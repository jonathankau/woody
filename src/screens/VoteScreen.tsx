import type { GameState } from '../engine'
import { alivePlayers } from '../engine'

/**
 * Public vote result entry.
 *
 * The group votes out loud, then the host enters the result. Candidates are
 * `pkCandidateIds` when a PK revote is active, else all alive players.
 */
export function VoteScreen({
  state,
  onHostEliminate,
}: {
  state: GameState
  onHostEliminate: (playerId: string | null) => void
}): React.JSX.Element {
  const isPK = state.pkCandidateIds != null
  const byId = new Map(state.players.map((p) => [p.id, p]))

  const candidateIds =
    state.pkCandidateIds && state.pkCandidateIds.length > 0
      ? state.pkCandidateIds
      : alivePlayers(state).map((p) => p.id)

  const candidates = candidateIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)

  return (
    <section className="screen vote">
      <h2 className="screen-title">Who was voted off?</h2>

      {isPK && (
        <p className="vote-pk-banner" role="status">
          PK revote: only these players can be voted out.
        </p>
      )}

      <p className="vote-rule-copy">
        Run the vote out loud, then tap the result here. No voting for yourself.
      </p>

      <ul className="vote-list">
        {candidates.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="btn vote-host-pick"
              onClick={() => onHostEliminate(p.id)}
              data-testid={`vote-eliminate-${p.id}`}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>

      <div className="vote-actions">
        <button
          type="button"
          className="btn btn-ghost vote-no-elim"
          onClick={() => onHostEliminate(null)}
          data-testid="vote-no-elimination"
        >
          No elimination
        </button>
      </div>
    </section>
  )
}
