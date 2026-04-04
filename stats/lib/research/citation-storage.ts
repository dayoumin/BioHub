/**
 * 인용 레코드 IndexedDB 저장소
 *
 * document-blueprint-storage.ts 패턴을 따름.
 * Local-only, storage.ts facade 비경유.
 */

import type { CitationRecord } from './citation-types'
import { citationKey } from './citation-types'
import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'
import { txPut, txGetByIndex, txDelete } from '@/lib/utils/indexeddb-helpers'

const STORE_NAME = 'citations'

/** 인용 저장 — 동일 프로젝트 내 citationKey 중복 시 무시 (idempotent, 단일 트랜잭션) */
export async function saveCitation(record: CitationRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.index('projectId').getAll(record.projectId)
    req.onsuccess = () => {
      const existing = req.result as CitationRecord[]
      const key = citationKey(record.item)
      if (existing.some(r => citationKey(r.item) === key)) {
        resolve()
        return
      }
      const putReq = store.put(record)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    req.onerror = () => reject(req.error)
  })
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
