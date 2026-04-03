/**
 * 차트 스냅샷 IndexedDB 저장소
 *
 * Graph Studio에서 ECharts로 캡처한 PNG 바이너리를 로컬에 저장합니다.
 * 논문 작성 기능(Phase 6a)에서 DOCX 삽입 시 사용됩니다.
 */

import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'

const STORE_NAME = 'chart-snapshots'

export interface ChartSnapshot {
  id: string           // graphProjectId
  data: Uint8Array     // PNG 바이너리
  cssWidth: number     // ECharts 렌더 영역 CSS px
  cssHeight: number
  pixelRatio: number   // 캡처 시 배율 (기본 2)
  updatedAt: string    // ISO 8601
}

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
 * 차트 스냅샷 저장 (신규 또는 덮어쓰기)
 */
export async function saveSnapshot(snapshot: ChartSnapshot): Promise<void> {
  const db = await openDB()
  await txPut<ChartSnapshot>(db, STORE_NAME, snapshot)
}

/**
 * 단건 조회. 없으면 undefined 반환.
 */
export async function loadSnapshot(id: string): Promise<ChartSnapshot | undefined> {
  const db = await openDB()
  return txGet<ChartSnapshot>(db, STORE_NAME, id)
}

/**
 * 복수 ID로 일괄 조회.
 * 존재하는 항목만 Map에 포함됩니다 (없는 키는 Map에 없음).
 */
export async function loadSnapshots(ids: string[]): Promise<Map<string, ChartSnapshot>> {
  const db = await openDB()
  const result = new Map<string, ChartSnapshot>()
  await Promise.all(
    ids.map(async (id) => {
      const snapshot = await txGet<ChartSnapshot>(db, STORE_NAME, id)
      if (snapshot !== undefined) {
        result.set(id, snapshot)
      }
    }),
  )
  return result
}

/**
 * 단건 삭제
 */
export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB()
  await txDelete(db, STORE_NAME, id)
}

/**
 * 복수 ID 일괄 삭제
 */
export async function deleteSnapshots(ids: string[]): Promise<void> {
  const db = await openDB()
  await Promise.all(ids.map((id) => txDelete(db, STORE_NAME, id)))
}

/**
 * base64 data URL → Uint8Array 변환
 *
 * ECharts의 getDataURL()이 반환하는 "data:image/png;base64,..." 형식을 처리합니다.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  if (base64 === undefined) {
    throw new Error('[chart-snapshot-storage] dataUrl에 base64 데이터가 없습니다')
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
