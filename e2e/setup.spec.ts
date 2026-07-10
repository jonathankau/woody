import { test, expect } from '@playwright/test'
import { freshApp } from './helpers'

test('setup: host can clear and type 2 undercovers for a 5-player game', async ({ page }) => {
  await freshApp(page)
  await page.getByRole('button', { name: 'Add player', exact: true }).click()
  await page.getByText('Advanced settings').click()

  const undercovers = page.getByLabel('Undercovers')
  await expect(undercovers).toHaveValue('1')

  await undercovers.fill('')
  await undercovers.type('2')

  await expect(undercovers).toHaveValue('2')
  await expect(page.getByTestId('setup-summary')).toContainText('5 players · 2 undercovers')
})
