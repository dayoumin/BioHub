/**
 * DocumentBlueprint IndexedDB 저장소
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §6
 * 구현 계획: Phase 1
 *
 * Local-only: storage.ts facade 비경유, project-storage.ts 패턴
 * EntityRef 동기화: 저장/삭제 시 upsertProjectEntityRef/removeProjectEntityRef 호출
 */

import type { DocumentBlueprint } from './document-blueprint-types'
import {
  upsertProjectEntityRef,
  removeProjectEntityRef,
} from './project-storage'
import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'

const STORE_NAME = 'document-blueprints'

// ── IndexedDB 헬퍼 ──

function txGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function txGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function txGetByIndex<T>(db: IDBDatabase, storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const req = index.getAll(key)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function txPut<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function txDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── 공개 API ──

/**
 * 문서 저장 + EntityRef 동기화
 *
 * IndexedDB 저장 성공 후 EntityRef 생성. 순차 실행.
 */
export async function saveDocumentBlueprint(
  blueprint: DocumentBlueprint,
): Promise<void> {
  const db = await openDB()
  // updatedAt는 호출자가 설정하되, 누락 시 현재 시각으로 fallback
  const toSave = blueprint.updatedAt
    ? blueprint
    : { ...blueprint, updatedAt: new Date().toISOString() }
  await txPut(db, STORE_NAME, toSave)

  upsertProjectEntityRef({
    projectId: blueprint.projectId,
    entityKind: 'draft',
    entityId: blueprint.id,
    label: blueprint.title,
  })
}

/**
 * 문서 삭제 + EntityRef 동기화
 */
export async function deleteDocumentBlueprint(
  id: string,
  projectId: string,
): Promise<void> {
  const db = await openDB()
  await txDelete(db, STORE_NAME, id)

  removeProjectEntityRef(projectId, 'draft', id)
}

/**
 * 프로젝트별 문서 조회 (projectId 인덱스 사용)
 */
export async function loadDocumentBlueprints(
  projectId: string,
): Promise<DocumentBlueprint[]> {
  const db = await openDB()
  const docs = await txGetByIndex<DocumentBlueprint>(db, STORE_NAME, 'projectId', projectId)
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * 단건 조회
 */
export async function loadDocumentBlueprint(
  id: string,
): Promise<DocumentBlueprint | undefined> {
  const db = await openDB()
  return txGet<DocumentBlueprint>(db, STORE_NAME, id)
}

/**
 * 전체 문서 조회 (entity-loader용, 프로젝트 필터 없음)
 */
export async function loadAllDocumentBlueprints(): Promise<DocumentBlueprint[]> {
  const db = await openDB()
  return txGetAll<DocumentBlueprint>(db, STORE_NAME)
}

/**
 * 전체 문서 수 조회 (진단용)
 */
export async function getDocumentBlueprintCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
