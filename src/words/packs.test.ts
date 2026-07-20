import { describe, it, expect } from 'vitest'
import { builtinPacks } from './packs'
import { auditWordPack } from './audit'

describe('built-in pack data integrity', () => {
  it('has exactly 6 packs', () => {
    expect(builtinPacks).toHaveLength(6)
  })

  it('has the expected pack ids', () => {
    expect(builtinPacks.map((p) => p.id)).toEqual([
      'general-mix',
      'asian-american',
      'internet',
      'work-school',
      'pop-culture',
      'food-going-out',
    ])
  })

  it('has exactly 250 pairs per pack', () => {
    for (const pack of builtinPacks) {
      expect(pack.pairs).toHaveLength(250)
    }
  })

  it('has at least 1500 pairs total', () => {
    const total = builtinPacks.reduce((sum, p) => sum + p.pairs.length, 0)
    expect(total).toBeGreaterThanOrEqual(1500)
  })

  it('gives every pack a name and description', () => {
    for (const pack of builtinPacks) {
      expect(pack.name.length).toBeGreaterThan(0)
      expect(pack.description.length).toBeGreaterThan(0)
      expect(pack.builtIn).toBe(true)
    }
  })

  it('has unique pair ids across all packs', () => {
    const ids = builtinPacks.flatMap((p) => p.pairs.map((pair) => pair.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has pair ids prefixed by their pack id', () => {
    for (const pack of builtinPacks) {
      for (const pair of pack.pairs) {
        expect(pair.id.startsWith(`${pack.id}-`)).toBe(true)
      }
    }
  })

  it('has non-empty, distinct a/b for every pair with 1-3 tags', () => {
    for (const pack of builtinPacks) {
      for (const pair of pack.pairs) {
        expect(pair.a.trim().length).toBeGreaterThan(0)
        expect(pair.b.trim().length).toBeGreaterThan(0)
        expect(pair.a.toLowerCase()).not.toBe(pair.b.toLowerCase())
        expect(pair.tags.length).toBeGreaterThanOrEqual(1)
        expect(pair.tags.length).toBeLessThanOrEqual(3)
        for (const tag of pair.tags) {
          expect(tag).toBe(tag.toLowerCase())
        }
      }
    }
  })

  it('does not duplicate the same word combination across packs', () => {
    const combos = new Set<string>()
    for (const pack of builtinPacks) {
      for (const pair of pack.pairs) {
        const key = [pair.a.toLowerCase(), pair.b.toLowerCase()].sort().join('||')
        expect(combos.has(key), `${pack.id} duplicates ${pair.a} / ${pair.b}`).toBe(false)
        combos.add(key)
      }
    }
  })

  it('has no automatic prompt quality issues or warnings', () => {
    const issues = builtinPacks.flatMap(auditWordPack)
    expect(issues).toEqual([])
  })

  it('does not reintroduce rejected pair patterns', () => {
    const rejectedPairs = new Set([
      'hash browns||yogurt parfait',
      'lighthouse||water tower',
      'raincheck||rsvp',
    ])
    const rejectedTerms = new Set([
      'chronological feed',
      'grocery run',
      'padlock',
      'recommended feed',
      'splash pad',
      'trailhead',
      'upright piano',
    ])

    for (const pack of builtinPacks) {
      for (const pair of pack.pairs) {
        const terms = [pair.a.toLowerCase(), pair.b.toLowerCase()]
        const key = [...terms].sort().join('||')
        expect(rejectedPairs.has(key), `${pack.id} contains rejected pair ${pair.a} / ${pair.b}`).toBe(
          false,
        )
        expect(
          terms.some((term) => rejectedTerms.has(term)),
          `${pack.id} contains rejected term in ${pair.a} / ${pair.b}`,
        ).toBe(false)
      }
    }
  })
})
