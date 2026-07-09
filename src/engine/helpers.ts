import type { GameState, Player, Rng } from './types'

/** Players still in the game, in the original players-array order. */
export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.eliminated)
}

/** The player currently being passed the phone during the reveal phase. */
export function currentRevealPlayer(state: GameState): Player | null {
  if (state.phase !== 'reveal-pass' && state.phase !== 'reveal-show') return null
  return state.players[state.revealIndex] ?? null
}

/**
 * The starting speaker for the current round, derived from `speakingOrder`.
 * Returns null when there is no clue order yet (e.g. reveal phase) or when the
 * host has not yet chosen a starting speaker.
 */
export function startingSpeaker(state: GameState): Player | null {
  const firstId = state.speakingOrder[0]
  if (!firstId) return null
  return state.players.find((p) => p.id === firstId) ?? null
}

/** Fisher-Yates shuffle using the injected rng; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const clamped = j > i ? i : j < 0 ? 0 : j
    ;[arr[i], arr[clamped]] = [arr[clamped], arr[i]]
  }
  return arr
}

/** Alive, non-Whiteboard players eligible to be a starting speaker. */
export function eligibleSpeakers(players: Player[]): Player[] {
  return players.filter((p) => !p.eliminated && p.role !== 'baiban')
}

/**
 * Build a speaking order for a round among the given alive players, and pick a
 * starting speaker per the rule (never Whiteboard). Returns the reordered speaking
 * order (starting speaker first) and the updated rotation cursor.
 *
 * For `host-chooses` we cannot know the speaker yet, so `speakingOrder` is
 * seeded with a random-but-eligible ordering and the UI must call
 * CHOOSE_STARTING_SPEAKER to reorder; `startingSpeaker` will reflect whatever
 * is first. Callers that need "no speaker chosen yet" should inspect the phase.
 */
export function buildSpeakingOrder(
  alive: Player[],
  rule: 'random' | 'host-chooses' | 'rotate',
  rotationIndex: number,
  rng: Rng,
): { speakingOrder: string[]; rotationIndex: number } {
  const eligible = eligibleSpeakers(alive)
  // Base order: alive players in a shuffled sequence (stable input = players order).
  const ordered = shuffle(alive, rng)

  if (eligible.length === 0) {
    // Degenerate: only Whiteboard left alive. Keep order as-is.
    return { speakingOrder: ordered.map((p) => p.id), rotationIndex }
  }

  if (rule === 'rotate') {
    // Pick the rotation-th eligible speaker (advancing the cursor), skipping
    // dead and Whiteboard implicitly because `eligible` only holds valid players.
    const idx = rotationIndex % eligible.length
    const starter = eligible[idx]
    const next = putFirst(ordered, starter.id)
    return { speakingOrder: next, rotationIndex: rotationIndex + 1 }
  }

  if (rule === 'random') {
    const starter = eligible[Math.floor(rng() * eligible.length)] ?? eligible[0]
    const next = putFirst(ordered, starter.id)
    return { speakingOrder: next, rotationIndex }
  }

  // host-chooses: ensure the seeded first speaker is at least eligible so that
  // startingSpeaker() is never Whiteboard before the host picks.
  const firstPlayer = ordered[0]
  if (!firstPlayer || firstPlayer.role === 'baiban' || firstPlayer.eliminated) {
    const next = putFirst(ordered, eligible[0].id)
    return { speakingOrder: next, rotationIndex }
  }
  return { speakingOrder: ordered.map((p) => p.id), rotationIndex }
}

/** Move `id` to the front of the id list, preserving relative order otherwise. */
export function putFirst(players: Player[], id: string): string[] {
  const ids = players.map((p) => p.id)
  const rest = ids.filter((x) => x !== id)
  return [id, ...rest]
}
