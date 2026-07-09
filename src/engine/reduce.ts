import type {
  Elimination,
  GameAction,
  GameState,
  Player,
  Rng,
  VoteOutcome,
  VoteRecord,
} from './types'
import { alivePlayers, buildSpeakingOrder } from './helpers'
import { checkWinner } from './win'
import { sanitizeCounts, tallyVote, voteCandidates } from './vote'

/**
 * Pure reducer for everything after game creation. Illegal actions for the
 * current phase return the input state unchanged (same reference). `rng` is
 * used for PK/rotation/random-speaker needs on the next round.
 */
export function reduce(state: GameState, action: GameAction, rng: Rng): GameState {
  switch (action.type) {
    case 'SHOW_WORD':
      return reduceShowWord(state)
    case 'HIDE_WORD':
      return reduceHideWord(state)
    case 'CHOOSE_STARTING_SPEAKER':
      return reduceChooseStartingSpeaker(state, action.playerId)
    case 'BEGIN_DISCUSSION':
      return reduceBeginDiscussion(state)
    case 'BEGIN_VOTE':
      return reduceBeginVote(state)
    case 'SUBMIT_VOTE':
      return reduceSubmitVote(state, action.counts)
    case 'HOST_ELIMINATE':
      return reduceHostEliminate(state, action.playerId)
    case 'RESOLVE_BAIBAN_GUESS':
      return reduceResolveBaibanGuess(state, action.correct)
    case 'CONTINUE':
      return reduceContinue(state, rng)
    default:
      return state
  }
}

// ---------- reveal ----------

function reduceShowWord(state: GameState): GameState {
  if (state.phase !== 'reveal-pass') return state
  return { ...state, phase: 'reveal-show' }
}

function reduceHideWord(state: GameState): GameState {
  if (state.phase !== 'reveal-show') return state
  const nextIndex = state.revealIndex + 1
  if (nextIndex >= state.players.length) {
    return { ...state, phase: 'clue-order', revealIndex: nextIndex }
  }
  return { ...state, phase: 'reveal-pass', revealIndex: nextIndex }
}

// ---------- clue order ----------

function reduceChooseStartingSpeaker(state: GameState, playerId: string): GameState {
  if (state.phase !== 'clue-order') return state
  if (state.config.rules.startingSpeakerRule !== 'host-chooses') return state
  const player = state.players.find((p) => p.id === playerId)
  // Reject Whiteboard, dead, or unknown ids -> state unchanged.
  if (!player || player.eliminated || player.role === 'baiban') return state
  const rest = state.speakingOrder.filter((id) => id !== playerId)
  return { ...state, speakingOrder: [playerId, ...rest] }
}

function reduceBeginDiscussion(state: GameState): GameState {
  if (state.phase !== 'clue-order') return state
  return { ...state, phase: 'discussion' }
}

// ---------- vote ----------

function reduceBeginVote(state: GameState): GameState {
  if (state.phase !== 'discussion' && state.phase !== 'clue-order') return state
  return { ...state, phase: 'vote' }
}

function reduceSubmitVote(state: GameState, rawCounts: Record<string, number>): GameState {
  if (state.phase !== 'vote') return state
  const rules = state.config.rules
  // host-decides vote rule uses HOST_ELIMINATE, not SUBMIT_VOTE.
  if (rules.voteRule === 'host-decides' && !state.pkCandidateIds) return state

  const candidates = voteCandidates(state)
  const alive = alivePlayers(state).length
  const isPK = state.pkCandidateIds != null

  const tally = tallyVote(candidates, rawCounts, rules.voteRule, alive)

  // Determine the outcome and elimination.
  if (tally.noMajority) {
    const record: VoteRecord = {
      round: state.round,
      isPK,
      counts: tally.counts,
      outcome: 'no-majority',
      eliminatedPlayerId: null,
    }
    return toResolution(state, record, null, 'no-majority')
  }

  if (tally.isTie) {
    return resolveTie(state, tally.counts, tally.tiedIds, isPK)
  }

  // Clear elimination.
  const record: VoteRecord = {
    round: state.round,
    isPK,
    counts: tally.counts,
    outcome: 'eliminated',
    eliminatedPlayerId: tally.eliminatedId,
  }
  return applyElimination(state, record, tally.eliminatedId!)
}

function resolveTie(
  state: GameState,
  counts: Record<string, number>,
  tiedIds: string[],
  wasPK: boolean,
): GameState {
  const rules = state.config.rules

  // A tie during a PK revote -> no elimination, regardless of tie rule.
  if (wasPK) {
    const record: VoteRecord = {
      round: state.round,
      isPK: true,
      counts,
      outcome: 'no-elimination',
      eliminatedPlayerId: null,
    }
    return toResolution({ ...state, pkCandidateIds: null }, record, null, 'no-elimination')
  }

  switch (rules.tieRule) {
    case 'pk-revote': {
      // Record the tie, then go back to vote restricted to the tied ids.
      const record: VoteRecord = {
        round: state.round,
        isPK: false,
        counts,
        outcome: 'tie',
        eliminatedPlayerId: null,
      }
      return {
        ...state,
        phase: 'vote',
        pkCandidateIds: tiedIds.slice(),
        votes: [...state.votes, record],
        lastVoteOutcome: 'tie',
      }
    }
    case 'no-elimination': {
      const record: VoteRecord = {
        round: state.round,
        isPK: false,
        counts,
        outcome: 'no-elimination',
        eliminatedPlayerId: null,
      }
      return toResolution(state, record, null, 'no-elimination')
    }
    case 'host-decides': {
      // Stay on vote with the tied ids as candidates; UI uses HOST_ELIMINATE.
      const record: VoteRecord = {
        round: state.round,
        isPK: false,
        counts,
        outcome: 'tie',
        eliminatedPlayerId: null,
      }
      return {
        ...state,
        phase: 'vote',
        pkCandidateIds: tiedIds.slice(),
        votes: [...state.votes, record],
        lastVoteOutcome: 'tie',
      }
    }
  }
}

function reduceHostEliminate(state: GameState, playerId: string | null): GameState {
  if (state.phase !== 'vote') return state

  const candidates = voteCandidates(state)
  const counts = sanitizeCounts(candidates, {})
  const isPK = state.pkCandidateIds != null

  if (playerId === null) {
    const record: VoteRecord = {
      round: state.round,
      isPK,
      counts,
      outcome: 'host-decided',
      eliminatedPlayerId: null,
    }
    return toResolution({ ...state, pkCandidateIds: null }, record, null, 'host-decided')
  }

  // Reject ids that are not valid candidates.
  if (!candidates.includes(playerId)) return state

  const record: VoteRecord = {
    round: state.round,
    isPK,
    counts,
    outcome: 'host-decided',
    eliminatedPlayerId: playerId,
  }
  return applyElimination(state, record, playerId)
}

// ---------- elimination pipeline ----------

/**
 * Mark a player eliminated, record the vote, then branch to a Whiteboard guess or
 * run the win check.
 */
function applyElimination(
  state: GameState,
  record: VoteRecord,
  eliminatedId: string,
): GameState {
  const player = state.players.find((p) => p.id === eliminatedId)
  if (!player) return state

  const players: Player[] = state.players.map((p) =>
    p.id === eliminatedId
      ? { ...p, eliminated: true, eliminatedRound: state.round }
      : p,
  )

  const elimination: Elimination = {
    playerId: eliminatedId,
    role: player.role,
    round: state.round,
  }

  const next: GameState = {
    ...state,
    players,
    pkCandidateIds: null,
    votes: [...state.votes, record],
    lastElimination: elimination,
    lastVoteOutcome: record.outcome,
  }

  const rules = state.config.rules

  // Whiteboard guess branch: only when the eliminated player is Whiteboard, the rule is
  // guess-on-elimination, and the game isn't already decided in Whiteboard's favor.
  if (player.role === 'baiban' && rules.baibanRule === 'guess-on-elimination') {
    const decided = checkWinner(next)
    if (decided !== 'baiban') {
      return {
        ...next,
        phase: 'baiban-guess',
        pendingBaibanGuessPlayerId: eliminatedId,
      }
    }
  }

  return afterElimination(next)
}

/** Run the win check and move to resolution or results. */
function afterElimination(state: GameState): GameState {
  const winner = checkWinner(state)
  if (winner) {
    return { ...state, phase: 'results', winner }
  }
  return { ...state, phase: 'resolution' }
}

/**
 * Move to the resolution screen for a no-elimination outcome, recording the
 * vote and clearing the last elimination.
 */
function toResolution(
  state: GameState,
  record: VoteRecord,
  _eliminatedId: null,
  outcome: VoteOutcome,
): GameState {
  return {
    ...state,
    phase: 'resolution',
    pkCandidateIds: null,
    votes: [...state.votes, record],
    lastElimination: null,
    lastVoteOutcome: outcome,
  }
}

// ---------- baiban guess ----------

function reduceResolveBaibanGuess(state: GameState, correct: boolean): GameState {
  if (state.phase !== 'baiban-guess') return state
  if (correct) {
    return {
      ...state,
      phase: 'results',
      winner: 'baiban',
      pendingBaibanGuessPlayerId: null,
    }
  }
  // Incorrect: clear the pending guess and run the normal win check.
  return afterElimination({ ...state, pendingBaibanGuessPlayerId: null })
}

// ---------- continue ----------

function reduceContinue(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'resolution') return state
  if (state.winner) {
    return { ...state, phase: 'results' }
  }

  const nextRound = state.round + 1
  const speakingOrder = nextSpeakingOrder(state, rng)

  return {
    ...state,
    round: nextRound,
    phase: 'clue-order',
    speakingOrder,
    pkCandidateIds: null,
    lastElimination: null,
    lastVoteOutcome: null,
  }
}

function nextSpeakingOrder(state: GameState, rng: Rng): string[] {
  const alive = alivePlayers(state)
  const aliveById = new Map(alive.map((p) => [p.id, p]))
  let order = state.speakingOrder.filter((id) => aliveById.has(id))
  const missing = alive.filter((p) => !order.includes(p.id)).map((p) => p.id)
  order = [...order, ...missing]

  if (order.length === 0) {
    return buildSpeakingOrder(
      alive,
      state.config.rules.startingSpeakerRule,
      state.rotationIndex,
      rng,
    ).speakingOrder
  }

  const starterId = order.find((id) => aliveById.get(id)?.role !== 'baiban')
  if (starterId && order[0] !== starterId) {
    order = [starterId, ...order.filter((id) => id !== starterId)]
  }
  return order
}
