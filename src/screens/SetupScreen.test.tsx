import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupScreen } from './SetupScreen'
import { PRESETS, ruleSummary } from '../engine'
import { allPacks } from '../words'

function renderSetup() {
  const onStart = vi.fn()
  render(<SetupScreen onStart={onStart} />)
  return { onStart }
}

describe('SetupScreen', () => {
  it('shows a rule summary matching the engine for the default config', () => {
    renderSetup()
    const preset = PRESETS[0]
    const expected = ruleSummary({
      presetId: preset.id,
      rules: preset.rules(4),
      playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
      packIds: [],
    })
    expect(screen.getByTestId('setup-summary')).toHaveTextContent(expected)
  })

  it('updates the rule summary when the preset changes', async () => {
    const user = userEvent.setup()
    renderSetup()
    const before = screen.getByTestId('setup-summary').textContent
    await user.click(screen.getByRole('radio', { name: /Classic Wo Di/ }))
    const after = screen.getByTestId('setup-summary').textContent
    // Classic uses a different win threshold phrasing.
    expect(after).not.toEqual(before)
    expect(after).toContain('at last')
  })

  it('changing an advanced override changes the summary', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByText('Advanced settings'))
    const summaryBefore = screen.getByTestId('setup-summary').textContent
    const undercover = screen.getByLabelText('Undercovers') as HTMLInputElement
    await user.clear(undercover)
    await user.type(undercover, '2')
    expect(screen.getByTestId('setup-summary').textContent).not.toEqual(summaryBefore)
    expect(screen.getByTestId('setup-summary')).toHaveTextContent('2 undercovers')
  })

  it('auto-fills recommended counts when player count changes (no manual override)', async () => {
    const user = userEvent.setup()
    renderSetup()
    // Default 4 players -> 1 undercover, 0 baiban.
    expect(screen.getByTestId('setup-summary')).toHaveTextContent('1 undercover')
    expect(screen.getByTestId('setup-summary')).not.toHaveTextContent('Baiban')
    // Add players to reach 7 -> 2 undercovers, 1 baiban recommended.
    await user.click(screen.getByRole('button', { name: 'Add player' }))
    await user.click(screen.getByRole('button', { name: 'Add player' }))
    await user.click(screen.getByRole('button', { name: 'Add player' }))
    expect(screen.getByTestId('setup-summary')).toHaveTextContent('2 undercovers')
    expect(screen.getByTestId('setup-summary')).toHaveTextContent('1 Baiban')
  })

  it('stops auto-filling counts once the host overrides them', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByText('Advanced settings'))
    const undercover = screen.getByLabelText('Undercovers') as HTMLInputElement
    await user.clear(undercover)
    await user.type(undercover, '2')
    // Now grow to 7 players; count should stay at the overridden 2 (recommended is also 2 here),
    // so bump to check it does NOT jump to 3 at 10 players.
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole('button', { name: 'Add player' }))
    }
    // 10 players recommends 3 undercovers, but override keeps 2.
    expect(screen.getByTestId('setup-summary')).toHaveTextContent('2 undercovers')
  })

  it('renders validation errors on start when names are duplicated', async () => {
    const user = userEvent.setup()
    const { onStart } = renderSetup()
    const inputs = screen.getAllByLabelText(/Player \d+ name/)
    await user.clear(inputs[1])
    await user.type(inputs[1], 'Player 1')
    await user.click(screen.getByTestId('setup-start'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('toggles pack selection', async () => {
    const user = userEvent.setup()
    renderSetup()
    const packs = allPacks().filter((p) => p.builtIn)
    const first = packs[0]
    const checkbox = screen.getByRole('checkbox', { name: new RegExp(first.name) })
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('starts a game with a valid config', async () => {
    const user = userEvent.setup()
    const { onStart } = renderSetup()
    await user.click(screen.getByTestId('setup-start'))
    expect(onStart).toHaveBeenCalledTimes(1)
    const [state] = onStart.mock.calls[0]
    expect(state.phase).toBe('reveal-pass')
    expect(state.players).toHaveLength(4)
  })

  it('shows unused-pair counts and can reset word history', async () => {
    const user = userEvent.setup()
    renderSetup()
    expect(screen.getByText(/pairs unused in this selection/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset word history' }))
    const dialog = screen.getByRole('dialog', { name: 'Reset word history' })
    await user.click(within(dialog).getByRole('button', { name: 'Reset history' }))
    expect(screen.queryByRole('dialog', { name: 'Reset word history' })).not.toBeInTheDocument()
  })
})
