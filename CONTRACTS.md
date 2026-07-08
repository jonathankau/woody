# Module Contracts

Internal contract between workstreams. `src/engine/types.ts`, `src/words/types.ts`, and
`src/storage/local.ts` are the source of truth for types; this file pins the function-level
APIs each module must export. Do not change existing type/field names without updating all
consumers.

## `src/engine/index.ts` (rules engine — pure, no React, no localStorage)

```ts
export * from './types'

/** Current saved-state schema version. Bump on breaking GameState changes. */
export const SCHEMA_VERSION: number

/** Recommended counts per spec: 4-6 -> 1U/0B, 7-9 -> 2U/1B, 10-12 -> 3U/1B. */
export function recommendedRoleCounts(playerCount: number): { undercoverCount: number; baibanCount: 0 | 1 }

/** Preset definitions used by setup, the engine, and How to Play. */
export interface Preset { id: PresetId; name: string; tagline: string; details: string[]; rules(playerCount: number): RuleSet }
export const PRESETS: Preset[]

/** Validate a config before starting: player count 4-12, unique non-empty names,
 *  undercover/baiban counts leave >= 2 civilians, undercoverCount >= 1, etc.
 *  Returns readable error strings; empty array means valid. */
export function validateConfig(config: GameConfig): string[]

/** Create a fresh game: assigns roles randomly, randomizes which side of the pair is
 *  civilian vs undercover, builds reveal order (players array order), speaking order,
 *  and starting speaker (never Baiban).
 *  Initial phase: 'reveal-pass' with revealIndex 0. */
export function createGame(config: GameConfig, pair: { id: string; packId: string; a: string; b: string }, rng: Rng): GameState

/** Pure reducer for everything after game creation. Illegal actions for the current
 *  phase return the state unchanged. `rng` is used for counted PK/random fallback needs. */
export function reduce(state: GameState, action: GameAction, rng: Rng): GameState

/** One-line rule summary for setup + results header, e.g.
 *  "7 players · 2 undercovers · 1 Baiban · undercover wins at 1 civilian · Baiban guesses if eliminated". */
export function ruleSummary(config: GameConfig): string

/** Data for the How to Play win chart, generated from the same rule table. */
export interface WinChartRow { team: 'Civilians' | 'Undercovers' | 'Infiltrators' | 'Baiban'; how: string }
export function winChart(rules: RuleSet): WinChartRow[]

/** Helpers the UI may use for display. */
export function alivePlayers(state: GameState): Player[]
export function currentRevealPlayer(state: GameState): Player | null
export function startingSpeaker(state: GameState): Player | null
```

### Engine semantics (authoritative)

- Reveal: `reveal-pass` shows "Pass to [Name]" (players[revealIndex]); `SHOW_WORD` -> `reveal-show`;
  `HIDE_WORD` -> next player's `reveal-pass`, or `clue-order` after the last player.
- Baiban never starts: starting speaker selection excludes Baiban. If eliminations would put
  Baiban first in a later round, the next alive non-Baiban moves to the front.
- Clue order is randomized once at game creation and remains stable across rounds, dropping
  eliminated players.
- `HOST_ELIMINATE` is the production UI path: after the group votes out loud, the host enters the
  eliminated player id or `null` for no elimination.
- `SUBMIT_VOTE` is the counted-vote engine path for simulations and future UI variants:
  - plurality: unique max -> eliminate; tied max -> tie rule.
  - majority: unique max AND max > floor(aliveCount / 2) -> eliminate, else outcome 'no-majority', no elimination.
  - tie rules: 'pk-revote' -> phase back to 'vote' with pkCandidateIds = tied ids (record outcome 'tie');
    a tie *during* a PK revote -> no elimination. 'no-elimination' -> nobody out. 'host-decides' -> phase
    stays 'vote' with pkCandidateIds = tied ids and UI uses HOST_ELIMINATE.
  - All-zero/empty tallies count as a full tie among candidates.
- After any elimination: if eliminated player is Baiban and baibanRule is 'guess-on-elimination'
  and the game isn't already decided in Baiban's favor -> phase 'baiban-guess' (pendingBaibanGuessPlayerId set).
  `RESOLVE_BAIBAN_GUESS { correct: true }` -> winner 'baiban', phase 'results'.
  `{ correct: false }` -> run win check, then 'resolution' or 'results'.
- Win check order (after each elimination / guess resolution):
  1. Baiban 'survive-after-undercovers': all undercovers eliminated + Baiban alive -> winner 'baiban'.
  2. Civilians: all undercovers eliminated AND (baibanCount 0 or Baiban eliminated) -> 'civilians'.
  3. Undercover/infiltrator win per `undercoverWinRule`; when `infiltratorsWinTogether`, an alive
     Baiban counts as an infiltrator and winner is 'infiltrators', else requires an alive undercover
     and winner is 'undercovers'. 'last-two-or-three' threshold uses STARTING player count (>=6 -> 3, else 2).
- No elimination -> straight to 'resolution' with lastElimination null, then CONTINUE -> next round.
- CONTINUE from 'resolution': winner set -> 'results'; else round+1, new speaking order and
  starting speaker among alive players, phase 'clue-order'.
- Reducer never mutates; always returns new objects on change.

## `src/words/index.ts` (packs + selection + custom pack persistence)

```ts
export * from './types'

export const builtinPacks: WordPack[]   // 6 packs per spec, >= 200 pairs total

/** Parse + validate a custom pack JSON string or object. Readable errors, e.g.
 *  `Pair 3: "a" must be a non-empty string.` Enforces version 1, non-empty name,
 *  1-500 pairs, non-empty a/b, optional string[] tags, a !== b. Generates pack/pair ids. */
export function validateCustomPack(input: string | unknown): PackValidationResult

/** Serialize a pack back to the spec's JSON file format (version 1). */
export function exportPackToJSON(pack: WordPack): string

/** Custom pack persistence (localStorage via STORAGE_KEYS.customPacks). */
export function loadCustomPacks(): WordPack[]
export function saveCustomPack(pack: WordPack): void       // insert or replace by id
export function deleteCustomPack(packId: string): void

/** All packs (builtin + custom). */
export function allPacks(): WordPack[]

/** Used-pair no-repeat history (STORAGE_KEYS.usedPairIds). */
export function getUsedPairIds(): string[]
export function markPairUsed(pairId: string): void
export function resetUsedPairs(): void

/** Choose a random unused pair from the selected packs. If every pair in the
 *  selection has been used, `exhausted: true` and it picks from the full selection.
 *  Returns null only if the selection has no pairs at all. */
export function choosePair(packIds: string[], rng: Rng): { pair: WordPair & { packId: string }; exhausted: boolean } | null
```

## `src/features/packs/PackEditor.tsx` (custom pack editor UI)

```tsx
/** Modal for managing custom packs: create/edit pairs inline, import JSON (paste or file),
 *  export JSON (download/copy), delete pack. Calls onClose when dismissed; the setup screen
 *  re-reads allPacks() after close. Accessible: dialog role, focus trap, Escape closes. */
export function PackEditor(props: { onClose: () => void }): JSX.Element
```

## `src/storage/game.ts` (owned by UI workstream)

```ts
export function saveGame(state: GameState): void
export function loadGame(): { ok: true; state: GameState } | { ok: false; reason: 'none' | 'incompatible' }
export function clearGame(): void
```

- Envelope `{ schemaVersion, state }` under `STORAGE_KEYS.activeGame`; mismatched or
  unparseable versions -> 'incompatible' and the UI offers "Start new game".
- Privacy: when restoring a game whose phase is 'reveal-show', restore to 'reveal-pass'
  for the same revealIndex so a refresh never re-exposes a word without the pass gate.

## UI conventions

- Styling: plain CSS in `src/styles.css` (dark party theme, mobile-first, 44px+ touch
  targets, system font stack). Class names kebab-case, prefixed by screen (`setup-`,
  `reveal-`, `vote-`...). Shared primitives: `.btn`, `.btn-primary`, `.btn-ghost`,
  `.card`, `.sheet` (bottom sheet modal).
- Modals use `role="dialog"` + `aria-modal` + labelled title, Escape/backdrop close.
- No path routing; single `App` state machine. Back button handled with a pushState trap.
