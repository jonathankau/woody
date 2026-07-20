import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PackEditor } from './PackEditor'
import { loadCustomPacks } from '../../words'

beforeEach(() => {
  localStorage.clear()
})

function renderEditor() {
  const onClose = vi.fn()
  render(<PackEditor onClose={onClose} />)
  return { onClose }
}

describe('PackEditor a11y', () => {
  it('renders a labelled modal dialog', () => {
    renderEditor()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Word Packs')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = renderEditor()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on the Close button', async () => {
    const user = userEvent.setup()
    const { onClose } = renderEditor()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('PackEditor listing', () => {
  it('shows built-in packs read-only (exportable, not editable)', () => {
    renderEditor()
    expect(screen.getByText('General Mix')).toBeInTheDocument()
    expect(screen.getAllByText('Built-in').length).toBe(6)
  })

  it('opens a searchable review view for built-in packs', async () => {
    const user = userEvent.setup()
    renderEditor()

    const card = screen.getByText('Food & Going Out').closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Review' }))

    expect(screen.getByText('Review Food & Going Out')).toBeInTheDocument()
    expect(screen.getByLabelText('Search pairs')).toBeInTheDocument()
    expect(screen.getByText(/250 pairs/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search pairs'), 'boba')
    expect(screen.getAllByText(/boba shop/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/dessert run/i)).not.toBeInTheDocument()
  })
})

describe('PackEditor create', () => {
  it('creates a pack from inline pairs', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'New pack' }))
    await user.type(screen.getByLabelText('Pack name'), 'Inside Jokes')
    await user.type(screen.getByLabelText('Pair 1 word A'), 'cat')
    await user.type(screen.getByLabelText('Pair 1 word B'), 'dog')
    await user.click(screen.getByRole('button', { name: 'Save pack' }))

    await waitFor(() => {
      expect(screen.getByText('Inside Jokes')).toBeInTheDocument()
    })
    const saved = loadCustomPacks()
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Inside Jokes')
    expect(saved[0].pairs).toHaveLength(1)
  })

  it('shows validation errors for an invalid pack', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'New pack' }))
    // No name, no pairs.
    await user.click(screen.getByRole('button', { name: 'Save pack' }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(loadCustomPacks()).toHaveLength(0)
  })
})

describe('PackEditor import', () => {
  it('shows readable errors for bad JSON', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    await user.click(screen.getByLabelText('Paste pack JSON'))
    await user.paste('{ not json')
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(screen.getByText('Pack JSON is not valid JSON.')).toBeInTheDocument()
    expect(loadCustomPacks()).toHaveLength(0)
  })

  it('imports a valid pack from pasted JSON', async () => {
    const user = userEvent.setup()
    renderEditor()

    const json = JSON.stringify({
      version: 1,
      name: 'Imported Pack',
      pairs: [{ a: 'boba', b: 'matcha' }],
    })

    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    // paste avoids userEvent parsing braces as special keys
    await user.click(screen.getByLabelText('Paste pack JSON'))
    await user.paste(json)
    await user.click(screen.getByRole('button', { name: 'Import' }))

    await waitFor(() => {
      expect(screen.getByText('Imported Pack')).toBeInTheDocument()
    })
    expect(loadCustomPacks()).toHaveLength(1)
  })

  it('offers a file picker input for import', async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    const fileInput = screen.getByLabelText('Import pack from file')
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('.json'))
  })
})

describe('PackEditor export', () => {
  it('copies schema-valid JSON to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderEditor()

    // Built-in General Mix card has a Copy JSON button.
    const card = screen.getByText('General Mix').closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Copy JSON' }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const json = writeText.mock.calls[0][0] as string
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.name).toBe('General Mix')
    expect(Array.isArray(parsed.pairs)).toBe(true)
    expect(parsed.pairs[0]).toHaveProperty('a')
    expect(parsed.pairs[0]).toHaveProperty('b')
  })
})

describe('PackEditor delete', () => {
  it('deletes a custom pack after confirmation', async () => {
    const user = userEvent.setup()
    renderEditor()

    // Create one first.
    await user.click(screen.getByRole('button', { name: 'New pack' }))
    await user.type(screen.getByLabelText('Pack name'), 'Temp Pack')
    await user.type(screen.getByLabelText('Pair 1 word A'), 'x')
    await user.type(screen.getByLabelText('Pair 1 word B'), 'y')
    await user.click(screen.getByRole('button', { name: 'Save pack' }))

    await waitFor(() => expect(screen.getByText('Temp Pack')).toBeInTheDocument())

    const card = screen.getByText('Temp Pack').closest('li')!
    await user.click(within(card).getByRole('button', { name: 'Delete' }))
    await user.click(within(card).getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => expect(loadCustomPacks()).toHaveLength(0))
    expect(screen.queryByText('Temp Pack')).not.toBeInTheDocument()
  })
})
