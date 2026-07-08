import type { GameState, VoteRule } from './types'

export interface VoteTally {
  /** The single player id to eliminate, or null when nobody is out. */
  eliminatedId: string | null
  /** True when the result is an unresolved tie (needs the tie rule). */
  isTie: boolean
  /** The tied candidate ids (only meaningful when isTie is true). */
  tiedIds: string[]
  /** True when a majority was required but not reached. */
  noMajority: boolean
  /** The sanitized counts restricted to valid candidates (received votes). */
  counts: Record<string, number>
}

/** The candidate ids eligible to receive votes this round. */
export function voteCandidates(state: GameState): string[] {
  if (state.pkCandidateIds && state.pkCandidateIds.length > 0) {
    return state.pkCandidateIds.slice()
  }
  return state.players.filter((p) => !p.eliminated).map((p) => p.id)
}

/**
 * Sanitize submitted counts: keep only keys that are valid candidates, coerce
 * negatives/NaN to 0, and ensure every candidate has an entry (missing = 0).
 */
export function sanitizeCounts(
  candidates: string[],
  raw: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of candidates) {
    const v = raw[id]
    out[id] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
  }
  return out
}

/**
 * Apply the configured vote rule to submitted counts.
 *
 * - plurality: unique max -> eliminate; tied max (incl. all-zero) -> tie.
 * - majority: unique max AND max > floor(aliveCount / 2) -> eliminate,
 *   else no-majority (no elimination).
 *
 * `aliveCount` is the number of alive players (used for the majority threshold).
 */
export function tallyVote(
  candidates: string[],
  raw: Record<string, number>,
  rule: VoteRule,
  aliveCount: number,
): VoteTally {
  const counts = sanitizeCounts(candidates, raw)

  let max = -1
  for (const id of candidates) {
    if (counts[id] > max) max = counts[id]
  }
  const leaders = candidates.filter((id) => counts[id] === max)

  // All-zero (max === 0) or multiple leaders => tie among leaders.
  const tie = max <= 0 || leaders.length > 1
  const tiedIds = tie ? (max <= 0 ? candidates.slice() : leaders.slice()) : []

  if (rule === 'majority') {
    const threshold = Math.floor(aliveCount / 2)
    if (!tie && max > threshold) {
      return { eliminatedId: leaders[0], isTie: false, tiedIds: [], noMajority: false, counts }
    }
    // A tie or an insufficient plurality both mean "no strict majority".
    return { eliminatedId: null, isTie: false, tiedIds: [], noMajority: true, counts }
  }

  // plurality
  if (tie) {
    return { eliminatedId: null, isTie: true, tiedIds, noMajority: false, counts }
  }
  return { eliminatedId: leaders[0], isTie: false, tiedIds: [], noMajority: false, counts }
}
