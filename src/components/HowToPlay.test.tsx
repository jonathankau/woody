import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HowToPlay } from './HowToPlay'
import { HowToPlayButton } from './HowToPlayButton'
import { PRESETS, winChart } from '../engine'

const rules = PRESETS[0].rules(7)

describe('HowToPlay', () => {
  it('opens from a trigger button and renders all seven sections', async () => {
    const user = userEvent.setup()
    render(<HowToPlayButton rules={rules} />)
    await user.click(screen.getByTestId('howto-open'))
    const dialog = screen.getByRole('dialog', { name: 'How to Play' })
    for (const heading of ['Goal', 'Roles', 'Reveal', 'Round Loop', 'Voting', 'Baiban', 'Winning']) {
      expect(within(dialog).getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('has dialog a11y attributes', () => {
    render(<HowToPlay rules={rules} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'How to Play' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('renders win chart rows reflecting the current rules', () => {
    render(<HowToPlay rules={rules} onClose={() => {}} />)
    const rows = winChart(rules)
    for (const row of rows) {
      expect(screen.getByRole('rowheader', { name: row.team })).toBeInTheDocument()
    }
  })

  it('reflects a different ruleset (survive-after-undercovers adds a Baiban survival row)', () => {
    const classic = PRESETS[1].rules(7)
    render(<HowToPlay rules={classic} onClose={() => {}} />)
    expect(screen.getByText(/Still be alive when the last undercover/)).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HowToPlay rules={rules} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes via the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HowToPlay rules={rules} onClose={onClose} />)
    await user.click(screen.getByTestId('howto-close'))
    expect(onClose).toHaveBeenCalled()
  })
})
