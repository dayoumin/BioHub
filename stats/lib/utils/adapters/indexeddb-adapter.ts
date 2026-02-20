/**
 * IndexedDB Storage Adapter
 *
 * 브라우저 IndexedDB를 사용하는 저장소 어댑터
 * 내부망(폐쇄망) 환경에서 사용
 */

import type { StorageAdapter, SyncableAdapter } from './storage-adapter'
import type {
  HistoryRecord,
  SyncQueueItem,
  StorageType,
  StorageStatus
} from '../storage-types'

const DB_NAME = 'smart-flow-history'
const DB_VERSION = 2  // 버전 업그레이드 (sync_queue 추가)
const HISTORY_STORE = 'analyses'
const SYNC_QUEUE_STORE = 'sync_queue'
const FAVORITES_STORE = 'favorites'
const MAX_HISTORY = 100

/**
 * IndexedDB 사용 가능 여부 체크
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/**
 * IndexedDB 연결 초기화
 */
function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // History 스토어 생성
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' })
        historyStore.createIndex('timestamp', 'timestamp', { unique: false })
        historyStore.createIndex('syncedAt', 'syncedAt', { unique: false })
      }

      // Sync Queue 스토어 생성 (v2)
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Favorites 스토어 생성 (v2)
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' })
      }
    }
  })
}

/**
 * IndexedDB Adapter 클래스
 */
export class IndexedDBAdapter implements SyncableAdapter {
  // === History CRUD ===

  async saveHistory(record: HistoryRecord, isUpdate = false): Promise<void> {
    // 최대 개수 체크 (업데이트 모드에서는 건너뜀)
    if (!isUpdate) {
      const allRecords = await this.getAllHistory()
      const existingRecord = allRecords.find(r => r.id === record.id)
      if (!existingRecord && allRecords.length >= MAX_HISTORY) {
        const oldestId = allRecords[allRecords.length - 1].id
        await this.deleteHistory(oldestId)
      }
    }

    const db = await openDB()
    const tx = db.transaction(HISTORY_STORE, 'readwrite')
    const store = tx.objectStore(HISTORY_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put({
        ...record,
        updatedAt: Date.now()
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getAllHistory(): Promise<HistoryRecord[]> {
    const db = await openDB()
    const tx = db.transaction(HISTORY_STORE, 'readonly')
    const store = tx.objectStore(HISTORY_STORE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const records = request.result as HistoryRecord[]
        // 최신순 정렬
        records.sort((a, b) => b.timestamp - a.timestamp)
        resolve(records)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getHistory(id: string): Promise<HistoryRecord | null> {
    const db = await openDB()
    const tx = db.transaction(HISTORY_STORE, 'readonly')
    const store = tx.objectStore(HISTORY_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteHistory(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(HISTORY_STORE, 'readwrite')
    const store = tx.objectStore(HISTORY_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearAllHistory(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(HISTORY_STORE, 'readwrite')
    const store = tx.objectStore(HISTORY_STORE)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getHistoryCount(): Promise<number> {
    const db = await openDB()
    const tx = db.transaction(HISTORY_STORE, 'readonly')
    const store = tx.objectStore(HISTORY_STORE)

    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // === Favorites ===

  async saveFavorites(methodIds: string[]): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(FAVORITES_STORE, 'readwrite')
    const store = tx.objectStore(FAVORITES_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put({ id: 'default', methodIds })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getFavorites(): Promise<string[]> {
    const db = await openDB()
    const tx = db.transaction(FAVORITES_STORE, 'readonly')
    const store = tx.objectStore(FAVORITES_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get('default')
      request.onsuccess = () => {
        resolve(request.result?.methodIds || [])
      }
      request.onerror = () => reject(request.error)
    })
  }

  // === Sync Queue ===

  async addToSyncQueue(id: string, action: 'save' | 'delete'): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(SYNC_QUEUE_STORE)

    const item: SyncQueueItem = {
      id,
      action,
      timestamp: Date.now(),
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await openDB()
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly')
    const store = tx.objectStore(SYNC_QUEUE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const items = request.result as SyncQueueItem[]
        // 오래된 순 정렬
        items.sort((a, b) => a.timestamp - b.timestamp)
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearSyncQueue(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(SYNC_QUEUE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async incrementRetryCount(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(SYNC_QUEUE_STORE)

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const item = getRequest.result as SyncQueueItem | undefined
        if (item) {
          item.retryCount++
          const putRequest = store.put(item)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // === Sync Operations (IndexedDB는 로컬 전용이므로 no-op) ===

  async syncPendingItems(): Promise<void> {
    // IndexedDB 단독 사용 시 동기화 불필요
    console.log('[IndexedDB] Sync not applicable for standalone mode')
  }

  async pullFromCloud(): Promise<void> {
    // IndexedDB 단독 사용 시 클라우드 없음
    console.log('[IndexedDB] Pull not applicable for standalone mode')
  }

  // === Metadata ===

  getStorageType(): StorageType {
    return 'indexeddb'
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : false
  }

  isAvailable(): boolean {
    return isIndexedDBAvailable()
  }

  async getStatus(): Promise<StorageStatus> {
    const queue = await this.getSyncQueue()
    return {
      type: 'indexeddb',
      isOnline: this.isOnline(),
      pendingSyncCount: queue.length,
      lastSyncAt: undefined  // 로컬 전용
    }
  }
}
