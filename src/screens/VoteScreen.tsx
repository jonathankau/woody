import { useMemo, useState } from 'react'
import type { GameState } from '../engine'
import { alivePlayers } from '../engine'

/**
 * Public vote entry.
 *
 * - plurality / majority: a +/- stepper per candidate, showing the running
 *   total against the alive-voter count.
 * - host-decides (vote rule, or a host-decides tie during a PK): tap a
 *   candidate or "No elimination".
 *
 * Candidates are `pkCandidateIds` when a PK revote is active, else all alive
 * players. A PK banner is shown when `pkCandidateIds` is set.
 */
export function VoteScreen({
  state,
  onSubmit,
  onHostEliminate,
}: {
  state: GameState
  onSubmit: (counts: Record<string, number>) => void
  onHostEliminate: (playerId: string | null) => void
}): React.JSX.Element {
  const rules = state.config.rules
  const isPK = state.pkCandidateIds != null
  const byId = new Map(state.players.map((p) => [p.id, p]))

  const candidateIds =
    state.pkCandidateIds && state.pkCandidateIds.length > 0
      ? state.pkCandidateIds
      : alivePlayers(state).map((p) => p.id)

  const candidates = candidateIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)

  const aliveVoterCount = alivePlayers(state).length

  // host-decides applies when the vote rule is host-decides, or a PK tie fell
  // through to a host-decides tie rule (pkCandidateIds set + host-decides tie).
  const hostMode =
    rules.voteRule === 'host-decides' ||
    (isPK && rules.tieRule === 'host-decides')

  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(candidateIds.map((id) => [id, 0])),
  )

  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  )

  function bump(id: string, delta: number) {
    setCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
  }

  return (
    <section className="screen vote">
      <h2 className="screen-title">Vote</h2>

      {isPK && (
        <p className="vote-pk-banner" role="status">
          PK revote — only these players can be voted.
        </p>
      )}

      <p className="vote-rule-copy">Vote in the open. No voting for yourself.</p>

      {hostMode ? (
        <>
          <p className="vote-lead">Tap who the group voted out.</p>
          <ul className="vote-list">
            {candidates.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="btn vote-host-pick"
                  onClick={() => onHostEliminate(p.id)}
                  data-testid={`vote-host-pick-${p.id}`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost vote-no-elim"
            onClick={() => onHostEliminate(null)}
            data-testid="vote-no-elimination"
          >
            No elimination
          </button>
        </>
      ) : (
        <>
          <ul className="vote-list">
            {candidates.map((p) => (
              <li key={p.id} className="vote-row">
                <span className="vote-name">{p.name}</span>
                <div className="vote-stepper">
                  <button
                    type="button"
                    className="btn vote-step vote-step-dec"
                    aria-label={`Remove a vote from ${p.name}`}
                    onClick={() => bump(p.id, -1)}
                    data-testid={`vote-stepper-dec-${p.id}`}
                  >
                    −
                  </button>
                  <span className="vote-count" aria-live="polite">
                    {counts[p.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    className="btn vote-step vote-step-inc"
                    aria-label={`Add a vote for ${p.name}`}
                    onClick={() => bump(p.id, 1)}
                    data-testid={`vote-stepper-inc-${p.id}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className={`vote-total${total > aliveVoterCount ? ' vote-total-warn' : ''}`}>
            {total} of {aliveVoterCount} votes entered
            {total > aliveVoterCount && ' — more votes than players'}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSubmit(counts)}
            data-testid="vote-submit"
          >
            Submit votes
          </button>
        </>
      )}
    </section>
  )
}
