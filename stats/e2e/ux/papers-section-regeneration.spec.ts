import { expect, test, type Page } from '@playwright/test'
import { S } from '../selectors'

const DB_NAME = 'analysis-history'
const DB_VERSION = 6
const DOCUMENT_ID = 'e2e-section-regeneration-doc'

interface SeedDocument {
  id: string
  projectId: string
  preset: string
  title: string
  language: 'ko'
  authors: unknown[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  sections: Array<{
    id: string
    title: string
    content: string
    sourceRefs: Array<{ kind: 'analysis'; sourceId: string; label: string }>
    editable: boolean
    generatedBy: 'template' | 'user'
  }>
}

interface SeedAnalysis {
  id: string
  timestamp: number
  name: string
  projectId: string
  purpose: string
  method: {
    id: string
    name: string
    category: string
  }
  variableMapping: {
    dependentVar: string
    groupVar: string
  }
  analysisOptions: Record<string, unknown>
  dataFileName: string
  dataRowCount: number
  columnInfo: Array<{
    name: string
    type: 'numeric' | 'categorical'
  }>
  results: Record<string, unknown>
  aiInterpretation: string | null
  apaFormat: string
  paperDraft: null
}

async function openSeedDb(page: Page): Promise<void> {
  await page.evaluate(async ({ dbName, dbVersion }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('analyses')) {
          const historyStore = db.createObjectStore('analyses', { keyPath: 'id' })
          historyStore.createIndex('timestamp', 'timestamp', { unique: false })
          historyStore.createIndex('syncedAt', 'syncedAt', { unique: false })
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('document-blueprints')) {
          const docStore = db.createObjectStore('document-blueprints', { keyPath: 'id' })
          docStore.createIndex('projectId', 'projectId', { unique: false })
        }
        if (!db.objectStoreNames.contains('chart-snapshots')) {
          db.createObjectStore('chart-snapshots', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('citations')) {
          const citationStore = db.createObjectStore('citations', { keyPath: 'id' })
          citationStore.createIndex('projectId', 'projectId', { unique: false })
        }
        if (!db.objectStoreNames.contains('document-blueprint-revisions')) {
          const revisionStore = db.createObjectStore('document-blueprint-revisions', { keyPath: 'id' })
          revisionStore.createIndex('documentId', 'documentId', { unique: false })
          revisionStore.createIndex('projectId', 'projectId', { unique: false })
          revisionStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
      request.onsuccess = () => {
        request.result.close()
        resolve()
      }
      request.onerror = () => reject(request.error ?? new Error('Failed to open seed DB'))
    })
  }, { dbName: DB_NAME, dbVersion: DB_VERSION })
}

async function seedPaperDocument(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await openSeedDb(page)

  const now = '2026-04-30T00:00:00.000Z'
  const document: SeedDocument = {
    id: DOCUMENT_ID,
    projectId: 'e2e-project',
    preset: 'paper',
    title: 'E2E 섹션 재생성 문서',
    language: 'ko',
    authors: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: 'methods',
        title: '연구 방법',
        content: '기존 Methods 본문',
        sourceRefs: [{ kind: 'analysis', sourceId: 'e2e-analysis', label: 'ANOVA' }],
        editable: true,
        generatedBy: 'template',
      },
      {
        id: 'results',
        title: '결과',
        content: '기존 Results 본문',
        sourceRefs: [{ kind: 'analysis', sourceId: 'e2e-analysis', label: 'ANOVA' }],
        editable: true,
        generatedBy: 'template',
      },
    ],
  }
  const analysis: SeedAnalysis = {
    id: 'e2e-analysis',
    timestamp: Date.parse(now),
    name: 'One-Way ANOVA',
    projectId: document.projectId,
    purpose: '세 집단의 평균 차이를 비교한다.',
    method: {
      id: 'one-way-anova',
      name: 'One-Way ANOVA',
      category: 'anova',
    },
    variableMapping: {
      dependentVar: 'length',
      groupVar: 'group',
    },
    analysisOptions: {},
    dataFileName: 'e2e-anova.csv',
    dataRowCount: 12,
    columnInfo: [
      { name: 'length', type: 'numeric' },
      { name: 'group', type: 'categorical' },
    ],
    results: {
      method: 'One-Way ANOVA',
      displayMethodName: 'One-Way ANOVA',
      canonicalMethodId: 'one-way-anova',
      statistic: 5.2,
      pValue: 0.01,
      effectSize: { value: 0.54, type: 'etaSquared', interpretation: 'large' },
      confidence: { lower: 0.12, upper: 0.81, estimate: 0.54, level: 0.95 },
      interpretation: '유의',
      groupStats: [
        { name: 'A', n: 4, mean: 10, std: 1 },
        { name: 'B', n: 4, mean: 12, std: 1.2 },
        { name: 'C', n: 4, mean: 14, std: 1.4 },
      ],
    },
    aiInterpretation: null,
    apaFormat: 'F(2, 9) = 5.20, p = .010',
    paperDraft: null,
  }

  await page.evaluate(async ({ seedDocument, seedAnalysis }) => {
    sessionStorage.clear()
    const now = seedDocument.createdAt

    localStorage.setItem('research_projects', JSON.stringify([
      {
        id: seedDocument.projectId,
        name: 'E2E 자료 작성 프로젝트',
        status: 'active',
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    ]))
    localStorage.setItem('research_project_entity_refs', JSON.stringify([
      {
        id: 'pref-e2e-analysis',
        projectId: seedDocument.projectId,
        entityKind: 'analysis',
        entityId: 'e2e-analysis',
        label: 'ANOVA',
        createdAt: now,
        updatedAt: now,
      },
    ]))

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('analysis-history', 6)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
    })

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['analyses', 'document-blueprints', 'document-blueprint-revisions'], 'readwrite')
        const analysisStore = tx.objectStore('analyses')
        analysisStore.clear()
        analysisStore.put(seedAnalysis)
        const docStore = tx.objectStore('document-blueprints')
        docStore.clear()
        docStore.put(seedDocument)
        tx.objectStore('document-blueprint-revisions').clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('Failed to seed paper document'))
        tx.onabort = () => reject(tx.error ?? new Error('Paper document seed aborted'))
      })
    } finally {
      db.close()
    }
  }, { seedDocument: document, seedAnalysis: analysis })
}

async function waitForPersistedDocumentContent(page: Page, sectionId: string, expectedContent: string): Promise<void> {
  await page.waitForFunction(
    async ({ dbName, dbVersion, documentId, targetSectionId, content }) => {
      const isRecord = (value: unknown): value is Record<string, unknown> => (
        typeof value === 'object' && value !== null
      )
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
      })

      try {
        const documentRecord = await new Promise<unknown>((resolve, reject) => {
          const tx = db.transaction('document-blueprints', 'readonly')
          const request = tx.objectStore('document-blueprints').get(documentId)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error ?? new Error('Failed to read document blueprint'))
        })
        if (!isRecord(documentRecord) || !Array.isArray(documentRecord.sections)) {
          return false
        }

        return documentRecord.sections.some((section) => (
          isRecord(section)
          && section.id === targetSectionId
          && typeof section.content === 'string'
          && section.content.includes(content)
        ))
      } finally {
        db.close()
      }
    },
    { dbName: DB_NAME, dbVersion: DB_VERSION, documentId: DOCUMENT_ID, targetSectionId: sectionId, content: expectedContent },
    { timeout: 30_000 },
  )
}

async function waitForPersistedDocumentPlateValue(page: Page, sectionId: string, expectedText: string): Promise<void> {
  await page.waitForFunction(
    async ({ dbName, dbVersion, documentId, targetSectionId, text }) => {
      const collectText = (value: unknown): string => {
        if (typeof value === 'string') return value
        if (Array.isArray(value)) return value.map((item) => collectText(item)).join(' ')
        if (typeof value !== 'object' || value === null) return ''
        return Object.values(value as Record<string, unknown>).map((item) => collectText(item)).join(' ')
      }
      const isRecord = (value: unknown): value is Record<string, unknown> => (
        typeof value === 'object' && value !== null
      )
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
      })

      try {
        const documentRecord = await new Promise<unknown>((resolve, reject) => {
          const tx = db.transaction('document-blueprints', 'readonly')
          const request = tx.objectStore('document-blueprints').get(documentId)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error ?? new Error('Failed to read document blueprint'))
        })
        if (!isRecord(documentRecord) || !Array.isArray(documentRecord.sections)) {
          return false
        }

        return documentRecord.sections.some((section) => (
          isRecord(section)
          && section.id === targetSectionId
          && collectText(section.plateValue).includes(text)
        ))
      } finally {
        db.close()
      }
    },
    { dbName: DB_NAME, dbVersion: DB_VERSION, documentId: DOCUMENT_ID, targetSectionId: sectionId, text: expectedText },
    { timeout: 30_000 },
  )
}

test.describe('@papers section regeneration UX', () => {
  test('shows safe refresh and destructive regeneration confirmation for a seeded paper document', async ({ page }) => {
    await seedPaperDocument(page)

    await page.goto(`/papers/?doc=${DOCUMENT_ID}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    await expect(page.getByText('E2E 섹션 재생성 문서')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('heading', { name: '연구 방법' })).toBeVisible()
    await expect(page.locator(S.paperSectionRefreshSourcesBtn)).toBeVisible()
    await expect(page.locator(S.paperSectionRegenerateBtn)).toBeVisible()
    await expect(page.getByText('Methods 자동 작성 가능')).toBeVisible()

    await page.locator(S.paperSectionRegenerateBtn).click()

    const dialog = page.locator(S.paperSectionRegenerateDialog)
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('섹션 본문을 새 초안으로 교체할까요?')
    await expect(dialog).toContainText('본문이 연결 자료 기준의 새 자동 초안으로 대체됩니다.')
    await expect(dialog).toContainText('본문 보존 갱신')
    await expect(page.locator(S.paperSectionRegenerateConfirmBtn)).toBeVisible()

    await page.getByRole('button', { name: '취소' }).click()
    await expect(dialog).toBeHidden()
  })

  test('preserves body on source refresh, regenerates results destructively, exports HTML, and records revisions', async ({ page }) => {
    await seedPaperDocument(page)

    await page.goto(`/papers/?doc=${DOCUMENT_ID}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    await page.getByRole('button', { name: /결과/ }).click()
    await expect(page.getByRole('heading', { name: '결과' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Results 자동 작성 가능')).toBeVisible()
    await expect(page.getByText('기존 Results 본문')).toBeVisible()

    await page.locator(S.paperSectionRefreshSourcesBtn).click()
    await expect(page.getByText('본문은 유지하고 연결 자료를 갱신했습니다.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('기존 Results 본문')).toBeVisible()

    await page.locator(S.paperSectionRegenerateBtn).click()
    await page.locator(S.paperSectionRegenerateConfirmBtn).click()
    await expect(page.getByText('섹션 초안을 다시 생성했습니다.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('섹션 반영 완료')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('table', { name: '표 2. 검정 결과' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '5.200' })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'HTML 다운로드' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.html')

    await page.getByRole('button', { name: '복원 기록' }).click()
    await expect(page.getByText('문서 복원 기록')).toBeVisible()
    await expect(page.getByText('내보내기 전 자동 저장 지점')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('섹션 재생성 전 자동 저장 지점').first()).toBeVisible()
  })

  test('autosaves manual edits across reload and keeps controls usable at a narrow desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await seedPaperDocument(page)

    await page.goto(`/papers/?doc=${DOCUMENT_ID}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByText('E2E 섹션 재생성 문서')).toBeVisible({ timeout: 30_000 })

    await expect(page.locator(S.paperSectionRefreshSourcesBtn)).toBeVisible()
    await expect(page.locator(S.paperSectionRegenerateBtn)).toBeVisible()
    await expect(page.getByRole('button', { name: 'HTML 다운로드' })).toBeVisible()

    const editor = page.locator('[contenteditable="true"]').first()
    await editor.fill('Autosave reload body')
    await expect(page.getByText('변경됨')).toBeVisible({ timeout: 5_000 })
    await waitForPersistedDocumentContent(page, 'methods', 'Autosave reload body')
    await waitForPersistedDocumentPlateValue(page, 'methods', 'Autosave reload body')
    await expect(page.getByText('저장됨')).toBeVisible({ timeout: 30_000 })

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await waitForPersistedDocumentContent(page, 'methods', 'Autosave reload body')
    await waitForPersistedDocumentPlateValue(page, 'methods', 'Autosave reload body')
    await expect(page.locator('[contenteditable="true"]').first()).toContainText('Autosave reload body', { timeout: 30_000 })
  })
})
