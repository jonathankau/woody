/**
 * Core domain types for the Woody game engine.
 *
 * This file is the shared contract between the rules engine, the UI, and the
 * word-pack modules. The engine is a pure reducer over `GameState`; the UI
 * dispatches `GameAction`s and renders phases. All randomness is injected via
 * `Rng` so tests are deterministic.
 */

/** Uniform random in [0, 1). Inject `Math.random` in production code. */
export type Rng = () => number

export type Role = 'civilian' | 'undercover' | 'baiban'

export type PresetId = 'woody-standard' | 'classic-wodi' | 'mr-white'

/** What happens with the Baiban (blank/Mr. White) player. */
export type BaibanRule =
  /** Baiban gets one verbal guess at the civilian word when eliminated. */
  | 'guess-on-elimination'
  /** Baiban wins immediately if all undercovers are out while Baiban is alive. */
  | 'survive-after-undercovers'
  /** No special Baiban behavior beyond having no word. */
  | 'off'

export type UndercoverWinRule =
  /**
   * Undercovers win when total alive players drop to 3 (for games that
   * started with 6+ players) or 2 (for smaller games), with an undercover alive.
   */
  | 'last-two-or-three'
  /** Undercovers (or infiltrators, see `infiltratorsWinTogether`) win when only 1 civilian remains. */
  | 'one-civilian-left'
  /** Undercovers win when alive civilians <= alive undercovers + 1. */
  | 'parity-plus-one'

export type VoteRule =
  /** Highest public vote count is eliminated; ties go to the tie rule. */
  | 'plurality'
  /** Elimination requires a strict majority of alive voters; otherwise nobody is out. */
  | 'majority'
  /** Host directly selects who (or nobody) is eliminated. */
  | 'host-decides'

export type TieRule =
  /** Tied players face a PK revote; a second tie means no elimination. */
  | 'pk-revote'
  | 'no-elimination'
  | 'host-decides'

export type StartingSpeakerRule =
  /** Random alive non-Baiban player. */
  | 'random'
  /** Host picks the starting speaker on the clue-order screen (never Baiban). */
  | 'host-chooses'
  /** Rotate through alive non-Baiban players round to round. */
  | 'rotate'

export interface RuleSet {
  undercoverCount: number
  /** V1 supports 0 or 1 Baiban. */
  baibanCount: 0 | 1
  baibanRule: BaibanRule
  undercoverWinRule: UndercoverWinRule
  /**
   * When true (Undercover / Mr. White preset), Baiban counts as an
   * infiltrator: an alive Baiban satisfies the undercover win condition and
   * shares the win. When false, the undercover win requires an alive
   * undercover, and civilians must also eliminate Baiban to win.
   */
  infiltratorsWinTogether: boolean
  voteRule: VoteRule
  tieRule: TieRule
  startingSpeakerRule: StartingSpeakerRule
  /** Classic mode option: clues must be true statements about your word. */
  strictClues: boolean
}

export interface GameConfig {
  presetId: PresetId
  rules: RuleSet
  playerNames: string[]
  /** Word pack ids selected in setup (builtin and custom). */
  packIds: string[]
}

export interface Player {
  id: string
  name: string
  role: Role
  /** The player's word; null for Baiban. */
  word: string | null
  eliminated: boolean
  /** Round the player was eliminated in (1-based), if eliminated. */
  eliminatedRound: number | null
}

/** The word pair in play, after civilian/undercover side randomization. */
export interface ActivePair {
  pairId: string
  packId: string
  civilianWord: string
  undercoverWord: string
}

export type Phase =
  /** `Pass to [Name]` interstitial before a private reveal. */
  | 'reveal-pass'
  /** The current player is privately viewing their word (or no-word notice). */
  | 'reveal-show'
/** Clue order screen: shows speaking order and starting speaker. */
  | 'clue-order'
  /** Legacy saved-game phase; new UI goes from clue order directly to vote. */
  | 'discussion'
  /** Public vote entry (tallies or host decision). */
  | 'vote'
  /** Round outcome: who was eliminated (or nobody) and their role. */
  | 'resolution'
  /** Host adjudicates the eliminated Baiban's verbal guess. */
  | 'baiban-guess'
  /** Game over: full roles and words revealed. */
  | 'results'

export type Winner = 'civilians' | 'undercovers' | 'infiltrators' | 'baiban'

/** A named bundle of rules, used by setup, the engine, and How to Play. */
export interface Preset {
  id: PresetId
  name: string
  tagline: string
  details: string[]
  rules(playerCount: number): RuleSet
}

/** One row of the How to Play win chart. */
export interface WinChartRow {
  team: 'Civilians' | 'Undercovers' | 'Infiltrators' | 'Baiban'
  how: string
}

export type VoteOutcome =
  | 'eliminated'
  | 'tie'
  | 'no-majority'
  | 'no-elimination'
  | 'host-decided'

export interface VoteRecord {
  round: number
  isPK: boolean
  /** Public tally: alive player id -> number of votes received. */
  counts: Record<string, number>
  outcome: VoteOutcome
  eliminatedPlayerId: string | null
}

export interface Elimination {
  playerId: string
  role: Role
  round: number
}

export interface GameState {
  schemaVersion: number
  config: GameConfig
  players: Player[]
  pair: ActivePair
  /** 1-based round counter. */
  round: number
  phase: Phase
  /** Index into `players` during the reveal phase. */
  revealIndex: number
  /** Speaking order for the current round (alive player ids). */
  speakingOrder: string[]
  /** Rotation cursor for the `rotate` starting-speaker rule. */
  rotationIndex: number
  votes: VoteRecord[]
  /** Restricted candidates during a PK revote, else null. */
  pkCandidateIds: string[] | null
  /** Set while waiting on the host to adjudicate a Baiban guess. */
  pendingBaibanGuessPlayerId: string | null
  /** The most recent elimination, for the resolution screen. */
  lastElimination: Elimination | null
  /** Outcome of the most recent vote, for the resolution screen. */
  lastVoteOutcome: VoteOutcome | null
  winner: Winner | null
}

export type GameAction =
  /** `Pass to [Name]` acknowledged; show that player's private word. */
  | { type: 'SHOW_WORD' }
  /** Player hides their word; advance to the next reveal or to clue order. */
  | { type: 'HIDE_WORD' }
  /** Host picked the starting speaker (host-chooses rule only; never Baiban). */
  | { type: 'CHOOSE_STARTING_SPEAKER'; playerId: string }
  /** Legacy action for old saved flows; current UI skips straight to voting. */
  | { type: 'BEGIN_DISCUSSION' }
  /** Clue order or legacy discussion done; move to vote entry. */
  | { type: 'BEGIN_VOTE' }
  /**
   * Counted-vote engine path (used by simulations and tests). Keys must be
   * alive player ids — only `pkCandidateIds` when a PK revote is active.
   */
  | { type: 'SUBMIT_VOTE'; counts: Record<string, number> }
  /** Production UI path: host enters who was eliminated, or nobody. */
  | { type: 'HOST_ELIMINATE'; playerId: string | null }
  /** Host adjudicates the Baiban's verbal guess. */
  | { type: 'RESOLVE_BAIBAN_GUESS'; correct: boolean }
  /** Leave the resolution screen: next round, or results if the game ended. */
  | { type: 'CONTINUE' }
