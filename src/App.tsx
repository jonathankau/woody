import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameConfig, GameState } from './engine'
import { createGame } from './engine'
import { choosePair, markPairUsed } from './words'
import { saveGame, loadGame, clearGame } from './storage/game'
import { SetupScreen } from './screens/SetupScreen'
import { PlayingScreen } from './screens/PlayingScreen'

type Mode =
  | { kind: 'setup' }
  | { kind: 'playing'; state: GameState; exhausted: boolean; sessionId: number }
  | { kind: 'incompatible' }

/**
 * Top-level state machine. No routing library / URL paths (GitHub Pages safe).
 *
 * On mount: loadGame(). ok -> resume; 'incompatible' -> offer a fresh start;
 * 'none' -> setup. The active game auto-saves inside PlayingScreen.
 *
 * Back-button trap: while a game is active we push a history entry and, on every
 * popstate, immediately push again. That re-arms the trap so the browser back
 * button can never step into a previous player's reveal. We never drive the
 * state machine backward from popstate.
 */
export function App(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>(() => {
    const loaded = loadGame()
    if (loaded.ok) {
      saveGame(loaded.state)
      return { kind: 'playing', state: loaded.state, exhausted: false, sessionId: 0 }
    }
    if (loaded.reason === 'incompatible') return { kind: 'incompatible' }
    return { kind: 'setup' }
  })
  const sessionRef = useRef(0)

  const isPlaying = mode.kind === 'playing'

  // Back-button trap: arm while a game is active.
  useEffect(() => {
    if (!isPlaying) return
    window.history.pushState({ woody: true }, '')
    function onPop() {
      // Re-arm immediately; never navigate the game backward.
      window.history.pushState({ woody: true }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isPlaying])

  const startGame = useCallback((state: GameState, exhausted: boolean) => {
    saveGame(state)
    sessionRef.current += 1
    setMode({ kind: 'playing', state, exhausted, sessionId: sessionRef.current })
  }, [])

  const playAgain = useCallback((config: GameConfig) => {
    const chosen = choosePair(config.packIds, Math.random)
    if (!chosen) return
    const { pair, exhausted } = chosen
    const state = createGame(
      config,
      { id: pair.id, packId: pair.packId, a: pair.a, b: pair.b },
      Math.random,
    )
    markPairUsed(pair.id)
    saveGame(state)
    sessionRef.current += 1
    setMode({ kind: 'playing', state, exhausted, sessionId: sessionRef.current })
  }, [])

  const backToSetup = useCallback(() => {
    clearGame()
    setMode({ kind: 'setup' })
  }, [])

  if (mode.kind === 'incompatible') {
    return (
      <main className="screen restore">
        <div className="card restore-card">
          <h1 className="restore-title">Saved game can&apos;t be restored</h1>
          <p>
            Your last game was saved by an older version of Woody and can&apos;t be
            continued. Start a fresh game to keep playing.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={backToSetup}
            data-testid="restore-new-game"
          >
            Start new game
          </button>
        </div>
      </main>
    )
  }

  if (mode.kind === 'playing') {
    return (
      <PlayingScreen
        key={mode.sessionId}
        initialState={mode.state}
        exhaustedNotice={mode.exhausted}
        onEndGame={backToSetup}
        onBackToSetup={backToSetup}
        onPlayAgain={() => playAgain(mode.state.config)}
      />
    )
  }

  return (
    <main className="app-setup">
      <SetupScreen onStart={startGame} />
    </main>
  )
}
