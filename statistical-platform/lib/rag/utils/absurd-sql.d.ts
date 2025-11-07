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

  interface SqlJsDatabase {
    exec(sql: string): SqlJsExecResult[]
    close(): void
    export(): Uint8Array
  }

  interface SqlJsExecResult {
    columns: string[]
    values: any[][]
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>
}
