import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  freshApp,
  configureAndStart,
  advanceToVote,
} from './helpers'

/**
 * 9. Accessibility scans on the key screens. We fail the test only on
 *    'serious' or 'critical' violations (the spec's bar). Any violations are
 *    printed so they can be reported without editing src.
 */

/** Run axe and return only serious/critical violations. */
async function seriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
}

/** Compact printable summary for reporting. */
function describe(violations: Awaited<ReturnType<typeof seriousViolations>>): string {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  nodes: ${v.nodes
          .map((n) => n.target.join(' '))
          .join('; ')}`,
    )
    .join('\n')
}

test('a11y: setup screen', async ({ page }) => {
  await freshApp(page)
  const violations = await seriousViolations(page)
  expect(violations, describe(violations)).toEqual([])
})

test('a11y: reveal-pass, reveal-show, vote, results, and How to Play', async ({
  page,
}) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 4, preset: 'Woody Standard' })

  // reveal-pass gate.
  await expect(page.getByTestId('reveal-pass-show')).toBeVisible()
  let violations = await seriousViolations(page)
  expect(violations, `reveal-pass:\n${describe(violations)}`).toEqual([])

  // reveal-show (word visible).
  await page.getByTestId('reveal-pass-show').click()
  await expect(page.getByTestId('reveal-word')).toBeVisible()
  violations = await seriousViolations(page)
  expect(violations, `reveal-show:\n${describe(violations)}`).toEqual([])

  // Open How to Play from the in-game header (a sheet/dialog).
  await page.getByTestId('howto-open').first().click()
  await expect(page.getByRole('dialog', { name: 'How to Play' })).toBeVisible()
  violations = await seriousViolations(page)
  expect(violations, `howto:\n${describe(violations)}`).toEqual([])
  await page.getByTestId('howto-close').click()

  // Walk to the vote screen. We are currently on player 1's visible-word
  // screen, so hide it, then reveal/hide remaining players until clue order.
  await page.getByTestId('reveal-hide').click()
  for (let guard = 0; guard < 12; guard++) {
    if (await page.getByTestId('clue-order-continue').isVisible().catch(() => false)) break
    await page.getByTestId('reveal-pass-show').click()
    await expect(page.getByTestId('reveal-word')).toBeVisible()
    await page.getByTestId('reveal-hide').click()
  }
  await expect(page.getByTestId('clue-order-continue')).toBeVisible()
  await advanceToVote(page)
  violations = await seriousViolations(page)
  expect(violations, `vote:\n${describe(violations)}`).toEqual([])

  // Drive to results: eliminate the sole undercover (4 players -> 1U/0B).
  // Give everyone-but-first a 0 and pick the first candidate; that's a clean
  // plurality that ends *some* game state, but to guarantee a winner banner we
  // just eliminate until results. Simplest: submit a clear plurality each round.
  await eliminateUntilResults(page)
  await expect(page.getByTestId('results-winner')).toBeVisible()
  violations = await seriousViolations(page)
  expect(violations, `results:\n${describe(violations)}`).toEqual([])
})

/**
 * Vote out the first candidate each round until the results screen appears.
 * Handles the occasional Baiban-guess interstitial (not expected at 4 players,
 * but safe).
 */
async function eliminateUntilResults(
  page: import('@playwright/test').Page,
) {
  for (let guard = 0; guard < 6; guard++) {
    if (await page.getByTestId('results-winner').isVisible().catch(() => false)) return

    // Vote screen: enter the first candidate as the voted-off player.
    await page.locator('[data-testid^="vote-eliminate-"]').first().click()

    if (await page.getByTestId('baiban-incorrect').isVisible().catch(() => false)) {
      await page.getByTestId('baiban-incorrect').click()
    }
    if (await page.getByTestId('results-winner').isVisible().catch(() => false)) return
    if (await page.getByTestId('resolution-continue').isVisible().catch(() => false)) {
      await page.getByTestId('resolution-continue').click()
      // Next round: clue-order -> discussion -> vote.
      if (await page.getByTestId('clue-order-continue').isVisible().catch(() => false)) {
        await page.getByTestId('clue-order-continue').click()
        await page.getByTestId('discussion-vote').click()
      }
    }
  }
}
