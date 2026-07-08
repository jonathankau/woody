import type { GameConfig, PresetId, RuleSet } from '../../engine'

/** The persisted setup draft (survives reload). */
export interface SetupDraft {
  playerNames: string[]
  presetId: PresetId
  rules: RuleSet
  packIds: string[]
  /** True once the host manually edits undercover/baiban counts, so recommended
   *  auto-fill stops overriding them on player-count changes. */
  countsOverridden: boolean
}

export function draftToConfig(draft: SetupDraft): GameConfig {
  return {
    presetId: draft.presetId,
    rules: draft.rules,
    playerNames: draft.playerNames,
    packIds: draft.packIds,
  }
}
