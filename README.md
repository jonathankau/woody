# Woody

A one-phone party word game inspired by 谁是卧底 (Wo Di / "Who's the Undercover").

Civilians all get the same word. Undercovers get a related-but-different word. One
player — the Baiban — gets nothing and has to bluff. Pass the phone for private
reveals, give clues, discuss, vote in the open, and figure out who's faking.

## Play

- 4–12 players, one phone, no accounts, no internet needed after load.
- Three presets: **Woody Standard**, **Classic Wo Di**, and **Undercover / Mr. White**,
  plus advanced overrides for role counts, Baiban behavior, and strict clues.
- Clue order is randomized once per game, stays stable across rounds, and never
  starts with Baiban.
- Six built-in word packs with 250 pairs each, plus a custom pack editor with
  JSON import/export.
- Game state persists across refresh and sleep; a refresh can never leak another
  player's word.

## Develop

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # tsc
npm run lint       # eslint
npm test           # vitest unit + component tests
npm run build      # production build (GitHub Pages base /woody/)
npm run test:e2e   # playwright mobile e2e (builds + previews automatically)
```

Deploys to GitHub Pages from the `gh-pages` branch. The local GitHub token in this
environment cannot push workflow files, so this repo uses branch-based Pages
instead of Actions:

```sh
npm run build
git subtree push --prefix dist origin gh-pages
```

Architecture notes live in `IMPLEMENTATION_NOTES.md`; internal module contracts
live in `CONTRACTS.md`.
