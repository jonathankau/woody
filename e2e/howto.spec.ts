import { test, expect } from '@playwright/test'
import { freshApp, configureAndStart } from './helpers'

/**
 * 10. How to Play opens from setup and from the in-game header, renders its
 *     sections, and closes with the close button.
 */

const SECTIONS = ['Goal', 'Roles', 'Reveal', 'Round Loop', 'Voting', 'Whiteboard', 'Winning']

async function assertSheetRenders(page: import('@playwright/test').Page): Promise<void> {
  const sheet = page.getByRole('dialog', { name: 'How to Play' })
  await expect(sheet).toBeVisible()
  for (const title of SECTIONS) {
    await expect(sheet.getByRole('heading', { name: title, exact: true })).toBeVisible()
  }
  // Win chart is generated from the rules.
  await expect(sheet.locator('.howto-winchart')).toBeVisible()
}

test('How to Play opens from setup and closes', async ({ page }) => {
  await freshApp(page)

  await page.getByTestId('howto-open').click()
  await assertSheetRenders(page)

  await page.getByTestId('howto-close').click()
  await expect(page.getByRole('dialog', { name: 'How to Play' })).toHaveCount(0)
})

test('How to Play opens from the in-game header and closes', async ({ page }) => {
  await freshApp(page)
  await configureAndStart(page, { playerCount: 4, preset: 'Woody Standard' })

  // In-game header How to Play button.
  await page.getByTestId('howto-open').first().click()
  await assertSheetRenders(page)

  await page.getByTestId('howto-close').click()
  await expect(page.getByRole('dialog', { name: 'How to Play' })).toHaveCount(0)
})
