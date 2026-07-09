import type { GameState, Role, Winner } from '../engine'
import { ruleSummary } from '../engine'
import { HowToPlayButton } from '../components/HowToPlayButton'

const ROLE_LABEL: Record<Role, string> = {
  civilian: 'Civilian',
  undercover: 'Undercover',
  baiban: 'Whiteboard',
}

const WINNER_COPY: Record<Winner, { title: string; sub: string }> = {
  civilians: { title: 'Civilians win!', sub: 'The infiltrators got sniffed out.' },
  undercovers: { title: 'Undercovers win!', sub: 'The sneaks pulled it off.' },
  infiltrators: { title: 'Infiltrators win!', sub: 'Undercovers and Whiteboard took the room.' },
  baiban: { title: 'Whiteboard wins!', sub: 'The blank one played everybody.' },
}

/** Final results: winner banner + full role/word reveal for every player. */
export function ResultsScreen({
  state,
  onPlayAgain,
  onBackToSetup,
  exhaustedNotice,
}: {
  state: GameState
  onPlayAgain: () => void
  onBackToSetup: () => void
  exhaustedNotice: boolean
}): React.JSX.Element {
  const winner = state.winner
  const copy = winner ? WINNER_COPY[winner] : null

  return (
    <section className="screen results">
      <div className="card results-banner" data-testid="results-winner">
        <h2 className="results-title">{copy?.title ?? 'Game over'}</h2>
        {copy && <p className="results-sub">{copy.sub}</p>}
      </div>

      <p className="results-summary">{ruleSummary(state.config)}</p>

      <table className="results-table">
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Role</th>
            <th scope="col">Word</th>
            <th scope="col">Out</th>
          </tr>
        </thead>
        <tbody>
          {state.players.map((p) => (
            <tr key={p.id}>
              <th scope="row">{p.name}</th>
              <td>{ROLE_LABEL[p.role]}</td>
              <td>{p.word ?? '—'}</td>
              <td>{p.eliminatedRound === null ? '—' : `R${p.eliminatedRound}`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {exhaustedNotice && (
        <p className="results-exhausted" role="status">
          You&apos;ve played every pair in your selection — words may repeat.
        </p>
      )}

      <div className="results-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPlayAgain}
          data-testid="results-play-again"
        >
          Play again (same settings)
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBackToSetup}
          data-testid="results-back-to-setup"
        >
          Back to setup
        </button>
        <HowToPlayButton rules={state.config.rules} />
      </div>
    </section>
  )
}
