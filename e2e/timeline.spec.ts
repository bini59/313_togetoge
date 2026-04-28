import { expect, test } from '@playwright/test'

test.describe('GBC Timeline — overview', () => {
  test.beforeEach(async ({ page }) => {
    // Stub API routes — they need Supabase, which isn't running in E2E.
    await page.route('**/api/participate*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { counts: {}, participated: [] } })
      } else {
        await route.fulfill({ json: { count: 1, alreadyParticipated: false } })
      }
    })
    await page.route('**/api/comments*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { comments: [] } })
      } else {
        await route.fulfill({
          json: {
            comment: {
              id: 'c1',
              event_id: 'x',
              content: 'hi',
              created_at: new Date().toISOString(),
            },
          },
        })
      }
    })
  })

  test('home shows the chronicle overview immediately', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('GIRLS BAND CRY')
    const cards = page.locator('[data-event-id]')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(1)
    // Either the start button or the play/pause toggle is shown at the top.
    const controls = page.locator('section button:has-text("처음부터 재생"), section button:has-text("일시정지"), section button:has-text("재생")').first()
    await expect(controls).toBeVisible()
  })

  test('per-event 재생 button activates that event and reveals comments', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('[data-event-id]')
    const second = cards.nth(1)
    const id = await second.getAttribute('data-event-id')
    expect(id).toBeTruthy()
    await second.getByRole('button', { name: /이 시점부터 재생/ }).click()
    await expect(
      page.locator(`[data-event-id="${id}"]`).getByPlaceholder(/익명 댓글/),
    ).toBeVisible()
  })

  test('participate button shows count and disables after click', async ({ page }) => {
    await page.goto('/')
    const firstCard = page.locator('[data-event-id]').first()
    const participateBtn = firstCard.locator('button').filter({ hasText: /참여|구매|시청|청취|재생|관람/ }).last()
    await expect(participateBtn).toBeEnabled()
    await participateBtn.click()
    await expect(firstCard.getByText('참여완료')).toBeVisible()
  })
})
