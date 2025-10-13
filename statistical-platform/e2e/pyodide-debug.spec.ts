import { test, expect } from '@playwright/test'

test('Pyodide 페이지 디버깅', async ({ page }) => {
  console.log('페이지 이동: /test-pyodide-init')

  await page.goto('/test-pyodide-init')

  // 5초 대기
  await page.waitForTimeout(5000)

  // 스크린샷
  await page.screenshot({ path: 'test-pyodide-init-debug.png', fullPage: true })

  // HTML 내용 확인
  const html = await page.content()
  console.log('페이지 HTML 길이:', html.length)

  // data-pyodide-status 요소 찾기
  const statusElements = await page.locator('[data-pyodide-status]').count()
  console.log('data-pyodide-status 요소 개수:', statusElements)

  if (statusElements > 0) {
    const status = await page.locator('[data-pyodide-status]').first().getAttribute('data-pyodide-status')
    console.log('Pyodide 상태:', status)
  }

  // 모든 data-* 속성 찾기
  const allDataElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-numpy-loaded], [data-scipy-loaded]')
    return Array.from(elements).map(el => ({
      tag: el.tagName,
      dataAttrs: Array.from(el.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => ({ name: attr.name, value: attr.value }))
    }))
  })

  console.log('Data 속성 요소들:', JSON.stringify(allDataElements, null, 2))
})
