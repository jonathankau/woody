import { test, expect } from '@playwright/test'
import {
  freshApp,
  configureAndStart,
  walkRevealsAndBuildRoster,
  advanceToVote,
  voteCandidateIdByName,
} from './helpers'

/**
 * 3. Undercover / Whiteboard guess win.
 *
 * Whiteboard preset uses guess-on-elimination. Vote out the Whiteboard,
 * then the host taps "Correct" on the guess -> Whiteboard wins immediately.
 */
test('Whiteboard preset -> correct guess is a Whiteboard win', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 7, preset: 'Undercover / Whiteboard' })

  const roster = await walkRevealsAndBuildRoster(page)
  const whiteboard = roster.find((r) => r.team === 'baiban')
  expect(whiteboard).toBeTruthy()

  await advanceToVote(page)
  const ids = await voteCandidateIdByName(page)
  const whiteboardId = ids.get(whiteboard!.name)!
  await page.getByTestId(`vote-eliminate-${whiteboardId}`).click()

  // Eliminating Whiteboard triggers the guess prompt; host taps Correct.
  await expect(page.getByTestId('baiban-correct')).toBeVisible()
  await page.getByTestId('baiban-correct').click()

  await expect(page.getByTestId('results-winner')).toContainText('Whiteboard wins!')
})
