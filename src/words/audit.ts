import type { WordPack, WordPair } from './types'

export type PackAuditSeverity = 'error' | 'warning'

export interface PackAuditIssue {
  packId: string
  packName: string
  pairId: string
  pairIndex: number
  a: string
  b: string
  term: string
  severity: PackAuditSeverity
  rule: string
  reason: string
}

const discouragedStandaloneTerms = new Map<string, string>([
  ['dessert run', 'Use a concrete standalone place or item, like "dessert cafe" or "ice cream shop".'],
  ['boba run', 'Use a concrete standalone place or item, like "boba shop" or "milk tea".'],
  ['gluten free', 'Add the actual item, like "gluten-free pasta" or "gluten-free pizza".'],
  ['gluten-free option', 'Add the actual item, like "gluten-free pasta" or "gluten-free pizza".'],
  ['vegetarian option', 'Add the actual item, like "vegetarian entree" or "veggie burger".'],
  ['vegan option', 'Add the actual item, like "vegan entree" or "plant-based burger".'],
  ['dietary restrictions', 'This reads like setup context, not a clueable prompt.'],
  ['allergy note', 'This reads like setup context, not a clueable prompt.'],
])

const contextualActivityEnding = /\b(run|pickup|dropoff|visit|appointment)\b$/
const generalMixSpecialistTags = new Set(['office', 'school', 'work'])
const generalMixSpecialistTerms = new Set([
  'agenda',
  'all-hands',
  'expense report',
  'final exam',
  'group project',
  'inbox zero',
  'lab partner',
  'midterm',
  'office hours',
  'performance review',
  'scope creep',
  'slide deck',
  'standup',
  'status update',
  'study hall',
])
const allowedLongTerms = new Set(['hong kong milk tea'])

function normalize(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ')
}

function issueForTerm(
  pack: WordPack,
  pair: WordPair,
  pairIndex: number,
  term: string,
): PackAuditIssue[] {
  const normalized = normalize(term)
  const exactReason = discouragedStandaloneTerms.get(normalized)
  if (exactReason) {
    return [
      {
        packId: pack.id,
        packName: pack.name,
        pairId: pair.id,
        pairIndex,
        a: pair.a,
        b: pair.b,
        term,
        severity: 'error',
        rule: 'standalone-prompt',
        reason: exactReason,
      },
    ]
  }

  if (/\b(option|restrictions?)\b$/.test(normalized)) {
    return [
      {
        packId: pack.id,
        packName: pack.name,
        pairId: pair.id,
        pairIndex,
        a: pair.a,
        b: pair.b,
        term,
        severity: 'warning',
        rule: 'form-field-language',
        reason: 'This may read like planning context instead of a clueable standalone prompt.',
      },
    ]
  }

  if (contextualActivityEnding.test(normalized)) {
    return [
      {
        packId: pack.id,
        packName: pack.name,
        pairId: pair.id,
        pairIndex,
        a: pair.a,
        b: pair.b,
        term,
        severity: 'warning',
        rule: 'vague-activity',
        reason: 'Use a standalone object, place, or activity that does not depend on an implied errand.',
      },
    ]
  }

  if (
    pack.id !== 'pop-culture' &&
    normalized.split(' ').length >= 4 &&
    !allowedLongTerms.has(normalized)
  ) {
    return [
      {
        packId: pack.id,
        packName: pack.name,
        pairId: pair.id,
        pairIndex,
        a: pair.a,
        b: pair.b,
        term,
        severity: 'warning',
        rule: 'overlong-prompt',
        reason: 'Four or more words often add clue ambiguity; shorten this unless it is a familiar fixed name.',
      },
    ]
  }

  return []
}

export function auditWordPack(pack: WordPack): PackAuditIssue[] {
  return pack.pairs.flatMap((pair, i) => {
    const termIssues = [
      ...issueForTerm(pack, pair, i, pair.a),
      ...issueForTerm(pack, pair, i, pair.b),
    ]
    const leakedTag =
      pack.id === 'general-mix'
        ? pair.tags.find((tag) => generalMixSpecialistTags.has(normalize(tag)))
        : undefined
    const leakedTerm =
      pack.id === 'general-mix'
        ? [pair.a, pair.b].find((term) => generalMixSpecialistTerms.has(normalize(term)))
        : undefined

    if (!leakedTag && !leakedTerm) return termIssues

    return [
      ...termIssues,
      {
        packId: pack.id,
        packName: pack.name,
        pairId: pair.id,
        pairIndex: i,
        a: pair.a,
        b: pair.b,
        term: `${pair.a} / ${pair.b}`,
        severity: 'error' as const,
        rule: 'pack-scope',
        reason: `Move ${leakedTerm ?? leakedTag} content out of General Mix and into its specialist pack.`,
      },
    ]
  })
}

export function summarizePackAudit(issues: readonly PackAuditIssue[]): {
  errors: number
  warnings: number
} {
  return issues.reduce(
    (summary, issue) => {
      if (issue.severity === 'error') summary.errors += 1
      if (issue.severity === 'warning') summary.warnings += 1
      return summary
    },
    { errors: 0, warnings: 0 },
  )
}
