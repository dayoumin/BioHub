-- RAG System Database Schema
-- SQLite 3.35+ (FTS5 지원)
-- 용도: 완전 오프라인 RAG 시스템 (Static HTML Export용)

-- ============================================
-- 1. 문서 메타데이터 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 문서 식별
  doc_id TEXT UNIQUE NOT NULL,              -- 예: 'scipy_ttest_ind', 'numpy_mean'
  title TEXT NOT NULL,                      -- 예: 'scipy.stats.ttest_ind'
  library TEXT NOT NULL,                    -- 예: 'scipy', 'numpy', 'project'
  category TEXT,                            -- 예: 'hypothesis', 'descriptive'

  -- 문서 내용
  content TEXT NOT NULL,                    -- Markdown 전체 내용
  summary TEXT,                             -- 요약 (100-200자)

  -- 메타데이터
  source_url TEXT,                          -- 원본 URL
  source_file TEXT,                         -- 로컬 파일 경로
  created_at INTEGER NOT NULL,              -- Unix timestamp
  updated_at INTEGER NOT NULL,              -- Unix timestamp

  -- 통계
  word_count INTEGER,                       -- 단어 수
  view_count INTEGER DEFAULT 0,             -- 조회 수 (인기도)

  -- Vector Embedding (전체 문서 임베딩)
  embedding BLOB,                           -- 임베딩 벡터 (binary, 1024 dimensions for mxbai-embed-large)
  embedding_model TEXT                      -- 예: 'mxbai-embed-large'
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_documents_library ON documents(library);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON documents(doc_id);

-- ============================================
-- 2. Vector Embeddings 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 외래키
  doc_id TEXT NOT NULL,                     -- documents.doc_id 참조
  chunk_index INTEGER NOT NULL,             -- 청크 순서 (0, 1, 2...)

  -- 청크 내용
  chunk_text TEXT NOT NULL,                 -- 청크 텍스트 (300-500 tokens)
  chunk_tokens INTEGER,                     -- 토큰 수

  -- Vector Embedding
  embedding BLOB NOT NULL,                  -- 임베딩 벡터 (binary, 768 dimensions)
  embedding_model TEXT NOT NULL,            -- 예: 'nomic-embed-text'

  -- 메타데이터
  created_at INTEGER NOT NULL,

  -- 복합 유니크 제약
  UNIQUE(doc_id, chunk_index),

  -- 외래키 제약
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_embeddings_doc_id ON embeddings(doc_id);

-- ============================================
-- 3. Full-Text Search 테이블 (FTS5)
-- ============================================
-- FTS5는 키워드 검색 (BM25 알고리즘)에 사용
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  doc_id UNINDEXED,                         -- 문서 ID (검색 안 함)
  title,                                    -- 제목 (가중치 높음)
  content,                                  -- 내용
  library UNINDEXED,                        -- 라이브러리 (필터용)

  -- 토크나이저 설정
  tokenize='porter unicode61'               -- Porter stemming + Unicode
);

-- ============================================
-- 4. 검색 히스토리 테이블 (선택사항)
-- ============================================
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 검색 쿼리
  query TEXT NOT NULL,
  method TEXT,                              -- 통계 메서드 (선택사항)

  -- 검색 결과
  result_count INTEGER,                     -- 검색 결과 수
  top_doc_id TEXT,                          -- 최상위 문서 ID

  -- 메타데이터
  timestamp INTEGER NOT NULL,               -- Unix timestamp
  response_time INTEGER                     -- 응답 시간 (ms)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp);

-- ============================================
-- 5. 통계 메서드 메타데이터 (선택사항)
-- ============================================
CREATE TABLE IF NOT EXISTS method_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 메서드 정보
  method_id TEXT UNIQUE NOT NULL,           -- 예: 'tTest', 'linearRegression'
  method_name TEXT NOT NULL,                -- 예: '독립표본 t-검정'
  category TEXT NOT NULL,                   -- 예: 'hypothesis', 'regression'

  -- 설명
  description TEXT,                         -- 간단한 설명
  assumptions TEXT,                         -- 가정 (JSON 배열)

  -- 구현 정보
  is_implemented BOOLEAN NOT NULL,          -- 구현 여부
  worker_file TEXT,                         -- Worker 파일명
  python_function TEXT,                     -- Python 함수명

  -- 메타데이터
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_method_metadata_category ON method_metadata(category);
CREATE INDEX IF NOT EXISTS idx_method_metadata_implemented ON method_metadata(is_implemented);

-- ============================================
-- 6. 뷰: 문서 통계
-- ============================================
CREATE VIEW IF NOT EXISTS document_stats AS
SELECT
  d.library,
  COUNT(*) as total_docs,
  SUM(d.word_count) as total_words,
  AVG(d.word_count) as avg_words,
  COUNT(DISTINCT d.category) as categories
FROM documents d
GROUP BY d.library;

-- ============================================
-- 7. 트리거: FTS 동기화
-- ============================================
-- documents 테이블 INSERT 시 FTS 테이블에 자동 추가
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(doc_id, title, content, library)
  VALUES (new.doc_id, new.title, new.content, new.library);
END;

-- documents 테이블 UPDATE 시 FTS 테이블도 업데이트
CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts
  SET title = new.title, content = new.content, library = new.library
  WHERE doc_id = new.doc_id;
END;

-- documents 테이블 DELETE 시 FTS 테이블도 삭제
CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE doc_id = old.doc_id;
END;

-- ============================================
-- 8. 초기 데이터 삽입 (예제)
-- ============================================
-- 이 부분은 Python 스크립트에서 실행됩니다
-- INSERT INTO documents (doc_id, title, library, content, created_at, updated_at)
-- VALUES ('scipy_ttest_ind', 'scipy.stats.ttest_ind', 'scipy', '...', 1234567890, 1234567890);

-- ============================================
-- 9. 유틸리티 함수 (쿼리 예제)
-- ============================================

-- 키워드 검색 (FTS5 사용)
-- SELECT d.* FROM documents d
-- JOIN documents_fts fts ON d.doc_id = fts.doc_id
-- WHERE documents_fts MATCH 't-test'
-- ORDER BY rank;

-- Vector 유사도 검색 (Python에서 수행)
-- SELECT doc_id, chunk_text FROM embeddings
-- ORDER BY cosine_similarity(embedding, ?) DESC
-- LIMIT 5;

-- 라이브러리별 문서 수
-- SELECT library, COUNT(*) as count FROM documents GROUP BY library;

-- 최근 검색 기록
-- SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 10;
