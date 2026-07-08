/**
 * Word pack types shared by the pack data, the custom pack editor, and setup.
 */

export interface WordPair {
  /** Stable unique id, e.g. `general-012` or `custom-<slug>-3`. */
  id: string
  /** One side of the pair; which side is civilian is randomized per game. */
  a: string
  b: string
  tags: string[]
}

export interface WordPack {
  /** Stable unique id, e.g. `general-mix` or `custom-<slug>`. */
  id: string
  name: string
  /** Short blurb shown in setup. */
  description: string
  builtIn: boolean
  pairs: WordPair[]
}

/** JSON schema for imported/exported custom packs (spec: version 1). */
export interface CustomPackFile {
  version: 1
  name: string
  pairs: Array<{ a: string; b: string; tags?: string[] }>
}

export type PackValidationResult =
  | { ok: true; pack: WordPack }
  | { ok: false; errors: string[] }
