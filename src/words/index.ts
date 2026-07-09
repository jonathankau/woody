/**
 * Word packs: built-in data, custom pack validation/persistence, and pair
 * selection with no-repeat history. Pure logic + localStorage via storage
 * helpers; randomness is always injected as `Rng`.
 */

import type { Rng } from '../engine/types'
import { readJSON, writeJSON, removeKey, STORAGE_KEYS } from '../storage/local'
import type { WordPack, WordPair, PackValidationResult } from './types'
import { builtinPacks } from './packs'

export * from './types'
export * from './audit'
export { builtinPacks }

/** Turn a name into a url-safe slug for stable id generation. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'pack'
}

/** Left-pad a 1-based index to 3 digits, e.g. 1 -> "001". */
function padId(n: number): string {
  return String(n).padStart(3, '0')
}

// ---------------------------------------------------------------------------
// Custom pack validation
// ---------------------------------------------------------------------------

interface RawPair {
  a: string
  b: string
  tags?: string[]
}

/**
 * Parse + validate a custom pack from a JSON string or an already-parsed
 * object. Returns readable errors; on success, a fully-formed `WordPack` with
 * a stable id and pair ids.
 */
export function validateCustomPack(input: string | unknown): PackValidationResult {
  let data: unknown
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch {
      return { ok: false, errors: ['Pack JSON is not valid JSON.'] }
    }
  } else {
    data = input
  }

  const errors: string[] = []

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, errors: ['Pack must be a JSON object.'] }
  }

  const obj = data as Record<string, unknown>

  if (obj.version !== 1) {
    errors.push('version must be 1.')
  }

  const name = obj.name
  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string.')
  }

  const rawPairs = obj.pairs
  if (!Array.isArray(rawPairs)) {
    errors.push('pairs must be an array.')
    return { ok: false, errors }
  }

  if (rawPairs.length < 1) {
    errors.push('pairs must have at least 1 entry.')
  }
  if (rawPairs.length > 500) {
    errors.push('pairs must have at most 500 entries.')
  }

  const validPairs: RawPair[] = []
  rawPairs.forEach((pair, i) => {
    const n = i + 1
    if (typeof pair !== 'object' || pair === null || Array.isArray(pair)) {
      errors.push(`Pair ${n}: must be an object.`)
      return
    }
    const p = pair as Record<string, unknown>
    let valid = true

    if (typeof p.a !== 'string' || p.a.trim().length === 0) {
      errors.push(`Pair ${n}: "a" must be a non-empty string.`)
      valid = false
    }
    if (typeof p.b !== 'string' || p.b.trim().length === 0) {
      errors.push(`Pair ${n}: "b" must be a non-empty string.`)
      valid = false
    }
    if (
      valid &&
      typeof p.a === 'string' &&
      typeof p.b === 'string' &&
      p.a.trim().toLowerCase() === p.b.trim().toLowerCase()
    ) {
      errors.push(`Pair ${n}: "a" and "b" must be different.`)
      valid = false
    }

    let tags: string[] | undefined
    if (p.tags !== undefined) {
      if (!Array.isArray(p.tags) || p.tags.some((t) => typeof t !== 'string')) {
        errors.push(`Pair ${n}: tags must be an array of strings.`)
        valid = false
      } else {
        tags = p.tags as string[]
      }
    }

    if (valid && typeof p.a === 'string' && typeof p.b === 'string') {
      validPairs.push({ a: p.a.trim(), b: p.b.trim(), tags })
    }
  })

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const packName = (name as string).trim()
  const packId = generateCustomPackId(packName)
  const pairs: WordPair[] = validPairs.map((p, i) => ({
    id: `${packId}-${padId(i + 1)}`,
    a: p.a,
    b: p.b,
    tags: p.tags ?? [],
  }))

  return {
    ok: true,
    pack: {
      id: packId,
      name: packName,
      description: `Custom pack · ${pairs.length} pairs`,
      builtIn: false,
      pairs,
    },
  }
}

/** Generate a `custom-<slug>` id, deduped against existing custom packs. */
function generateCustomPackId(name: string): string {
  const base = `custom-${slugify(name)}`
  const existing = new Set(loadCustomPacks().map((p) => p.id))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Serialize a pack to the spec's version-1 JSON file format, pretty-printed. */
export function exportPackToJSON(pack: WordPack): string {
  const file = {
    version: 1 as const,
    name: pack.name,
    pairs: pack.pairs.map((p) => ({ a: p.a, b: p.b, tags: p.tags })),
  }
  return JSON.stringify(file, null, 2)
}

// ---------------------------------------------------------------------------
// Custom pack persistence
// ---------------------------------------------------------------------------

/** Load custom packs from storage; tolerant of missing/corrupt data. */
export function loadCustomPacks(): WordPack[] {
  const packs = readJSON<WordPack[]>(STORAGE_KEYS.customPacks)
  if (!Array.isArray(packs)) return []
  return packs.filter(
    (p): p is WordPack =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as WordPack).id === 'string' &&
      Array.isArray((p as WordPack).pairs),
  )
}

/** Insert or replace a custom pack by id. */
export function saveCustomPack(pack: WordPack): void {
  const packs = loadCustomPacks()
  const idx = packs.findIndex((p) => p.id === pack.id)
  if (idx >= 0) {
    packs[idx] = pack
  } else {
    packs.push(pack)
  }
  writeJSON(STORAGE_KEYS.customPacks, packs)
}

/** Remove a custom pack by id. */
export function deleteCustomPack(packId: string): void {
  const packs = loadCustomPacks().filter((p) => p.id !== packId)
  if (packs.length === 0) {
    removeKey(STORAGE_KEYS.customPacks)
  } else {
    writeJSON(STORAGE_KEYS.customPacks, packs)
  }
}

/** All packs available for selection: built-in first, then custom. */
export function allPacks(): WordPack[] {
  return [...builtinPacks, ...loadCustomPacks()]
}

// ---------------------------------------------------------------------------
// Used-pair no-repeat history
// ---------------------------------------------------------------------------

/** Ids of pairs already used this session/history. */
export function getUsedPairIds(): string[] {
  const ids = readJSON<string[]>(STORAGE_KEYS.usedPairIds)
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === 'string')
}

/** Record a pair id as used (dedupes). */
export function markPairUsed(pairId: string): void {
  const ids = getUsedPairIds()
  if (ids.includes(pairId)) return
  ids.push(pairId)
  writeJSON(STORAGE_KEYS.usedPairIds, ids)
}

/** Clear the used-pair history. */
export function resetUsedPairs(): void {
  removeKey(STORAGE_KEYS.usedPairIds)
}

// ---------------------------------------------------------------------------
// Pair selection
// ---------------------------------------------------------------------------

/**
 * Choose a random unused pair from the selected packs. If every pair in the
 * selection has been used, returns `exhausted: true` and picks from the full
 * selection. Returns null only if the selection has no pairs at all.
 */
export function choosePair(
  packIds: string[],
  rng: Rng,
): { pair: WordPair & { packId: string }; exhausted: boolean } | null {
  const selected = new Set(packIds)
  const pool: Array<WordPair & { packId: string }> = []
  for (const pack of allPacks()) {
    if (!selected.has(pack.id)) continue
    for (const pair of pack.pairs) {
      pool.push({ ...pair, packId: pack.id })
    }
  }

  if (pool.length === 0) return null

  const used = new Set(getUsedPairIds())
  const fresh = pool.filter((p) => !used.has(p.id))

  if (fresh.length > 0) {
    return { pair: pick(fresh, rng), exhausted: false }
  }
  return { pair: pick(pool, rng), exhausted: true }
}

function pick<T>(items: T[], rng: Rng): T {
  const idx = Math.floor(rng() * items.length)
  const clamped = Math.min(Math.max(idx, 0), items.length - 1)
  return items[clamped]
}
