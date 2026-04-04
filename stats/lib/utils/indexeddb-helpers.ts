/**
 * IndexedDB 트랜잭션 헬퍼 (공유)
 *
 * 여러 저장소에서 공통으로 사용하는 IndexedDB CRUD 래퍼.
 * Promise 기반으로 IDBRequest 콜백을 감싼다.
 */

/** 단일 레코드 조회 (keyPath 기준) */
export function txGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = (): void => resolve(req.result as T | undefined)
    req.onerror = (): void => reject(req.error)
  })
}

/** 전체 레코드 조회 */
export function txGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = (): void => resolve(req.result as T[])
    req.onerror = (): void => reject(req.error)
  })
}

/** 인덱스 기준 레코드 조회 */
export function txGetByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const req = index.getAll(key)
    req.onsuccess = (): void => resolve(req.result as T[])
    req.onerror = (): void => reject(req.error)
  })
}

/** 레코드 저장 (upsert) */
export function txPut<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value)
    req.onsuccess = (): void => resolve()
    req.onerror = (): void => reject(req.error)
  })
}

/** 레코드 삭제 */
export function txDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = (): void => resolve()
    req.onerror = (): void => reject(req.error)
  })
}
