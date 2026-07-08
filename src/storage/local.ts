/**
 * Thin, safe wrapper around localStorage plus the canonical key registry.
 * All persisted features go through these helpers so keys never collide.
 */

export const STORAGE_KEYS = {
  /** Serialized `SavedGame` envelope: `{ schemaVersion, state }`. */
  activeGame: 'woody:active-game',
  /** string[] of used word-pair ids (no-repeat history). */
  usedPairIds: 'woody:used-pair-ids',
  /** Serialized custom `WordPack[]`. */
  customPacks: 'woody:custom-packs',
  /** Last-used setup config (player names, preset, rules, pack selection). */
  setupDraft: 'woody:setup-draft',
} as const

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be full or unavailable (private mode); the game keeps
    // working in memory, it just won't survive a refresh.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
