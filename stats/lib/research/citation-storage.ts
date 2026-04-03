/**
 * 인용 레코드 IndexedDB 저장소
 *
 * document-blueprint-storage.ts 패턴을 따름.
 * Local-only, storage.ts facade 비경유.
 */

import type { CitationRecord } from './citation-types'
import { citationKey } from './citation-types'
import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'

const STORE_NAME = 'citations'

function txPut<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function txGetByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).index(indexName).getAll(key)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function txDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 인용 저장 — 동일 프로젝트 내 citationKey 중복 시 무시 (idempotent) */
export async function saveCitation(record: CitationRecord): Promise<void> {
  const db = await openDB()
  const existing = await txGetByIndex<CitationRecord>(db, STORE_NAME, 'projectId', record.projectId)
  const key = citationKey(record.item)
  if (existing.some(r => citationKey(r.item) === key)) return
  await txPut(db, STORE_NAME, record)
}

/** 프로젝트별 인용 목록 (추가순) */
export async function listCitationsByProject(projectId: string): Promise<CitationRecord[]> {
  const db = await openDB()
  const records = await txGetByIndex<CitationRecord>(db, STORE_NAME, 'projectId', projectId)
  return records.sort((a, b) => a.addedAt.localeCompare(b.addedAt))
}

/** 인용 삭제 */
export async function deleteCitation(id: string): Promise<void> {
  const db = await openDB()
  await txDelete(db, STORE_NAME, id)
}
