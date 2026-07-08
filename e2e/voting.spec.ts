import { test, expect } from '@playwright/test'
import {
  freshApp,
  configureAndStart,
  walkRevealsAndBuildRoster,
  advanceToVote,
  voteCandidateIdByName,
} from './helpers'

/**
 * Public vote entry is intentionally simple: the group votes out loud, then the
 * host enters who was voted off.
 */
test('public vote result entry: selecting a player eliminates them', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 5, preset: 'Woody Standard' })
  const roster = await walkRevealsAndBuildRoster(page)
  const target = roster.find((r) => r.team === 'civilian')!

  await advanceToVote(page)
  await expect(page.getByRole('heading', { name: 'Who was voted off?' })).toBeVisible()
  await expect(page.getByTestId('vote-submit')).toHaveCount(0)
  await expect(page.locator('[data-testid^="vote-stepper-"]')).toHaveCount(0)

  const ids = await voteCandidateIdByName(page)
  const targetId = ids.get(target.name)!
  await page.getByTestId(`vote-eliminate-${targetId}`).click()

  await expect(page.getByTestId('resolution-continue')).toBeVisible()
  await expect(page.locator('.resolution-out')).toContainText(target.name)
  await expect(page.locator('.resolution-role')).toContainText('a Civilian')
  if (target.word) {
    await expect(page.locator('.resolution-card')).not.toContainText(target.word)
  }
})

test('public vote result entry: no elimination advances to the next round', async ({
  page,
}) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 5, preset: 'Woody Standard' })
  await walkRevealsAndBuildRoster(page)

  await advanceToVote(page)
  await page.getByTestId('vote-no-elimination').click()

  await expect(page.getByTestId('resolution-continue')).toBeVisible()
  await expect(page.locator('.resolution-out')).toContainText('Nobody was eliminated')
  await expect(page.locator('.resolution-role')).toContainText('The host called it')

  await page.getByTestId('resolution-continue').click()
  await expect(page.getByTestId('clue-order-continue')).toBeVisible()
  await expect(page.locator('.game-round')).toContainText('Round 2')
})
