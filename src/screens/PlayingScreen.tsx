import { useReducer, useEffect, useState, useCallback } from 'react'
import type { GameAction, GameState } from '../engine'
import { reduce } from '../engine'
import { saveGame } from '../storage/game'
import { HowToPlayButton } from '../components/HowToPlayButton'
import { RevealPassScreen } from './RevealPassScreen'
import { RevealShowScreen } from './RevealShowScreen'
import { ClueOrderScreen } from './ClueOrderScreen'
import { VoteScreen } from './VoteScreen'
import { ResolutionScreen } from './ResolutionScreen'
import { BaibanGuessScreen } from './BaibanGuessScreen'
import { ResultsScreen } from './ResultsScreen'

const PHASE_HINT: Record<GameState['phase'], string> = {
  'reveal-pass': 'Secret reveal',
  'reveal-show': 'Secret reveal',
  'clue-order': 'Clue order',
  discussion: 'Voting',
  vote: 'Voting',
  resolution: 'Resolution',
  'baiban-guess': 'Baiban guess',
  results: 'Results',
}

function gameReducer(state: GameState, action: GameAction): GameState {
  return reduce(state, action, Math.random)
}

/**
 * Drives an active game: owns the GameState reducer, auto-saves on every
 * transition, renders the current phase, and offers the persistent header
 * (round, phase hint, How to Play, End game).
 */
export function PlayingScreen({
  initialState,
  onEndGame,
  onPlayAgain,
  onBackToSetup,
  exhaustedNotice,
}: {
  initialState: GameState
  onEndGame: () => void
  onPlayAgain: () => void
  onBackToSetup: () => void
  exhaustedNotice: boolean
}): React.JSX.Element {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [confirmQuit, setConfirmQuit] = useState(false)

  // Auto-save on every transition.
  useEffect(() => {
    saveGame(state)
  }, [state])

  const dispatchAction = useCallback((action: GameAction) => dispatch(action), [])

  return (
    <div className="playing">
      <header className="game-header">
        <div className="game-header-info">
          <span className="game-round">Round {state.round}</span>
          <span className="game-phase">{PHASE_HINT[state.phase]}</span>
        </div>
        <div className="game-header-actions">
          <HowToPlayButton rules={state.config.rules} className="btn btn-ghost game-howto" />
          <button
            type="button"
            className="btn btn-ghost game-quit"
            onClick={() => setConfirmQuit(true)}
          >
            End game
          </button>
        </div>
      </header>

      {confirmQuit && (
        <div className="game-quit-confirm" role="dialog" aria-label="End game">
          <span>End this game and return to setup?</span>
          <div className="game-quit-actions">
            <button type="button" className="btn btn-primary" onClick={onEndGame}>
              End game
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmQuit(false)}
            >
              Keep playing
            </button>
          </div>
        </div>
      )}

      <main className="game-main">
        <h1 className="sr-only">Woody game in progress</h1>
        <PhaseView
          state={state}
          dispatch={dispatchAction}
          onPlayAgain={onPlayAgain}
          onBackToSetup={onBackToSetup}
          exhaustedNotice={exhaustedNotice}
        />
      </main>
    </div>
  )
}

function PhaseView({
  state,
  dispatch,
  onPlayAgain,
  onBackToSetup,
  exhaustedNotice,
}: {
  state: GameState
  dispatch: (action: GameAction) => void
  onPlayAgain: () => void
  onBackToSetup: () => void
  exhaustedNotice: boolean
}): React.JSX.Element {
  switch (state.phase) {
    case 'reveal-pass':
      return <RevealPassScreen state={state} onShow={() => dispatch({ type: 'SHOW_WORD' })} />
    case 'reveal-show':
      return <RevealShowScreen state={state} onHide={() => dispatch({ type: 'HIDE_WORD' })} />
    case 'clue-order':
      return (
        <ClueOrderScreen
          state={state}
          onContinue={() => dispatch({ type: 'BEGIN_VOTE' })}
          onChooseStarter={(playerId) =>
            dispatch({ type: 'CHOOSE_STARTING_SPEAKER', playerId })
          }
        />
      )
    case 'discussion':
      return (
        <VoteScreen
          state={state}
          onHostEliminate={(playerId) => dispatch({ type: 'HOST_ELIMINATE', playerId })}
        />
      )
    case 'vote':
      return (
        <VoteScreen
          state={state}
          onHostEliminate={(playerId) => dispatch({ type: 'HOST_ELIMINATE', playerId })}
        />
      )
    case 'resolution':
      return (
        <ResolutionScreen state={state} onContinue={() => dispatch({ type: 'CONTINUE' })} />
      )
    case 'baiban-guess':
      return (
        <BaibanGuessScreen
          state={state}
          onResolve={(correct) => dispatch({ type: 'RESOLVE_BAIBAN_GUESS', correct })}
        />
      )
    case 'results':
      return (
        <ResultsScreen
          state={state}
          onPlayAgain={onPlayAgain}
          onBackToSetup={onBackToSetup}
          exhaustedNotice={exhaustedNotice}
        />
      )
  }
}
