import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameConfig, GameState, PresetId, RuleSet } from '../engine'
import {
  PRESETS,
  recommendedRoleCounts,
  ruleSummary,
  validateConfig,
  createGame,
} from '../engine'
import {
  allPacks,
  choosePair,
  getUsedPairIds,
  markPairUsed,
  resetUsedPairs,
} from '../words'
import type { WordPack } from '../words'
import { readJSON, writeJSON, STORAGE_KEYS } from '../storage/local'
import { PackEditor } from '../features/packs/PackEditor'
import { HowToPlayButton } from '../components/HowToPlayButton'
import { AdvancedSettings } from './setup/AdvancedSettings'
import type { SetupDraft } from './setup/types'
import { draftToConfig } from './setup/types'

const MIN_PLAYERS = 4
const MAX_PLAYERS = 12

function defaultNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Player ${i + 1}`)
}

function initialDraft(): SetupDraft {
  const saved = readJSON<SetupDraft>(STORAGE_KEYS.setupDraft)
  if (saved && Array.isArray(saved.playerNames) && saved.rules) {
    return saved
  }
  const playerNames = defaultNames(4)
  const preset = PRESETS[0]
  return {
    playerNames,
    presetId: preset.id,
    rules: preset.rules(playerNames.length),
    packIds: allPacks().filter((p) => p.builtIn).map((p) => p.id),
    countsOverridden: false,
  }
}

export function SetupScreen({
  onStart,
}: {
  onStart: (state: GameState, exhausted: boolean) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<SetupDraft>(initialDraft)
  const [packs, setPacks] = useState<WordPack[]>(() => allPacks())
  const [showPackEditor, setShowPackEditor] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [confirmReset, setConfirmReset] = useState(false)
  const [usedRefresh, setUsedRefresh] = useState(0)

  // Persist the draft on every change.
  useEffect(() => {
    writeJSON(STORAGE_KEYS.setupDraft, draft)
  }, [draft])

  const config: GameConfig = useMemo(() => draftToConfig(draft), [draft])
  const summary = ruleSummary(config)

  // ---- player names ----
  function setPlayerCount(count: number): void {
    setDraft((prev) => {
      const names = prev.playerNames.slice(0, count)
      while (names.length < count) names.push(`Player ${names.length + 1}`)
      const rec = recommendedRoleCounts(count)
      const rules: RuleSet = prev.countsOverridden
        ? prev.rules
        : { ...prev.rules, undercoverCount: rec.undercoverCount, baibanCount: rec.baibanCount }
      return { ...prev, playerNames: names, rules }
    })
  }

  function addPlayer(): void {
    if (draft.playerNames.length >= MAX_PLAYERS) return
    setPlayerCount(draft.playerNames.length + 1)
  }

  function removePlayer(index: number): void {
    if (draft.playerNames.length <= MIN_PLAYERS) return
    setDraft((prev) => {
      const names = prev.playerNames.filter((_, i) => i !== index)
      const rec = recommendedRoleCounts(names.length)
      const rules: RuleSet = prev.countsOverridden
        ? prev.rules
        : { ...prev.rules, undercoverCount: rec.undercoverCount, baibanCount: rec.baibanCount }
      return { ...prev, playerNames: names, rules }
    })
  }

  function renamePlayer(index: number, name: string): void {
    setDraft((prev) => ({
      ...prev,
      playerNames: prev.playerNames.map((n, i) => (i === index ? name : n)),
    }))
  }

  // ---- preset ----
  function selectPreset(presetId: PresetId): void {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setDraft((prev) => ({
      ...prev,
      presetId,
      rules: preset.rules(prev.playerNames.length),
      countsOverridden: false,
    }))
  }

  // ---- rules ----
  function patchRules(patch: Partial<RuleSet>): void {
    setDraft((prev) => ({ ...prev, rules: { ...prev.rules, ...patch } }))
  }

  function patchRulesAsOverride(patch: Partial<RuleSet>): void {
    setDraft((prev) => ({
      ...prev,
      rules: { ...prev.rules, ...patch },
      countsOverridden: true,
    }))
  }

  // ---- packs ----
  function togglePack(id: string): void {
    setDraft((prev) => {
      const has = prev.packIds.includes(id)
      return {
        ...prev,
        packIds: has ? prev.packIds.filter((p) => p !== id) : [...prev.packIds, id],
      }
    })
  }

  const closePackEditor = useCallback(() => {
    setShowPackEditor(false)
    const fresh = allPacks()
    setPacks(fresh)
    // Drop selections for packs that no longer exist.
    setDraft((prev) => ({
      ...prev,
      packIds: prev.packIds.filter((id) => fresh.some((p) => p.id === id)),
    }))
  }, [])

  // ---- used-pair history ----
  const { remaining, totalInSelection } = useMemo(() => {
    void usedRefresh
    const used = new Set(getUsedPairIds())
    let total = 0
    let unused = 0
    for (const pack of packs) {
      if (!draft.packIds.includes(pack.id)) continue
      for (const pair of pack.pairs) {
        total += 1
        if (!used.has(pair.id)) unused += 1
      }
    }
    return { remaining: unused, totalInSelection: total }
  }, [packs, draft.packIds, usedRefresh])

  function doResetUsed(): void {
    resetUsedPairs()
    setConfirmReset(false)
    setUsedRefresh((n) => n + 1)
  }

  // ---- start ----
  function start(): void {
    const validation = validateConfig(config)
    if (validation.length > 0) {
      setErrors(validation)
      return
    }
    setErrors([])
    const chosen = choosePair(draft.packIds, Math.random)
    if (!chosen) {
      setErrors(['Select at least one word pack with pairs.'])
      return
    }
    const { pair, exhausted } = chosen
    const state = createGame(
      config,
      { id: pair.id, packId: pair.packId, a: pair.a, b: pair.b },
      Math.random,
    )
    markPairUsed(pair.id)
    onStart(state, exhausted)
  }

  return (
    <section className="screen setup">
      <header className="setup-header">
        <h1 className="setup-heading">Woody</h1>
        <HowToPlayButton rules={draft.rules} />
      </header>

      {/* Players */}
      <section className="setup-block">
        <h2 className="setup-block-title">Players ({draft.playerNames.length})</h2>
        <ul className="setup-players">
          {draft.playerNames.map((name, i) => (
            <li className="setup-player-row" key={i}>
              <input
                className="setup-input"
                aria-label={`Player ${i + 1} name`}
                value={name}
                onChange={(e) => renamePlayer(i, e.target.value)}
              />
              <button
                type="button"
                className="setup-remove"
                aria-label={`Remove player ${i + 1}`}
                onClick={() => removePlayer(i)}
                disabled={draft.playerNames.length <= MIN_PLAYERS}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn"
          onClick={addPlayer}
          disabled={draft.playerNames.length >= MAX_PLAYERS}
        >
          Add player
        </button>
      </section>

      {/* Presets */}
      <section className="setup-block">
        <h2 className="setup-block-title">Game mode</h2>
        <div className="setup-presets" role="radiogroup" aria-label="Game mode">
          {PRESETS.map((preset) => {
            const active = draft.presetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`card setup-preset${active ? ' setup-preset-active' : ''}`}
                onClick={() => selectPreset(preset.id)}
              >
                <span className="setup-preset-name">{preset.name}</span>
                <span className="setup-preset-tagline">{preset.tagline}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Advanced */}
      <section className="setup-block">
        <AdvancedSettings
          rules={draft.rules}
          playerCount={draft.playerNames.length}
          strictSurfaced={draft.presetId === 'classic-wodi' || draft.rules.strictClues}
          onPatchRules={patchRules}
          onCountOverride={patchRulesAsOverride}
        />
      </section>

      {/* Word packs */}
      <section className="setup-block">
        <div className="setup-block-head">
          <h2 className="setup-block-title">Word packs</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowPackEditor(true)}
          >
            Manage packs
          </button>
        </div>
        <ul className="setup-packs">
          {packs.map((pack) => {
            const checked = draft.packIds.includes(pack.id)
            return (
              <li className="setup-pack-row" key={pack.id}>
                <label className="setup-pack-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePack(pack.id)}
                  />
                  <span className="setup-pack-name">
                    {pack.name}
                    {!pack.builtIn && <span className="setup-pack-badge">custom</span>}
                  </span>
                  <span className="setup-pack-meta">{pack.pairs.length} pairs</span>
                </label>
                {pack.description && <p className="setup-pack-desc">{pack.description}</p>}
              </li>
            )
          })}
        </ul>
        <p className="setup-used-history">
          {remaining} of {totalInSelection} pairs unused in this selection.{' '}
          <button
            type="button"
            className="setup-link"
            onClick={() => setConfirmReset(true)}
          >
            Reset word history
          </button>
        </p>
        {confirmReset && (
          <div className="setup-confirm" role="dialog" aria-label="Reset word history">
            <span>Reset the used-pair history? Old pairs can come up again.</span>
            <div className="setup-confirm-actions">
              <button type="button" className="btn btn-primary" onClick={doResetUsed}>
                Reset history
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Errors */}
      {errors.length > 0 && (
        <ul className="setup-errors" role="alert">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {/* Summary + start */}
      <div className="setup-footer">
        <p className="setup-summary" data-testid="setup-summary">
          {summary}
        </p>
        <button
          type="button"
          className="btn btn-primary setup-start"
          onClick={start}
          data-testid="setup-start"
        >
          Start game
        </button>
      </div>

      {showPackEditor && <PackEditor onClose={closePackEditor} />}
    </section>
  )
}
