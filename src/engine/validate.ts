import type { GameConfig } from './types'

export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 12

/**
 * Validate a game config before starting. Returns a list of human-readable
 * error strings; an empty array means the config is valid.
 *
 * Checks:
 *  - player count within [4, 12]
 *  - every name non-empty (after trim) and unique (case-insensitive)
 *  - at least one word pack selected
 *  - undercoverCount >= 1
 *  - baibanCount is 0 or 1
 *  - roles leave at least 2 civilians
 */
export function validateConfig(config: GameConfig): string[] {
  const errors: string[] = []
  const names = config.playerNames
  const count = names.length

  if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
    errors.push(`Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS} (got ${count}).`)
  }

  const trimmed = names.map((n) => n.trim())
  if (trimmed.some((n) => n.length === 0)) {
    errors.push('Every player must have a non-empty name.')
  }

  const seen = new Set<string>()
  let hasDuplicate = false
  for (const n of trimmed) {
    if (n.length === 0) continue
    const key = n.toLowerCase()
    if (seen.has(key)) {
      hasDuplicate = true
      break
    }
    seen.add(key)
  }
  if (hasDuplicate) {
    errors.push('Player names must be unique.')
  }

  if (config.packIds.length === 0) {
    errors.push('Select at least one word pack.')
  }

  const { undercoverCount, baibanCount } = config.rules

  if (undercoverCount < 1) {
    errors.push('There must be at least 1 undercover.')
  }

  if (baibanCount !== 0 && baibanCount !== 1) {
    errors.push('Baiban count must be 0 or 1.')
  }

  const safeUndercover = Math.max(0, undercoverCount)
  const safeBaiban = baibanCount === 1 ? 1 : 0
  const civilians = count - safeUndercover - safeBaiban
  if (civilians < 2) {
    errors.push('Roles leave fewer than 2 civilians; reduce undercovers or Baiban.')
  }

  return errors
}
