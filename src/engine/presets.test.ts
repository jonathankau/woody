import { describe, expect, it } from 'vitest'
import { recommendedRoleCounts, recommendedRoleCountsWithBaiban, PRESETS, presetById } from './presets'
import { validateConfig } from './validate'
import { customConfig, names, presetConfig } from './testutils'
import type { GameConfig } from './types'

describe('recommendedRoleCounts', () => {
  it('assigns 1U/0B for 4-6 players', () => {
    for (const n of [4, 5, 6]) {
      expect(recommendedRoleCounts(n)).toEqual({ undercoverCount: 1, baibanCount: 0 })
    }
  })
  it('assigns 2U/1B for 7-9 players', () => {
    for (const n of [7, 8, 9]) {
      expect(recommendedRoleCounts(n)).toEqual({ undercoverCount: 2, baibanCount: 1 })
    }
  })
  it('assigns 3U/1B for 10-12 players', () => {
    for (const n of [10, 11, 12]) {
      expect(recommendedRoleCounts(n)).toEqual({ undercoverCount: 3, baibanCount: 1 })
    }
  })

  it('moves the Whiteboard slot to undercovers when Whiteboard is disabled', () => {
    expect(recommendedRoleCountsWithBaiban(8, 1)).toEqual({
      undercoverCount: 2,
      baibanCount: 1,
    })
    expect(recommendedRoleCountsWithBaiban(8, 0)).toEqual({
      undercoverCount: 3,
      baibanCount: 0,
    })
  })
})

describe('PRESETS', () => {
  it('exposes the three presets with stable ids', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['classic-wodi', 'woody-standard', 'mr-white'])
  })

  it('gives every preset concrete setup details', () => {
    for (const preset of PRESETS) {
      expect(preset.details.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('woody-standard: guess baiban, one-civilian, not infiltrators, PK', () => {
    const r = presetById('woody-standard').rules(8)
    expect(r.baibanRule).toBe('guess-on-elimination')
    expect(r.undercoverWinRule).toBe('one-civilian-left')
    expect(r.infiltratorsWinTogether).toBe(false)
    expect(r.tieRule).toBe('pk-revote')
  })

  it('classic-wodi: survive baiban, last-two-or-three, strict clues', () => {
    const r = presetById('classic-wodi').rules(8)
    expect(r.baibanRule).toBe('survive-after-undercovers')
    expect(r.undercoverWinRule).toBe('last-two-or-three')
    expect(r.strictClues).toBe(true)
  })

  it('mr-white: infiltrators win together, one-civilian', () => {
    const r = presetById('mr-white').rules(8)
    expect(r.infiltratorsWinTogether).toBe(true)
    expect(r.undercoverWinRule).toBe('one-civilian-left')
  })

  it('presets use recommended role counts', () => {
    for (const preset of PRESETS) {
      expect(preset.rules(5).undercoverCount).toBe(1)
      expect(preset.rules(5).baibanCount).toBe(0)
      expect(preset.rules(8).undercoverCount).toBe(2)
      expect(preset.rules(11).undercoverCount).toBe(3)
    }
  })
})

describe('validateConfig', () => {
  it('accepts a valid preset config', () => {
    expect(validateConfig(presetConfig('woody-standard', 8))).toEqual([])
  })

  it('rejects player count below 4', () => {
    const errors = validateConfig(customConfig(3, {}))
    expect(errors.join(' ')).toMatch(/between 4 and 12/)
  })

  it('rejects player count above 12', () => {
    const cfg: GameConfig = { ...customConfig(12, {}), playerNames: names(13) }
    const errors = validateConfig(cfg)
    expect(errors.join(' ')).toMatch(/between 4 and 12/)
  })

  it('rejects empty names', () => {
    const cfg = customConfig(5, {})
    cfg.playerNames = ['A', '', 'C', 'D', 'E']
    expect(validateConfig(cfg).join(' ')).toMatch(/non-empty name/)
  })

  it('rejects whitespace-only names as empty', () => {
    const cfg = customConfig(5, {})
    cfg.playerNames = ['A', '   ', 'C', 'D', 'E']
    expect(validateConfig(cfg).join(' ')).toMatch(/non-empty name/)
  })

  it('rejects duplicate names (case-insensitive)', () => {
    const cfg = customConfig(5, {})
    cfg.playerNames = ['Amy', 'amy', 'C', 'D', 'E']
    expect(validateConfig(cfg).join(' ')).toMatch(/unique/)
  })

  it('rejects too many undercovers (fewer than 2 civilians)', () => {
    const cfg = customConfig(4, { undercoverCount: 3, baibanCount: 0 })
    expect(validateConfig(cfg).join(' ')).toMatch(/fewer than 2 civilians/)
  })

  it('rejects undercoverCount < 1', () => {
    const cfg = customConfig(5, { undercoverCount: 0, baibanCount: 0 })
    expect(validateConfig(cfg).join(' ')).toMatch(/at least 1 undercover/)
  })

  it('requires at least 2 civilians with baiban present', () => {
    // 4 players, 1 undercover, 1 baiban -> 2 civilians: OK.
    expect(validateConfig(customConfig(4, { undercoverCount: 1, baibanCount: 1 }))).toEqual([])
    // 4 players, 2 undercover, 1 baiban -> 1 civilian: reject.
    expect(
      validateConfig(customConfig(4, { undercoverCount: 2, baibanCount: 1 })).join(' '),
    ).toMatch(/fewer than 2 civilians/)
  })

  it('rejects baibanCount other than 0 or 1', () => {
    const cfg = customConfig(6, {})
    ;(cfg.rules as unknown as { baibanCount: number }).baibanCount = 2
    expect(validateConfig(cfg).join(' ')).toMatch(/Whiteboard count must be 0 or 1/)
  })

  it('requires at least one word pack', () => {
    const cfg = customConfig(5, {})
    cfg.packIds = []
    expect(validateConfig(cfg).join(' ')).toMatch(/at least one word pack/)
  })
})
