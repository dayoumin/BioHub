/**
 * RAG 시스템 통합 테스트 - sql.js WASM 로딩 검증
 *
 * 목적: sql.js가 올바르게 로드되고 RAG 시스템이 정상 작동하는지 검증
 */

describe('RAG 시스템 sql.js WASM 통합 테스트', () => {

  describe('sql.js 파일 존재 확인', () => {
    it('public/sql-wasm/sql-wasm.js 파일이 존재해야 함', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.join(__dirname, '../../public/sql-wasm/sql-wasm.js')
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it('public/sql-wasm/sql-wasm.wasm 파일이 존재해야 함', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.join(__dirname, '../../public/sql-wasm/sql-wasm.wasm')
      expect(fs.existsSync(filePath)).toBe(true)
    })
  })

  describe('sql.js import 테스트', () => {
    it('@jlongster/sql.js npm 패키지가 import 가능해야 함', async () => {
      const initSqlJs = require('@jlongster/sql.js')
      expect(initSqlJs).toBeDefined()
      expect(typeof initSqlJs).toBe('function')
    })

    it('sql.js가 정상적으로 초기화되어야 함 (Node.js 환경)', async () => {
      const initSqlJs = require('@jlongster/sql.js')
      const path = require('path')

      // Node.js 환경에서는 실제 파일 경로 사용
      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          return path.join(__dirname, '../../public/sql-wasm', file)
        }
      })

      expect(SQL).toBeDefined()
      expect(SQL.Database).toBeDefined()
    }, 10000)

    it('SQLite DB를 생성하고 쿼리를 실행할 수 있어야 함', async () => {
      const initSqlJs = require('@jlongster/sql.js')
      const path = require('path')

      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          return path.join(__dirname, '../../public/sql-wasm', file)
        }
      })

      // 테스트용 in-memory DB 생성
      const db = new SQL.Database()

      // 테스트 테이블 생성
      db.run(`
        CREATE TABLE test_documents (
          id INTEGER PRIMARY KEY,
          title TEXT,
          content TEXT
        )
      `)

      // 테스트 데이터 삽입
      db.run(`
        INSERT INTO test_documents (title, content)
        VALUES ('Test Doc 1', 'This is test content 1')
      `)

      db.run(`
        INSERT INTO test_documents (title, content)
        VALUES ('Test Doc 2', 'This is test content 2')
      `)

      // 데이터 조회
      const result = db.exec('SELECT * FROM test_documents')

      expect(result).toBeDefined()
      expect(result.length).toBe(1)
      expect(result[0].columns).toEqual(['id', 'title', 'content'])
      expect(result[0].values.length).toBe(2)
      expect(result[0].values[0][1]).toBe('Test Doc 1')
      expect(result[0].values[1][1]).toBe('Test Doc 2')

      db.close()
    }, 10000)
  })

  describe('RAG 문서 저장/검색 시뮬레이션', () => {
    it('문서를 저장하고 검색할 수 있어야 함', async () => {
      const initSqlJs = require('@jlongster/sql.js')
      const path = require('path')

      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          return path.join(__dirname, '../../public/sql-wasm', file)
        }
      })

      const db = new SQL.Database()

      // RAG documents 테이블 생성 (실제 스키마 모방)
      db.run(`
        CREATE TABLE documents (
          doc_id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          library TEXT,
          category TEXT,
          summary TEXT,
          created_at INTEGER,
          updated_at INTEGER
        )
      `)

      // 모의 문서 삽입
      const mockDoc = {
        doc_id: 'test-doc-1',
        title: 'Kolmogorov-Smirnov Test',
        content: 'The Kolmogorov-Smirnov test is a nonparametric test...',
        library: 'scipy',
        category: 'statistics',
        summary: 'Tests if a sample follows a distribution',
        created_at: Date.now(),
        updated_at: Date.now()
      }

      db.run(`
        INSERT INTO documents (doc_id, title, content, library, category, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        mockDoc.doc_id,
        mockDoc.title,
        mockDoc.content,
        mockDoc.library,
        mockDoc.category,
        mockDoc.summary,
        mockDoc.created_at,
        mockDoc.updated_at
      ])

      // 문서 검색
      const result = db.exec(`
        SELECT doc_id, title, content
        FROM documents
        WHERE title LIKE '%Kolmogorov%'
      `)

      expect(result).toBeDefined()
      expect(result.length).toBe(1)
      expect(result[0].values.length).toBe(1)
      expect(result[0].values[0][0]).toBe('test-doc-1')
      expect(result[0].values[0][1]).toBe('Kolmogorov-Smirnov Test')

      db.close()
    }, 10000)

    it('BLOB 데이터(임베딩)를 저장하고 읽을 수 있어야 함', async () => {
      const initSqlJs = require('@jlongster/sql.js')
      const path = require('path')

      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          return path.join(__dirname, '../../public/sql-wasm', file)
        }
      })

      const db = new SQL.Database()

      // embeddings 테이블 생성 (실제 스키마)
      db.run(`
        CREATE TABLE embeddings (
          embedding_id INTEGER PRIMARY KEY AUTOINCREMENT,
          doc_id TEXT NOT NULL,
          chunk_index INTEGER,
          chunk_text TEXT,
          embedding BLOB,
          created_at INTEGER
        )
      `)

      // 모의 임베딩 벡터 생성 (768차원 float32)
      const mockEmbedding = new Float32Array(768)
      for (let i = 0; i < 768; i++) {
        mockEmbedding[i] = Math.random()
      }

      // BLOB으로 변환
      const embeddingBlob = new Uint8Array(mockEmbedding.buffer)

      // 임베딩 삽입
      db.run(`
        INSERT INTO embeddings (doc_id, chunk_index, chunk_text, embedding, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'test-doc-1',
        0,
        'This is a test chunk',
        embeddingBlob,
        Date.now()
      ])

      // 임베딩 조회
      const result = db.exec(`
        SELECT doc_id, chunk_index, embedding
        FROM embeddings
        WHERE doc_id = 'test-doc-1'
      `)

      expect(result).toBeDefined()
      expect(result.length).toBe(1)
      expect(result[0].values.length).toBe(1)
      expect(result[0].values[0][0]).toBe('test-doc-1')
      expect(result[0].values[0][1]).toBe(0)

      // BLOB 데이터가 Uint8Array로 반환되는지 확인
      const retrievedBlob = result[0].values[0][2] as Uint8Array
      expect(retrievedBlob).toBeInstanceOf(Uint8Array)
      expect(retrievedBlob.length).toBe(768 * 4) // float32 = 4 bytes

      db.close()
    }, 10000)
  })

  describe('버전 일치 검증', () => {
    it('@jlongster/sql.js 패키지와 public 폴더의 sql-wasm.js 해시가 일치해야 함', () => {
      const fs = require('fs')
      const path = require('path')
      const crypto = require('crypto')

      const npmPath = path.join(__dirname, '../../node_modules/@jlongster/sql.js/dist/sql-wasm.js')
      const publicPath = path.join(__dirname, '../../public/sql-wasm/sql-wasm.js')

      const npmHash = crypto.createHash('md5').update(fs.readFileSync(npmPath)).digest('hex')
      const publicHash = crypto.createHash('md5').update(fs.readFileSync(publicPath)).digest('hex')

      expect(publicHash).toBe(npmHash)
    })

    it('@jlongster/sql.js 패키지와 public 폴더의 sql-wasm.wasm 해시가 일치해야 함', () => {
      const fs = require('fs')
      const path = require('path')
      const crypto = require('crypto')

      const npmPath = path.join(__dirname, '../../node_modules/@jlongster/sql.js/dist/sql-wasm.wasm')
      const publicPath = path.join(__dirname, '../../public/sql-wasm/sql-wasm.wasm')

      const npmHash = crypto.createHash('md5').update(fs.readFileSync(npmPath)).digest('hex')
      const publicHash = crypto.createHash('md5').update(fs.readFileSync(publicPath)).digest('hex')

      expect(publicHash).toBe(npmHash)
    })
  })
})
