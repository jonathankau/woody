# Woody — Implementation Notes

Independent candidate implementation. Spec: `2026-07-07 woody-implementation-spec.md`.

## Architecture

- **Stack:** Vite 6 + React 19 + TypeScript (strict) + Vitest + Playwright. Static build for GitHub Pages with `base: "/woody/"`. No routing library — a single SPA state machine, so no 404s on Pages.
- **Engine** (`src/engine/`): pure reducer (`createGame` + `reduce(state, action, rng)`) over `GameState`. All randomness injected via `Rng` for deterministic tests. Presets, rule summary, and How to Play win chart all derive from the same `PRESETS`/`RuleSet` table.
- **Words** (`src/words/`): built-in packs as typed data, custom pack import/export/validation, used-pair no-repeat history with reset.
- **UI** (`src/App.tsx`, `src/screens/`, `src/components/`): screens per phase, persistence in `src/storage/`, How to Play bottom sheets with inline SVG diagrams.
- **Contracts:** module APIs pinned in `CONTRACTS.md`; shared types in `src/engine/types.ts` and `src/words/types.ts`.

## Key decisions

- `parity-plus-one` implements the spec's "civilians = undercovers + 1" threshold as: undercovers win when alive civilians <= alive undercovers + 1.
- Second tie during a PK revote -> no elimination (spec implies via "PK second tie" test).
- `infiltratorsWinTogether` flag distinguishes Mr. White (alive Baiban counts toward and shares the undercover-side win, winner label "infiltrators") from Woody Standard (undercover win needs an alive undercover).
- Classic Wo Di uses `survive-after-undercovers` for Baiban (no guess on elimination); a correct guess win is only in `guess-on-elimination` modes.
- Refresh-privacy: a game saved during `reveal-show` restores to `reveal-pass` for the same player, so the pass gate always precedes a word. Back button is trapped via pushState.
- Saved game envelope carries `schemaVersion`; mismatch offers "Start new game" instead of crashing.
- Node 25's experimental built-in `localStorage` shadows jsdom's in Vitest, so the test scripts set `NODE_OPTIONS=--no-experimental-webstorage` (harmless on Node 22, which CI uses).

## Workstreams

Built by parallel subagents against `CONTRACTS.md`:

1. **Rules engine + unit tests** — pure reducer in `src/engine/` (presets, validation, vote/tie/win logic, Baiban guess, reveal flow), 85 tests including one full-game simulation per preset and reducer-purity checks.
2. **Word packs + custom pack editor** — 243 pairs across the 6 spec packs, custom pack import/export/validation with readable errors, used-pair history, `PackEditor` dialog; 53 tests.
3. **UI / game flow** — screens per phase, setup with presets/advanced overrides/pack selection/draft persistence, auto-save + restore, back-button pushState trap, How to Play bottom sheet with SVG diagrams and `winChart()`-driven win chart; ~33 component tests.
4. **Playwright + accessibility** — mobile (Pixel 7) e2e per the spec matrix plus axe scans of key screens. Tests deduce roles by recording words during the reveal pass (minority word = undercover, no word = Baiban), then vote deterministically.

## Evaluation And Incorporation

Three blind evaluator agents compared the two independent candidate builds. All recommended Candidate A as the base because it wired the live app to the tested reducer/state-machine, shipped the full starter word library, and handled reveal privacy more reliably.

Incorporated fixes after evaluation:

- kept/fixed corrupt-save detection so unparseable storage is incompatible, not missing
- added/kept Playwright e2e coverage for full flow, refresh privacy, back privacy, voting, How to Play, accessibility, and Baiban/Mr. White
- removed the sticky setup footer overlap on mobile
- increased the reset-history tap target
- added a screen-reader h1 to active game screens
- made the How to Play sheet keyboard-focusable

## Verification

Commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

Results are recorded in the final assistant response for the run that published the repo.
