/**
 * Storage Facade
 *
 * 환경에 따라 적절한 저장소 어댑터를 자동 선택
 * - 내부망 (NEXT_PUBLIC_TURSO_URL 없음): IndexedDB만 사용
 * - 외부망 (NEXT_PUBLIC_TURSO_URL 있음): Hybrid 모드 (IndexedDB + Turso)
 *
 * 사용법:
 * ```typescript
 * import { storage, initStorage } from '@/lib/utils/storage'
 *
 * // 초기화 (앱 시작 시 1회)
 * await initStorage()
 *
 * // CRUD
 * await storage.saveHistory(record)
 * const history = await storage.getAllHistory()
 * ```
 */

import type { StorageAdapter, SyncableAdapter } from './adapters/storage-adapter'
import type { HistoryRecord, StorageStatus } from './storage-types'
import { IndexedDBAdapter, isIndexedDBAvailable } from './adapters/indexeddb-adapter'

// 어댑터 인스턴스 (싱글톤)
let storageInstance: StorageAdapter | null = null
let initPromise: Promise<StorageAdapter> | null = null

/**
 * 저장소 초기화
 * 환경에 따라 적절한 어댑터 선택
 */
export async function initStorage(): Promise<StorageAdapter> {
  if (storageInstance) return storageInstance

  if (initPromise) return initPromise

  initPromise = (async () => {
    // IndexedDB 사용 가능 여부 체크
    if (!isIndexedDBAvailable()) {
      console.error('[Storage] IndexedDB not available!')
      throw new Error('IndexedDB is required but not available')
    }

    // Turso URL이 설정되어 있으면 Hybrid 모드
    const tursoUrl = typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_TURSO_URL
      : undefined

    if (tursoUrl) {
      console.log('[Storage] Turso URL detected, using Hybrid mode')
      try {
        // 동적 import (번들 최적화)
        const { HybridAdapter } = await import('./adapters/hybrid-adapter')
        storageInstance = new HybridAdapter()

        // 초기 동기화 시도
        if (storageInstance && 'pullFromCloud' in storageInstance) {
          (storageInstance as SyncableAdapter).pullFromCloud().catch(console.error)
        }
      } catch (error) {
        console.warn('[Storage] Hybrid mode failed, falling back to IndexedDB:', error)
        storageInstance = new IndexedDBAdapter()
      }
    } else {
      console.log('[Storage] No Turso URL, using IndexedDB only')
      storageInstance = new IndexedDBAdapter()
    }

    return storageInstance
  })()

  return initPromise
}

/**
 * 저장소 인스턴스 가져오기
 * 초기화되지 않았으면 자동 초기화
 */
export async function getStorage(): Promise<StorageAdapter> {
  if (!storageInstance) {
    return initStorage()
  }
  return storageInstance
}

/**
 * 저장소 인스턴스 (동기 접근)
 * 초기화 후에만 사용 가능
 */
export function getStorageSync(): StorageAdapter | null {
  return storageInstance
}

// ========================================
// 편의 함수 (직접 호출 가능)
// ========================================

/**
 * 히스토리 저장
 */
export async function saveHistory(record: HistoryRecord, isUpdate = false): Promise<void> {
  const storage = await getStorage()
  return storage.saveHistory(record, isUpdate)
}

/**
 * 모든 히스토리 가져오기
 */
export async function getAllHistory(): Promise<HistoryRecord[]> {
  const storage = await getStorage()
  return storage.getAllHistory()
}

/**
 * 특정 히스토리 가져오기
 */
export async function getHistory(id: string): Promise<HistoryRecord | null> {
  const storage = await getStorage()
  return storage.getHistory(id)
}

/**
 * 히스토리 삭제
 */
export async function deleteHistory(id: string): Promise<void> {
  const storage = await getStorage()
  return storage.deleteHistory(id)
}

/**
 * 모든 히스토리 삭제
 */
export async function clearAllHistory(): Promise<void> {
  const storage = await getStorage()
  return storage.clearAllHistory()
}

/**
 * 히스토리 개수
 */
export async function getHistoryCount(): Promise<number> {
  const storage = await getStorage()
  return storage.getHistoryCount()
}

/**
 * 즐겨찾기 저장
 */
export async function saveFavorites(methodIds: string[]): Promise<void> {
  const storage = await getStorage()
  return storage.saveFavorites(methodIds)
}

/**
 * 즐겨찾기 가져오기
 */
export async function getFavorites(): Promise<string[]> {
  const storage = await getStorage()
  return storage.getFavorites()
}

/**
 * 저장소 상태 확인
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const storage = await getStorage()
  return storage.getStatus()
}

/**
 * 동기화 큐 수동 실행 (Hybrid 모드만)
 */
export async function syncNow(): Promise<void> {
  const storage = await getStorage()
  if ('syncPendingItems' in storage) {
    return (storage as SyncableAdapter).syncPendingItems()
  }
}

/**
 * 클라우드에서 데이터 가져오기 (Hybrid 모드만)
 */
export async function pullFromCloud(): Promise<void> {
  const storage = await getStorage()
  if ('pullFromCloud' in storage) {
    return (storage as SyncableAdapter).pullFromCloud()
  }
}

/**
 * 저장소 인스턴스 리셋 (테스트용)
 * @internal
 */
export function _resetStorageForTesting(): void {
  storageInstance = null
  initPromise = null
}

// ========================================
// 레거시 호환 (기존 indexeddb.ts 함수들)
// ========================================

/**
 * @deprecated Use saveHistory instead
 */
export const saveAnalysisHistory = saveHistory

/**
 * @deprecated Use getAllHistory instead
 */
export const getAnalysisHistory = getAllHistory

/**
 * @deprecated Use deleteHistory instead
 */
export const deleteAnalysisHistory = deleteHistory

/**
 * @deprecated Use clearAllHistory instead
 */
export const clearAnalysisHistory = clearAllHistory

// 기본 내보내기
export const storage = {
  init: initStorage,
  get: getStorage,
  getSync: getStorageSync,
  saveHistory,
  getAllHistory,
  getHistory,
  deleteHistory,
  clearAllHistory,
  getHistoryCount,
  saveFavorites,
  getFavorites,
  getStatus: getStorageStatus,
  syncNow,
  pullFromCloud
}

export default storage
