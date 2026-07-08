import type { GameConfig, PresetId, Rng, RuleSet } from './types'
import { presetById } from './presets'

/**
 * Engine tests are pure and do not need the DOM. The shared test setup's
 * `afterEach` calls `localStorage.clear()`, but under this project's jsdom
 * config `localStorage` is a bare `{}` without a `clear` method, which would
 * fail teardown for every engine test. Install a minimal, spec-compliant
 * Storage shim so teardown succeeds without depending on out-of-scope config.
 * This is idempotent and no-ops once a real Storage with `clear` exists.
 */
function ensureLocalStorage(): void {
  const g = globalThis as { localStorage?: unknown }
  const existing = g.localStorage as { clear?: unknown } | undefined
  if (existing && typeof existing.clear === 'function') return
  const map = new Map<string, string>()
  const shim: Storage = {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => map.delete(k),
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: shim,
    configurable: true,
    writable: true,
  })
}
ensureLocalStorage()

/** An rng that always returns the given constant. */
export function constRng(value: number): Rng {
  return () => value
}

/**
 * An rng that yields the given sequence, then repeats the last value forever
 * (so tests never run off the end).
 */
export function seqRng(values: number[]): Rng {
  let i = 0
  return () => {
    const v = values[Math.min(i, values.length - 1)]
    i++
    return v
  }
}

/** Deterministic mulberry32 PRNG for sweeps. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function names(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `P${i + 1}`)
}

/** Build a config for a preset with N players (default recommended rules). */
export function presetConfig(presetId: PresetId, playerCount: number): GameConfig {
  const preset = presetById(presetId)
  return {
    presetId,
    rules: preset.rules(playerCount),
    playerNames: names(playerCount),
    packIds: ['pack1'],
  }
}

/** Build a config with a custom rule override. */
export function customConfig(playerCount: number, rules: Partial<RuleSet>): GameConfig {
  const base = presetById('woody-standard').rules(playerCount)
  return {
    presetId: 'woody-standard',
    rules: { ...base, ...rules },
    playerNames: names(playerCount),
    packIds: ['pack1'],
  }
}

export const PAIR = { id: 'pair1', packId: 'pack1', a: 'apple', b: 'pear' }
