import type { GameState, Player, RuleSet, Winner } from './types'

interface AliveTally {
  civilians: number
  undercovers: number
  baibanAlive: boolean
  total: number
}

function tally(players: Player[]): AliveTally {
  let civilians = 0
  let undercovers = 0
  let baibanAlive = false
  for (const p of players) {
    if (p.eliminated) continue
    if (p.role === 'civilian') civilians++
    else if (p.role === 'undercover') undercovers++
    else baibanAlive = true
  }
  const total = civilians + undercovers + (baibanAlive ? 1 : 0)
  return { civilians, undercovers, baibanAlive, total }
}

/**
 * Whether the undercover/infiltrator win threshold is met, per `undercoverWinRule`.
 * This is a pure predicate over the alive tally; caller decides the winner label.
 */
function infiltratorThresholdMet(
  rules: RuleSet,
  t: AliveTally,
  startingPlayerCount: number,
): boolean {
  switch (rules.undercoverWinRule) {
    case 'one-civilian-left':
      return t.civilians <= 1
    case 'parity-plus-one':
      return t.civilians <= t.undercovers + 1
    case 'last-two-or-three': {
      const threshold = startingPlayerCount >= 6 ? 3 : 2
      return t.total <= threshold
    }
    default:
      return false
  }
}

/**
 * Determine the winner (if any) given the current alive players and rules.
 *
 * Win check order (authoritative, from CONTRACTS.md):
 *   1. Baiban 'survive-after-undercovers': all undercovers out + Baiban alive -> 'baiban'.
 *   2. Civilians: all undercovers out AND (no Baiban in game or Baiban out) -> 'civilians'.
 *   3. Undercover/infiltrator win per undercoverWinRule:
 *        - infiltratorsWinTogether: an alive Baiban OR alive undercover counts;
 *          winner 'infiltrators'.
 *        - else: requires an alive undercover; winner 'undercovers'.
 */
export function checkWinner(state: GameState): Winner | null {
  const rules = state.config.rules
  const t = tally(state.players)
  const baibanInGame = rules.baibanCount === 1
  const startingPlayerCount = state.config.playerNames.length

  // 1. Baiban survive-after-undercovers.
  if (rules.baibanRule === 'survive-after-undercovers' && t.undercovers === 0 && t.baibanAlive) {
    return 'baiban'
  }

  // 2. Civilians clear the board.
  const baibanClearedOrAbsent = !baibanInGame || !t.baibanAlive
  if (t.undercovers === 0 && baibanClearedOrAbsent) {
    return 'civilians'
  }

  // 3. Undercover / infiltrator threshold.
  if (infiltratorThresholdMet(rules, t, startingPlayerCount)) {
    if (rules.infiltratorsWinTogether) {
      // An alive undercover OR an alive Baiban satisfies the infiltrator win.
      if (t.undercovers > 0 || t.baibanAlive) return 'infiltrators'
    } else if (t.undercovers > 0) {
      return 'undercovers'
    }
  }

  return null
}
