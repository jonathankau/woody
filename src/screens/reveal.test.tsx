import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GameConfig, GameState } from '../engine'
import { createGame, PRESETS } from '../engine'
import { RevealPassScreen } from './RevealPassScreen'
import { RevealShowScreen } from './RevealShowScreen'

/** Deterministic rng feeding a fixed sequence (loops). */
function seqRng(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

function makeGame(overrideBaiban = false): GameState {
  const names = ['Ana', 'Bo', 'Cy', 'Dee', 'Ed', 'Fi', 'Gus']
  const rules = { ...PRESETS[0].rules(names.length), baibanCount: 1 as const }
  const config: GameConfig = {
    presetId: 'woody-standard',
    rules,
    playerNames: names,
    packIds: [],
  }
  // Fixed rng so role assignment is stable within the test.
  const rng = seqRng(overrideBaiban ? [0.9, 0.1, 0.2, 0.3, 0.4] : [0.1, 0.2, 0.3, 0.4, 0.5])
  return createGame(config, { id: 'pair-1', packId: 'pk', a: 'Tea', b: 'Coffee' }, rng)
}

describe('reveal visibility matrix', () => {
  it('does not render any word during reveal-pass', () => {
    const game = makeGame()
    render(<RevealPassScreen state={game} onShow={() => {}} />)
    // Neither pair word appears on the pass screen.
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()
    expect(screen.queryByTestId('reveal-word')).not.toBeInTheDocument()
  })

  it('shows only the current player word after show, and no other player word', () => {
    const game = makeGame()
    const current = game.players[game.revealIndex]
    const showState: GameState = { ...game, phase: 'reveal-show' }
    render(<RevealShowScreen state={showState} onHide={() => {}} />)

    const wordEl = screen.getByTestId('reveal-word')
    if (current.word === null) {
      // Baiban: no word shown.
      expect(wordEl).toHaveTextContent('—')
      expect(screen.getByText(/You have NO word/)).toBeInTheDocument()
    } else {
      expect(wordEl).toHaveTextContent(current.word)
      // The other side of the pair must not appear.
      const other = current.word === 'Tea' ? 'Coffee' : 'Tea'
      expect(screen.queryByText(other)).not.toBeInTheDocument()
    }
  })

  it('shows the Baiban no-word notice and never a word', () => {
    const game = makeGame()
    // Find a Baiban and point revealIndex at them.
    const baibanIndex = game.players.findIndex((p) => p.word === null)
    expect(baibanIndex).toBeGreaterThanOrEqual(0)
    const showState: GameState = {
      ...game,
      phase: 'reveal-show',
      revealIndex: baibanIndex,
    }
    render(<RevealShowScreen state={showState} onHide={() => {}} />)
    expect(screen.getByText(/You have NO word/)).toBeInTheDocument()
    expect(screen.getByTestId('reveal-word')).toHaveTextContent('—')
    expect(screen.queryByText('Tea')).not.toBeInTheDocument()
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument()
  })

  it('the next pass screen after hide shows no word', async () => {
    const user = userEvent.setup()
    const game = makeGame()
    // Simulate advancing to the next player's pass screen.
    const nextPass: GameState = {
      ...game,
      phase: 'reveal-pass',
      revealIndex: game.revealIndex + 1,
    }
    render(<RevealPassScreen state={nextPass} onShow={() => {}} />)
    expect(screen.queryByTestId('reveal-word')).not.toBeInTheDocument()
    // The show button exists but no word until tapped.
    expect(screen.getByTestId('reveal-pass-show')).toBeInTheDocument()
    await user.click(screen.getByTestId('reveal-pass-show'))
    // Still no word in this isolated pass screen (parent would transition).
    expect(screen.queryByTestId('reveal-word')).not.toBeInTheDocument()
  })
})
