import type { ActivePair, GameConfig, GameState, Player, Role, Rng } from './types'
import { SCHEMA_VERSION } from './version'
import { buildSpeakingOrder, shuffle } from './helpers'

/**
 * Create a fresh game from a validated config and a chosen word pair.
 *
 * - Assigns roles randomly: `undercoverCount` undercovers, `baibanCount`
 *   Baiban, the rest civilians.
 * - Randomizes which side of the pair (`a` or `b`) is the civilian word vs the
 *   undercover word.
 * - Player ids are deterministic `p1`..`pN` in `playerNames` order.
 * - Reveal order is the players-array order (revealIndex starts at 0).
 * - Builds the round-1 speaking order and starting speaker (never Baiban),
 *   respecting `startingSpeakerRule`. For `host-chooses` the UI reorders later
 *   via CHOOSE_STARTING_SPEAKER.
 *
 * Initial phase is `reveal-pass`.
 */
export function createGame(
  config: GameConfig,
  pair: { id: string; packId: string; a: string; b: string },
  rng: Rng,
): GameState {
  const { rules, playerNames } = config
  const n = playerNames.length

  // Randomize which pair side is civilian vs undercover.
  const aIsCivilian = rng() < 0.5
  const civilianWord = aIsCivilian ? pair.a : pair.b
  const undercoverWord = aIsCivilian ? pair.b : pair.a

  const activePair: ActivePair = {
    pairId: pair.id,
    packId: pair.packId,
    civilianWord,
    undercoverWord,
  }

  // Build a role bag then shuffle it, so assignment is random but counts exact.
  const baibanCount = rules.baibanCount === 1 ? 1 : 0
  const undercoverCount = Math.max(0, rules.undercoverCount)
  const civilianCount = n - undercoverCount - baibanCount

  const roleBag: Role[] = [
    ...Array<Role>(undercoverCount).fill('undercover'),
    ...Array<Role>(baibanCount).fill('baiban'),
    ...Array<Role>(civilianCount).fill('civilian'),
  ]
  const shuffledRoles = shuffle(roleBag, rng)

  const players: Player[] = playerNames.map((name, i) => {
    const role = shuffledRoles[i]
    const word =
      role === 'baiban' ? null : role === 'undercover' ? undercoverWord : civilianWord
    return {
      id: `p${i + 1}`,
      name,
      role,
      word,
      eliminated: false,
      eliminatedRound: null,
    }
  })

  const { speakingOrder, rotationIndex } = buildSpeakingOrder(
    players,
    rules.startingSpeakerRule,
    0,
    rng,
  )

  return {
    schemaVersion: SCHEMA_VERSION,
    config,
    players,
    pair: activePair,
    round: 1,
    phase: 'reveal-pass',
    revealIndex: 0,
    speakingOrder,
    rotationIndex,
    votes: [],
    pkCandidateIds: null,
    pendingBaibanGuessPlayerId: null,
    lastElimination: null,
    lastVoteOutcome: null,
    winner: null,
  }
}
