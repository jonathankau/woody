import type { Preset, PresetId, RuleSet } from './types'

/**
 * Recommended role counts per the spec:
 *   4-6 players  -> 1 undercover, 0 Baiban
 *   7-9 players  -> 2 undercovers, 1 Baiban
 *   10-12 players -> 3 undercovers, 1 Baiban
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

/** Shared defaults reused across presets, overridden per preset below. */
function baseRules(playerCount: number): Pick<RuleSet, 'undercoverCount' | 'baibanCount'> {
  return recommendedRoleCounts(playerCount)
}

const woodyStandard: Preset = {
  id: 'woody-standard',
  name: 'Woody Standard',
  tagline: 'The friendly default: undercovers sneak, Baiban guesses.',
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
  tagline: 'Traditional 谁是卧底: Baiban can survive to steal the win.',
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
  name: 'Undercover / Mr. White',
  tagline: 'Infiltrators (undercovers + Mr. White) win together.',
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

export const PRESETS: Preset[] = [woodyStandard, classicWodi, mrWhite]

export function presetById(id: PresetId): Preset {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`Unknown preset: ${id}`)
  return preset
}
