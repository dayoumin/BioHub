/**
 * Type definitions for absurd-sql
 * absurd-sql은 sql.js에 IndexedDB 백엔드를 추가하는 라이브러리입니다.
 */

declare module 'absurd-sql' {
  export class SQLiteFS {
    constructor(FS: any, backend: any)
  }
}

declare module 'absurd-sql/dist/indexeddb-backend' {
  export default class IndexedDBBackend {
    constructor()
  }
}

declare module '@jlongster/sql.js' {
  interface InitSqlJsConfig {
    locateFile?: (file: string) => string
  }

  interface SqlJsStatic {
    Database: new (data?: Uint8Array | string) => SqlJsDatabase
    FS: {
      writeFile(path: string, data: Uint8Array): void
      readFile(path: string): Uint8Array
      unlink(path: string): void
    }
    register_for_idb(sqlFS: any): void
  }

  /**
   * SQL 파라미터 바인딩 타입
   * BLOB 저장 시 ArrayBuffer 사용
   */
  type BindParams = Array<string | number | null | ArrayBuffer | Uint8Array>

  interface SqlJsDatabase {
    /**
     * SQL 실행 (결과 반환)
     */
    exec(sql: string): SqlJsExecResult[]

    /**
     * SQL 실행 (파라미터 바인딩 지원, BLOB 저장 가능)
     *
     * @param sql SQL 쿼리 (? 플레이스홀더 사용)
     * @param params 바인딩할 파라미터 (ArrayBuffer = BLOB)
     * @returns Database 인스턴스 (체이닝 가능)
     *
     * @example
     * ```typescript
     * const embedding = new Float32Array([0.1, 0.2, 0.3])
     * db.run(
     *   "INSERT INTO embeddings (doc_id, embedding) VALUES (?, ?)",
     *   ['doc1', embedding.buffer]
     * )
     * ```
     */
    run(sql: string, params?: BindParams): SqlJsDatabase

    close(): void
    export(): Uint8Array
  }

  interface SqlJsExecResult {
    columns: string[]
    values: any[][]
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>
}
