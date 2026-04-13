import type { Page } from '@playwright/test'

export type StoredHistorySnapshot = {
  id: string | null
  name: string | null
  purpose: string | null
  analysisPurpose: string | null
  methodId: string | null
  methodName: string | null
  dataFileName: string | null
  dataRowCount: number | null
  resultsJson: string
  aiInterpretation: string | null
  apaFormat: string | null
  variableMappingJson: string
  updatedAt: number | null
}

export type SeededHistoryRecord = {
  id: string
  timestamp: number
  name: string
  purpose: string
  analysisPurpose: string
  method: {
    id: string
    name: string
    category: string
    description?: string
  }
  dataFileName: string
  dataRowCount: number
  results: Record<string, unknown>
  aiInterpretation: string
  apaFormat: string
  variableMapping: Record<string, unknown>
  analysisOptions: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function toStoredHistorySnapshot(record: Record<string, unknown>): StoredHistorySnapshot {
  const method = asRecord(record.method)

  return {
    id: asString(record.id),
    name: asString(record.name),
    purpose: asString(record.purpose),
    analysisPurpose: asString(record.analysisPurpose),
    methodId: asString(method?.id),
    methodName: asString(method?.name),
    dataFileName: asString(record.dataFileName),
    dataRowCount: asNumber(record.dataRowCount),
    resultsJson: JSON.stringify(record.results ?? null),
    aiInterpretation: asString(record.aiInterpretation),
    apaFormat: asString(record.apaFormat),
    variableMappingJson: JSON.stringify(record.variableMapping ?? null),
    updatedAt: asNumber(record.updatedAt),
  }
}

async function openAnalysisHistoryDb(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('analysis-history')
      request.onupgradeneeded = () => {
        const nextDb = request.result
        if (!nextDb.objectStoreNames.contains('analyses')) {
          nextDb.createObjectStore('analyses', { keyPath: 'id' })
        }
      }
      request.onsuccess = () => {
        request.result.close()
        resolve()
      }
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to initialize analysis-history DB'))
    })
  })
}

export async function readAnalysisHistoryCount(page: Page): Promise<number> {
  await openAnalysisHistoryDb(page)

  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('analysis-history')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
    })

    try {
      return await new Promise<number>((resolve, reject) => {
        const tx = db.transaction('analyses', 'readonly')
        const store = tx.objectStore('analyses')
        const request = store.count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Failed to count analysis history'))
      })
    } finally {
      db.close()
    }
  })
}

export async function resetAnalysisHistoryStore(page: Page): Promise<void> {
  await openAnalysisHistoryDb(page)

  await page.evaluate(async () => {
    sessionStorage.clear()

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('analysis-history')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
    })

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('analyses', 'readwrite')
        const store = tx.objectStore('analyses')
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error('Failed to clear analysis history'))
      })
    } finally {
      db.close()
    }
  })
}

export async function seedAnalysisHistoryRecord(
  page: Page,
  record: SeededHistoryRecord,
): Promise<void> {
  await openAnalysisHistoryDb(page)

  await page.evaluate(async (seedRecord: SeededHistoryRecord) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('analysis-history')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
    })

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('analyses', 'readwrite')
        const store = tx.objectStore('analyses')
        const request = store.put(seedRecord)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error(`Failed to seed history: ${seedRecord.id}`))
      })
    } finally {
      db.close()
    }
  }, record)
}

export async function readStoredHistorySnapshot(
  page: Page,
  historyId: string,
): Promise<StoredHistorySnapshot | null> {
  await openAnalysisHistoryDb(page)

  const rawRecord = await page.evaluate(async (targetHistoryId: string) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('analysis-history')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open analysis-history DB'))
    })

    try {
      return await new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const tx = db.transaction('analyses', 'readonly')
        const store = tx.objectStore('analyses')
        const request = store.get(targetHistoryId)
        request.onsuccess = () => {
          const result = request.result
          if (result === null || result === undefined || typeof result !== 'object') {
            resolve(null)
            return
          }

          resolve(JSON.parse(JSON.stringify(result)) as Record<string, unknown>)
        }
        request.onerror = () =>
          reject(request.error ?? new Error(`Failed to read analysis history: ${targetHistoryId}`))
      })
    } finally {
      db.close()
    }
  }, historyId)

  const record = asRecord(rawRecord)
  return record ? toStoredHistorySnapshot(record) : null
}
