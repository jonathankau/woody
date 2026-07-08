import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoteScreen } from './VoteScreen'
import { createGame, PRESETS } from '../engine'
import type { GameConfig, GameState, RuleSet } from '../engine'

function makeGame(ruleOverrides: Partial<RuleSet> = {}, patch: Partial<GameState> = {}): GameState {
  const names = ['A', 'B', 'C', 'D']
  const rules = { ...PRESETS[0].rules(names.length), ...ruleOverrides }
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
  it('steppers build a SUBMIT_VOTE counts map', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<VoteScreen state={makeGame()} onSubmit={onSubmit} onHostEliminate={() => {}} />)

    await user.click(screen.getByTestId('vote-stepper-inc-p1'))
    await user.click(screen.getByTestId('vote-stepper-inc-p1'))
    await user.click(screen.getByTestId('vote-stepper-inc-p2'))
    await user.click(screen.getByTestId('vote-submit'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const counts = onSubmit.mock.calls[0][0]
    expect(counts.p1).toBe(2)
    expect(counts.p2).toBe(1)
  })

  it('renders candidate buttons in host-decides mode', async () => {
    const user = userEvent.setup()
    const onHost = vi.fn()
    render(
      <VoteScreen
        state={makeGame({ voteRule: 'host-decides' })}
        onSubmit={() => {}}
        onHostEliminate={onHost}
      />,
    )
    expect(screen.queryByTestId('vote-submit')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('vote-host-pick-p1'))
    expect(onHost).toHaveBeenCalledWith('p1')
    await user.click(screen.getByTestId('vote-no-elimination'))
    expect(onHost).toHaveBeenCalledWith(null)
  })

  it('shows a PK banner and restricts candidates when pkCandidateIds is set', () => {
    render(
      <VoteScreen
        state={makeGame({}, { pkCandidateIds: ['p1', 'p2'] })}
        onSubmit={() => {}}
        onHostEliminate={() => {}}
      />,
    )
    expect(screen.getByText(/PK revote/)).toBeInTheDocument()
    expect(screen.getByTestId('vote-stepper-inc-p1')).toBeInTheDocument()
    expect(screen.getByTestId('vote-stepper-inc-p2')).toBeInTheDocument()
    expect(screen.queryByTestId('vote-stepper-inc-p3')).not.toBeInTheDocument()
  })

  it('warns when total votes exceed alive players without blocking submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<VoteScreen state={makeGame()} onSubmit={onSubmit} onHostEliminate={() => {}} />)
    // 4 alive; push 5 votes onto p1.
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByTestId('vote-stepper-inc-p1'))
    }
    expect(screen.getByText(/more votes than players/)).toBeInTheDocument()
    await user.click(screen.getByTestId('vote-submit'))
    expect(onSubmit).toHaveBeenCalled()
  })
})
