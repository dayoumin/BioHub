/**
 * IndexedDB 관리자 - 저수준 데이터베이스 작업
 *
 * - 데이터베이스 초기화
 * - 객체 저장소 관리
 * - 트랜잭션 처리
 */

export interface IndexedDBConfig {
  dbName: string
  version: number
}

export interface StoreConfig {
  name: string
  keyPath: string
  indexes?: Array<{
    name: string
    keyPath: string | string[]
    unique?: boolean
  }>
}

export class IndexedDBManager {
  private db: IDBDatabase | null = null
  private config: IndexedDBConfig

  constructor(config: IndexedDBConfig) {
    this.config = config
  }

  /**
   * 데이터베이스 초기화
   * - 처음 열기: 저장소 생성
   * - 버전 업그레이드: 데이터 보존하며 마이그레이션
   */
  async initialize(stores: StoreConfig[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log(`[IndexedDB] Database initialized: ${this.config.dbName}`)
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion
        const newVersion = event.newVersion ?? 1

        console.log(`[IndexedDB] Migrating from v${oldVersion} to v${newVersion}`)

        // 버전별 마이그레이션 실행
        this.runMigrations(db, stores, oldVersion)

        console.log(`[IndexedDB] Schema upgraded from v${oldVersion} to v${newVersion}`)
      }
    })
  }

  /**
   * 버전별 마이그레이션 실행 (순차적 버전 업그레이드)
   * - v0 → v1: 초기 저장소 생성
   * - v1 → v2: 인덱스 동기화
   * - v2 → v3+: 향후 스키마 변경 추가
   */
  private runMigrations(
    db: IDBDatabase,
    stores: StoreConfig[],
    oldVersion: number
  ): void {
    // v0 → v1: 초기 생성
    if (oldVersion < 1) {
      console.log('[IndexedDB] Running migration: v0 → v1 (initial setup)')
      for (const store of stores) {
        this.createObjectStore(db, store)
      }
    }

    // v1 → v2: 인덱스 동기화 (기존 저장소 보존, 인덱스 추가)
    if (oldVersion < 2) {
      console.log('[IndexedDB] Running migration: v1 → v2 (index synchronization)')
      for (const store of stores) {
        if (db.objectStoreNames.contains(store.name)) {
          // ✅ 저장소 이미 존재 → 인덱스만 동기화
          this.synchronizeIndexes(db, store)
        } else {
          // ✅ 새로운 저장소 → 생성
          this.createObjectStore(db, store)
        }
      }
    }

    // v2 → v3+: 향후 추가 마이그레이션
    // if (oldVersion < 3) {
    //   console.log('[IndexedDB] Running migration: v2 → v3 (future changes)')
    //   // 향후 스키마 변경 로직
    // }
  }

  /**
   * 인덱스 동기화 (기존 저장소)
   * - 선언된 인덱스 목록과 실제 DB 인덱스 비교
   * - 누락된 인덱스 추가
   * - 불필요한 인덱스는 유지 (호환성)
   */
  private synchronizeIndexes(db: IDBDatabase, store: StoreConfig): void {
    // onupgradeneeded 내에서는 읽기 전용 작업만 가능하므로 주의
    // 인덱스 추가는 트랜잭션 외부에서만 가능
    // 이미 존재하는 저장소는 recreate가 필요한 경우만 처리

    if (!store.indexes) {
      console.log(`[IndexedDB] Store "${store.name}" has no indexes to synchronize`)
      return
    }

    // 기존 저장소의 인덱스 목록 확인
    const existingStore = db.transaction([store.name], 'readonly').objectStore(store.name)
    const existingIndexes = new Set<string>(
      Array.from(existingStore.indexNames).map((name) => name as string)
    )

    // 추가해야 할 인덱스 목록
    const requiredIndexes = new Set<string>(store.indexes.map((idx) => idx.name))

    // 누락된 인덱스 확인
    const missingIndexes = Array.from(requiredIndexes).filter(
      (idx) => !existingIndexes.has(idx)
    )

    if (missingIndexes.length === 0) {
      console.log(`[IndexedDB] Store "${store.name}" indexes are synchronized`)
      return
    }

    // ⚠️ 주의: 기존 저장소에 새 인덱스 추가는 recreate가 필요
    console.warn(
      `[IndexedDB] Store "${store.name}" missing indexes: ${missingIndexes.join(', ')}`
    )
    console.warn(
      `[IndexedDB] To add new indexes to existing store, database recreation is required`
    )
    console.warn(`[IndexedDB] Current indexes: ${Array.from(existingIndexes).join(', ')}`)

    // 현재 구현: 누락된 인덱스는 로그만 남김
    // 향후 개선: 필요시 저장소 recreate 로직 추가
  }

  /**
   * 객체 저장소 생성
   */
  private createObjectStore(db: IDBDatabase, store: StoreConfig): void {
    const objectStore = db.createObjectStore(store.name, {
      keyPath: store.keyPath,
    })

    // 인덱스 생성
    if (store.indexes) {
      for (const index of store.indexes) {
        objectStore.createIndex(
          index.name,
          index.keyPath,
          { unique: index.unique ?? false }
        )
      }
    }

    console.log(`[IndexedDB] Created store "${store.name}"`)
  }

  /**
   * 객체 저장
   */
  async put<T extends Record<string, any>>(
    storeName: string,
    value: T
  ): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(value)

      request.onerror = () => {
        reject(new Error(`Failed to put: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  /**
   * 객체 조회
   */
  async get<T extends Record<string, any>>(
    storeName: string,
    key: IDBValidKey
  ): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onerror = () => {
        reject(new Error(`Failed to get: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result as T | undefined)
      }
    })
  }

  /**
   * 모든 객체 조회
   */
  async getAll<T extends Record<string, any>>(
    storeName: string
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => {
        reject(new Error(`Failed to get all: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result as T[])
      }
    })
  }

  /**
   * 인덱스로 조회
   */
  async query<T extends Record<string, any>>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onerror = () => {
        reject(new Error(`Failed to query: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result as T[])
      }
    })
  }

  /**
   * 객체 삭제
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => {
        reject(new Error(`Failed to delete: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * 모든 객체 삭제
   */
  async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => {
        reject(new Error(`Failed to clear: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * 트랜잭션 기반 업데이트 (Race Condition 방지)
   * 읽기-수정-쓰기를 단일 트랜잭션으로 처리하여 원자성 보장
   */
  async updateInTransaction<T extends Record<string, any>>(
    storeName: string,
    key: IDBValidKey,
    updater: (item: T) => T
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // ✅ 단일 트랜잭션으로 읽기-쓰기 보장
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const getRequest = store.get(key)

      getRequest.onerror = () => {
        reject(new Error(`Failed to get: ${getRequest.error?.message}`))
      }

      getRequest.onsuccess = () => {
        const item = getRequest.result as T | undefined
        if (!item) {
          reject(new Error(`Item not found with key: ${String(key)}`))
          return
        }

        // 수정
        const updatedItem = updater(item)

        // 같은 트랜잭션 내에서 업데이트
        const putRequest = store.put(updatedItem)

        putRequest.onerror = () => {
          reject(new Error(`Failed to put: ${putRequest.error?.message}`))
        }

        putRequest.onsuccess = () => {
          resolve()
        }
      }

      // 트랜잭션 에러 처리
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`))
      }
    })
  }

  /**
   * 데이터베이스 종료
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
