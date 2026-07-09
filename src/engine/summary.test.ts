import { describe, expect, it } from 'vitest'
import { ruleSummary, winChart } from './summary'
import { customConfig, presetConfig } from './testutils'
import { presetById } from './presets'

describe('ruleSummary', () => {
  it('matches the spec example for a 7-player Woody Standard game', () => {
    // 7 players -> 2 undercovers, 1 Whiteboard, guess-on-elimination.
    const cfg = presetConfig('woody-standard', 7)
    expect(ruleSummary(cfg)).toBe(
      '7 players · 2 undercovers · 1 Whiteboard · undercover wins at 1 civilian · Whiteboard guesses if eliminated',
    )
  })

  it('omits the Whiteboard segment when there is no Whiteboard', () => {
    const cfg = presetConfig('woody-standard', 5) // 1U, 0B
    const s = ruleSummary(cfg)
    expect(s).toContain('5 players')
    expect(s).toContain('1 undercover')
    expect(s).not.toContain('Whiteboard')
  })

  it('describes infiltrators for the Whiteboard preset', () => {
    const cfg = presetConfig('mr-white', 8)
    expect(ruleSummary(cfg)).toContain('infiltrators win at 1 civilian')
  })

  it('describes last-N threshold and survive rule for Classic Wo Di', () => {
    const cfg = presetConfig('classic-wodi', 8)
    const s = ruleSummary(cfg)
    expect(s).toContain('undercover wins at last 3')
    expect(s).toContain('Whiteboard wins if it outlasts undercovers')
  })

  it('uses last 2 for 6-player Classic Wo Di', () => {
    const cfg = presetConfig('classic-wodi', 6)
    expect(ruleSummary(cfg)).toContain('undercover wins at last 2')
  })

  it('describes parity threshold', () => {
    const cfg = customConfig(6, {
      undercoverWinRule: 'parity-plus-one',
      baibanCount: 0,
    })
    const s = ruleSummary(cfg)
    expect(s).toContain('civilians = undercovers + 1')
    expect(s).not.toContain('tie')
  })
})

describe('winChart', () => {
  it('generates rows from the rule table (Woody Standard)', () => {
    const rules = presetById('woody-standard').rules(8)
    const rows = winChart(rules)
    const teams = rows.map((r) => r.team)
    expect(teams).toContain('Undercovers')
    expect(teams).toContain('Civilians')
    expect(teams).toContain('Whiteboard')
    const civ = rows.find((r) => r.team === 'Civilians')!
    expect(civ.how).toMatch(/undercover and the Whiteboard/)
  })

  it('uses Infiltrators row when infiltratorsWinTogether', () => {
    const rules = presetById('mr-white').rules(8)
    const rows = winChart(rules)
    expect(rows.map((r) => r.team)).toContain('Infiltrators')
    // Civilian goal is just to eliminate undercovers (Whiteboard is an infiltrator).
    const civ = rows.find((r) => r.team === 'Civilians')!
    expect(civ.how).toBe('Eliminate every undercover.')
  })

  it('Classic Wo Di: Whiteboard survives-to-win row', () => {
    const rules = presetById('classic-wodi').rules(8)
    const rows = winChart(rules)
    const whiteboard = rows.find((r) => r.team === 'Whiteboard')!
    expect(whiteboard.how).toMatch(/last undercover is eliminated/)
  })

  it('omits Whiteboard row when baibanCount is 0', () => {
    const rules = { ...presetById('woody-standard').rules(5) } // 0 baiban
    const rows = winChart(rules)
    expect(rows.map((r) => r.team)).not.toContain('Whiteboard')
  })
})
