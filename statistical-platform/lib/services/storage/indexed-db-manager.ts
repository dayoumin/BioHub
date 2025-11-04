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

        // 기존 객체 저장소 삭제
        for (const store of stores) {
          if (db.objectStoreNames.contains(store.name)) {
            db.deleteObjectStore(store.name)
          }
        }

        // 새 객체 저장소 생성
        for (const store of stores) {
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
        }

        console.log(`[IndexedDB] Schema upgraded`)
      }
    })
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
   * 데이터베이스 종료
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
