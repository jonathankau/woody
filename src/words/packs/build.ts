import type { WordPair } from '../types'

export type PairSeed = readonly [a: string, b: string, tags: readonly string[]]

export interface PairGroup {
  tag: string
  terms: readonly string[]
}

function padId(n: number): string {
  return n.toString().padStart(3, '0')
}

function comboKey(a: string, b: string): string {
  return [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join('||')
}

/**
 * Builds a fixed-size built-in pack from curated direct pairs plus ordered
 * term groups. Adjacent terms in a group should be close enough to make fair
 * Woody clues while still leaving room for bluffing.
 */
export function buildPairs(
  packId: string,
  seeds: readonly PairSeed[],
  groups: readonly PairGroup[],
  target = 250,
): WordPair[] {
  const rows: PairSeed[] = []
  const seen = new Set<string>()

  const add = (a: string, b: string, tags: readonly string[]) => {
    const left = a.trim()
    const right = b.trim()
    if (!left || !right || left.toLowerCase() === right.toLowerCase()) return
    const key = comboKey(left, right)
    if (seen.has(key)) return
    seen.add(key)
    rows.push([left, right, tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)])
  }

  for (const [a, b, tags] of seeds) add(a, b, tags)
  for (const group of groups) {
    for (let i = 0; i < group.terms.length - 1; i++) {
      add(group.terms[i], group.terms[i + 1], [group.tag])
    }
  }

  if (rows.length < target) {
    throw new Error(`${packId} only has ${rows.length} built-in pairs; expected ${target}.`)
  }

  return rows.slice(0, target).map(([a, b, tags], i) => ({
    id: `${packId}-${padId(i + 1)}`,
    a,
    b,
    tags: [...tags],
  }))
}
