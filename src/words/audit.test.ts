import { describe, expect, it } from 'vitest'
import { auditWordPack } from './audit'
import type { WordPack } from './types'

function pack(
  id: string,
  a: string,
  b: string,
  tags: string[] = ['test'],
): WordPack {
  return {
    id,
    name: 'Test Pack',
    description: 'Test',
    builtIn: true,
    pairs: [{ id: `${id}-001`, a, b, tags }],
  }
}

describe('word-pack audit', () => {
  it('flags contextual errand phrasing without brand exceptions', () => {
    const issues = auditWordPack(pack('test', 'costco run', 'grocery run'))

    expect(issues.map((issue) => issue.rule)).toEqual([
      'vague-activity',
      'vague-activity',
    ])
  })

  it('flags work and school leakage in General Mix', () => {
    const issues = auditWordPack(pack('general-mix', 'agenda', 'calendar', ['planning']))

    expect(issues).toEqual([
      expect.objectContaining({ severity: 'error', rule: 'pack-scope' }),
    ])
  })

  it('warns about unusually long prompts', () => {
    const issues = auditWordPack(pack('test', 'the great british bake off', 'top chef'))

    expect(issues).toEqual([
      expect.objectContaining({ severity: 'warning', rule: 'overlong-prompt' }),
    ])
  })
})
