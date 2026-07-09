import type { Preset, PresetId, RuleSet } from './types'

/**
 * Recommended role counts per the spec:
 *   4-6 players  -> 1 undercover, 0 Whiteboard
 *   7-9 players  -> 2 undercovers, 1 Whiteboard
 *   10-12 players -> 3 undercovers, 1 Whiteboard
 *
 * For counts outside 4-12 we still return a sensible clamp so callers never
 * crash; `validateConfig` is responsible for rejecting out-of-range counts.
 */
export function recommendedRoleCounts(playerCount: number): {
  undercoverCount: number
  baibanCount: 0 | 1
} {
  if (playerCount <= 6) return { undercoverCount: 1, baibanCount: 0 }
  if (playerCount <= 9) return { undercoverCount: 2, baibanCount: 1 }
  return { undercoverCount: 3, baibanCount: 1 }
}

export function recommendedRoleCountsWithBaiban(
  playerCount: number,
  baibanCount: 0 | 1,
): { undercoverCount: number; baibanCount: 0 | 1 } {
  const rec = recommendedRoleCounts(playerCount)
  const outsiderSlots = rec.undercoverCount + rec.baibanCount
  const maxUndercover = Math.max(1, playerCount - 2 - baibanCount)
  return {
    undercoverCount: Math.min(maxUndercover, Math.max(1, outsiderSlots - baibanCount)),
    baibanCount,
  }
}

/** Shared defaults reused across presets, overridden per preset below. */
function baseRules(playerCount: number): Pick<RuleSet, 'undercoverCount' | 'baibanCount'> {
  return recommendedRoleCounts(playerCount)
}

const woodyStandard: Preset = {
  id: 'woody-standard',
  name: 'Woody Standard',
  tagline: 'Modern variant: Whiteboard gets one guess if voted off.',
  details: [
    'Undercovers win when only 1 civilian remains.',
    'Civilians must eliminate undercovers and Whiteboard.',
    'Clues can be loose, funny, or strategic.',
  ],
  rules(playerCount: number): RuleSet {
    return {
      ...baseRules(playerCount),
      baibanRule: 'guess-on-elimination',
      undercoverWinRule: 'one-civilian-left',
      infiltratorsWinTogether: false,
      voteRule: 'plurality',
      tieRule: 'pk-revote',
      startingSpeakerRule: 'random',
      strictClues: false,
    }
  },
}

const classicWodi: Preset = {
  id: 'classic-wodi',
  name: 'Classic Wo Di',
  tagline: 'Original-style: stricter clues and source-aligned endgame pressure.',
  details: [
    'Undercovers win at last 3 players for 7+ players; at last 2 for 6 or fewer.',
    'Whiteboard wins by outlasting every undercover.',
    'Clues should be true about your word.',
  ],
  rules(playerCount: number): RuleSet {
    return {
      ...baseRules(playerCount),
      baibanRule: 'survive-after-undercovers',
      undercoverWinRule: 'last-two-or-three',
      infiltratorsWinTogether: false,
      voteRule: 'plurality',
      tieRule: 'pk-revote',
      startingSpeakerRule: 'random',
      strictClues: true,
    }
  },
}

const mrWhite: Preset = {
  id: 'mr-white',
  name: 'Undercover / Whiteboard',
  tagline: 'App-style: Whiteboard joins the infiltrator team.',
  details: [
    'Undercovers and Whiteboard can win together.',
    'Infiltrators win when only 1 civilian remains.',
    'Whiteboard gets one guess if voted off.',
  ],
  rules(playerCount: number): RuleSet {
    return {
      ...baseRules(playerCount),
      baibanRule: 'guess-on-elimination',
      undercoverWinRule: 'one-civilian-left',
      infiltratorsWinTogether: true,
      voteRule: 'plurality',
      tieRule: 'pk-revote',
      startingSpeakerRule: 'random',
      strictClues: false,
    }
  },
}

export const PRESETS: Preset[] = [classicWodi, woodyStandard, mrWhite]

export function presetById(id: PresetId): Preset {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`Unknown preset: ${id}`)
  return preset
}
