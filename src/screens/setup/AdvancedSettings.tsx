import type {
  BaibanRule,
  RuleSet,
  StartingSpeakerRule,
  UndercoverWinRule,
} from '../../engine'

/**
 * Collapsible advanced-settings panel. Emits partial rule patches; the parent
 * owns the full RuleSet and the "counts overridden" flag.
 */
export function AdvancedSettings({
  rules,
  playerCount,
  strictSurfaced,
  onPatchRules,
  onCountOverride,
}: {
  rules: RuleSet
  playerCount: number
  strictSurfaced: boolean
  onPatchRules: (patch: Partial<RuleSet>) => void
  onCountOverride: (patch: Partial<RuleSet>) => void
}): React.JSX.Element {
  const maxUndercover = Math.max(1, playerCount - 2 - rules.baibanCount)

  return (
    <details className="setup-advanced">
      <summary className="setup-advanced-summary">Advanced settings</summary>
      <div className="setup-advanced-body">
        <Field label="Undercovers" htmlFor="adv-undercover">
          <input
            id="adv-undercover"
            className="setup-number"
            type="number"
            min={1}
            max={maxUndercover}
            value={rules.undercoverCount}
            onChange={(e) =>
              onCountOverride({ undercoverCount: clampInt(e.target.value, 1, maxUndercover) })
            }
          />
        </Field>

        <div className="setup-field setup-field-inline">
          <label className="setup-label" htmlFor="adv-baiban">
            Baiban in play
          </label>
          <input
            id="adv-baiban"
            type="checkbox"
            checked={rules.baibanCount === 1}
            onChange={(e) => onCountOverride({ baibanCount: e.target.checked ? 1 : 0 })}
          />
        </div>

        {rules.baibanCount === 1 && (
          <Field label="Baiban rule" htmlFor="adv-baiban-rule">
            <select
              id="adv-baiban-rule"
              className="setup-select"
              value={rules.baibanRule}
              onChange={(e) => onPatchRules({ baibanRule: e.target.value as BaibanRule })}
            >
              <option value="guess-on-elimination">Guesses when eliminated</option>
              <option value="survive-after-undercovers">Wins if it outlasts undercovers</option>
              <option value="off">No special power</option>
            </select>
          </Field>
        )}

        <Field label="Undercover win threshold" htmlFor="adv-win">
          <select
            id="adv-win"
            className="setup-select"
            value={rules.undercoverWinRule}
            onChange={(e) => onPatchRules({ undercoverWinRule: e.target.value as UndercoverWinRule })}
          >
            <option value="last-two-or-three">Last 3 (last 2 in small games)</option>
            <option value="one-civilian-left">Only 1 civilian left</option>
            <option value="parity-plus-one">Civilians = undercovers + 1</option>
          </select>
        </Field>

        <Field label="Starting speaker" htmlFor="adv-speaker">
          <select
            id="adv-speaker"
            className="setup-select"
            value={rules.startingSpeakerRule}
            onChange={(e) =>
              onPatchRules({ startingSpeakerRule: e.target.value as StartingSpeakerRule })
            }
          >
            <option value="random">Random</option>
            <option value="host-chooses">Host chooses</option>
            <option value="rotate">Rotate</option>
          </select>
        </Field>

        {strictSurfaced && (
          <div className="setup-field setup-field-inline">
            <label className="setup-label" htmlFor="adv-strict">
              Strict clues (must be true)
            </label>
            <input
              id="adv-strict"
              type="checkbox"
              checked={rules.strictClues}
              onChange={(e) => onPatchRules({ strictClues: e.target.checked })}
            />
          </div>
        )}
      </div>
    </details>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="setup-field">
      <label className="setup-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}

function clampInt(value: string, min: number, max: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}
