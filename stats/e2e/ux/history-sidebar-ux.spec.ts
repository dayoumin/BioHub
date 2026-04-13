/**
 * Analysis history sidebar UX regressions
 *
 * Focus:
 * - seeded history records remain operable from the persistent sidebar
 * - delete/pin mutations stay in sync with browser storage
 */

import { test, expect, type Page } from '@playwright/test'
import { S } from '../selectors'
import {
  readAnalysisHistoryCount,
  readStoredHistorySnapshot,
  resetAnalysisHistoryStore,
  seedAnalysisHistoryRecord,
  type SeededHistoryRecord,
} from '../helpers/history-helpers'

test.setTimeout(120_000)

async function readPinnedHistoryIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('analysis-history-pinned')
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  })
}

function buildSeededRecord(overrides?: Partial<SeededHistoryRecord>): SeededHistoryRecord {
  return {
    id: `analysis-history-${Date.now()}`,
    timestamp: Date.now(),
    name: '독립표본 t-검정 — history seed',
    purpose: '두 그룹 평균 차이를 확인한다',
    analysisPurpose: '두 그룹 평균 차이를 확인한다',
    method: {
      id: 'independent-t-test',
      name: '독립표본 t-검정',
      category: 't-test',
      description: '두 독립 집단의 평균 차이를 비교합니다.',
    },
    dataFileName: 'seeded-history.csv',
    dataRowCount: 24,
    results: {
      method: 't-test',
      pValue: 0.018,
      statistic: 2.456,
      statisticName: 't',
      df: 22,
      interpretation: '유의미한 차이가 있습니다.',
    },
    aiInterpretation: '두 집단 간 평균 차이가 통계적으로 유의합니다.',
    apaFormat: 't(22) = 2.456, p = .018',
    variableMapping: {
      dependentVar: 'value',
      independentVar: 'group',
      groupVar: 'group',
    },
    analysisOptions: {
      alpha: 0.05,
    },
    ...overrides,
  }
}

async function openHomeWithSeededHistory(page: Page, record: SeededHistoryRecord): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await resetAnalysisHistoryStore(page)
  await seedAnalysisHistoryRecord(page, record)
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })

  await expect
    .poll(async () => readAnalysisHistoryCount(page), {
      timeout: 10_000,
      message: 'seeded history should be visible to the sidebar after reload',
    })
    .toBe(1)

  await expect(page.getByText(record.name, { exact: true })).toBeVisible({ timeout: 15_000 })
}

async function openHomeWithSeededHistories(page: Page, records: SeededHistoryRecord[]): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await resetAnalysisHistoryStore(page)

  for (const record of records) {
    await seedAnalysisHistoryRecord(page, record)
  }

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })

  await expect
    .poll(async () => readAnalysisHistoryCount(page), {
      timeout: 10_000,
      message: 'all seeded history records should be visible to the sidebar after reload',
    })
    .toBe(records.length)

  for (const record of records) {
    await expect(page.getByText(record.name, { exact: true })).toBeVisible({ timeout: 15_000 })
  }
}

test.describe('@phase4 @important Analysis History Sidebar UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear()
      localStorage.removeItem('analysis-history-pinned')
    })
  })

  test('TC-4A.H1: seeded history can be renamed and persists the new label', async ({ page }) => {
    const originalRecord = buildSeededRecord({
      id: 'analysis-history-rename-seed',
      name: '독립표본 t-검정 — rename seed',
    })
    const renamedTitle = '독립표본 t-검정 — renamed from sidebar'

    await openHomeWithSeededHistory(page, originalRecord)

    await page.locator(S.analysisHistoryMoreActions(originalRecord.id)).click()
    const renameAction = page.locator(S.analysisHistoryRenameAction(originalRecord.id))
    await expect(renameAction).toBeVisible({ timeout: 10_000 })
    await renameAction.click()

    const renameDialog = page.locator(S.analysisHistoryRenameDialog)
    await expect(renameDialog).toBeVisible({ timeout: 10_000 })
    await expect(renameDialog.getByText(/분석 이름 변경/)).toBeVisible({ timeout: 10_000 })

    const renameInput = page.locator(S.analysisHistoryRenameInput)
    await renameInput.fill(renamedTitle)
    await page.locator(S.analysisHistoryRenameSave).click()

    await expect(page.getByText(renamedTitle, { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(originalRecord.name, { exact: true })).toHaveCount(0)

    const renamedSnapshot = await readStoredHistorySnapshot(page, originalRecord.id)
    expect(renamedSnapshot?.name).toBe(renamedTitle)
    expect(renamedSnapshot?.resultsJson).toContain('"pValue":0.018')
  })

  test('TC-4A.H2: seeded history can be deleted and is removed from IndexedDB', async ({ page }) => {
    const originalRecord = buildSeededRecord({
      id: 'analysis-history-delete-seed',
      name: '독립표본 t-검정 — delete seed',
    })

    await openHomeWithSeededHistory(page, originalRecord)

    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /1건/ }).click()

    await expect
      .poll(async () => readAnalysisHistoryCount(page), {
        timeout: 10_000,
        message: 'deleting from the sidebar should remove the saved history record',
      })
      .toBe(0)

    await expect(page.getByText(originalRecord.name, { exact: true })).toHaveCount(0)
    const deletedSnapshot = await readStoredHistorySnapshot(page, originalRecord.id)
    expect(deletedSnapshot).toBeNull()
  })

  test('TC-4A.H3: seeded history can be pinned and unpinned from the sidebar', async ({ page }) => {
    const originalRecord = buildSeededRecord({
      id: 'analysis-history-pin-seed',
      name: '독립표본 t-검정 — pin seed',
    })

    await openHomeWithSeededHistory(page, originalRecord)

    const pinButton = page.getByRole('button', { name: '상단 고정' }).last()
    await expect(pinButton).toBeVisible({ timeout: 10_000 })
    await pinButton.click()

    await expect
      .poll(async () => readPinnedHistoryIds(page), {
        timeout: 10_000,
        message: 'pinning should persist the history id into localStorage',
      })
      .toEqual([originalRecord.id])

    await expect(page.getByRole('button', { name: '고정 해제' }).last()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: '고정 해제' }).last().click()

    await expect
      .poll(async () => readPinnedHistoryIds(page), {
        timeout: 10_000,
        message: 'unpinning should remove the history id from localStorage',
      })
      .toEqual([])

    await expect(page.getByRole('button', { name: '상단 고정' }).last()).toBeVisible({ timeout: 10_000 })
  })

  test('TC-4A.H4: sidebar pinning respects the MAX_PINNED limit', async ({ page }) => {
    const records = [
      buildSeededRecord({ id: 'analysis-history-pin-limit-1', name: '독립표본 t-검정 — pin limit 1' }),
      buildSeededRecord({ id: 'analysis-history-pin-limit-2', name: '독립표본 t-검정 — pin limit 2' }),
      buildSeededRecord({ id: 'analysis-history-pin-limit-3', name: '독립표본 t-검정 — pin limit 3' }),
      buildSeededRecord({ id: 'analysis-history-pin-limit-4', name: '독립표본 t-검정 — pin limit 4' }),
    ]

    await openHomeWithSeededHistories(page, records)

    const pinButtons = page.getByRole('button', { name: '상단 고정' })
    await expect(pinButtons).toHaveCount(4)

    await pinButtons.nth(0).click()
    await pinButtons.nth(0).click()
    await pinButtons.nth(0).click()

    await expect
      .poll(async () => readPinnedHistoryIds(page), {
        timeout: 10_000,
        message: 'the first three history ids should be persisted when pinning up to the max',
      })
      .toEqual(records.slice(0, 3).map((record) => record.id))

    await pinButtons.nth(0).click()

    await expect
      .poll(async () => readPinnedHistoryIds(page), {
        timeout: 10_000,
        message: 'pinning beyond MAX_PINNED should leave localStorage unchanged',
      })
      .toEqual(records.slice(0, 3).map((record) => record.id))

    await expect(page.getByRole('button', { name: '고정 해제' })).toHaveCount(3)
    await expect(page.getByRole('button', { name: '상단 고정' })).toHaveCount(1)
  })

  test('TC-4A.H5: deleting a pinned history also cleans pinned localStorage state', async ({ page }) => {
    const originalRecord = buildSeededRecord({
      id: 'analysis-history-delete-pinned-seed',
      name: '독립표본 t-검정 — delete pinned seed',
    })

    await openHomeWithSeededHistory(page, originalRecord)

    const pinButton = page.getByRole('button', { name: '상단 고정' }).last()
    await expect(pinButton).toBeVisible({ timeout: 10_000 })
    await pinButton.click()

    await expect
      .poll(async () => readPinnedHistoryIds(page), {
        timeout: 10_000,
        message: 'pinning before delete should persist the history id into localStorage',
      })
      .toEqual([originalRecord.id])

    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /1건/ }).click()

    await expect
      .poll(async () => readAnalysisHistoryCount(page), {
        timeout: 10_000,
        message: 'deleting a pinned record should remove it from history storage',
      })
      .toBe(0)

    await expect
      .poll(async () => readPinnedHistoryIds(page), {
        timeout: 10_000,
        message: 'deleting a pinned record should also clear pinned localStorage state',
      })
      .toEqual([])

    const deletedSnapshot = await readStoredHistorySnapshot(page, originalRecord.id)
    expect(deletedSnapshot).toBeNull()
  })
})
