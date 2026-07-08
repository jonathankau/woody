import { test, expect } from '@playwright/test'
import {
  freshApp,
  configureAndStart,
  walkRevealsAndBuildRoster,
  advanceToVote,
  voteStepperIdByName,
  playRoundVotingOut,
  continueRound,
} from './helpers'

/**
 * 1. Full Woody Standard game (7 players: 2 undercovers + 1 Baiban).
 *
 * Vote out both undercovers, then the Baiban. The Baiban guess (guess-on-
 * elimination) is adjudicated Incorrect, so civilians win. We keep 4 civilians
 * alive throughout, so the undercover "one civilian left" threshold never
 * fires.
 */
test('full Woody Standard game -> civilians win', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 7, preset: 'Woody Standard' })

  const roster = await walkRevealsAndBuildRoster(page)
  const undercovers = roster.filter((r) => r.team === 'undercover')
  const baiban = roster.find((r) => r.team === 'baiban')
  const civilians = roster.filter((r) => r.team === 'civilian')
  expect(undercovers).toHaveLength(2)
  expect(baiban).toBeTruthy()
  expect(civilians).toHaveLength(4)

  // Round 1 & 2: eliminate both undercovers. Resolution shows role only, no word.
  for (const uc of undercovers) {
    await playRoundVotingOut(page, uc.name)
    await expect(page.getByTestId('resolution-continue')).toBeVisible()
    await expect(page.locator('.resolution-out')).toContainText(uc.name)
    await expect(page.locator('.resolution-role')).toContainText('an Undercover')
    // Resolution must never leak the word.
    if (uc.word) {
      await expect(page.locator('.resolution-card')).not.toContainText(uc.word)
    }
    await continueRound(page)
  }

  // Round 3: eliminate the Baiban. guess-on-elimination -> baiban-guess screen.
  await advanceToVote(page)
  const ids = await voteStepperIdByName(page)
  const baibanId = ids.get(baiban!.name)!
  await page.getByTestId(`vote-stepper-inc-${baibanId}`).click()
  await page.getByTestId('vote-submit').click()

  // Baiban guess: host taps Incorrect -> civilians win.
  await expect(page.getByTestId('baiban-incorrect')).toBeVisible()
  await page.getByTestId('baiban-incorrect').click()

  await expect(page.getByTestId('results-winner')).toContainText('Civilians win!')

  // Results reveal all roles and words.
  const table = page.locator('.results-table')
  for (const entry of roster) {
    const row = table.locator('tr', { hasText: entry.name }).first()
    await expect(row).toBeVisible()
    if (entry.team === 'baiban') {
      await expect(row).toContainText('Baiban')
    } else if (entry.team === 'undercover') {
      await expect(row).toContainText('Undercover')
      await expect(row).toContainText(entry.word!)
    } else {
      await expect(row).toContainText('Civilian')
      await expect(row).toContainText(entry.word!)
    }
  }
})

/**
 * 2. Classic Wo Di Baiban survival win.
 *
 * Classic uses survive-after-undercovers: once every undercover is out while
 * the Baiban is alive, the Baiban wins immediately (no guess prompt). 7 players
 * => 2 undercovers + 1 Baiban; eliminate both undercovers with the Baiban left
 * standing. Total stays at 5 (> last-3 threshold) so the undercover win never
 * triggers first.
 */
test('Classic Wo Di -> Baiban survival win', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 7, preset: 'Classic Wo Di' })

  const roster = await walkRevealsAndBuildRoster(page)
  const undercovers = roster.filter((r) => r.team === 'undercover')
  const baiban = roster.find((r) => r.team === 'baiban')
  expect(undercovers).toHaveLength(2)
  expect(baiban).toBeTruthy()

  // Eliminate the first undercover; game continues.
  await playRoundVotingOut(page, undercovers[0].name)
  await expect(page.locator('.resolution-role')).toContainText('an Undercover')
  await continueRound(page)

  // Eliminate the second undercover; Classic has no guess-on-elimination and
  // the Baiban is still alive -> Baiban wins immediately (straight to results).
  await playRoundVotingOut(page, undercovers[1].name)
  await expect(page.getByTestId('results-winner')).toContainText('Baiban wins!')
})
