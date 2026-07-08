import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateCustomPack,
  exportPackToJSON,
  loadCustomPacks,
  saveCustomPack,
  deleteCustomPack,
  allPacks,
  getUsedPairIds,
  markPairUsed,
  resetUsedPairs,
  choosePair,
  builtinPacks,
} from './index'
import type { WordPack } from './types'

beforeEach(() => {
  localStorage.clear()
})

/** Deterministic rng cycling through a fixed list of values in [0, 1). */
function stubRng(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i % values.length]
    i++
    return v
  }
}

const goodJSON = JSON.stringify({
  version: 1,
  name: 'My Pack',
  pairs: [
    { a: 'cat', b: 'dog', tags: ['animals'] },
    { a: 'tea', b: 'coffee' },
  ],
})

describe('validateCustomPack — accept', () => {
  it('accepts a valid pack and generates ids', () => {
    const result = validateCustomPack(goodJSON)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pack.id).toBe('custom-my-pack')
    expect(result.pack.name).toBe('My Pack')
    expect(result.pack.builtIn).toBe(false)
    expect(result.pack.pairs).toHaveLength(2)
    expect(result.pack.pairs[0].id).toBe('custom-my-pack-001')
    expect(result.pack.pairs[1].id).toBe('custom-my-pack-002')
    expect(result.pack.pairs[1].tags).toEqual([])
  })

  it('accepts an already-parsed object', () => {
    const result = validateCustomPack({
      version: 1,
      name: 'Obj Pack',
      pairs: [{ a: 'x', b: 'y' }],
    })
    expect(result.ok).toBe(true)
  })

  it('dedupes generated pack ids against existing custom packs', () => {
    const first = validateCustomPack(goodJSON)
    expect(first.ok).toBe(true)
    if (first.ok) saveCustomPack(first.pack)

    const second = validateCustomPack(goodJSON)
    expect(second.ok).toBe(true)
    if (second.ok) expect(second.pack.id).toBe('custom-my-pack-2')
  })
})

describe('validateCustomPack — errors', () => {
  it('reports invalid JSON', () => {
    const r = validateCustomPack('{ not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('Pack JSON is not valid JSON.')
  })

  it('rejects non-object roots', () => {
    const r = validateCustomPack('[]')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/must be a JSON object/)
  })

  it('requires version 1', () => {
    const r = validateCustomPack({ version: 2, name: 'x', pairs: [{ a: 'a', b: 'b' }] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('version must be 1.')
  })

  it('requires a non-empty name', () => {
    const r = validateCustomPack({ version: 1, name: '   ', pairs: [{ a: 'a', b: 'b' }] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('name is required'))).toBe(true)
  })

  it('requires pairs to be an array', () => {
    const r = validateCustomPack({ version: 1, name: 'x', pairs: 'nope' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('pairs must be an array.')
  })

  it('requires at least 1 pair', () => {
    const r = validateCustomPack({ version: 1, name: 'x', pairs: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('pairs must have at least 1 entry.')
  })

  it('rejects more than 500 pairs', () => {
    const pairs = Array.from({ length: 501 }, (_, i) => ({ a: `a${i}`, b: `b${i}` }))
    const r = validateCustomPack({ version: 1, name: 'x', pairs })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('pairs must have at most 500 entries.')
  })

  it('reports a non-empty string requirement for "a" with the pair number', () => {
    const r = validateCustomPack({
      version: 1,
      name: 'x',
      pairs: [{ a: 'ok', b: 'ok2' }, { a: 'ok', b: 'ok2' }, { a: '', b: 'b' }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('Pair 3: "a" must be a non-empty string.')
  })

  it('reports a non-empty string requirement for "b"', () => {
    const r = validateCustomPack({ version: 1, name: 'x', pairs: [{ a: 'a', b: 42 }] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('Pair 1: "b" must be a non-empty string.')
  })

  it('rejects a === b', () => {
    const r = validateCustomPack({ version: 1, name: 'x', pairs: [{ a: 'Same', b: 'same' }] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('Pair 1: "a" and "b" must be different.')
  })

  it('rejects non-string tags', () => {
    const r = validateCustomPack({
      version: 1,
      name: 'x',
      pairs: [{ a: 'a', b: 'b', tags: ['ok', 3] }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('Pair 1: tags must be an array of strings.')
  })

  it('rejects a non-object pair entry', () => {
    const r = validateCustomPack({ version: 1, name: 'x', pairs: ['nope'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('Pair 1: must be an object.')
  })
})

describe('exportPackToJSON round-trip', () => {
  it('exports the spec schema and re-imports identically', () => {
    const built = validateCustomPack(goodJSON)
    expect(built.ok).toBe(true)
    if (!built.ok) return

    const json = exportPackToJSON(built.pack)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.name).toBe('My Pack')
    expect(parsed.pairs).toEqual([
      { a: 'cat', b: 'dog', tags: ['animals'] },
      { a: 'tea', b: 'coffee', tags: [] },
    ])

    const reimported = validateCustomPack(json)
    expect(reimported.ok).toBe(true)
    if (reimported.ok) {
      expect(reimported.pack.pairs.map((p) => ({ a: p.a, b: p.b, tags: p.tags }))).toEqual(
        built.pack.pairs.map((p) => ({ a: p.a, b: p.b, tags: p.tags })),
      )
    }
  })

  it('exports a built-in pack to valid, re-importable JSON', () => {
    const json = exportPackToJSON(builtinPacks[0])
    const reimported = validateCustomPack(json)
    expect(reimported.ok).toBe(true)
  })
})

describe('custom pack persistence', () => {
  const pack: WordPack = {
    id: 'custom-test',
    name: 'Test',
    description: 'd',
    builtIn: false,
    pairs: [{ id: 'custom-test-001', a: 'a', b: 'b', tags: [] }],
  }

  it('starts empty', () => {
    expect(loadCustomPacks()).toEqual([])
  })

  it('saves and loads a pack', () => {
    saveCustomPack(pack)
    expect(loadCustomPacks()).toEqual([pack])
  })

  it('replaces a pack with the same id', () => {
    saveCustomPack(pack)
    saveCustomPack({ ...pack, name: 'Renamed' })
    const loaded = loadCustomPacks()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('Renamed')
  })

  it('deletes a pack', () => {
    saveCustomPack(pack)
    deleteCustomPack('custom-test')
    expect(loadCustomPacks()).toEqual([])
  })

  it('includes custom packs in allPacks after built-ins', () => {
    saveCustomPack(pack)
    const all = allPacks()
    expect(all).toHaveLength(builtinPacks.length + 1)
    expect(all[all.length - 1].id).toBe('custom-test')
  })
})

describe('used-pair history', () => {
  it('starts empty', () => {
    expect(getUsedPairIds()).toEqual([])
  })

  it('marks pairs and dedupes', () => {
    markPairUsed('general-mix-001')
    markPairUsed('general-mix-001')
    markPairUsed('general-mix-002')
    expect(getUsedPairIds()).toEqual(['general-mix-001', 'general-mix-002'])
  })

  it('persists through the storage key', () => {
    markPairUsed('general-mix-001')
    const raw = localStorage.getItem('woody:used-pair-ids')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual(['general-mix-001'])
  })

  it('resets', () => {
    markPairUsed('general-mix-001')
    resetUsedPairs()
    expect(getUsedPairIds()).toEqual([])
  })
})

describe('choosePair', () => {
  it('returns null when the selection has no pairs', () => {
    expect(choosePair([], stubRng([0]))).toBeNull()
    expect(choosePair(['does-not-exist'], stubRng([0]))).toBeNull()
  })

  it('only picks pairs from the selected packs', () => {
    const result = choosePair(['general-mix'], stubRng([0.5]))
    expect(result).not.toBeNull()
    expect(result?.pair.packId).toBe('general-mix')
    expect(result?.exhausted).toBe(false)
  })

  it('is deterministic under a stubbed rng', () => {
    const a = choosePair(['general-mix'], stubRng([0]))
    const b = choosePair(['general-mix'], stubRng([0]))
    expect(a?.pair.id).toBe(b?.pair.id)
    expect(a?.pair.id).toBe('general-mix-001')
  })

  it('skips already-used pairs', () => {
    const pack = builtinPacks.find((p) => p.id === 'general-mix')!
    // Mark all but the last pair used.
    for (const pair of pack.pairs.slice(0, -1)) markPairUsed(pair.id)
    const result = choosePair(['general-mix'], stubRng([0]))
    expect(result?.exhausted).toBe(false)
    expect(result?.pair.id).toBe(pack.pairs[pack.pairs.length - 1].id)
  })

  it('sets exhausted and reuses when all selected pairs are used', () => {
    const pack = builtinPacks.find((p) => p.id === 'general-mix')!
    for (const pair of pack.pairs) markPairUsed(pair.id)
    const result = choosePair(['general-mix'], stubRng([0]))
    expect(result).not.toBeNull()
    expect(result?.exhausted).toBe(true)
    expect(result?.pair.id).toBe('general-mix-001')
  })

  it('pools across multiple selected packs', () => {
    const result = choosePair(['general-mix', 'internet'], stubRng([0.999]))
    expect(result).not.toBeNull()
    expect(['general-mix', 'internet']).toContain(result?.pair.packId)
  })

  it('includes custom packs in the pool', () => {
    saveCustomPack({
      id: 'custom-solo',
      name: 'Solo',
      description: 'd',
      builtIn: false,
      pairs: [{ id: 'custom-solo-001', a: 'x', b: 'y', tags: [] }],
    })
    const result = choosePair(['custom-solo'], stubRng([0]))
    expect(result?.pair.id).toBe('custom-solo-001')
  })
})
