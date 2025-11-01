# Vector Store DB 구조 설명

**작성일**: 2025-11-01
**목적**: RAG 시스템 Vector Store DB의 정확한 구조 이해
**파일명 규칙**: `vector-{embedding-model}.db`

---

## 📋 핵심 개념

### Vector Store DB = SQLite 파일 (하이브리드 DB)

**중요한 사실**:
- ✅ **1개 파일** = SQLite 데이터베이스
- ✅ **그 안에 SQL 테이블 + Vector 임베딩 모두 포함**
- ❌ "SQL DB"와 "Vector Store"가 별도 파일이 아님!

```
vector-mxbai-embed-large.db (하나의 SQLite 파일)
├── SQL 테이블들
│   ├── documents (원본 문서 저장)
│   │   ├── doc_id, title, content
│   │   ├── embedding (BLOB) ← 🔥 Vector Store!
│   │   └── embedding_model ← 'mxbai-embed-large'
│   ├── documents_fts (FTS5 전문 검색)
│   └── embeddings (청크별 임베딩)
└── SQLite 파일 포맷 (.db)
```

---

## 🗂️ 파일명 규칙 (2025-11-01 변경)

### ✅ Before (혼란스러움):
```
rag-mxbai-embed-large.db      ← "rag"가 뭘 의미?
rag-qwen3-embedding-0.6b.db   ← SQL? Vector? 알 수 없음
rag.db                        ← 임베딩 모델 정보 없음
```

**문제점**:
- 파일명만 보고 Vector Store인지 SQL DB인지 모름
- 임베딩 모델 정보가 명확하지 않음

---

### ✅ After (명확함):
```
vector-mxbai-embed-large.db       ← Vector Store (mxbai 모델)
vector-qwen3-embedding-0.6b.db    ← Vector Store (qwen3 모델)
vector-nomic-embed-text.db        ← Vector Store (nomic 모델)
vector-base.db                    ← 기본 Vector Store
```

**장점**:
1. **명확성**: `vector-` 접두사로 즉시 Vector Store임을 알 수 있음
2. **일관성**: `vector-{embedding-model}.db` 패턴
3. **확장성**: 나중에 다른 DB 타입 추가 시 구분 용이

---

## 📊 DB 내부 구조 (schema.sql)

### 1. documents 테이블 (핵심!)

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 문서 식별
  doc_id TEXT UNIQUE NOT NULL,    -- 예: 'scipy_ttest_ind'
  title TEXT NOT NULL,             -- 예: 'scipy.stats.ttest_ind'
  library TEXT NOT NULL,           -- 예: 'scipy', 'numpy'
  category TEXT,                   -- 예: 'hypothesis', 'regression'

  -- 원본 문서 (SQL 부분)
  content TEXT NOT NULL,           -- Markdown 전체 내용
  summary TEXT,                    -- 요약 (100-200자)

  -- Vector Embedding (Vector Store 부분) 🔥
  embedding BLOB,                  -- 임베딩 벡터 (1024 dimensions)
  embedding_model TEXT,            -- 예: 'mxbai-embed-large'

  -- 메타데이터
  source_url TEXT,
  source_file TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  word_count INTEGER
);
```

**핵심**:
- `content` 컬럼 = SQL 원본 문서
- `embedding` 컬럼 = Vector 임베딩 (BLOB 타입, 1024차원 float32 배열)
- **같은 테이블, 같은 행**에 SQL + Vector 둘 다 저장!

---

### 2. documents_fts 테이블 (FTS5 전문 검색)

```sql
CREATE VIRTUAL TABLE documents_fts USING fts5(
  doc_id UNINDEXED,
  title,                         -- 제목 검색
  content,                       -- 내용 검색
  library UNINDEXED,
  tokenize='porter unicode61'    -- Porter stemming
);
```

**용도**:
- 키워드 검색 (예: "t-test", "ANOVA")
- BM25 알고리즘 사용

---

### 3. embeddings 테이블 (청크별 임베딩, 선택 사항)

```sql
CREATE TABLE embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL,           -- documents.doc_id 참조
  chunk_index INTEGER NOT NULL,   -- 청크 순서 (0, 1, 2...)
  chunk_text TEXT NOT NULL,       -- 청크 텍스트 (300-500 tokens)
  embedding BLOB NOT NULL,        -- 청크 임베딩 벡터
  embedding_model TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
);
```

**용도**:
- 긴 문서를 청크로 분할하여 임베딩
- 더 정확한 검색 (문서 전체 vs 청크별)

---

## 🔄 검색 모드별 사용 방식

### 1. FTS5 검색 (키워드 검색)

```sql
-- documents_fts 테이블 사용 (Vector 임베딩 사용 안 함)
SELECT d.*
FROM documents d
JOIN documents_fts fts ON d.doc_id = fts.doc_id
WHERE documents_fts MATCH 't-test'
ORDER BY rank;
```

**특징**:
- `documents.embedding` 컬럼 사용 안 함
- 키워드 정확 매칭 (BM25 알고리즘)

---

### 2. Vector 검색 (의미 검색)

```python
# Python (Ollama Provider)에서 실행
# 1. 쿼리 임베딩 생성
query_embedding = ollama.embeddings(
    model='mxbai-embed-large',
    prompt='t-test와 ANOVA의 차이는?'
)

# 2. Cosine Similarity 계산 (SQLite에서 불가능 → Python에서 처리)
cursor.execute("SELECT doc_id, embedding FROM documents")
results = []
for doc_id, embedding_blob in cursor.fetchall():
    doc_embedding = blob_to_embedding(embedding_blob)
    similarity = cosine_similarity(query_embedding, doc_embedding)
    results.append((doc_id, similarity))

# 3. Top-K 정렬
results.sort(key=lambda x: x[1], reverse=True)
top_k = results[:5]
```

**특징**:
- `documents.embedding` 컬럼 사용
- 의미적 유사도 계산 (Cosine Similarity)
- SQLite는 벡터 연산 불가 → Python에서 처리

---

### 3. Hybrid 검색 (FTS5 + Vector)

```python
# 1. FTS5로 후보 문서 필터링 (100개)
cursor.execute("""
    SELECT d.doc_id, d.embedding
    FROM documents d
    JOIN documents_fts fts ON d.doc_id = fts.doc_id
    WHERE documents_fts MATCH ?
    LIMIT 100
""", (query,))

# 2. Vector 유사도로 재정렬 (Top-5)
candidates = cursor.fetchall()
results = []
for doc_id, embedding_blob in candidates:
    doc_embedding = blob_to_embedding(embedding_blob)
    similarity = cosine_similarity(query_embedding, doc_embedding)
    results.append((doc_id, similarity))

results.sort(key=lambda x: x[1], reverse=True)
top_k = results[:5]
```

**특징**:
- FTS5 + Vector 둘 다 사용
- 속도 ↑ (FTS5 필터링), 정확도 ↑ (Vector 재정렬)

---

## 💾 임베딩 저장 방식 (BLOB)

### Python (빌드 시)

```python
import struct

def embedding_to_blob(embedding: List[float]) -> bytes:
    """임베딩 벡터를 SQLite BLOB으로 변환 (float32 배열)"""
    # float32로 변환 (4바이트 * 1024 = 4096 바이트)
    return struct.pack(f'{len(embedding)}f', *embedding)

# 사용 예시
embedding = [0.123, -0.456, ...]  # 1024차원 벡터
blob = embedding_to_blob(embedding)

cursor.execute("""
    INSERT INTO documents (doc_id, content, embedding, embedding_model)
    VALUES (?, ?, ?, ?)
""", (doc_id, content, blob, 'mxbai-embed-large'))
```

### Python (검색 시)

```python
def blob_to_embedding(blob: bytes) -> List[float]:
    """SQLite BLOB을 임베딩 벡터로 복원"""
    num_dimensions = len(blob) // 4  # 4바이트 = float32
    return list(struct.unpack(f'{num_dimensions}f', blob))

# 사용 예시
cursor.execute("SELECT embedding FROM documents WHERE doc_id = ?", (doc_id,))
blob = cursor.fetchone()[0]
embedding = blob_to_embedding(blob)  # [0.123, -0.456, ...]
```

**크기**:
- 1024차원 float32 = 4096 바이트 (4 KB)
- 111개 문서 = 455,424 바이트 (445 KB, 임베딩만)

---

## 📦 Vector Store 빌드 과정

### build_sqlite_db.py 실행 흐름

```bash
cd statistical-platform/rag-system
python scripts/build_sqlite_db.py --model mxbai-embed-large
```

**1단계: DB 생성**
```python
# data/vector-mxbai-embed-large.db 생성
# schema.sql 적용 (documents, documents_fts, embeddings 테이블 생성)
```

**2단계: 문서 로드**
```python
# data/scipy/*.md, data/numpy/*.md 등 111개 파일 읽기
for md_file in glob('data/**/*.md'):
    content = read_file(md_file)
    doc_id = generate_doc_id(library, filename)
    title = extract_title(content)
    summary = extract_summary(content)
```

**3단계: 임베딩 생성**
```python
# Ollama API 호출 (111번)
for doc in documents:
    embedding = ollama.embeddings(
        model='mxbai-embed-large',
        prompt=doc['content']
    )
    doc['embedding'] = embedding_to_blob(embedding)
```

**4단계: DB 삽입**
```python
# documents 테이블에 원본 + 임베딩 모두 저장
cursor.execute("""
    INSERT INTO documents (
        doc_id, title, content, embedding, embedding_model, ...
    ) VALUES (?, ?, ?, ?, ?, ...)
""", (doc_id, title, content, embedding_blob, 'mxbai-embed-large', ...))

# documents_fts 테이블에 자동 트리거로 삽입 (schema.sql 트리거)
```

**결과**:
```
data/vector-mxbai-embed-large.db (8.2 MB)
├── 111개 원본 문서 (content 컬럼)
├── 111개 임베딩 벡터 (embedding 컬럼)
└── FTS5 인덱스 (documents_fts)
```

---

## 🗄️ 저장소 구조 (3가지)

### 1. Vector Store DB (SQLite 파일)

**위치**: `public/rag-data/vector-{model}.db`

**예시**:
```
public/rag-data/
├── vector-mxbai-embed-large.db (8.2 MB)
├── vector-qwen3-embedding-0.6b.db (5.4 MB)
└── vector-nomic-embed-text.db (7.8 MB)
```

**용도**:
- 영구 저장 (서버 또는 Static HTML)
- 검색 시 sql.js로 메모리에 로드

---

### 2. sql.js (브라우저 메모리)

**동작**:
```javascript
// 브라우저에서 실행
const SQL = await initSqlJs()
const response = await fetch('/rag-data/vector-mxbai-embed-large.db')
const buffer = await response.arrayBuffer()
const db = new SQL.Database(new Uint8Array(buffer))

// 이제 메모리에서 SQL 실행 가능
const results = db.exec("SELECT * FROM documents WHERE library = 'scipy'")
```

**특징**:
- SQLite 파일을 브라우저 메모리에 로드
- JavaScript에서 SQL 쿼리 실행 가능

---

### 3. IndexedDB (브라우저 영구 저장)

**위치**: 브라우저 내장 DB (파일 시스템 접근 불가)

**구조**:
```javascript
// IndexedDB: RAGSystemDB > userDocuments
{
  doc_id: "user_20251101_abc123",
  title: "내가 추가한 t-test 설명",
  content: "t-test는 두 집단의 평균을 비교...",
  library: "user-added",
  category: "hypothesis",
  summary: "t-test 기본 개념",
  created_at: 1698764400,
  updated_at: 1698764400
}
```

**용도**:
- 사용자가 추가한 문서만 저장
- sql.js DB와 **병합**하여 검색

**데이터 흐름**:
```
사용자 쿼리 입력
  ↓
1. Vector Store DB 로드 (sql.js)
   - 111개 원본 문서
  ↓
2. IndexedDB 문서 병합
   - 사용자 추가 문서 N개
  ↓
3. 총 111+N개 문서에서 검색
   - FTS5 / Vector / Hybrid
  ↓
4. Top-K 결과 반환
```

---

## 📁 파일 크기 예상

### Vector Store DB (111개 문서 기준)

| 파일 | 크기 | 구성 |
|------|------|------|
| `vector-mxbai-embed-large.db` | 8.2 MB | 원본 문서 (3 MB) + 임베딩 (445 KB) + FTS 인덱스 (4.7 MB) |
| `vector-qwen3-embedding-0.6b.db` | 5.4 MB | 원본 문서 (3 MB) + 임베딩 (445 KB) + FTS 인덱스 (2 MB) |
| `vector-nomic-embed-text.db` | 7.8 MB | 원본 문서 (3 MB) + 임베딩 (334 KB) + FTS 인덱스 (4.4 MB) |

**전체 크기** (3개 모델): ~21.4 MB

---

## 🔄 코드 변경 사항 (2025-11-01)

### 1. build_sqlite_db.py

```python
# Before
DB_PATH = DATA_DIR / f"rag-{model_filename}.db"

# After
DB_PATH = DATA_DIR / f"vector-{model_filename}.db"
```

### 2. rag-service.ts

```typescript
// Before
export function vectorStoreIdToPath(vectorStoreId: string): string {
  return `/rag-data/rag-${vectorStoreId}.db`
}

// After
export function vectorStoreIdToPath(vectorStoreId: string): string {
  return `/rag-data/vector-${vectorStoreId}.db`
}
```

```typescript
// Before
const match = filename.match(/^rag-(.+)\.db$/)

// After
const match = filename.match(/^vector-(.+)\.db$/)
```

### 3. getAvailableVectorStores()

```typescript
// Before
dbPath: '/rag-data/rag-qwen3-embedding-0.6b.db'

// After
dbPath: '/rag-data/vector-qwen3-embedding-0.6b.db'
```

---

## 🎯 요약

### 핵심 사실 3가지

1. **Vector Store DB = SQLite 파일 1개**
   - SQL 테이블 + Vector 임베딩 모두 포함
   - `documents.content` (SQL) + `documents.embedding` (Vector)

2. **파일명 규칙: `vector-{model}.db`**
   - 명확하게 Vector Store임을 표시
   - 임베딩 모델 정보 포함

3. **3가지 저장소**
   - Vector Store DB (파일)
   - sql.js (메모리)
   - IndexedDB (브라우저)

---

**작성자**: Claude (AI Assistant)
**최종 업데이트**: 2025-11-01
