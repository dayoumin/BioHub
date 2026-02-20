/**
 * IndexedDB 유틸리티
 * 스마트 분석 히스토리를 영구 저장합니다.
 *
 * 특징:
 * - 브라우저 종료 후에도 데이터 유지
 * - 결과만 저장 (원본 데이터 제외로 메모리 절약)
 * - 최대 100개 히스토리 저장
 */

import type { VariableMapping } from '@/lib/statistics/variable-mapping'

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
  aiInterpretation?: string | null
  apaFormat?: string | null

  // 재분석용 설정 저장
  variableMapping?: VariableMapping | null
  analysisPurpose?: string
}

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
 * @param record - 저장할 히스토리 레코드
 * @param isUpdate - true인 경우 기존 레코드 업데이트 (MAX_HISTORY 체크 건너뜀)
 */
export async function saveHistory(record: HistoryRecord, isUpdate = false): Promise<void> {
  // ⚠️ 트랜잭션 생성 전에 최대 개수 체크 (TransactionInactiveError 방지)
  // 업데이트 모드에서는 체크 건너뜀 (기존 ID를 덮어쓰므로 개수 증가 없음)
  if (!isUpdate) {
    const allRecords = await getAllHistory()
    // 기존 ID가 이미 존재하는지 확인
    const existingRecord = allRecords.find(r => r.id === record.id)
    if (!existingRecord && allRecords.length >= MAX_HISTORY) {
      const oldestId = allRecords[allRecords.length - 1].id
      await deleteHistory(oldestId)
    }
  }

  // 이제 새 트랜잭션으로 저장 (트랜잭션이 활성 상태로 유지됨)
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

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
