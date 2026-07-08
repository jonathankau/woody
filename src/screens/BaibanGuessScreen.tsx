import type { GameState } from '../engine'

/**
 * The eliminated Baiban gets one verbal guess at the civilians' word. The host
 * adjudicates with Correct / Incorrect.
 */
export function BaibanGuessScreen({
  state,
  onResolve,
}: {
  state: GameState
  onResolve: (correct: boolean) => void
}): React.JSX.Element {
  const id = state.pendingBaibanGuessPlayerId
  const player = id ? state.players.find((p) => p.id === id) : null
  const name = player?.name ?? 'The Baiban'

  return (
    <section className="screen baiban-guess">
      <h2 className="screen-title">Baiban&apos;s last shot</h2>
      <div className="card baiban-guess-card">
        <p>
          <strong>{name}</strong> was the Baiban! They get one shot: guess the
          civilians&apos; word out loud.
        </p>
        <p className="baiban-guess-hint">Host, did they get it?</p>
      </div>
      <div className="baiban-guess-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onResolve(true)}
          data-testid="baiban-correct"
        >
          Correct
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onResolve(false)}
          data-testid="baiban-incorrect"
        >
          Incorrect
        </button>
      </div>
    </section>
  )
}
