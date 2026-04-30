import { expect, test, type Page } from '@playwright/test'
import { S } from '../selectors'

const DB_NAME = 'analysis-history'
const DB_VERSION = 5
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

  await page.evaluate(async (seedDocument) => {
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
      const request = indexedDB.open('analysis-history', 5)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
    })

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['analyses', 'document-blueprints'], 'readwrite')
        tx.objectStore('analyses').clear()
        const docStore = tx.objectStore('document-blueprints')
        docStore.clear()
        docStore.put(seedDocument)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('Failed to seed paper document'))
        tx.onabort = () => reject(tx.error ?? new Error('Paper document seed aborted'))
      })
    } finally {
      db.close()
    }
  }, document)
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
})
