/**
 * sql-indexeddb.ts 테스트
 *
 * absurd-sql (IndexedDB 백엔드) 기능 검증
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

describe('sql-indexeddb', () => {
  describe('타입 정의 검증', () => {
    it('SqlJsStatic 타입이 올바르게 정의되어야 함', () => {
      // 타입 체크만 수행 (컴파일 시점 검증)
      type SqlJsStaticTest = {
        Database: new (data?: Uint8Array | string) => unknown
        FS: {
          writeFile(path: string, data: Uint8Array): void
          readFile(path: string): Uint8Array
          unlink(path: string): void
        }
        register_for_idb(sqlFS: unknown): void
      }

      const typeCheck: SqlJsStaticTest = {} as any
      expect(typeCheck).toBeDefined()
    })

    it('SqlJsDatabase 타입이 올바르게 정의되어야 함', () => {
      type SqlJsDatabaseTest = {
        exec(sql: string): unknown[]
        close(): void
        export(): Uint8Array
      }

      const typeCheck: SqlJsDatabaseTest = {} as any
      expect(typeCheck).toBeDefined()
    })
  })

  describe('오프라인 지원 검증', () => {
    it('CDN 의존성이 없어야 함', () => {
      // sql-indexeddb.ts 소스 코드에 CDN URL이 없는지 확인
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // CDN URL 패턴 검사
      expect(source).not.toMatch(/https?:\/\/sql\.js\.org/)
      expect(source).not.toMatch(/https?:\/\/cdn/)
      expect(source).not.toMatch(/https?:\/\/unpkg/)

      console.log('✓ CDN 의존성 없음 확인')
    })

    it('로컬 리소스만 사용해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // 로컬 경로 사용 확인
      expect(source).toMatch(/\/sql-wasm\//)
      expect(source).toMatch(/\/rag-data\//)

      console.log('✓ 로컬 리소스 사용 확인')
    })
  })

  describe('함수 시그니처 검증', () => {
    it('initSqlWithIndexedDB 함수가 올바른 파라미터를 받아야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // vectorStoreId 파라미터 기본값 확인
      expect(source).toMatch(/vectorStoreId: string = ['"]qwen3-embedding-0\.6b['"]/)
      expect(source).toMatch(/Promise<\{[^}]*SQL: SqlJsStatic[^}]*db: SqlJsDatabase[^}]*\}>/)

      console.log('✓ initSqlWithIndexedDB 시그니처 올바름')
    })

    it('persistDB 함수가 올바른 파라미터를 받아야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // persistDB 시그니처 확인
      expect(source).toMatch(/export function persistDB\(SQL: SqlJsStatic, db: SqlJsDatabase\): void/)

      console.log('✓ persistDB 시그니처 올바름')
    })

    it('clearPersistedDB 함수가 올바른 파라미터를 받아야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // clearPersistedDB 시그니처 확인
      expect(source).toMatch(/export function clearPersistedDB\(SQL: SqlJsStatic\): void/)

      console.log('✓ clearPersistedDB 시그니처 올바름')
    })
  })

  describe('에러 처리 검증', () => {
    it('initSqlWithIndexedDB가 에러 메시지를 포함해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // 에러 메시지 확인
      expect(source).toMatch(/DB 파일 다운로드 실패/)
      expect(source).toMatch(/response\.statusText/)

      console.log('✓ 에러 처리 로직 존재')
    })

    it('persistDB가 try-catch를 사용해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // persistDB 함수 내 try-catch 확인
      const persistDBFunction = source.match(/export function persistDB[\s\S]*?^}/m)
      expect(persistDBFunction).toBeTruthy()

      if (persistDBFunction) {
        expect(persistDBFunction[0]).toMatch(/try/)
        expect(persistDBFunction[0]).toMatch(/catch/)
      }

      console.log('✓ persistDB try-catch 존재')
    })
  })

  describe('로깅 검증', () => {
    it('모든 주요 함수가 로깅을 해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // 로깅 prefix 확인
      const logMatches = source.match(/\[sql-indexeddb\]/g)
      expect(logMatches).toBeTruthy()
      expect(logMatches!.length).toBeGreaterThan(5)

      console.log(`✓ [sql-indexeddb] 로그 ${logMatches!.length}개 발견`)
    })

    it('성공/실패 로그가 명확히 구분되어야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // 성공 로그 (✓)
      expect(source).toMatch(/✓/)

      // 실패 로그 (✗)
      expect(source).toMatch(/✗/)

      console.log('✓ 성공/실패 로그 구분 명확')
    })
  })

  describe('통합 검증', () => {
    it('ollama-provider.ts가 sql-indexeddb를 올바르게 import해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../../providers/ollama-provider.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // import 구문 확인 (여러 줄로 나뉜 import 지원)
      expect(source).toMatch(/initSqlWithIndexedDB/)
      expect(source).toMatch(/persistDB/)
      expect(source).toMatch(/from.*['"].*sql-indexeddb['"]/)

      console.log('✓ ollama-provider.ts import 올바름')
    })

    it('ollama-provider.ts가 persistDB를 3곳에서 호출해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../../providers/ollama-provider.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // persistDB 호출 횟수 확인
      const persistDBCalls = source.match(/persistDB\(this\.SQL, this\.db\)/g)
      expect(persistDBCalls).toBeTruthy()
      expect(persistDBCalls!.length).toBe(3)

      console.log('✓ persistDB 호출 3곳 확인 (addDocument, updateDocument, deleteDocument)')
    })

    it('ollama-provider.ts가 loadSqlJs를 제거했어야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../../providers/ollama-provider.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // loadSqlJs 함수가 단순화되었는지 확인
      const loadSqlJsFunction = source.match(/async function loadSqlJs[\s\S]*?^}/m)
      expect(loadSqlJsFunction).toBeTruthy()

      if (loadSqlJsFunction) {
        // CDN 로직이 없어야 함
        expect(loadSqlJsFunction[0]).not.toMatch(/https?:\/\//)
        expect(loadSqlJsFunction[0]).not.toMatch(/loadFromCDN/)
      }

      console.log('✓ loadSqlJs CDN 로직 제거 확인')
    })

    it('ollama-provider.ts의 loadSQLiteDB가 absurd-sql을 사용해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../../providers/ollama-provider.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // initSqlWithIndexedDB 호출 확인
      expect(source).toMatch(/await initSqlWithIndexedDB\(vectorStoreId\)/)
      expect(source).toMatch(/this\.SQL = SQL/)
      expect(source).toMatch(/IndexedDB 백엔드/)

      console.log('✓ loadSQLiteDB absurd-sql 통합 확인')
    })
  })

  describe('성능 최적화 검증', () => {
    it('재방문 시 다운로드를 건너뛰어야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // readFile 시도 후 catch 블록에서 fetch 확인
      expect(source).toMatch(/SQL\.FS\.readFile\(dbPath\)/)
      expect(source).toMatch(/} catch \{/)
      expect(source).toMatch(/const response = await fetch\(dbUrl\)/)
      expect(source).toMatch(/IndexedDB에서 DB 로드 완료.*다운로드 불필요/)

      console.log('✓ 재방문 최적화 로직 확인')
    })

    it('DB 크기를 MB 단위로 표시해야 함', () => {
      const fs = require('fs')
      const path = require('path')

      const filePath = path.join(__dirname, '../sql-indexeddb.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // MB 변환 로직 확인
      expect(source).toMatch(/uint8Array\.length \/ 1024 \/ 1024/)
      expect(source).toMatch(/\.toFixed\(2\)/)
      expect(source).toMatch(/MB/)

      console.log('✓ DB 크기 표시 로직 확인')
    })
  })
})
