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

const allowedRunTerms = new Set([
  'h mart run',
  '99 ranch run',
  'mitsuwa run',
  'nijiya run',
  'seafood city run',
  'patel brothers run',
  'costco run',
  'target run',
])

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

  if (/\b(option|restrictions?|note)\b$/.test(normalized)) {
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

  if (normalized.endsWith(' run') && !allowedRunTerms.has(normalized)) {
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
        reason: 'This may need a concrete object or place to make sense without extra context.',
      },
    ]
  }

  return []
}

export function auditWordPack(pack: WordPack): PackAuditIssue[] {
  return pack.pairs.flatMap((pair, i) => [
    ...issueForTerm(pack, pair, i, pair.a),
    ...issueForTerm(pack, pair, i, pair.b),
  ])
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
