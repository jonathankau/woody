import { describe, it, expect } from 'vitest'
import { saveGame, loadGame, clearGame } from './game'
import { STORAGE_KEYS } from './local'
import { createGame, presetById, SCHEMA_VERSION } from '../engine'
import type { GameConfig, GameState } from '../engine'

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

describe('storage/game', () => {
  it('round-trips saveGame/loadGame', () => {
    const game = makeGame()
    saveGame(game)
    const loaded = loadGame()
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.state.players).toHaveLength(4)
      expect(loaded.state.pair.pairId).toBe('p1')
    }
  })

  it('maps a saved reveal-show back to reveal-pass on restore', () => {
    const game: GameState = { ...makeGame(), phase: 'reveal-show', revealIndex: 2 }
    saveGame(game)
    const loaded = loadGame()
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.state.phase).toBe('reveal-pass')
      expect(loaded.state.revealIndex).toBe(2)
    }
  })

  it('returns none when there is no saved game', () => {
    const loaded = loadGame()
    expect(loaded).toEqual({ ok: false, reason: 'none' })
  })

  it('returns incompatible on a schema-version mismatch', () => {
    const game = makeGame()
    localStorage.setItem(
      STORAGE_KEYS.activeGame,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, state: game }),
    )
    expect(loadGame()).toEqual({ ok: false, reason: 'incompatible' })
  })

  it('returns incompatible on unparseable data', () => {
    localStorage.setItem(STORAGE_KEYS.activeGame, 'not json')
    expect(loadGame()).toEqual({ ok: false, reason: 'incompatible' })
  })

  it('clearGame removes the saved game', () => {
    saveGame(makeGame())
    clearGame()
    expect(loadGame().ok).toBe(false)
  })
})
