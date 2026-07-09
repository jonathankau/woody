import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoteScreen } from './VoteScreen'
import { createGame, presetById } from '../engine'
import type { GameConfig, GameState, RuleSet } from '../engine'

function makeGame(ruleOverrides: Partial<RuleSet> = {}, patch: Partial<GameState> = {}): GameState {
  const names = ['A', 'B', 'C', 'D']
  const rules = { ...presetById('woody-standard').rules(names.length), ...ruleOverrides }
  const config: GameConfig = {
    presetId: 'woody-standard',
    rules,
    playerNames: names,
    packIds: [],
  }
  const base = createGame(config, { id: 'p', packId: 'pk', a: 'Tea', b: 'Coffee' }, () => 0.3)
  return { ...base, phase: 'vote', ...patch }
}

describe('VoteScreen', () => {
  it('records the player the group voted off', async () => {
    const user = userEvent.setup()
    const onHost = vi.fn()
    render(<VoteScreen state={makeGame()} onHostEliminate={onHost} />)

    await user.click(screen.getByTestId('vote-eliminate-p1'))
    expect(onHost).toHaveBeenCalledWith('p1')
  })

  it('can record no elimination', async () => {
    const user = userEvent.setup()
    const onHost = vi.fn()
    render(<VoteScreen state={makeGame()} onHostEliminate={onHost} />)

    expect(screen.queryByTestId('vote-submit')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('vote-no-elimination'))
    expect(onHost).toHaveBeenCalledWith(null)
  })

  it('shows a PK banner and restricts candidates when pkCandidateIds is set', () => {
    render(
      <VoteScreen
        state={makeGame({}, { pkCandidateIds: ['p1', 'p2'] })}
        onHostEliminate={() => {}}
      />,
    )
    expect(screen.getByText(/PK revote/)).toBeInTheDocument()
    expect(screen.getByTestId('vote-eliminate-p1')).toBeInTheDocument()
    expect(screen.getByTestId('vote-eliminate-p2')).toBeInTheDocument()
    expect(screen.queryByTestId('vote-eliminate-p3')).not.toBeInTheDocument()
  })
})
