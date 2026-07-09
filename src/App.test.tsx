import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { STORAGE_KEYS } from './storage/local'
import { createGame, presetById, SCHEMA_VERSION } from './engine'
import type { GameConfig, GameState } from './engine'

function makeGame(): GameState {
  const names = ['A', 'B', 'C', 'D']
  const config: GameConfig = {
    presetId: 'woody-standard',
    rules: presetById('woody-standard').rules(names.length),
    playerNames: names,
    packIds: [],
  }
  return createGame(config, { id: 'p1', packId: 'pk', a: 'Tea', b: 'Coffee' }, () => 0.3)
}

describe('App state machine', () => {
  it('starts on setup when there is no saved game', () => {
    render(<App />)
    expect(screen.getByTestId('setup-start')).toBeInTheDocument()
  })

  it('resumes a compatible saved game', () => {
    localStorage.setItem(
      STORAGE_KEYS.activeGame,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, state: makeGame() }),
    )
    render(<App />)
    // Game header appears when playing.
    expect(screen.getByText(/Round 1/)).toBeInTheDocument()
    expect(screen.getByTestId('reveal-pass-show')).toBeInTheDocument()
  })

  it('restores a reveal-show game at the pass gate (no word visible)', () => {
    const game: GameState = { ...makeGame(), phase: 'reveal-show', revealIndex: 1 }
    localStorage.setItem(
      STORAGE_KEYS.activeGame,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, state: game }),
    )
    render(<App />)
    expect(screen.getByTestId('reveal-pass-show')).toBeInTheDocument()
    expect(screen.queryByTestId('reveal-word')).not.toBeInTheDocument()
  })

  it('offers "Start new game" on an incompatible save', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      STORAGE_KEYS.activeGame,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 99, state: makeGame() }),
    )
    render(<App />)
    const button = screen.getByTestId('restore-new-game')
    expect(button).toBeInTheDocument()
    await user.click(button)
    expect(screen.getByTestId('setup-start')).toBeInTheDocument()
  })
})
