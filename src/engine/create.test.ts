import { describe, expect, it } from 'vitest'
import { createGame } from './create'
import { startingSpeaker } from './helpers'
import { customConfig, PAIR, presetConfig, seededRng } from './testutils'
import type { GameState, Role } from './types'

function roleCounts(state: GameState): Record<Role, number> {
  const counts: Record<Role, number> = { civilian: 0, undercover: 0, baiban: 0 }
  for (const p of state.players) counts[p.role]++
  return counts
}

describe('createGame role assignment', () => {
  it('assigns exact role counts and deterministic ids', () => {
    const cfg = presetConfig('woody-standard', 8) // 2U, 1B, 5C
    const state = createGame(cfg, PAIR, seededRng(1))
    expect(roleCounts(state)).toEqual({ civilian: 5, undercover: 2, baiban: 1 })
    expect(state.players.map((p) => p.id)).toEqual([
      'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8',
    ])
    expect(state.players.map((p) => p.name)).toEqual(cfg.playerNames)
    expect(state.phase).toBe('reveal-pass')
    expect(state.revealIndex).toBe(0)
    expect(state.round).toBe(1)
  })

  it('civilians share one word, undercovers share the other, baiban null', () => {
    const cfg = presetConfig('woody-standard', 8)
    const state = createGame(cfg, PAIR, seededRng(7))
    const civWords = new Set(
      state.players.filter((p) => p.role === 'civilian').map((p) => p.word),
    )
    const uWords = new Set(
      state.players.filter((p) => p.role === 'undercover').map((p) => p.word),
    )
    expect(civWords.size).toBe(1)
    expect(uWords.size).toBe(1)
    expect([...civWords][0]).not.toBe([...uWords][0])
    expect(state.players.find((p) => p.role === 'baiban')!.word).toBeNull()
    // Pair sides are the two words.
    const both = new Set([...civWords, ...uWords])
    expect(both).toEqual(new Set([PAIR.a, PAIR.b]))
  })

  it('randomizes which pair side is civilian across seeds', () => {
    const cfg = presetConfig('woody-standard', 6)
    const civSides = new Set<string>()
    for (let seed = 0; seed < 40; seed++) {
      const state = createGame(cfg, PAIR, seededRng(seed))
      civSides.add(state.pair.civilianWord)
    }
    // Both sides should appear as the civilian word at least once.
    expect(civSides).toEqual(new Set([PAIR.a, PAIR.b]))
  })
})

describe('Baiban never starts the clue round', () => {
  it('random rule: starting speaker is never Baiban across seeds', () => {
    const cfg = presetConfig('woody-standard', 8) // has 1 baiban, random rule
    for (let seed = 0; seed < 60; seed++) {
      const state = createGame(cfg, PAIR, seededRng(seed))
      const first = state.players.find((p) => p.id === state.speakingOrder[0])!
      expect(first.role).not.toBe('baiban')
    }
  })

  it('rotate rule: starting speaker is never Baiban across seeds', () => {
    const cfg = customConfig(8, {
      undercoverCount: 2,
      baibanCount: 1,
      startingSpeakerRule: 'rotate',
    })
    for (let seed = 0; seed < 60; seed++) {
      const state = createGame(cfg, PAIR, seededRng(seed))
      const first = startingSpeaker(state)!
      expect(first.role).not.toBe('baiban')
    }
  })

  it('host-chooses rule: seeded starting speaker is never Baiban', () => {
    const cfg = customConfig(8, {
      undercoverCount: 2,
      baibanCount: 1,
      startingSpeakerRule: 'host-chooses',
    })
    for (let seed = 0; seed < 60; seed++) {
      const state = createGame(cfg, PAIR, seededRng(seed))
      expect(startingSpeaker(state)!.role).not.toBe('baiban')
    }
  })

  it('speaking order contains every alive player exactly once', () => {
    const cfg = presetConfig('woody-standard', 9)
    const state = createGame(cfg, PAIR, seededRng(3))
    expect(new Set(state.speakingOrder).size).toBe(9)
    expect(state.speakingOrder.length).toBe(9)
  })
})
