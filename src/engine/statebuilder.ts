import type { GameConfig, GameState, Phase, Player, Role, RuleSet } from './types'
import { SCHEMA_VERSION } from './version'
import { presetById } from './presets'

interface Spec {
  id: string
  role: Role
  eliminated?: boolean
}

/**
 * Build a fully-controlled GameState for unit tests. Roles/alive status are
 * explicit so vote and win logic can be exercised in isolation.
 */
export function makeState(opts: {
  players: Spec[]
  rules?: Partial<RuleSet>
  phase?: Phase
  round?: number
  pkCandidateIds?: string[] | null
  pendingBaibanGuessPlayerId?: string | null
}): GameState {
  const playerCount = opts.players.length
  const base = presetById('woody-standard').rules(playerCount)
  const rules: RuleSet = { ...base, ...opts.rules }

  const players: Player[] = opts.players.map((s) => ({
    id: s.id,
    name: `Name-${s.id}`,
    role: s.role,
    word: s.role === 'baiban' ? null : s.role === 'undercover' ? 'U' : 'C',
    eliminated: s.eliminated ?? false,
    eliminatedRound: s.eliminated ? 1 : null,
  }))

  const config: GameConfig = {
    presetId: 'woody-standard',
    rules,
    playerNames: opts.players.map((_, i) => `Name-p${i + 1}`),
    packIds: ['pack1'],
  }

  const alive = players.filter((p) => !p.eliminated).map((p) => p.id)

  return {
    schemaVersion: SCHEMA_VERSION,
    config,
    players,
    pair: { pairId: 'pair1', packId: 'pack1', civilianWord: 'C', undercoverWord: 'U' },
    round: opts.round ?? 1,
    phase: opts.phase ?? 'vote',
    revealIndex: 0,
    speakingOrder: alive,
    rotationIndex: 0,
    votes: [],
    pkCandidateIds: opts.pkCandidateIds ?? null,
    pendingBaibanGuessPlayerId: opts.pendingBaibanGuessPlayerId ?? null,
    lastElimination: null,
    lastVoteOutcome: null,
    winner: null,
  }
}
