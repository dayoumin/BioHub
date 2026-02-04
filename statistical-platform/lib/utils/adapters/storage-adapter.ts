/**
 * Storage Adapter Interface
 *
 * IndexedDB, Turso, Hybrid 어댑터가 구현해야 하는 공통 인터페이스
 */

import type {
  HistoryRecord,
  SyncQueueItem,
  StorageType,
  StorageStatus
} from '../storage-types'

export interface StorageAdapter {
  // === History CRUD ===

  /**
   * 히스토리 저장
   * @param record - 저장할 히스토리 레코드
   * @param isUpdate - true인 경우 기존 레코드 업데이트 (MAX_HISTORY 체크 건너뜀)
   */
  saveHistory(record: HistoryRecord, isUpdate?: boolean): Promise<void>

  /**
   * 모든 히스토리 가져오기 (최신순)
   */
  getAllHistory(): Promise<HistoryRecord[]>

  /**
   * 특정 히스토리 가져오기
   */
  getHistory(id: string): Promise<HistoryRecord | null>

  /**
   * 히스토리 삭제
   */
  deleteHistory(id: string): Promise<void>

  /**
   * 모든 히스토리 삭제
   */
  clearAllHistory(): Promise<void>

  /**
   * 히스토리 개수 가져오기
   */
  getHistoryCount(): Promise<number>

  // === Favorites ===

  /**
   * 즐겨찾기 저장
   */
  saveFavorites(methodIds: string[]): Promise<void>

  /**
   * 즐겨찾기 가져오기
   */
  getFavorites(): Promise<string[]>

  // === Metadata ===

  /**
   * 저장소 타입 반환
   */
  getStorageType(): StorageType

  /**
   * 온라인 상태 확인
   */
  isOnline(): boolean

  /**
   * 저장소 사용 가능 여부
   */
  isAvailable(): boolean

  /**
   * 저장소 상태 정보
   */
  getStatus(): Promise<StorageStatus>
}

/**
 * 동기화 가능한 어댑터 (Hybrid용)
 */
export interface SyncableAdapter extends StorageAdapter {
  // === Sync Queue ===

  /**
   * 동기화 큐에 항목 추가
   */
  addToSyncQueue(id: string, action: 'save' | 'delete'): Promise<void>

  /**
   * 동기화 큐 항목 가져오기
   */
  getSyncQueue(): Promise<SyncQueueItem[]>

  /**
   * 동기화 큐에서 항목 제거
   */
  clearSyncQueue(id: string): Promise<void>

  /**
   * 동기화 큐 재시도 횟수 증가
   */
  incrementRetryCount(id: string): Promise<void>

  // === Sync Operations ===

  /**
   * 대기 중인 항목 동기화
   */
  syncPendingItems(): Promise<void>

  /**
   * 클라우드에서 데이터 가져오기
   */
  pullFromCloud(): Promise<void>
}