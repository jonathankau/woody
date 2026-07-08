import { describe, expect, it } from 'vitest'
import { createGame } from './create'
import { reduce } from './reduce'
import { alivePlayers } from './helpers'
import { constRng, presetConfig, seededRng, PAIR } from './testutils'
import type { GameState, Role } from './types'

const rng = constRng(0)

/** Run the reveal phase for every player. */
function doReveal(s: GameState): GameState {
  while (s.phase === 'reveal-pass' || s.phase === 'reveal-show') {
    if (s.phase === 'reveal-pass') s = reduce(s, { type: 'SHOW_WORD' }, rng)
    else s = reduce(s, { type: 'HIDE_WORD' }, rng)
  }
  return s
}

/** From clue-order, walk to the vote phase. */
function toVote(s: GameState): GameState {
  s = reduce(s, { type: 'BEGIN_DISCUSSION' }, rng)
  s = reduce(s, { type: 'BEGIN_VOTE' }, rng)
  return s
}

/** Vote out a specific alive player via a unanimous plurality tally. */
function voteOut(s: GameState, targetId: string): GameState {
  const counts: Record<string, number> = { [targetId]: alivePlayers(s).length }
  return reduce(s, { type: 'SUBMIT_VOTE', counts }, rng)
}

/** The first alive player with the given role, or null. */
function firstAlive(s: GameState, role: Role): GameState['players'][number] | null {
  return alivePlayers(s).find((p) => p.role === role) ?? null
}

describe('full game: Woody Standard -> civilians win', () => {
  it('civilians eliminate every undercover and the baiban', () => {
    const cfg = presetConfig('woody-standard', 7) // 2U, 1B, 4C
    let s = createGame(cfg, PAIR, seededRng(21))
    s = doReveal(s)
    expect(s.phase).toBe('clue-order')

    let guard = 0
    while (!s.winner && guard++ < 20) {
      s = toVote(s)
      // Prefer to eliminate an undercover, else the baiban, else a civilian.
      const target = firstAlive(s, 'undercover') ?? firstAlive(s, 'baiban') ?? firstAlive(s, 'civilian')!
      s = voteOut(s, target.id)
      // If baiban was eliminated and must guess, adjudicate incorrect.
      if (s.phase === 'baiban-guess') {
        s = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: false }, rng)
      }
      if (s.phase === 'resolution') s = reduce(s, { type: 'CONTINUE' }, rng)
    }
    expect(s.winner).toBe('civilians')
    expect(s.phase).toBe('results')
  })
})

describe('full game: Woody Standard -> undercovers win', () => {
  it('undercovers reach 1 civilian while alive', () => {
    const cfg = presetConfig('woody-standard', 5) // 1U, 0B, 4C
    let s = createGame(cfg, PAIR, seededRng(5))
    s = doReveal(s)
    let guard = 0
    while (!s.winner && guard++ < 20) {
      s = toVote(s)
      // Always eliminate a civilian to help the undercover win.
      const civ = firstAlive(s, 'civilian')
      const target = civ ?? firstAlive(s, 'undercover')!
      s = voteOut(s, target.id)
      if (s.phase === 'baiban-guess') s = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: false }, rng)
      if (s.phase === 'resolution') s = reduce(s, { type: 'CONTINUE' }, rng)
    }
    expect(s.winner).toBe('undercovers')
  })
})

describe('full game: Classic Wo Di -> baiban survival win', () => {
  it('baiban wins when the last undercover is eliminated while alive', () => {
    const cfg = presetConfig('classic-wodi', 7) // survive-after-undercovers
    let s = createGame(cfg, PAIR, seededRng(33))
    s = doReveal(s)
    let guard = 0
    while (!s.winner && guard++ < 20) {
      s = toVote(s)
      // Eliminate undercovers first; never target the baiban.
      const u = firstAlive(s, 'undercover')
      const target = u ?? firstAlive(s, 'civilian')!
      s = voteOut(s, target.id)
      if (s.phase === 'baiban-guess') s = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: false }, rng)
      if (s.phase === 'resolution') s = reduce(s, { type: 'CONTINUE' }, rng)
    }
    // With survive-after-undercovers, clearing undercovers hands baiban the win.
    expect(s.winner).toBe('baiban')
  })
})

describe('full game: Mr. White -> baiban guess win', () => {
  it('a correct baiban guess ends the game as a baiban win', () => {
    const cfg = presetConfig('mr-white', 7)
    let s = createGame(cfg, PAIR, seededRng(14))
    s = doReveal(s)
    let guard = 0
    let ended = false
    while (!s.winner && guard++ < 20) {
      s = toVote(s)
      // Target the baiban to trigger the guess.
      const baiban = firstAlive(s, 'baiban')
      const target = baiban ?? firstAlive(s, 'undercover') ?? firstAlive(s, 'civilian')!
      s = voteOut(s, target.id)
      if (s.phase === 'baiban-guess') {
        s = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: true }, rng)
        ended = true
        break
      }
      if (s.phase === 'resolution') s = reduce(s, { type: 'CONTINUE' }, rng)
    }
    expect(ended).toBe(true)
    expect(s.winner).toBe('baiban')
    expect(s.phase).toBe('results')
  })

  it('mr-white infiltrators win at 1 civilian', () => {
    const cfg = presetConfig('mr-white', 5) // 1U, 0B in mr-white
    let s = createGame(cfg, PAIR, seededRng(2))
    s = doReveal(s)
    let guard = 0
    while (!s.winner && guard++ < 20) {
      s = toVote(s)
      const civ = firstAlive(s, 'civilian')
      const target = civ ?? firstAlive(s, 'undercover')!
      s = voteOut(s, target.id)
      if (s.phase === 'baiban-guess') s = reduce(s, { type: 'RESOLVE_BAIBAN_GUESS', correct: false }, rng)
      if (s.phase === 'resolution') s = reduce(s, { type: 'CONTINUE' }, rng)
    }
    expect(s.winner).toBe('infiltrators')
  })
})

describe('no-elimination flows straight to resolution then next round', () => {
  it('majority no-majority -> resolution with null elimination -> CONTINUE next round', () => {
    const cfg = presetConfig('woody-standard', 6)
    let s = createGame(cfg, PAIR, seededRng(8))
    s = doReveal(s)
    s = toVote(s)
    // Spread votes so no majority: everyone gets 1.
    const alive = alivePlayers(s)
    const counts: Record<string, number> = {}
    for (const p of alive) counts[p.id] = 1
    s = reduce({ ...s, config: { ...s.config, rules: { ...s.config.rules, voteRule: 'majority' } } }, { type: 'SUBMIT_VOTE', counts }, rng)
    expect(s.phase).toBe('resolution')
    expect(s.lastElimination).toBeNull()
    expect(s.lastVoteOutcome).toBe('no-majority')
    s = reduce(s, { type: 'CONTINUE' }, rng)
    expect(s.phase).toBe('clue-order')
    expect(s.round).toBe(2)
  })
})
