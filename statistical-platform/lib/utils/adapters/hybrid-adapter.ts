/**
 * Hybrid Storage Adapter
 *
 * IndexedDB + Turso를 결합한 하이브리드 저장소
 * - 오프라인: IndexedDB에 저장 + 동기화 큐에 추가
 * - 온라인: IndexedDB + Turso 동시 저장
 * - 네트워크 복구 시: 큐에 쌓인 항목 자동 동기화
 */

import type { SyncableAdapter } from './storage-adapter'
import type {
  HistoryRecord,
  SyncQueueItem,
  StorageType,
  StorageStatus
} from '../storage-types'
import { IndexedDBAdapter } from './indexeddb-adapter'
import { TursoAdapter } from './turso-adapter'

const MAX_RETRY_COUNT = 3
const SYNC_INTERVAL = 30000  // 30초마다 동기화 시도

/**
 * Hybrid Adapter 클래스
 */
export class HybridAdapter implements SyncableAdapter {
  private localAdapter: IndexedDBAdapter
  private cloudAdapter: TursoAdapter
  private syncIntervalId: ReturnType<typeof setInterval> | null = null
  private isSyncing = false

  // Event listener references (for proper cleanup)
  private boundHandleOnline: () => void
  private boundHandleOffline: () => void

  constructor() {
    this.localAdapter = new IndexedDBAdapter()
    this.cloudAdapter = new TursoAdapter()

    // Bind event handlers for proper cleanup
    this.boundHandleOnline = this.handleOnline.bind(this)
    this.boundHandleOffline = this.handleOffline.bind(this)

    // 온라인 상태 변화 감지
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundHandleOnline)
      window.addEventListener('offline', this.boundHandleOffline)

      // 초기 온라인 상태면 동기화 시작
      if (navigator.onLine) {
        this.startSyncInterval()
      }
    }
  }

  /**
   * 온라인 전환 시 처리
   */
  private handleOnline(): void {
    console.log('[Hybrid] Online detected, starting sync...')
    this.startSyncInterval()
    this.syncPendingItems().catch(console.error)
  }

  /**
   * 오프라인 전환 시 처리
   */
  private handleOffline(): void {
    console.log('[Hybrid] Offline detected, stopping sync')
    this.stopSyncInterval()
  }

  /**
   * 주기적 동기화 시작
   */
  private startSyncInterval(): void {
    if (this.syncIntervalId) return

    this.syncIntervalId = setInterval(() => {
      this.syncPendingItems().catch(console.error)
    }, SYNC_INTERVAL)
  }

  /**
   * 주기적 동기화 중지
   */
  private stopSyncInterval(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }

  // === History CRUD ===

  async saveHistory(record: HistoryRecord, isUpdate = false): Promise<void> {
    // 1. 항상 로컬(IndexedDB)에 먼저 저장
    await this.localAdapter.saveHistory(record, isUpdate)

    // 2. 온라인이고 Turso 사용 가능하면 클라우드에도 저장
    if (this.isOnline() && this.cloudAdapter.isAvailable()) {
      try {
        await this.cloudAdapter.saveHistory(record, isUpdate)
        // 성공 시 동기화 완료 표시
        const syncedRecord = { ...record, syncedAt: Date.now() }
        await this.localAdapter.saveHistory(syncedRecord, true)
      } catch (error) {
        console.warn('[Hybrid] Cloud save failed, queuing for sync:', error)
        // 실패 시 동기화 큐에 추가
        await this.localAdapter.addToSyncQueue(record.id, 'save')
      }
    } else {
      // 오프라인이면 동기화 큐에 추가
      await this.localAdapter.addToSyncQueue(record.id, 'save')
    }
  }

  async getAllHistory(): Promise<HistoryRecord[]> {
    // 로컬 데이터 반환 (항상 최신)
    return this.localAdapter.getAllHistory()
  }

  async getHistory(id: string): Promise<HistoryRecord | null> {
    return this.localAdapter.getHistory(id)
  }

  async deleteHistory(id: string): Promise<void> {
    // 1. 로컬에서 삭제
    await this.localAdapter.deleteHistory(id)

    // 2. 온라인이면 클라우드에서도 삭제
    if (this.isOnline() && this.cloudAdapter.isAvailable()) {
      try {
        await this.cloudAdapter.deleteHistory(id)
      } catch (error) {
        console.warn('[Hybrid] Cloud delete failed, queuing for sync:', error)
        await this.localAdapter.addToSyncQueue(id, 'delete')
      }
    } else {
      await this.localAdapter.addToSyncQueue(id, 'delete')
    }
  }

  async clearAllHistory(): Promise<void> {
    await this.localAdapter.clearAllHistory()

    if (this.isOnline() && this.cloudAdapter.isAvailable()) {
      try {
        await this.cloudAdapter.clearAllHistory()
      } catch (error) {
        console.warn('[Hybrid] Cloud clear failed:', error)
      }
    }
  }

  async getHistoryCount(): Promise<number> {
    return this.localAdapter.getHistoryCount()
  }

  // === Favorites ===

  async saveFavorites(methodIds: string[]): Promise<void> {
    await this.localAdapter.saveFavorites(methodIds)

    if (this.isOnline() && this.cloudAdapter.isAvailable()) {
      try {
        await this.cloudAdapter.saveFavorites(methodIds)
      } catch (error) {
        console.warn('[Hybrid] Cloud favorites save failed:', error)
      }
    }
  }

  async getFavorites(): Promise<string[]> {
    return this.localAdapter.getFavorites()
  }

  // === Sync Queue (IndexedDB에 위임) ===

  async addToSyncQueue(id: string, action: 'save' | 'delete'): Promise<void> {
    return this.localAdapter.addToSyncQueue(id, action)
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.localAdapter.getSyncQueue()
  }

  async clearSyncQueue(id: string): Promise<void> {
    return this.localAdapter.clearSyncQueue(id)
  }

  async incrementRetryCount(id: string): Promise<void> {
    return this.localAdapter.incrementRetryCount(id)
  }

  // === Sync Operations ===

  /**
   * 대기 중인 항목 동기화 (오프라인 → 온라인)
   */
  async syncPendingItems(): Promise<void> {
    if (!this.isOnline() || !this.cloudAdapter.isAvailable()) {
      console.log('[Hybrid] Skip sync - offline or Turso unavailable')
      return
    }

    if (this.isSyncing) {
      console.log('[Hybrid] Sync already in progress')
      return
    }

    this.isSyncing = true

    try {
      const queue = await this.getSyncQueue()
      console.log(`[Hybrid] Syncing ${queue.length} pending items...`)

      for (const item of queue) {
        if (item.retryCount >= MAX_RETRY_COUNT) {
          console.warn(`[Hybrid] Max retry exceeded for ${item.id}, removing from queue`)
          await this.clearSyncQueue(item.id)
          continue
        }

        try {
          if (item.action === 'save') {
            const record = await this.localAdapter.getHistory(item.id)
            if (record) {
              await this.cloudAdapter.saveHistory(record, true)
              // 동기화 완료 표시
              const syncedRecord = { ...record, syncedAt: Date.now() }
              await this.localAdapter.saveHistory(syncedRecord, true)
            }
          } else if (item.action === 'delete') {
            await this.cloudAdapter.deleteHistory(item.id)
          }

          // 성공 시 큐에서 제거
          await this.clearSyncQueue(item.id)
          console.log(`[Hybrid] Synced: ${item.id} (${item.action})`)
        } catch (error) {
          console.warn(`[Hybrid] Sync failed for ${item.id}:`, error)
          await this.incrementRetryCount(item.id)
        }
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 클라우드에서 데이터 가져오기 (온라인 → 로컬)
   * 충돌 해결: timestamp 기반 (최신 우선)
   */
  async pullFromCloud(): Promise<void> {
    if (!this.isOnline() || !this.cloudAdapter.isAvailable()) {
      console.log('[Hybrid] Skip pull - offline or Turso unavailable')
      return
    }

    try {
      const cloudRecords = await this.cloudAdapter.getAllHistory()
      const localRecords = await this.localAdapter.getAllHistory()
      const localMap = new Map(localRecords.map(r => [r.id, r]))

      console.log(`[Hybrid] Pulling ${cloudRecords.length} records from cloud...`)

      for (const cloudRecord of cloudRecords) {
        const localRecord = localMap.get(cloudRecord.id)

        if (!localRecord) {
          // 로컬에 없으면 추가
          await this.localAdapter.saveHistory(cloudRecord, true)
        } else {
          // 충돌 해결: updatedAt 비교 (최신 우선)
          const cloudTime = cloudRecord.updatedAt || cloudRecord.timestamp
          const localTime = localRecord.updatedAt || localRecord.timestamp

          if (cloudTime > localTime) {
            // 클라우드가 더 최신이면 로컬 업데이트
            await this.localAdapter.saveHistory(cloudRecord, true)
          }
          // 로컬이 더 최신이면 무시 (다음 sync에서 클라우드로 푸시됨)
        }
      }

      console.log('[Hybrid] Pull completed')
    } catch (error) {
      console.error('[Hybrid] Pull failed:', error)
    }
  }

  // === Metadata ===

  getStorageType(): StorageType {
    return 'hybrid'
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : false
  }

  isAvailable(): boolean {
    // Hybrid는 IndexedDB만 있으면 사용 가능
    return this.localAdapter.isAvailable()
  }

  async getStatus(): Promise<StorageStatus> {
    const queue = await this.getSyncQueue()
    const localStatus = await this.localAdapter.getStatus()
    const cloudAvailable = this.cloudAdapter.isAvailable()

    return {
      type: 'hybrid',
      isOnline: this.isOnline(),
      pendingSyncCount: queue.length,
      lastSyncAt: localStatus.lastSyncAt,
      // 추가 정보 (디버깅용)
      ...({ cloudAvailable } as Record<string, unknown>)
    }
  }

  /**
   * 리소스 정리 (컴포넌트 언마운트 시 호출)
   */
  dispose(): void {
    this.stopSyncInterval()
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundHandleOnline)
      window.removeEventListener('offline', this.boundHandleOffline)
    }
  }
}
