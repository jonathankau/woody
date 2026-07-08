# Evaluation Summary

## Decision

Use Candidate A as the final base.

All three blind evaluators recommended Candidate A. Candidate A had the stronger rule engine, real 243-pair starter library, refresh-safe reveal behavior, generated rule summaries, and cleaner architecture. Candidate B had useful e2e scenarios and some calmer setup/UI ideas, but its live app used only 18 word pairs and duplicated game logic outside its tested modules.

## Incorporated

- Candidate A is the final implementation base.
- Candidate A's storage parse behavior is kept/fixed so corrupt saved games are treated as incompatible.
- Candidate A's Playwright e2e suite is present and covers full game flow, refresh privacy, back-button privacy, voting, Baiban/Mr. White, How to Play, and accessibility.
- UX fixes from evaluation:
  - setup footer is no longer sticky, avoiding mobile overlap
  - reset word history has a 44px tap target
  - active game screens expose an h1 for assistive tech
  - How to Play sheet is keyboard-focusable

## Candidate Notes

- Candidate A: `/Users/jkau/dev/side-projects/woody-claude`
- Candidate B: `/Users/jkau/dev/side-projects/woody-codex`

The final repo intentionally does not include the local candidate map.
