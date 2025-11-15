/**
 * 시맨틱 청킹 재처리 스크립트
 *
 * LangChain SemanticChunker를 사용하여 기존 문서를 의미 기반으로 재청킹
 * 빌드 타임에 한 번만 실행
 */

import { OllamaEmbeddings } from "@langchain/ollama"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import initSqlJs from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'

// 설정
const CONFIG = {
  ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
  embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
  sourceDbPath: path.join(process.cwd(), '../rag-system/data/rag.db'),
  outputDbPath: path.join(process.cwd(), 'public/rag-data/rag-semantic.db'),

  // RecursiveCharacterTextSplitter 설정 (시맨틱 청킹 근사)
  chunkSize: 512,        // 500 → 512 (최적값)
  chunkOverlap: 100,     // 50 → 100 (오버랩 증가)
  separators: [
    "\n\n\n",  // 섹션 구분
    "\n\n",    // 문단 구분
    "\n",      // 줄 구분
    ". ",      // 문장 구분
    "! ",
    "? ",
    " ",       // 단어 구분
    ""
  ]
}

interface Document {
  doc_id: string
  title: string
  content: string
  library: string
  category: string | null
  summary: string | null
}

/**
 * 메인 함수
 */
async function main() {
  console.log('[Semantic Rechunk] 시작...\n')

  try {
    // 1. Ollama 연결 확인
    console.log(`[1/6] Ollama 연결 확인 (${CONFIG.ollamaEndpoint})...`)
    await checkOllamaConnection()
    console.log('✓ Ollama 연결 성공\n')

    // 2. 원본 DB 로드
    console.log(`[2/6] 원본 DB 로드 (${CONFIG.sourceDbPath})...`)
    const documents = await loadDocuments()
    console.log(`✓ ${documents.length}개 문서 로드 완료\n`)

    // 3. LangChain Text Splitter 초기화
    console.log('[3/6] RecursiveCharacterTextSplitter 초기화...')
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CONFIG.chunkSize,
      chunkOverlap: CONFIG.chunkOverlap,
      separators: CONFIG.separators,
      lengthFunction: (text: string) => text.length
    })
    console.log('✓ Text Splitter 초기화 완료\n')

    // 4. Ollama Embeddings 초기화
    console.log('[4/6] Ollama Embeddings 초기화...')
    const embeddings = new OllamaEmbeddings({
      baseUrl: CONFIG.ollamaEndpoint,
      model: CONFIG.embeddingModel,
    })
    console.log('✓ Embeddings 초기화 완료\n')

    // 5. 문서 재청킹 + 임베딩 생성
    console.log('[5/6] 문서 재청킹 중...')
    const chunkedDocs = await rechunkDocuments(documents, textSplitter, embeddings)
    console.log(`✓ ${chunkedDocs.length}개 청크 생성 완료\n`)

    // 6. 새 DB 저장
    console.log('[6/6] 새 DB 저장 중...')
    await saveToDatabase(chunkedDocs)
    console.log(`✓ DB 저장 완료: ${CONFIG.outputDbPath}\n`)

    console.log('='.repeat(60))
    console.log('✅ 시맨틱 재청킹 완료!')
    console.log('='.repeat(60))
    console.log(`원본 문서: ${documents.length}개`)
    console.log(`생성 청크: ${chunkedDocs.length}개`)
    console.log(`평균 청크: ${(chunkedDocs.length / documents.length).toFixed(1)}개/문서`)
    console.log(`출력 파일: ${CONFIG.outputDbPath}`)
  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

/**
 * Ollama 연결 확인
 */
async function checkOllamaConnection(): Promise<void> {
  try {
    const response = await fetch(`${CONFIG.ollamaEndpoint}/api/tags`)
    if (!response.ok) {
      throw new Error(`Ollama 연결 실패: ${response.statusText}`)
    }

    const data = await response.json() as { models: Array<{ name: string }> }
    const hasEmbeddingModel = data.models.some(m =>
      m.name.includes(CONFIG.embeddingModel)
    )

    if (!hasEmbeddingModel) {
      throw new Error(
        `임베딩 모델 '${CONFIG.embeddingModel}'이 설치되지 않았습니다.\n` +
        `설치 명령: ollama pull ${CONFIG.embeddingModel}`
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(
        'Ollama 서버에 연결할 수 없습니다.\n' +
        `1. Ollama가 실행 중인지 확인하세요.\n` +
        `2. 엔드포인트가 올바른지 확인하세요: ${CONFIG.ollamaEndpoint}`
      )
    }
    throw error
  }
}

/**
 * 원본 DB에서 문서 로드
 */
async function loadDocuments(): Promise<Document[]> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  })

  const dbBuffer = fs.readFileSync(CONFIG.sourceDbPath)
  const db = new SQL.Database(dbBuffer)

  const results = db.exec(`
    SELECT doc_id, title, content, library, category, summary
    FROM documents
  `)

  db.close()

  if (results.length === 0 || !results[0]) {
    throw new Error('문서를 찾을 수 없습니다')
  }

  const documents: Document[] = []
  const [result] = results

  for (const row of result.values) {
    documents.push({
      doc_id: row[0] as string,
      title: row[1] as string,
      content: row[2] as string,
      library: row[3] as string,
      category: row[4] as string | null,
      summary: row[5] as string | null
    })
  }

  return documents
}

/**
 * 문서 재청킹 + 임베딩 생성
 */
async function rechunkDocuments(
  documents: Document[],
  textSplitter: RecursiveCharacterTextSplitter,
  embeddings: OllamaEmbeddings
): Promise<ChunkedDocument[]> {
  const chunkedDocs: ChunkedDocument[] = []
  let processedCount = 0

  for (const doc of documents) {
    processedCount++
    console.log(`  [${processedCount}/${documents.length}] ${doc.library}/${doc.title}`)

    try {
      // 1. 텍스트 분할 (RecursiveCharacterTextSplitter)
      const chunks = await textSplitter.splitText(doc.content)

      // 2. 각 청크에 대해 임베딩 생성
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        // 임베딩 생성 (Ollama API 호출)
        const embedding = await embeddings.embedQuery(chunk)

        chunkedDocs.push({
          doc_id: `${doc.doc_id}_chunk_${i}`,
          parent_doc_id: doc.doc_id,
          title: doc.title,
          content: chunk,
          chunk_index: i,
          total_chunks: chunks.length,
          library: doc.library,
          category: doc.category,
          summary: doc.summary,
          embedding,
          embedding_model: CONFIG.embeddingModel
        })
      }

      console.log(`    → ${chunks.length}개 청크 생성`)
    } catch (error) {
      console.error(`    ❌ 오류: ${error instanceof Error ? error.message : String(error)}`)
      // 에러 발생 시 해당 문서 건너뛰기
      continue
    }
  }

  return chunkedDocs
}

interface ChunkedDocument {
  doc_id: string
  parent_doc_id: string
  title: string
  content: string
  chunk_index: number
  total_chunks: number
  library: string
  category: string | null
  summary: string | null
  embedding: number[]
  embedding_model: string
}

/**
 * 새 DB에 저장
 */
async function saveToDatabase(chunkedDocs: ChunkedDocument[]): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  })

  const db = new SQL.Database()

  // 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS chunks (
      doc_id TEXT PRIMARY KEY,
      parent_doc_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      library TEXT NOT NULL,
      category TEXT,
      summary TEXT,
      embedding BLOB,
      embedding_model TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // FTS5 인덱스 생성 (키워드 검색용)
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
      doc_id UNINDEXED,
      title,
      content,
      library,
      category
    )
  `)

  // 청크 삽입
  const insertStmt = db.prepare(`
    INSERT INTO chunks (
      doc_id, parent_doc_id, title, content, chunk_index, total_chunks,
      library, category, summary, embedding, embedding_model
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertFtsStmt = db.prepare(`
    INSERT INTO chunks_fts (doc_id, title, content, library, category)
    VALUES (?, ?, ?, ?, ?)
  `)

  for (const chunk of chunkedDocs) {
    // 임베딩을 BLOB으로 변환
    const embeddingBlob = vectorToBlob(chunk.embedding)

    // 메인 테이블
    insertStmt.run([
      chunk.doc_id,
      chunk.parent_doc_id,
      chunk.title,
      chunk.content,
      chunk.chunk_index,
      chunk.total_chunks,
      chunk.library,
      chunk.category,
      chunk.summary,
      embeddingBlob,
      chunk.embedding_model
    ])

    // FTS5 테이블
    insertFtsStmt.run([
      chunk.doc_id,
      chunk.title,
      chunk.content,
      chunk.library,
      chunk.category || ''
    ])
  }

  insertStmt.free()
  insertFtsStmt.free()

  // DB 파일로 저장
  const outputDir = path.dirname(CONFIG.outputDbPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const data = db.export()
  fs.writeFileSync(CONFIG.outputDbPath, Buffer.from(data))

  db.close()
}

/**
 * Vector를 SQLite BLOB으로 변환
 */
function vectorToBlob(vector: number[]): Uint8Array {
  const buffer = new ArrayBuffer(vector.length * 4)
  const view = new DataView(buffer)

  for (let i = 0; i < vector.length; i++) {
    view.setFloat32(i * 4, vector[i], true) // little-endian
  }

  return new Uint8Array(buffer)
}

// 실행
main()
