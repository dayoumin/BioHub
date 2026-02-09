import { test } from '@playwright/test'

test('debug smart-flow console', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    console.log(`[pageerror] ${err.message}`)
  })

  await page.goto('http://localhost:3000/smart-flow', { waitUntil: 'networkidle' })
  await page.waitForTimeout(10000)
})
