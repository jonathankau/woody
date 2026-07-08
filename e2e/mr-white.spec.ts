import { test, expect } from '@playwright/test'
import {
  freshApp,
  configureAndStart,
  walkRevealsAndBuildRoster,
  advanceToVote,
  voteStepperIdByName,
} from './helpers'

/**
 * 3. Undercover / Mr. White guess win.
 *
 * Mr. White preset uses guess-on-elimination. Vote out the Baiban (Mr. White),
 * then the host taps "Correct" on the guess -> Baiban wins immediately.
 */
test('Mr. White preset -> correct guess is a Baiban win', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 7, preset: 'Undercover / Mr. White' })

  const roster = await walkRevealsAndBuildRoster(page)
  const baiban = roster.find((r) => r.team === 'baiban')
  expect(baiban).toBeTruthy()

  await advanceToVote(page)
  const ids = await voteStepperIdByName(page)
  const baibanId = ids.get(baiban!.name)!
  await page.getByTestId(`vote-stepper-inc-${baibanId}`).click()
  await page.getByTestId('vote-submit').click()

  // Eliminating Mr. White triggers the guess prompt; host taps Correct.
  await expect(page.getByTestId('baiban-correct')).toBeVisible()
  await page.getByTestId('baiban-correct').click()

  await expect(page.getByTestId('results-winner')).toContainText('Baiban wins!')
})
