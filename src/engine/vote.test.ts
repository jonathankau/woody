import { describe, expect, it } from 'vitest'
import { reduce } from './reduce'
import { makeState } from './statebuilder'
import { constRng } from './testutils'

const rng = constRng(0)

/** A 5-player vote-phase game: 3 civilians, 2 undercovers, no baiban. */
function fiveWay(rules = {}) {
  return makeState({
    players: [
      { id: 'p1', role: 'civilian' },
      { id: 'p2', role: 'civilian' },
      { id: 'p3', role: 'civilian' },
      { id: 'p4', role: 'undercover' },
      { id: 'p5', role: 'undercover' },
    ],
    rules,
  })
}

describe('plurality vote rule', () => {
  it('unique max eliminates that player', () => {
    const s = fiveWay({ voteRule: 'plurality' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 3, p1: 1, p2: 1 } }, rng)
    expect(next.lastElimination?.playerId).toBe('p4')
    expect(next.lastVoteOutcome).toBe('eliminated')
    expect(next.players.find((p) => p.id === 'p4')!.eliminated).toBe(true)
  })

  it('tie -> tie rule (pk-revote) records tie and restricts candidates', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'pk-revote' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    expect(next.phase).toBe('vote')
    expect(next.pkCandidateIds).toEqual(['p4', 'p5'])
    expect(next.votes.at(-1)!.outcome).toBe('tie')
    expect(next.lastVoteOutcome).toBe('tie')
  })

  it('all-zero tally is a full tie among candidates', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'pk-revote' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: {} }, rng)
    expect(next.pkCandidateIds).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(next.votes.at(-1)!.outcome).toBe('tie')
  })

  it('ignores votes for dead/non-candidate ids', () => {
    const s = fiveWay({ voteRule: 'plurality' })
    // 'zz' is not a candidate; should be ignored, p4 still wins the plurality.
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, zz: 99 } }, rng)
    expect(next.lastElimination?.playerId).toBe('p4')
    expect(next.votes.at(-1)!.counts.zz).toBeUndefined()
  })
})

describe('majority vote rule', () => {
  it('strict majority of alive players eliminates', () => {
    // 5 alive, threshold floor(5/2)=2, need > 2 (>=3).
    const s = fiveWay({ voteRule: 'majority' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 3, p1: 2 } }, rng)
    expect(next.lastElimination?.playerId).toBe('p4')
    expect(next.lastVoteOutcome).toBe('eliminated')
  })

  it('plurality without majority -> no-majority, nobody out', () => {
    const s = fiveWay({ voteRule: 'majority' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p1: 1, p2: 1 } }, rng)
    expect(next.phase).toBe('resolution')
    expect(next.lastElimination).toBeNull()
    expect(next.lastVoteOutcome).toBe('no-majority')
    expect(next.votes.at(-1)!.outcome).toBe('no-majority')
  })

  it('tie under majority -> no-majority, nobody out', () => {
    const s = fiveWay({ voteRule: 'majority' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    expect(next.lastVoteOutcome).toBe('no-majority')
    expect(next.lastElimination).toBeNull()
  })
})

describe('host-decides vote rule', () => {
  it('HOST_ELIMINATE with an id eliminates that player', () => {
    const s = fiveWay({ voteRule: 'host-decides' })
    const next = reduce(s, { type: 'HOST_ELIMINATE', playerId: 'p5' }, rng)
    expect(next.lastElimination?.playerId).toBe('p5')
    expect(next.lastVoteOutcome).toBe('host-decided')
  })

  it('HOST_ELIMINATE records the result under counted vote rules too', () => {
    const s = fiveWay({ voteRule: 'plurality' })
    const next = reduce(s, { type: 'HOST_ELIMINATE', playerId: 'p5' }, rng)
    expect(next.lastElimination?.playerId).toBe('p5')
    expect(next.lastVoteOutcome).toBe('host-decided')
  })

  it('HOST_ELIMINATE null eliminates nobody', () => {
    const s = fiveWay({ voteRule: 'host-decides' })
    const next = reduce(s, { type: 'HOST_ELIMINATE', playerId: null }, rng)
    expect(next.phase).toBe('resolution')
    expect(next.lastElimination).toBeNull()
    expect(next.lastVoteOutcome).toBe('host-decided')
  })

  it('SUBMIT_VOTE is ignored under host-decides (no PK active)', () => {
    const s = fiveWay({ voteRule: 'host-decides' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 5 } }, rng)
    expect(next).toBe(s)
  })

  it('HOST_ELIMINATE with an invalid id is ignored', () => {
    const s = fiveWay({ voteRule: 'host-decides' })
    const next = reduce(s, { type: 'HOST_ELIMINATE', playerId: 'zz' }, rng)
    expect(next).toBe(s)
  })
})

describe('tie rules', () => {
  it('pk-revote: PK vote among tied candidates eliminates the loser', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'pk-revote' })
    const tied = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    expect(tied.pkCandidateIds).toEqual(['p4', 'p5'])
    // PK: p4 gets more, p4 eliminated.
    const done = reduce(tied, { type: 'SUBMIT_VOTE', counts: { p4: 3, p5: 1 } }, rng)
    expect(done.lastElimination?.playerId).toBe('p4')
    expect(done.pkCandidateIds).toBeNull()
  })

  it('pk-revote: a SECOND tie during PK -> no elimination', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'pk-revote' })
    const tied = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    const second = reduce(tied, { type: 'SUBMIT_VOTE', counts: { p4: 1, p5: 1 } }, rng)
    expect(second.phase).toBe('resolution')
    expect(second.lastElimination).toBeNull()
    expect(second.lastVoteOutcome).toBe('no-elimination')
    expect(second.pkCandidateIds).toBeNull()
  })

  it('pk-revote restricts candidates: votes for non-tied ids are ignored', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'pk-revote' })
    const tied = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    // p1 is not a PK candidate; ignored. p5 wins the PK.
    const done = reduce(tied, { type: 'SUBMIT_VOTE', counts: { p5: 2, p4: 1, p1: 9 } }, rng)
    expect(done.lastElimination?.playerId).toBe('p5')
    expect(done.votes.at(-1)!.counts.p1).toBeUndefined()
  })

  it('no-elimination tie rule -> nobody out immediately', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'no-elimination' })
    const next = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    expect(next.phase).toBe('resolution')
    expect(next.lastElimination).toBeNull()
    expect(next.lastVoteOutcome).toBe('no-elimination')
  })

  it('host-decides tie rule: stay on vote with tied candidates, host eliminates', () => {
    const s = fiveWay({ voteRule: 'plurality', tieRule: 'host-decides' })
    const tied = reduce(s, { type: 'SUBMIT_VOTE', counts: { p4: 2, p5: 2 } }, rng)
    expect(tied.phase).toBe('vote')
    expect(tied.pkCandidateIds).toEqual(['p4', 'p5'])
    expect(tied.votes.at(-1)!.outcome).toBe('tie')
    const done = reduce(tied, { type: 'HOST_ELIMINATE', playerId: 'p4' }, rng)
    expect(done.lastElimination?.playerId).toBe('p4')
  })
})

describe('illegal actions return state unchanged', () => {
  it('SUBMIT_VOTE ignored outside vote phase', () => {
    const s = makeState({
      players: [
        { id: 'p1', role: 'civilian' },
        { id: 'p2', role: 'civilian' },
        { id: 'p3', role: 'undercover' },
        { id: 'p4', role: 'civilian' },
      ],
      phase: 'discussion',
    })
    expect(reduce(s, { type: 'SUBMIT_VOTE', counts: {} }, rng)).toBe(s)
  })
})
