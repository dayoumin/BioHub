/**
 * IndexedDB 유틸리티
 * 스마트 분석 히스토리를 영구 저장합니다.
 *
 * 특징:
 * - 브라우저 종료 후에도 데이터 유지
 * - 결과만 저장 (원본 데이터 제외로 메모리 절약)
 * - 최대 100개 히스토리 저장
 */

const DB_NAME = 'smart-flow-history'
const DB_VERSION = 1
const STORE_NAME = 'analyses'
const MAX_HISTORY = 100

export interface HistoryRecord {
  id: string
  timestamp: number
  name: string
  purpose: string
  method: {
    id: string
    name: string
    category: string
    description?: string
  } | null
  dataFileName: string
  dataRowCount: number
  results: Record<string, unknown> | null
}

/**
 * IndexedDB 연결 초기화
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 스토어 생성
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * 히스토리 저장
 */
export async function saveHistory(record: HistoryRecord): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  // 최대 개수 초과 시 가장 오래된 항목 삭제
  const allRecords = await getAllHistory()
  if (allRecords.length >= MAX_HISTORY) {
    const oldestId = allRecords[allRecords.length - 1].id
    await deleteHistory(oldestId)
  }

  return new Promise((resolve, reject) => {
    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 모든 히스토리 가져오기 (최신순)
 */
export async function getAllHistory(): Promise<HistoryRecord[]> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

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

/**
 * 특정 히스토리 가져오기
 */
export async function getHistory(id: string): Promise<HistoryRecord | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 히스토리 삭제
 */
export async function deleteHistory(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 모든 히스토리 삭제
 */
export async function clearAllHistory(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 히스토리 개수 가져오기
 */
export async function getHistoryCount(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
