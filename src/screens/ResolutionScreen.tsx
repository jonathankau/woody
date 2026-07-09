import type { GameState, Role } from '../engine'

const ROLE_LABEL: Record<Role, string> = {
  civilian: 'a Civilian',
  undercover: 'an Undercover',
  baiban: 'the Whiteboard',
}

function noElimReason(outcome: GameState['lastVoteOutcome']): string {
  switch (outcome) {
    case 'tie':
      return 'The vote tied.'
    case 'no-majority':
      return 'No one reached a majority.'
    case 'no-elimination':
      return 'The tie eliminated nobody.'
    case 'host-decided':
      return 'No one is out. Give another clue round, then revote.'
    default:
      return 'No elimination this round.'
  }
}

/**
 * Round outcome card. Eliminated players reveal their ROLE only (never their
 * word). No-elimination outcomes show a short reason.
 */
export function ResolutionScreen({
  state,
  onContinue,
}: {
  state: GameState
  onContinue: () => void
}): React.JSX.Element {
  const elim = state.lastElimination
  const player = elim ? state.players.find((p) => p.id === elim.playerId) : null

  return (
    <section className="screen resolution">
      <h2 className="screen-title">Round {state.round}</h2>
      <div className="card resolution-card">
        {player && elim ? (
          <>
            <p className="resolution-out">
              <strong>{player.name}</strong> is out
            </p>
            <p className="resolution-role">they were {ROLE_LABEL[elim.role]}</p>
          </>
        ) : (
          <>
            <p className="resolution-out">Nobody was eliminated</p>
            <p className="resolution-role">{noElimReason(state.lastVoteOutcome)}</p>
          </>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onContinue}
        data-testid="resolution-continue"
      >
        Continue
      </button>
    </section>
  )
}
