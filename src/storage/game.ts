/**
 * Active-game persistence for the UI workstream.
 *
 * The full `GameState` is saved under `STORAGE_KEYS.activeGame` in an envelope
 * `{ schemaVersion, state }`. The schema version comes from the engine so a
 * breaking `GameState` change invalidates old saves.
 *
 * Privacy: a game saved while a player is privately viewing their word
 * (`reveal-show`) is restored to `reveal-pass` for the same `revealIndex`, so a
 * refresh can never re-expose a word without the pass gate in front of it.
 */

import type { GameState } from '../engine'
import { SCHEMA_VERSION } from '../engine'
import { readJSON, writeJSON, removeKey, STORAGE_KEYS } from './local'

interface SavedGame {
  schemaVersion: number
  state: GameState
}

export function saveGame(state: GameState): void {
  const envelope: SavedGame = { schemaVersion: SCHEMA_VERSION, state }
  writeJSON(STORAGE_KEYS.activeGame, envelope)
}

export function loadGame():
  | { ok: true; state: GameState }
  | { ok: false; reason: 'none' | 'incompatible' } {
  const raw = readJSON<SavedGame>(STORAGE_KEYS.activeGame)
  if (raw === null) {
    // `readJSON` returns null both for a missing key and for corrupt/unparseable
    // data. Distinguish: a present-but-null value is an incompatible save.
    if (keyPresent(STORAGE_KEYS.activeGame)) {
      return { ok: false, reason: 'incompatible' }
    }
    return { ok: false, reason: 'none' }
  }

  if (
    typeof raw !== 'object' ||
    typeof raw.schemaVersion !== 'number' ||
    typeof raw.state !== 'object' ||
    raw.state === null
  ) {
    return { ok: false, reason: 'incompatible' }
  }

  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, reason: 'incompatible' }
  }

  const state = raw.state

  // Privacy: never restore straight into a private reveal. Fall back to the
  // pass gate for the same player.
  if (state.phase === 'reveal-show') {
    return { ok: true, state: { ...state, phase: 'reveal-pass' } }
  }

  return { ok: true, state }
}

export function clearGame(): void {
  removeKey(STORAGE_KEYS.activeGame)
}

/** True when a key exists in storage (even if its value doesn't parse). */
function keyPresent(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}
