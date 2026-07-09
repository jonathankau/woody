import { expect, type Page } from '@playwright/test'

/**
 * E2E helpers for driving the real Woody UI.
 *
 * The game is random (roles, words, which side of a pair is civilian vs
 * undercover) but *fully observable*: during the private reveal each player's
 * word is shown on screen, and the Whiteboard sees a no-word notice. So we walk the
 * reveal, capture each player's word, and then infer teams purely from word
 * frequency:
 *   - the majority word  -> civilians
 *   - the minority word  -> undercovers
 *   - no word (Whiteboard notice) -> baiban
 * That lets every downstream test vote deterministically to force an outcome
 * without ever importing engine internals.
 */

export type Team = 'civilian' | 'undercover' | 'baiban'

export interface RosterEntry {
  /** 0-based position in the reveal order (== players-array index). */
  index: number
  name: string
  /** The player's word, or null for the Whiteboard. */
  word: string | null
  team: Team
}

export interface SetupOptions {
  playerCount: number
  /** Preset card label as shown in setup (defaults to Classic Wo Di). */
  preset?: 'Woody Standard' | 'Classic Wo Di' | 'Undercover / Whiteboard'
  /** Custom player names; defaults to the app's "Player N" names. */
  names?: string[]
}

/**
 * Clear all Woody localStorage before the app boots so every test starts from a
 * pristine setup screen (no restored game, no used-pair history, no saved
 * setup draft that could change defaults).
 */
export async function freshApp(page: Page): Promise<void> {
  await page.goto('/woody/')
  await page.evaluate('window.localStorage.clear()')
  await page.goto('/woody/')
  await expect(page.getByTestId('setup-start')).toBeVisible()
}

/** Set the player count on the setup screen by adding/removing rows. */
async function setPlayerCount(page: Page, count: number): Promise<void> {
  // "Players (N)" heading reflects the current count.
  const heading = page.getByRole('heading', { name: /^Players \(\d+\)$/ })
  const readCount = async (): Promise<number> => {
    const text = (await heading.textContent()) ?? ''
    const m = text.match(/\((\d+)\)/)
    return m ? Number(m[1]) : 0
  }

  let current = await readCount()
  while (current < count) {
    await page.getByRole('button', { name: 'Add player', exact: true }).click()
    await expect(heading).toHaveText(`Players (${current + 1})`)
    current += 1
  }
  while (current > count) {
    // Remove the last player row each time.
    await page.getByRole('button', { name: `Remove player ${current}` }).click()
    await expect(heading).toHaveText(`Players (${current - 1})`)
    current -= 1
  }
}

/** Configure the setup screen and start the game, landing on the first reveal. */
export async function configureAndStart(
  page: Page,
  opts: SetupOptions,
): Promise<void> {
  await setPlayerCount(page, opts.playerCount)

  if (opts.names) {
    for (let i = 0; i < opts.names.length; i++) {
      await page.getByLabel(`Player ${i + 1} name`).fill(opts.names[i])
    }
  }

  if (opts.preset) {
    await page.getByRole('radio', { name: new RegExp(opts.preset) }).click()
  }

  await page.getByTestId('setup-start').click()
  // First reveal-pass gate.
  await expect(page.getByTestId('reveal-pass-show')).toBeVisible()
}

/**
 * Walk the entire reveal flow, capturing each player's word, and return the
 * inferred roster. Lands the app on the clue-order screen when done.
 */
export async function walkRevealsAndBuildRoster(page: Page): Promise<RosterEntry[]> {
  const captured: { index: number; name: string; word: string | null }[] = []

  // "Player X of Y" tells us how many reveals to walk.
  const progress = page.locator('.reveal-progress')
  await expect(progress).toBeVisible()
  const progressText = (await progress.textContent()) ?? ''
  const total = Number(progressText.match(/of (\d+)/)?.[1] ?? '0')
  expect(total).toBeGreaterThan(0)

  for (let i = 0; i < total; i++) {
    // On the pass gate the word must NOT be present.
    await expect(page.getByTestId('reveal-pass-show')).toBeVisible()
    await expect(page.getByTestId('reveal-word')).toHaveCount(0)

    // The pass button reads "I'm <Name> — show my word".
    const passLabel = (await page.getByTestId('reveal-pass-show').textContent()) ?? ''
    const name = passLabel.replace(/^I'm\s+/, '').replace(/\s*—.*$/, '').trim()

    await page.getByTestId('reveal-pass-show').click()

    // Now the word (or the Whiteboard "—" no-word marker) is visible.
    const wordEl = page.getByTestId('reveal-word')
    await expect(wordEl).toBeVisible()
    const isBaiban = (await wordEl.getAttribute('class'))?.includes('reveal-show-noword')
    const rawWord = (await wordEl.textContent())?.trim() ?? ''
    captured.push({ index: i, name, word: isBaiban ? null : rawWord })

    await page.getByTestId('reveal-hide').click()
  }

  // After the last hide we should be on clue order.
  await expect(page.getByTestId('clue-order-continue')).toBeVisible()

  return inferTeams(captured)
}

/** Classify captured words into teams by frequency (majority = civilian). */
function inferTeams(
  captured: { index: number; name: string; word: string | null }[],
): RosterEntry[] {
  const counts = new Map<string, number>()
  for (const c of captured) {
    if (c.word === null) continue
    counts.set(c.word, (counts.get(c.word) ?? 0) + 1)
  }
  // Majority word is the civilian word.
  let civilianWord: string | null = null
  let maxCount = -1
  for (const [word, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      civilianWord = word
    }
  }

  return captured.map((c) => {
    let team: Team
    if (c.word === null) team = 'baiban'
    else if (c.word === civilianWord) team = 'civilian'
    else team = 'undercover'
    return { index: c.index, name: c.name, word: c.word, team }
  })
}

/** Advance clue-order -> vote, landing on the vote screen. */
export async function advanceToVote(page: Page): Promise<void> {
  await page.getByTestId('clue-order-continue').click()
  await expect(page.getByTestId('vote-no-elimination')).toBeVisible()
}

/**
 * Map candidate names (as shown on the current vote screen) to their engine
 * player ids by reading each result button's data-testid. Only alive candidates
 * (or PK candidates) appear.
 */
export async function voteCandidateIdByName(page: Page): Promise<Map<string, string>> {
  const buttons = page.locator('[data-testid^="vote-eliminate-"]')
  const count = await buttons.count()
  const map = new Map<string, string>()
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i)
    const name = (await button.textContent())?.trim() ?? ''
    const testId = (await button.getAttribute('data-testid')) ?? ''
    const id = testId.replace('vote-eliminate-', '')
    if (name && id) map.set(name, id)
  }
  return map
}

/**
 * Enter a plurality vote (from clue-order onward) against a single named target
 * and submit. Assumes the game is already on the clue-order screen. Bumps the
 * target once for a clean plurality of 1. Lands on resolution / baiban-guess /
 * results depending on what the elimination triggers.
 */
export async function playRoundVotingOut(page: Page, targetName: string): Promise<void> {
  await advanceToVote(page)
  const ids = await voteCandidateIdByName(page)
  const id = ids.get(targetName)
  if (!id) throw new Error(`No vote candidate named "${targetName}". Candidates: ${[...ids.keys()].join(', ')}`)
  await page.getByTestId(`vote-eliminate-${id}`).click()
}

/** Advance a fresh round's reveal-less loop: clue-order -> vote. */
export async function continueRound(page: Page): Promise<void> {
  await expect(page.getByTestId('resolution-continue')).toBeVisible()
  await page.getByTestId('resolution-continue').click()
}
