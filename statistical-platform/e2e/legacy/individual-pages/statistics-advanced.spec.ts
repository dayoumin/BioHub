import { test, expect } from '@playwright/test'

test.describe('고급 통계 브라우저 검증', () => {
    test.skip('PCA, Cronbach\'s Alpha, Factor/Cluster/TimeSeries', async ({ page }) => {
        await page.goto('/test-statistics')

        // 상태가 완료될 때까지 대기
        await page.waitForSelector('[data-status="done"]', { timeout: 90000 })

        // 기본 가드
        await expect(page.locator('[data-pca]')).toBeVisible()
        await expect(page.locator('[data-alpha]')).toBeVisible()

        // PCA
        const pcaEv = await page.locator('[data-pca-ev]').textContent()
        expect(pcaEv?.length).toBeGreaterThan(0)

        // Alpha
        const alphaVal = await page.locator('[data-alpha-value]').textContent()
        const alpha = Number(alphaVal)
        expect(alpha).toBeGreaterThanOrEqual(0)
        expect(alpha).toBeLessThanOrEqual(1)

        // E2E는 최소 요구만 검증 (상세 수치는 단위/레퍼런스 테스트에서 검증)
    })
})


