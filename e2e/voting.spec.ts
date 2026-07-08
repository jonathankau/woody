import { test, expect } from '@playwright/test'
import {
  freshApp,
  configureAndStart,
  walkRevealsAndBuildRoster,
  advanceToVote,
  voteStepperIdByName,
} from './helpers'

/**
 * 6. Public vote entry: steppers increment/decrement, the running total
 *    reflects entries, and a clear plurality eliminates the right player.
 *    Resolution names them + role only (never their word).
 */
test('public vote entry: steppers, total, and plurality elimination', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 5, preset: 'Woody Standard' })
  const roster = await walkRevealsAndBuildRoster(page)
  const target = roster.find((r) => r.team === 'civilian')!

  await advanceToVote(page)
  const ids = await voteStepperIdByName(page)
  const targetId = ids.get(target.name)!
  const otherId = [...ids.values()].find((id) => id !== targetId)!

  const total = page.locator('.vote-total')
  await expect(total).toContainText('0 of 5 votes entered')

  // Increment target twice, other once -> total 3.
  await page.getByTestId(`vote-stepper-inc-${targetId}`).click()
  await page.getByTestId(`vote-stepper-inc-${targetId}`).click()
  await page.getByTestId(`vote-stepper-inc-${otherId}`).click()
  await expect(total).toContainText('3 of 5 votes entered')

  // Decrement other back to 0 -> total 2, a clean plurality for the target.
  await page.getByTestId(`vote-stepper-dec-${otherId}`).click()
  await expect(total).toContainText('2 of 5 votes entered')

  await page.getByTestId('vote-submit').click()

  // Resolution names the eliminated player + role, no word.
  await expect(page.getByTestId('resolution-continue')).toBeVisible()
  await expect(page.locator('.resolution-out')).toContainText(target.name)
  await expect(page.locator('.resolution-role')).toContainText('a Civilian')
  if (target.word) {
    await expect(page.locator('.resolution-card')).not.toContainText(target.word)
  }
})

/**
 * 7. Majority no-elimination: with 'majority required', a split vote whose max
 *    is not a strict majority eliminates nobody; the game continues.
 */
test('majority rule: split vote eliminates nobody', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, {
    playerCount: 5,
    preset: 'Woody Standard',
    voteRule: 'majority',
  })
  await walkRevealsAndBuildRoster(page)

  await advanceToVote(page)
  const ids = await voteStepperIdByName(page)
  const [a, b] = [...ids.values()]

  // 5 alive -> majority threshold is floor(5/2) = 2, so a max of 2 is NOT a
  // strict majority. Split 2 vs 2.
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await expect(page.locator('.vote-total')).toContainText('4 of 5 votes entered')

  await page.getByTestId('vote-submit').click()

  // No elimination; resolution says nobody eliminated, game continues.
  await expect(page.getByTestId('resolution-continue')).toBeVisible()
  await expect(page.locator('.resolution-out')).toContainText('Nobody was eliminated')
  await expect(page.locator('.resolution-role')).toContainText('No one reached a majority')

  // Continue lands on the next round's clue order (round 2).
  await page.getByTestId('resolution-continue').click()
  await expect(page.getByTestId('clue-order-continue')).toBeVisible()
  await expect(page.locator('.game-round')).toContainText('Round 2')
})

/**
 * 8. PK revote (plurality + tie rule PK):
 *    - a first tie opens a PK restricted to the tied players;
 *    - a second tie -> no elimination;
 *    - a PK where one candidate wins -> that candidate is eliminated.
 */
test('PK revote: tied vote restricts candidates, second tie eliminates nobody', async ({
  page,
}) => {
  await freshApp(page)
  await configureAndStart(page, {
    playerCount: 5,
    preset: 'Woody Standard',
    voteRule: 'plurality',
    tieRule: 'pk-revote',
  })
  await walkRevealsAndBuildRoster(page)

  await advanceToVote(page)
  const ids = await voteStepperIdByName(page)
  const allIds = [...ids.values()]
  const [a, b] = allIds

  // Tie A vs B at 2 each.
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await page.getByTestId('vote-submit').click()

  // PK banner appears; only the two tied players are now candidates.
  await expect(page.locator('.vote-pk-banner')).toBeVisible()
  const pkIds = await voteStepperIdByName(page)
  expect(new Set(pkIds.values())).toEqual(new Set([a, b]))

  // Second tie during PK -> no elimination.
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await page.getByTestId('vote-submit').click()

  await expect(page.getByTestId('resolution-continue')).toBeVisible()
  await expect(page.locator('.resolution-out')).toContainText('Nobody was eliminated')
})

test('PK revote: a candidate winning the PK is eliminated', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, {
    playerCount: 5,
    preset: 'Woody Standard',
    voteRule: 'plurality',
    tieRule: 'pk-revote',
  })
  await walkRevealsAndBuildRoster(page)

  await advanceToVote(page)
  const ids = await voteStepperIdByName(page)
  const nameById = new Map([...ids.entries()].map(([name, id]) => [id, name]))
  const [a, b] = [...ids.values()]

  // Tie A vs B.
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await page.getByTestId(`vote-stepper-inc-${b}`).click()
  await page.getByTestId('vote-submit').click()

  await expect(page.locator('.vote-pk-banner')).toBeVisible()

  // In the PK, give A a clear win.
  await page.getByTestId(`vote-stepper-inc-${a}`).click()
  await page.getByTestId('vote-submit').click()

  // A resolution or baiban-guess follows; either way the PK winner is out.
  // If A was the Baiban, a guess screen appears first; adjudicate Incorrect.
  const baibanGuess = page.getByTestId('baiban-incorrect')
  if (await baibanGuess.isVisible().catch(() => false)) {
    await baibanGuess.click()
  }
  // Resolution (unless the elimination ended the game). Assert the eliminated
  // player is the PK winner A wherever the role/name is shown.
  const resolutionOut = page.locator('.resolution-out')
  const resultsWinner = page.getByTestId('results-winner')
  await expect(resolutionOut.or(resultsWinner)).toBeVisible()
  if (await resolutionOut.isVisible().catch(() => false)) {
    await expect(resolutionOut).toContainText(nameById.get(a)!)
  }
})
