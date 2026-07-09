import type { GameConfig, RuleSet, WinChartRow } from './types'

function plural(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? '' : 's'}`
}

/** Human phrase for the undercover/infiltrator win threshold. */
function winThresholdPhrase(rules: RuleSet, playerCount: number): string {
  const side = rules.infiltratorsWinTogether ? 'infiltrators win' : 'undercover wins'
  switch (rules.undercoverWinRule) {
    case 'one-civilian-left':
      return `${side} at 1 civilian`
    case 'parity-plus-one':
      return `${side} when civilians = undercovers + 1`
    case 'last-two-or-three': {
      const threshold = playerCount >= 7 ? 3 : 2
      return `${side} at last ${threshold}`
    }
  }
}

/** Human phrase for the Whiteboard rule. */
function baibanPhrase(rules: RuleSet): string | null {
  if (rules.baibanCount === 0) return null
  switch (rules.baibanRule) {
    case 'guess-on-elimination':
      return 'Whiteboard guesses if eliminated'
    case 'survive-after-undercovers':
      return 'Whiteboard wins if it outlasts undercovers'
    case 'off':
      return 'Whiteboard has no special power'
  }
}

/**
 * One-line rule summary for the setup and results header, e.g.
 * "7 players · 2 undercovers · 1 Whiteboard · undercover wins at 1 civilian ·
 *  Whiteboard guesses if eliminated".
 */
export function ruleSummary(config: GameConfig): string {
  const { rules } = config
  const playerCount = config.playerNames.length
  const segments: string[] = [
    plural(playerCount, 'player'),
    plural(rules.undercoverCount, 'undercover'),
  ]
  if (rules.baibanCount === 1) segments.push('1 Whiteboard')
  segments.push(winThresholdPhrase(rules, playerCount))
  const baiban = baibanPhrase(rules)
  if (baiban) segments.push(baiban)
  return segments.join(' · ')
}

/**
 * Rows for the How to Play win chart, generated from the rule table (not
 * hardcoded per preset).
 */
export function winChart(rules: RuleSet): WinChartRow[] {
  const rows: WinChartRow[] = []
  const infiltrators = rules.infiltratorsWinTogether

  // Undercover / infiltrator win.
  let how: string
  switch (rules.undercoverWinRule) {
    case 'one-civilian-left':
      how = 'Reach the point where only 1 civilian remains.'
      break
    case 'parity-plus-one':
      how = 'Reach the point where civilians equal undercovers + 1.'
      break
    case 'last-two-or-three':
      how = 'Survive until only the last 3 players remain (last 2 with 6 or fewer players).'
      break
  }
  if (infiltrators) {
    rows.push({ team: 'Infiltrators', how: `${how} An alive Whiteboard counts as an infiltrator.` })
  } else {
    rows.push({ team: 'Undercovers', how: `${how} At least one undercover must be alive.` })
  }

  // Civilian win.
  const civilianHow =
    rules.baibanCount === 1 && !infiltrators
      ? 'Eliminate every undercover and the Whiteboard.'
      : 'Eliminate every undercover.'
  rows.push({ team: 'Civilians', how: civilianHow })

  // Whiteboard-specific rows.
  if (rules.baibanCount === 1) {
    if (rules.baibanRule === 'survive-after-undercovers') {
      rows.push({
        team: 'Whiteboard',
        how: 'Still be alive when the last undercover is eliminated.',
      })
    } else if (rules.baibanRule === 'guess-on-elimination') {
      rows.push({
        team: 'Whiteboard',
        how: 'Correctly guess the civilian word when eliminated.',
      })
    }
  }

  return rows
}
