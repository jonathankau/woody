import { useEffect, useState } from 'react'
import type { GameState } from '../engine'
import { alivePlayers, startingSpeaker } from '../engine'

/**
 * Clue-order screen: shows the speaking order with the starting speaker
 * highlighted. For the host-chooses rule the host taps a player to set the
 * starter. To avoid leaking the Baiban's identity, we offer every alive player;
 * the engine silently rejects a Baiban pick (state unchanged), and we surface a
 * neutral prompt to try a different starter.
 */
export function ClueOrderScreen({
  state,
  onContinue,
  onChooseStarter,
}: {
  state: GameState
  onContinue: () => void
  onChooseStarter: (playerId: string) => void
}): React.JSX.Element {
  const rules = state.config.rules
  const hostChooses = rules.startingSpeakerRule === 'host-chooses'
  const starter = startingSpeaker(state)
  const alive = alivePlayers(state)
  // The player the host last tapped. After the parent re-renders with the
  // authoritative order, if the tapped player is NOT the starter the engine
  // rejected it (a Baiban pick) and we show a neutral prompt — never revealing
  // who the Baiban is.
  const [attemptedPick, setAttemptedPick] = useState<string | null>(null)

  const byId = new Map(state.players.map((p) => [p.id, p]))
  const order = state.speakingOrder
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null && !p.eliminated)

  const showToast =
    attemptedPick !== null && starter?.id !== attemptedPick

  useEffect(() => {
    // Once an accepted pick lands (starter matches), clear the flag.
    if (attemptedPick !== null && starter?.id === attemptedPick) {
      setAttemptedPick(null)
    }
  }, [attemptedPick, starter?.id])

  function handlePick(playerId: string) {
    setAttemptedPick(playerId)
    onChooseStarter(playerId)
  }

  return (
    <section className="screen clue-order">
      <h2 className="screen-title">Clue order</h2>

      {hostChooses ? (
        <>
          <p className="clue-order-lead">Tap who starts the clues this round.</p>
          <ul className="clue-order-list">
            {alive.map((p, i) => {
              const isStarter = starter?.id === p.id
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`btn clue-order-pick${isStarter ? ' clue-order-pick-active' : ''}`}
                    onClick={() => handlePick(p.id)}
                  >
                    <span className="clue-order-num">{i + 1}</span>
                    <span className="clue-order-name">{p.name}</span>
                    {isStarter && <span className="clue-order-tag">starts</span>}
                  </button>
                </li>
              )
            })}
          </ul>
          {showToast && (
            <p className="clue-order-toast" role="status">
              Pick a different starter for this round.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="clue-order-lead">
            <strong>{starter?.name}</strong> starts the clues.
          </p>
          <ol className="clue-order-list">
            {order.map((p) => {
              const isStarter = starter?.id === p.id
              return (
                <li
                  key={p.id}
                  className={`clue-order-item${isStarter ? ' clue-order-item-active' : ''}`}
                >
                  <span className="clue-order-name">{p.name}</span>
                  {isStarter && <span className="clue-order-tag">starts</span>}
                </li>
              )
            })}
          </ol>
        </>
      )}

      <div className="card clue-order-rule">
        <p>
          Each player says one clue in this order. Then discuss who feels off
          and vote out loud.
        </p>
        <p>Don&apos;t say your word itself.</p>
        {rules.strictClues && (
          <p className="clue-order-strict">Strict mode: your clue must be true about your word.</p>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={onContinue}
        data-testid="clue-order-continue"
      >
        Go to voting when ready
      </button>
    </section>
  )
}
