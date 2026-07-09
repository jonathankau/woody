import { describe, expect, it } from 'vitest'
import { checkWinner } from './win'
import { reduce } from './reduce'
import { makeState } from './statebuilder'
import { constRng } from './testutils'
import type { Role } from './types'

const rng = constRng(0)

function state(specs: Array<{ id: string; role: Role; eliminated?: boolean }>, rules = {}) {
  return makeState({ players: specs, rules, phase: 'resolution' })
}

describe('Woody Standard win conditions', () => {
  const rules = {
    baibanRule: 'guess-on-elimination' as const,
    undercoverWinRule: 'one-civilian-left' as const,
    infiltratorsWinTogether: false,
    baibanCount: 1 as const,
  }

  it('undercovers win at 1 civilian with an alive undercover', () => {
    const s = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban', eliminated: true },
      ],
      rules,
    )
    expect(checkWinner(s)).toBe('undercovers')
  })

  it('civilians win only when undercovers AND baiban all out', () => {
    // undercover out but baiban alive -> no civilian win yet.
    const partial = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover', eliminated: true },
        { id: 'p4', role: 'baiban' },
      ],
      rules,
    )
    expect(checkWinner(partial)).toBeNull()

    // both out -> civilians win.
    const full = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover', eliminated: true },
        { id: 'p4', role: 'baiban', eliminated: true },
      ],
      rules,
    )
    expect(checkWinner(full)).toBe('civilians')
  })
})

describe('Classic Wo Di win conditions', () => {
  const rules = {
    baibanRule: 'survive-after-undercovers' as const,
    undercoverWinRule: 'last-two-or-three' as const,
    infiltratorsWinTogether: false,
    baibanCount: 1 as const,
  }

  it('baiban wins immediately when last undercover eliminated while baiban alive', () => {
    const s = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover', eliminated: true },
        { id: 'p4', role: 'baiban' },
      ],
      rules,
    )
    expect(checkWinner(s)).toBe('baiban')
  })

  it('undercover does not win at last 3 for 6 starting players', () => {
    // 6 starting players, reduced to 3 alive with an undercover present.
    // Classic source-aligned threshold is last 2 until 7 players.
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'civilian', eliminated: true },
        { id: 'p4', role: 'civilian' },
        { id: 'p5', role: 'undercover' },
        { id: 'p6', role: 'civilian', eliminated: true },
      ],
      rules: { ...rules, baibanCount: 0 },
      phase: 'resolution',
    })
    expect(checkWinner(s)).toBeNull()
  })

  it('undercover wins at last 3 for 7+ starting players', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'civilian', eliminated: true },
        { id: 'p4', role: 'civilian' },
        { id: 'p5', role: 'undercover' },
        { id: 'p6', role: 'civilian', eliminated: true },
        { id: 'p7', role: 'civilian', eliminated: true },
      ],
      rules: { ...rules, baibanCount: 0 },
      phase: 'resolution',
    })
    expect(checkWinner(s)).toBe('undercovers')
  })

  it('undercover wins at last 2 for fewer than 7 starting players', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'civilian', eliminated: true },
        { id: 'p4', role: 'undercover' },
      ],
      rules: { ...rules, baibanCount: 0 },
      phase: 'resolution',
    })
    // 4 starting -> threshold 2, 2 alive -> undercover win.
    expect(checkWinner(s)).toBe('undercovers')
  })
})

describe('Whiteboard / infiltrators win conditions', () => {
  const rules = {
    baibanRule: 'guess-on-elimination' as const,
    undercoverWinRule: 'one-civilian-left' as const,
    infiltratorsWinTogether: true,
    baibanCount: 1 as const,
  }

  it('infiltrators win at 1 civilian; label is infiltrators', () => {
    const s = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban', eliminated: true },
      ],
      rules,
    )
    expect(checkWinner(s)).toBe('infiltrators')
  })

  it('an alive baiban alone satisfies the infiltrator win', () => {
    const s = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'undercover', eliminated: true },
        { id: 'p4', role: 'baiban' },
      ],
      rules,
    )
    expect(checkWinner(s)).toBe('infiltrators')
  })
})

describe('parity-plus-one rule', () => {
  it('undercovers win when alive civilians <= alive undercovers + 1', () => {
    // 2 civilians, 1 undercover: 2 <= 1+1 -> win.
    const s = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'civilian', eliminated: true },
      ],
      { undercoverWinRule: 'parity-plus-one', baibanCount: 0, infiltratorsWinTogether: false },
    )
    expect(checkWinner(s)).toBe('undercovers')
  })

  it('no win when civilians exceed undercovers + 1', () => {
    // 3 civilians, 1 undercover: 3 > 2 -> no win.
    const s = state(
      [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'civilian' },
        { id: 'p4', role: 'undercover' },
      ],
      { undercoverWinRule: 'parity-plus-one', baibanCount: 0, infiltratorsWinTogether: false },
    )
    expect(checkWinner(s)).toBeNull()
  })
})

describe('baiban guess flow', () => {
  it('eliminating baiban under guess-on-elimination -> baiban-guess phase', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban' },
      ],
      rules: { voteRule: 'plurality', baibanRule: 'guess-on-elimination', baibanCount: 1 },
      phase: 'vote',
    })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 3 } }, rng)
    expect(next.phase).toBe('baiban-guess')
    expect(next.pendingBaibanGuessPlayerId).toBe('p4')
  })

  it('RESOLVE_BAIBAN_GUESS correct -> baiban winner + results', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban', eliminated: true },
      ],
      rules: { baibanRule: 'guess-on-elimination', baibanCount: 1 },
      phase: 'baiban-guess',
      pendingBaibanGuessPlayerId: 'p4',
    })
    const next = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: true }, rng)
    expect(next.winner).toBe('baiban')
    expect(next.phase).toBe('results')
    expect(next.pendingBaibanGuessPlayerId).toBeNull()
  })

  it('RESOLVE_BAIBAN_GUESS incorrect -> game continues via win check', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban', eliminated: true },
      ],
      rules: { baibanRule: 'guess-on-elimination', baibanCount: 1, undercoverWinRule: 'one-civilian-left' },
      phase: 'baiban-guess',
      pendingBaibanGuessPlayerId: 'p4',
    })
    const next = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: false }, rng)
    // 2 civilians, 1 undercover still alive -> no winner, resolution.
    expect(next.winner).toBeNull()
    expect(next.phase).toBe('resolution')
  })

  it('incorrect guess can still end game if win check triggers', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian', eliminated: true },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban', eliminated: true },
      ],
      rules: { baibanRule: 'guess-on-elimination', baibanCount: 1, undercoverWinRule: 'one-civilian-left' },
      phase: 'baiban-guess',
      pendingBaibanGuessPlayerId: 'p4',
    })
    const next = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: false }, rng)
    // 1 civilian, undercover alive -> undercover win.
    expect(next.winner).toBe('undercovers')
    expect(next.phase).toBe('results')
  })

  it('survive-after-undercovers: eliminating baiban does NOT trigger a guess', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'baiban' },
      ],
      rules: { voteRule: 'plurality', baibanRule: 'survive-after-undercovers', baibanCount: 1 },
      phase: 'vote',
    })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 3 } }, rng)
    expect(next.phase).not.toBe('baiban-guess')
    expect(next.pendingBaibanGuessPlayerId).toBeNull()
  })
})
