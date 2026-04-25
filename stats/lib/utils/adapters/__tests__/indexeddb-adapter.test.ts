import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { openDB } from '../indexeddb-adapter'

const DB_NAME = 'analysis-history'

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('delete blocked'))
  })
}

function openLegacyV5Database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5)
    request.onerror = () => reject(request.error)
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
    request.onsuccess = () => resolve(request.result)
  })
}

describe('indexeddb-adapter', () => {
  afterEach(async () => {
    await deleteDatabase().catch(() => undefined)
  })

  it('migrates a v5 database to v6 with document quality report indexes', async () => {
    const legacyDb = await openLegacyV5Database()
    expect(legacyDb.version).toBe(5)
    legacyDb.close()

    const db = await openDB()

    expect(db.version).toBe(6)
    expect(db.objectStoreNames.contains('analyses')).toBe(true)
    expect(db.objectStoreNames.contains('citations')).toBe(true)
    expect(db.objectStoreNames.contains('document-quality-reports')).toBe(true)

    const tx = db.transaction('document-quality-reports', 'readonly')
    const store = tx.objectStore('document-quality-reports')
    expect(store.indexNames.contains('documentId')).toBe(true)
    expect(store.indexNames.contains('projectId')).toBe(true)
    expect(store.indexNames.contains('status')).toBe(true)
    expect(store.indexNames.contains('updatedAt')).toBe(true)
    db.close()
  })

  it('rejects when a database upgrade is blocked by another open connection', async () => {
    const legacyDb = await openLegacyV5Database()

    await expect(openDB()).rejects.toThrow('IndexedDB upgrade blocked by another open BioHub tab')

    legacyDb.close()
  })
})
