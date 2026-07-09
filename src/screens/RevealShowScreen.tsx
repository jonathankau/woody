import type { GameState } from '../engine'
import { currentRevealPlayer } from '../engine'

/**
 * Private word card for the current player. Word-holders see their word (never
 * their role). The Whiteboard sees a no-word notice (they inevitably learn they are
 * Whiteboard by having no word — that is per spec).
 */
export function RevealShowScreen({
  state,
  onHide,
}: {
  state: GameState
  onHide: () => void
}): React.JSX.Element {
  const player = currentRevealPlayer(state)
  const name = player?.name ?? ''
  const isBaiban = player?.word === null

  return (
    <section className="screen reveal-show">
      <p className="reveal-warn">Make sure only you can see the screen.</p>
      <div className="card reveal-show-card">
        <p className="reveal-show-for">{name}</p>
        {isBaiban ? (
          <>
            <p className="reveal-show-label">You have NO word.</p>
            <p className="reveal-show-word reveal-show-noword" data-testid="reveal-word">
              —
            </p>
            <p className="reveal-hint">Bluff like you belong.</p>
          </>
        ) : (
          <>
            <p className="reveal-show-label">Your word</p>
            <p className="reveal-show-word" data-testid="reveal-word">
              {player?.word}
            </p>
            <p className="reveal-hint">Don&apos;t say it outright — clue, don&apos;t spill.</p>
          </>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primary reveal-hide-btn"
        onClick={onHide}
        data-testid="reveal-hide"
      >
        Hide &amp; pass on
      </button>
    </section>
  )
}
