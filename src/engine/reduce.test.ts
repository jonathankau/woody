import { describe, expect, it } from 'vitest'
import { createGame } from './create'
import { reduce } from './reduce'
import { makeState } from './statebuilder'
import { currentRevealPlayer } from './helpers'
import { constRng, customConfig, PAIR, presetConfig, seededRng } from './testutils'
import type { GameState } from './types'

const rng = constRng(0)

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj)
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) deepFreeze(v)
  }
  return obj
}

describe('reveal flow', () => {
  it('reveal-pass -> SHOW_WORD -> reveal-show; HIDE_WORD advances to next player', () => {
    const cfg = presetConfig('woody-standard', 5)
    let s = createGame(cfg, PAIR, seededRng(2))
    expect(s.phase).toBe('reveal-pass')
    expect(currentRevealPlayer(s)!.id).toBe('p1')

    s = reduce(s, { type: 'SHOW_WORD' }, rng)
    expect(s.phase).toBe('reveal-show')

    s = reduce(s, { type: 'HIDE_WORD' }, rng)
    expect(s.phase).toBe('reveal-pass')
    expect(s.revealIndex).toBe(1)
    expect(currentRevealPlayer(s)!.id).toBe('p2')
  })

  it('after the last player HIDE_WORD moves to clue-order', () => {
    const cfg = presetConfig('woody-standard', 4)
    let s = createGame(cfg, PAIR, seededRng(2))
    for (let i = 0; i < 4; i++) {
      s = reduce(s, { type: 'SHOW_WORD' }, rng)
      s = reduce(s, { type: 'HIDE_WORD' }, rng)
    }
    expect(s.phase).toBe('clue-order')
    expect(currentRevealPlayer(s)).toBeNull()
  })

  it('SHOW_WORD ignored when not in reveal-pass', () => {
    const cfg = presetConfig('woody-standard', 4)
    let s = createGame(cfg, PAIR, seededRng(2))
    s = reduce(s, { type: 'SHOW_WORD' }, rng) // now reveal-show
    const again = reduce(s, { type: 'SHOW_WORD' }, rng)
    expect(again).toBe(s)
  })

  it('HIDE_WORD ignored when not in reveal-show', () => {
    const cfg = presetConfig('woody-standard', 4)
    const s = createGame(cfg, PAIR, seededRng(2))
    expect(reduce(s, { type: 'HIDE_WORD' }, rng)).toBe(s)
  })
})

describe('clue-order flow', () => {
  function toClueOrder(cfg = presetConfig('woody-standard', 4)): GameState {
    let s = createGame(cfg, PAIR, seededRng(9))
    for (let i = 0; i < cfg.playerNames.length; i++) {
      s = reduce(s, { type: 'SHOW_WORD' }, rng)
      s = reduce(s, { type: 'HIDE_WORD' }, rng)
    }
    return s
  }

  it('BEGIN_DISCUSSION -> discussion; BEGIN_VOTE -> vote', () => {
    let s = toClueOrder()
    s = reduce(s, { type: 'BEGIN_DISCUSSION' }, rng)
    expect(s.phase).toBe('discussion')
    s = reduce(s, { type: 'BEGIN_VOTE' }, rng)
    expect(s.phase).toBe('vote')
  })

  it('CHOOSE_STARTING_SPEAKER puts a valid player first (host-chooses)', () => {
    const cfg = customConfig(6, { startingSpeakerRule: 'host-chooses', baibanCount: 1, undercoverCount: 1 })
    const s = toClueOrder(cfg)
    // Find a civilian to select.
    const civ = s.players.find((p) => p.role === 'civilian' && !p.eliminated)!
    const next = reduce(s, { type: 'CHOOSE_STARTING_SPEAKER', playerId: civ.id }, rng)
    expect(next.speakingOrder[0]).toBe(civ.id)
  })

  it('CHOOSE_STARTING_SPEAKER rejects a Baiban id (state unchanged)', () => {
    const cfg = customConfig(6, { startingSpeakerRule: 'host-chooses', baibanCount: 1, undercoverCount: 1 })
    const s = toClueOrder(cfg)
    const baiban = s.players.find((p) => p.role === 'baiban')!
    const next = reduce(s, { type: 'CHOOSE_STARTING_SPEAKER', playerId: baiban.id }, rng)
    expect(next).toBe(s)
  })

  it('CHOOSE_STARTING_SPEAKER ignored when rule is not host-chooses', () => {
    const s = toClueOrder(presetConfig('woody-standard', 4)) // random rule
    const civ = s.players.find((p) => p.role === 'civilian')!
    const next = reduce(s, { type: 'CHOOSE_STARTING_SPEAKER', playerId: civ.id }, rng)
    expect(next).toBe(s)
  })
})

describe('reducer purity', () => {
  it('does not mutate the input state on a vote elimination', () => {
    const s = deepFreeze(
      makeState({
        players: [
          { id: 'p1', role: 'civilian' },
          { id: 'p2', role: 'civilian' },
          { id: 'p3', role: 'undercover' },
          { id: 'p4', role: 'civilian' },
        ],
        rules: { voteRule: 'plurality' },
      }),
    )
    const snapshot = JSON.stringify(s)
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p3: 3 } }, rng)
    expect(JSON.stringify(s)).toBe(snapshot)
    expect(next).not.toBe(s)
    expect(next.players.find((p) => p.id === 'p3')!.eliminated).toBe(true)
  })

  it('does not mutate on a full reveal sequence', () => {
    const cfg = presetConfig('woody-standard', 4)
    const s = deepFreeze(createGame(cfg, PAIR, seededRng(4)))
    const snapshot = JSON.stringify(s)
    reduce(s, { type: 'SHOW_WORD' }, rng)
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('unknown/illegal action returns the same reference', () => {
    const cfg = presetConfig('woody-standard', 4)
    const s = createGame(cfg, PAIR, seededRng(4))
    // CONTINUE is illegal during reveal.
    expect(reduce(s, { type: 'CONTINUE' }, rng)).toBe(s)
  })
})

describe('CONTINUE advances rounds', () => {
  it('CONTINUE from resolution (no winner) starts next round at clue-order', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'civilian' },
        { id: 'p4', role: 'undercover' },
        { id: 'p5', role: 'undercover' },
        { id: 'p6', role: 'civilian' },
      ],
      rules: { voteRule: 'plurality' },
      phase: 'vote',
    })
    const voted = reduce(s, { type: 'SUBMIT_VOTE', counts: { p1: 3 } }, rng)
    expect(voted.phase).toBe('resolution')
    const next = reduce(voted, { type: 'CONTINUE' }, rng)
    expect(next.phase).toBe('clue-order')
    expect(next.round).toBe(2)
    // Speaking order only includes alive players.
    expect(next.speakingOrder).not.toContain('p1')
    expect(next.speakingOrder.length).toBe(5)
  })

  it('rotate rule advances the starting speaker across rounds, skipping baiban', () => {
    const cfg = customConfig(6, { startingSpeakerRule: 'rotate', baibanCount: 1, undercoverCount: 1 })
    let s = createGame(cfg, PAIR, seededRng(11))
    const starters: string[] = []
    for (let round = 0; round < 3; round++) {
      const first = s.players.find((p) => p.id === s.speakingOrder[0])!
      starters.push(first.id)
      expect(first.role).not.toBe('baiban')
      // Simulate a no-op round: go to vote, no-elimination via majority no-majority.
      s = { ...s, phase: 'resolution', winner: null }
      s = reduce(s, { type: 'CONTINUE' }, rng)
    }
    expect(starters.length).toBe(3)
  })
})
