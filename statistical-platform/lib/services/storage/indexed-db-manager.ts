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
   * - v1 → v2: 데이터 보존 (기존 저장소 유지, 새 저장소만 생성)
   * - v2 → v3+: 향후 인덱스 변경 필요 시 저장소 재생성
   *
   * ⚠️ 제약사항: onupgradeneeded 콘텍스트 내에서만 호출
   * - versionchange 트랜잭션이 활성화됨
   * - 새 트랜잭션 생성 불가 (InvalidStateError)
   * - 따라서 기존 저장소의 인덱스 검사 불가능
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

    // v1 → v2: 저장소 유지 (데이터 보존)
    if (oldVersion < 2) {
      console.log('[IndexedDB] Running migration: v1 → v2 (data preservation)')
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store.name)) {
          // ✅ 새로운 저장소만 생성
          this.createObjectStore(db, store)
        } else {
          // ✅ 기존 저장소는 유지 (데이터 보존)
          // 인덱스 변경이 필요하면 별도 버전에서 처리
          console.log(
            `[IndexedDB] Store "${store.name}" already exists. Data preserved.`
          )
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
   * ⚠️ IndexedDB 제약사항
   *
   * onupgradeneeded 핸들러 내에서는 versionchange 트랜잭션이 활성 상태이므로:
   * - ❌ db.transaction() 호출 불가 → InvalidStateError 발생
   * - ❌ 기존 저장소의 인덱스 검사 불가 → 새 트랜잭션 필요
   *
   * 따라서:
   * - v1 → v2: 데이터만 보존 (인덱스 변경 불가)
   * - v2 → v3+: 인덱스 변경 필요 시 저장소 재생성 (데이터 손실)
   *
   * 미래 인덱스 추가 방법:
   * 1. DB 버전을 v3으로 업그레이드
   * 2. onupgradeneeded에서 다음 로직 실행:
   *    if (oldVersion < 3) {
   *      if (db.objectStoreNames.contains('sessions')) {
   *        db.deleteObjectStore('sessions')
   *      }
   *      this.createObjectStore(db, storeConfig)
   *    }
   * 3. 주의: 이 방식은 데이터 손실 발생
   */

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
