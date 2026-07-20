import { describe, expect, it } from 'vitest'
import { buildPairs, type PairSeed } from './build'

const seeds = [
  ['cat', 'dog', ['animals']],
  ['tea', 'coffee', ['drinks']],
] as const satisfies readonly PairSeed[]

describe('buildPairs', () => {
  it('requires the curated pair count to match the target exactly', () => {
    expect(() => buildPairs('short', seeds, [], 3)).toThrow(
      'short has 2 built-in pairs; expected exactly 3',
    )
    expect(() => buildPairs('long', seeds, [], 1)).toThrow(
      'long has 2 built-in pairs; expected exactly 1',
    )
  })
})
