import type { GameState } from '../engine'
import { currentRevealPlayer } from '../engine'

/**
 * "Pass the phone to [Name]" interstitial. Deliberately renders NO word: the
 * word only appears after the player taps to show it.
 */
export function RevealPassScreen({
  state,
  onShow,
}: {
  state: GameState
  onShow: () => void
}): React.JSX.Element {
  const player = currentRevealPlayer(state)
  const name = player?.name ?? 'the next player'
  const total = state.players.length
  const position = state.revealIndex + 1

  return (
    <section className="screen reveal-pass">
      <p className="reveal-progress" aria-live="polite">
        Player {position} of {total}
      </p>
      <div className="card reveal-pass-card">
        <p className="reveal-pass-lead">Pass the phone to</p>
        <h2 className="reveal-pass-name">{name}</h2>
        <p className="reveal-warn">Make sure only you can see the screen.</p>
      </div>
      <button
        type="button"
        className="btn btn-primary reveal-pass-btn"
        onClick={onShow}
        data-testid="reveal-pass-show"
      >
        I&apos;m {name} — show my word
      </button>
    </section>
  )
}
