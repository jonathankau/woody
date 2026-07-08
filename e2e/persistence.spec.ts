import { test, expect } from '@playwright/test'
import {
  freshApp,
  configureAndStart,
  walkRevealsAndBuildRoster,
  advanceToVote,
} from './helpers'

/**
 * 4. Refresh mid-game restores safely.
 *
 * (a) Refresh while a word is visible (reveal-show): the restored app must be
 *     back at the "Pass to [same player]" gate with NO word visible until the
 *     player taps show again.
 * (b) Refresh during the vote phase: resumes on the vote screen.
 */
test('refresh during reveal-show resumes at the pass gate with no word', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 4, preset: 'Woody Standard' })

  // Reveal player 1's word so a word is on screen.
  const passLabel = (await page.getByTestId('reveal-pass-show').textContent()) ?? ''
  const name = passLabel.replace(/^I'm\s+/, '').replace(/\s*—.*$/, '').trim()
  await page.getByTestId('reveal-pass-show').click()
  await expect(page.getByTestId('reveal-word')).toBeVisible()
  const shownWord = (await page.getByTestId('reveal-word').textContent())?.trim() ?? ''

  // Refresh: the privacy guard must drop us back to the pass gate.
  await page.reload()

  // Back on the pass gate for the SAME player, word hidden.
  await expect(page.getByTestId('reveal-pass-show')).toBeVisible()
  await expect(page.getByTestId('reveal-pass-show')).toContainText(name)
  await expect(page.getByTestId('reveal-word')).toHaveCount(0)
  // The word text must not be lingering anywhere on the page.
  if (shownWord && shownWord !== '—') {
    await expect(page.locator('body')).not.toContainText(shownWord)
  }

  // Tapping show reveals it again (same player, same reveal index).
  await page.getByTestId('reveal-pass-show').click()
  await expect(page.getByTestId('reveal-word')).toBeVisible()
})

test('refresh during vote phase resumes on the vote screen', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 4, preset: 'Woody Standard' })
  await walkRevealsAndBuildRoster(page)
  await advanceToVote(page)

  await expect(page.getByTestId('vote-no-elimination')).toBeVisible()
  await page.reload()

  // Vote phase is not privacy-sensitive; it resumes in place.
  await expect(page.getByTestId('vote-no-elimination')).toBeVisible()
})

/**
 * 5. Back button cannot reveal a previous player's word.
 *
 * After player 1 hides and player 2's pass screen is showing, pressing the
 * browser Back button must NOT step back into player 1's word. The pushState
 * trap re-arms and the app stays on the pass gate; player 1's word never
 * reappears.
 */
test('back button cannot reveal the previous word', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 4, preset: 'Woody Standard' })

  // Player 1: reveal + hide.
  await page.getByTestId('reveal-pass-show').click()
  await expect(page.getByTestId('reveal-word')).toBeVisible()
  const p1Word = (await page.getByTestId('reveal-word').textContent())?.trim() ?? ''
  await page.getByTestId('reveal-hide').click()

  // Now on player 2's pass gate.
  await expect(page.getByTestId('reveal-pass-show')).toBeVisible()
  await expect(page.getByTestId('reveal-word')).toHaveCount(0)

  // Press Back a few times; the trap must keep us out of any prior word.
  // The pushState trap re-arms on popstate, so history.back() never actually
  // navigates the SPA. We fire it via the history API (page.goBack can hang
  // waiting for a navigation that never happens) and poll on the stable state.
  for (let i = 0; i < 3; i++) {
    await page.evaluate('window.history.back()')
  }
  // The trap keeps us on a reveal-pass gate; poll until that's stable.
  await expect(page.getByTestId('reveal-pass-show')).toBeVisible()

  // Still no word visible anywhere, and player 1's word never resurfaced.
  await expect(page.getByTestId('reveal-word')).toHaveCount(0)
  if (p1Word && p1Word !== '—') {
    await expect(page.locator('body')).not.toContainText(p1Word)
  }
  // The app is still on a pass gate (privacy preserved).
  await expect(page.getByTestId('reveal-pass-show')).toBeVisible()
})
