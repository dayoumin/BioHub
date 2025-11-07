/**
 * sql.js + absurd-sql (IndexedDB 백엔드)
 *
 * 브라우저에서 SQLite DB를 IndexedDB에 영구 저장
 * - 초기 로딩: 원격 DB 파일 다운로드 → IndexedDB 저장
 * - 재방문: IndexedDB에서 즉시 로드 (다운로드 불필요)
 * - 문서 추가/수정: IndexedDB에 자동 저장
 */

import initSqlJs from '@jlongster/sql.js'
import { SQLiteFS } from 'absurd-sql'
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend'

export interface SqlJsStatic {
  Database: new (data?: Uint8Array | string) => SqlJsDatabase
  FS: {
    writeFile(path: string, data: Uint8Array): void
    readFile(path: string): Uint8Array
    unlink(path: string): void
  }
  register_for_idb(sqlFS: SQLiteFS): void
}

export interface SqlJsDatabase {
  exec(sql: string): SqlJsExecResult[]
  close(): void
  export(): Uint8Array
}

export interface SqlJsExecResult {
  columns: string[]
  values: unknown[][]
}

/**
 * IndexedDB 기반 SQLite 초기화
 *
 * @param vectorStoreId - Vector Store ID (예: 'qwen3-embedding-0.6b')
 * @returns SQL 객체 및 DB 인스턴스
 */
export async function initSqlWithIndexedDB(
  vectorStoreId: string = 'qwen3-embedding-0.6b'
): Promise<{
  SQL: SqlJsStatic
  db: SqlJsDatabase
}> {
  console.log('[sql-indexeddb] 초기화 중...')

  // 1. sql.js 로드
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/sql-wasm/${file}`
  }) as unknown as SqlJsStatic

  // 2. IndexedDB 백엔드 설정
  const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend())
  SQL.register_for_idb(sqlFS)

  console.log('[sql-indexeddb] ✓ IndexedDB 백엔드 등록 완료')

  // 3. DB 파일 경로 (IndexedDB에 영구 저장됨)
  const dbPath = '/vector-store.db'

  // 4. 기존 DB 확인
  let db: SqlJsDatabase

  try {
    // IndexedDB에 이미 있으면 로드
    SQL.FS.readFile(dbPath)
    db = new SQL.Database(dbPath)
    console.log('[sql-indexeddb] ✓ IndexedDB에서 DB 로드 완료 (다운로드 불필요)')
  } catch {
    // 없으면 원격에서 다운로드 후 IndexedDB에 저장
    console.log('[sql-indexeddb] IndexedDB에 DB 없음, 원격 다운로드 중...')

    const dbUrl = `/rag-data/vector-${vectorStoreId}.db`
    const response = await fetch(dbUrl)

    if (!response.ok) {
      throw new Error(`DB 파일 다운로드 실패: ${dbUrl} (${response.statusText})`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    console.log(`[sql-indexeddb] ✓ 다운로드 완료 (${(uint8Array.length / 1024 / 1024).toFixed(2)} MB)`)

    // DB 생성 및 IndexedDB에 저장
    db = new SQL.Database(uint8Array)

    // ✅ 핵심: DB를 IndexedDB에 영구 저장 (다음번엔 다운로드 불필요!)
    SQL.FS.writeFile(dbPath, db.export())

    console.log('[sql-indexeddb] ✓ DB를 IndexedDB에 저장 완료 (재방문 시 즉시 로드)')
  }

  return { SQL, db }
}

/**
 * DB 변경사항을 IndexedDB에 저장
 *
 * 사용 시점:
 * - 문서 추가/수정/삭제 후
 * - 임베딩 생성 후
 *
 * @param SQL - sql.js 객체
 * @param db - DB 인스턴스
 */
export function persistDB(SQL: SqlJsStatic, db: SqlJsDatabase): void {
  const dbPath = '/vector-store.db'

  try {
    const exportedData = db.export()
    SQL.FS.writeFile(dbPath, exportedData)
    console.log('[sql-indexeddb] ✓ DB 변경사항 IndexedDB에 저장 완료')
  } catch (error) {
    console.error('[sql-indexeddb] ✗ DB 저장 실패:', error)
    throw error
  }
}

/**
 * IndexedDB에서 DB 삭제 (재구축 시 사용)
 *
 * @param SQL - sql.js 객체
 */
export function clearPersistedDB(SQL: SqlJsStatic): void {
  const dbPath = '/vector-store.db'

  try {
    SQL.FS.unlink(dbPath)
    console.log('[sql-indexeddb] ✓ IndexedDB에서 DB 삭제 완료')
  } catch (error) {
    console.warn('[sql-indexeddb] DB 삭제 실패 (이미 없을 수 있음):', error)
  }
}
