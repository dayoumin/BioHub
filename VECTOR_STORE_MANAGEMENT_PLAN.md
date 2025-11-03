# 벡터스토어 & 임베딩 모델 관리 시스템 계획

## 📋 Executive Summary

현재 프로젝트의 RAG 시스템에 **벡터스토어 및 임베딩 모델 동적 관리 기능**을 추가하여, 사용자가 다양한 임베딩 모델로 벡터스토어를 생성/관리할 수 있는 환경을 구축합니다.

**핵심 목표**:
- ✅ 여러 임베딩 모델로 벡터스토어 생성 가능
- ✅ Ollama에서 설치된 모델 자동 감지
- ✅ 벡터스토어 CRUD 작업 지원
- ✅ 사용자 문서 추가/삭제 관리
- ✅ 벡터스토어 상태 모니터링 (인덱싱 진행률, 크기 등)

**⚠️ 코딩 표준**: CLAUDE.md의 AI 코딩 규칙 준수 (any 금지, unknown + 타입 가드, 에러 처리 등)

---

## 🏗️ Phase 구조

| Phase | 담당 | 기간 | 상태 |
|-------|------|------|------|
| **Phase 1** | 백엔드 API | 1주 | 📋 계획 |
| **Phase 2** | 프론트엔드 UI | 1주 | 📋 계획 |
| **Phase 3** | 통합 테스트 | 3-4일 | 📋 계획 |
| **Phase 4** | 배포 & 모니터링 | 진행형 | 📋 계획 |

---

## Phase 1: 백엔드 API 설계 & 구현 (1주)

### 1.1 데이터 구조 설계

#### 1.1.1 VectorStore 메타데이터 (IndexedDB)

```typescript
// IDBStore: 'vector_stores'
interface VectorStoreMetadata {
  id: string                          // UUID, 'vs_qwen3_embedding_0.6b_20250101'
  name: string                        // 'Qwen3 Embedding 0.6B'
  description?: string               // '고속 임베딩 모델 (한국어 최적화)'
  embeddingModel: string             // 'qwen3-embedding:0.6b'
  embeddingDimensions: number        // 1024
  documentCount: number              // 현재 문서 수
  totalTokens: number                // 인덱싱된 총 토큰 수
  dbSize: number                     // 바이트 단위 파일 크기
  status: 'ready' | 'indexing' | 'failed'
  indexingProgress: number           // 0-100
  lastIndexedAt: number              // Unix timestamp
  createdAt: number                  // Unix timestamp
  updatedAt: number                  // Unix timestamp
  isDefault: boolean                 // 기본 벡터스토어 여부
  tags?: string[]                    // 분류용 태그
}
```

#### 1.1.2 사용자 문서 (IndexedDB)

```typescript
// IDBStore: 'user_documents'
interface UserDocument {
  id: string                         // UUID
  vectorStoreId: string             // 어느 벡터스토어에 속하는지
  title: string
  content: string
  category: string                  // 'research', 'guide', 'custom' 등
  source?: string                   // 'file' | 'clipboard' | 'url'
  tags?: string[]
  embedding?: Float32Array          // 임베딩 벡터 (선택사항)
  tokenCount: number
  createdAt: number
  updatedAt: number
}
```

#### 1.1.3 벡터스토어 인덱싱 작업 (IndexedDB)

```typescript
// IDBStore: 'indexing_jobs'
interface IndexingJob {
  id: string                         // UUID
  vectorStoreId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalDocuments: number
  processedDocuments: number
  errorMessage?: string
  startedAt: number
  completedAt?: number
}
```

#### 1.1.4 Ollama 모델 캐시 (IndexedDB)

```typescript
// IDBStore: 'ollama_models'
interface OllamaModelCache {
  name: string                       // 'qwen3-embedding:0.6b'
  modelType: 'embedding' | 'inference'
  displayName: string
  parameters: string                 // '0.6B', '7B', '13B' 등
  quantization: string              // 'Q4_K_M', 'Q5_K_M' 등
  size: number                       // 바이트
  format: string                     // 'gguf', 'safetensors' 등
  digest: string                     // Ollama digest
  isActive: boolean                  // 현재 Ollama에 로드됨
  cachedAt: number                   // 마지막 갱신 시간
}
```

---

### 1.2 API Routes 설계 (TypeScript 타입 안전성 & 에러 처리)

#### 1.2.1 벡터스토어 관리 API

```
POST   /api/rag/vector-stores              # 새 벡터스토어 생성
GET    /api/rag/vector-stores              # 벡터스토어 목록 조회
GET    /api/rag/vector-stores/:id          # 특정 벡터스토어 상세 조회
PATCH  /api/rag/vector-stores/:id          # 벡터스토어 메타데이터 수정
DELETE /api/rag/vector-stores/:id          # 벡터스토어 삭제
POST   /api/rag/vector-stores/:id/set-default  # 기본 벡터스토어 설정
```

**POST /api/rag/vector-stores** (새 벡터스토어 생성)

```typescript
/**
 * 새 벡터스토어 생성 및 인덱싱 시작
 *
 * @requires
 * - 입력 유효성 검사 (name, embeddingModel)
 * - Ollama 모델 존재 확인
 * - 에러 처리 (try-catch + 명확한 메시지)
 * - 비동기 인덱싱 (jobId 반환)
 *
 * @errors
 * - 400: Invalid request (name 또는 embeddingModel 누락)
 * - 404: Embedding model not found
 * - 500: Vector store creation failed
 */

// Request
interface CreateVectorStoreRequest {
  name: string
  description?: string
  embeddingModel: string             // 'qwen3-embedding:0.6b'
  documents?: Array<{
    title: string
    content: string
    category?: string
  }>
  isDefault?: boolean
  tags?: string[]
}

// Response
interface CreateVectorStoreResponse {
  id: string
  metadata: VectorStoreMetadata
  jobId: string                      // 인덱싱 작업 ID
}

// 구현 예시:
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()

    // 유효성 검사
    if (!body?.name || typeof body.name !== 'string') {
      return Response.json({ error: 'Invalid name' }, { status: 400 })
    }
    if (!body?.embeddingModel || typeof body.embeddingModel !== 'string') {
      return Response.json({ error: 'Invalid embeddingModel' }, { status: 400 })
    }

    // Ollama 모델 확인
    const modelExists = await checkOllamaModel(body.embeddingModel)
    if (!modelExists) {
      return Response.json({ error: 'Embedding model not found' }, { status: 404 })
    }

    // 벡터스토어 생성 및 인덱싱 시작
    const response = await createVectorStoreService(body)
    return Response.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Vector store creation failed:', errorMessage)
    return Response.json({ error: 'Failed to create vector store' }, { status: 500 })
  }
}
```

**GET /api/rag/vector-stores**

```typescript
// Response
interface ListVectorStoresResponse {
  stores: VectorStoreMetadata[]
  defaultStoreId: string
  totalSize: number                  // 모든 벡터스토어의 총 크기
}
```

**PATCH /api/rag/vector-stores/:id**

```typescript
interface UpdateVectorStoreRequest {
  name?: string
  description?: string
  tags?: string[]
}
```

**DELETE /api/rag/vector-stores/:id**

```typescript
// Response
interface DeleteVectorStoreResponse {
  success: boolean
  freedSize: number                  // 해제된 용량
}
```

---

#### 1.2.2 문서 관리 API

```
POST   /api/rag/documents                  # 문서 추가
GET    /api/rag/documents                  # 문서 목록 조회
GET    /api/rag/documents/:id              # 특정 문서 조회
PATCH  /api/rag/documents/:id              # 문서 수정
DELETE /api/rag/documents/:id              # 문서 삭제
POST   /api/rag/documents/reindex          # 재인덱싱
```

**POST /api/rag/documents**

```typescript
interface AddDocumentRequest {
  vectorStoreId: string
  documents: Array<{
    title: string
    content: string
    category?: string
    source?: 'file' | 'clipboard' | 'url'
    tags?: string[]
  }>
}

interface AddDocumentResponse {
  documentIds: string[]
  jobId: string                      // 인덱싱 작업 ID
  indexingProgress: number           // 0-100
}
```

**DELETE /api/rag/documents/:id**

```typescript
interface DeleteDocumentResponse {
  success: boolean
  vectorStoreId: string
  documentCount: number              // 삭제 후 남은 문서 수
}
```

---

#### 1.2.3 Ollama 모델 API

```
GET    /api/rag/ollama/models               # 설치된 모델 목록
GET    /api/rag/ollama/models/embedding     # 임베딩 모델만 조회
GET    /api/rag/ollama/models/inference     # 추론 모델만 조회
POST   /api/rag/ollama/models/refresh       # 모델 캐시 갱신
```

**GET /api/rag/ollama/models**

```typescript
interface OllamaModelsResponse {
  embeddings: Array<{
    name: string
    displayName: string
    parameters: string
    size: number
    format: string
  }>
  inferences: Array<{
    name: string
    displayName: string
    parameters: string
    size: number
    format: string
  }>
  cachedAt: number
  ollamaStatus: 'online' | 'offline'
}
```

---

#### 1.2.4 인덱싱 작업 API

```
GET    /api/rag/indexing-jobs               # 진행 중인 작업 목록
GET    /api/rag/indexing-jobs/:id           # 작업 상태 조회 (polling/WebSocket)
POST   /api/rag/indexing-jobs/:id/cancel    # 작업 취소
```

**GET /api/rag/indexing-jobs/:id**

```typescript
interface IndexingJobStatusResponse {
  id: string
  vectorStoreId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalDocuments: number
  processedDocuments: number
  currentDocument?: {
    title: string
    tokenCount: number
  }
  estimatedTimeRemaining?: number   // 초 단위
  errorMessage?: string
}
```

---

### 1.3 서비스 계층 설계

#### 1.3.1 VectorStoreManager (신규)

```typescript
// lib/rag/services/vector-store-manager.ts

class VectorStoreManager {
  // 벡터스토어 관리
  async createVectorStore(req: CreateVectorStoreRequest): Promise<VectorStoreMetadata>
  async listVectorStores(): Promise<VectorStoreMetadata[]>
  async getVectorStore(id: string): Promise<VectorStoreMetadata>
  async updateVectorStore(id: string, updates: Partial<VectorStoreMetadata>): Promise<VectorStoreMetadata>
  async deleteVectorStore(id: string): Promise<void>
  async setDefaultVectorStore(id: string): Promise<void>

  // 메타데이터
  async getVectorStoreSizeEstimate(id: string): Promise<number>
  async exportVectorStoreMetadata(id: string): Promise<Blob>
  async importVectorStoreMetadata(blob: Blob): Promise<VectorStoreMetadata>
}
```

#### 1.3.2 DocumentManager (신규)

```typescript
// lib/rag/services/document-manager.ts

class DocumentManager {
  // 문서 관리
  async addDocuments(vectorStoreId: string, docs: UserDocument[]): Promise<string[]>
  async listDocuments(vectorStoreId: string): Promise<UserDocument[]>
  async getDocument(id: string): Promise<UserDocument>
  async updateDocument(id: string, updates: Partial<UserDocument>): Promise<UserDocument>
  async deleteDocument(id: string): Promise<void>
  async deleteDocumentsByVectorStore(vectorStoreId: string): Promise<number>

  // 검색
  async searchDocuments(vectorStoreId: string, query: string): Promise<UserDocument[]>
}
```

#### 1.3.3 OllamaModelManager (신규)

```typescript
// lib/rag/services/ollama-model-manager.ts

class OllamaModelManager {
  // 모델 조회
  async getEmbeddingModels(): Promise<OllamaModel[]>
  async getInferenceModels(): Promise<OllamaModel[]>
  async getAllModels(): Promise<{embeddings: OllamaModel[], inferences: OllamaModel[]}>

  // 모델 검증
  async validateModel(modelName: string): Promise<boolean>
  async checkModelCapabilities(modelName: string): Promise<{isEmbedding: boolean, isInference: boolean}>

  // 캐시 관리
  async refreshModelCache(): Promise<void>
  async getCachedModels(): Promise<OllamaModelCache[]>
}
```

#### 1.3.4 IndexingJobManager (신규)

```typescript
// lib/rag/services/indexing-job-manager.ts

class IndexingJobManager {
  // 작업 관리
  async createJob(vectorStoreId: string, documentCount: number): Promise<string>
  async getJobStatus(jobId: string): Promise<IndexingJob>
  async updateJobProgress(jobId: string, processed: number): Promise<void>
  async completeJob(jobId: string): Promise<void>
  async failJob(jobId: string, error: string): Promise<void>
  async cancelJob(jobId: string): Promise<void>

  // 모니터링
  async listActiveJobs(): Promise<IndexingJob[]>
  async getJobHistory(limit: number): Promise<IndexingJob[]>
}
```

---

### 1.4 Worker 구현 (Python)

#### 1.4.1 embedding_worker.py (신규)

```python
# public/workers/python/embedding_worker.py

"""
임베딩 생성 및 벡터스토어 관리 Worker
- 텍스트 임베딩 생성
- 배치 임베딩 처리
- 유사도 계산
"""

class EmbeddingWorker:
    def __init__(self, embedding_model_name: str):
        self.model_name = embedding_model_name
        self.model = None
        self.tokenizer = None

    def load_model(self) -> Dict[str, Any]:
        """모델 로드 및 초기화"""

    def embed_text(self, text: str) -> np.ndarray:
        """단일 텍스트 임베딩"""

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """배치 임베딩"""

    def calculate_similarity(self,
                            embedding1: np.ndarray,
                            embedding2: np.ndarray) -> float:
        """코사인 유사도 계산"""

    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""

    def cleanup(self) -> None:
        """메모리 정리"""
```

#### 1.4.2 vector_store_indexer.py (신규)

```python
# public/workers/python/vector_store_indexer.py

"""
벡터스토어 인덱싱 및 검색
- 문서 임베딩 배치 처리
- SQLite DB 인덱싱
- 검색 쿼리 처리
"""

class VectorStoreIndexer:
    def __init__(self, db_path: str, embedding_model_name: str):
        self.db_path = db_path
        self.embedding_model = EmbeddingWorker(embedding_model_name)
        self.conn = None

    def initialize_db(self) -> None:
        """SQLite DB 초기화 (테이블 생성)"""

    def add_documents(self, documents: List[Dict]) -> Dict[str, Any]:
        """문서 추가 및 임베딩"""

    def delete_documents(self, doc_ids: List[str]) -> int:
        """문서 삭제"""

    def rebuild_index(self) -> Dict[str, Any]:
        """인덱스 재구축"""

    def search_vector(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
        """벡터 검색"""

    def search_fts(self, query: str, top_k: int = 5) -> List[Dict]:
        """FTS5 키워드 검색"""

    def get_stats(self) -> Dict[str, Any]:
        """벡터스토어 통계 조회"""
```

---

### 1.5 구현 순서 (상세)

| 순번 | 작업 | 담당 | 소요 시간 | 의존성 |
|------|------|------|----------|--------|
| 1-1 | 타입/인터페이스 정의 (lib/types) | BE | 2시간 | - |
| 1-2 | VectorStoreManager 구현 | BE | 3시간 | 1-1 |
| 1-3 | DocumentManager 구현 | BE | 3시간 | 1-1 |
| 1-4 | OllamaModelManager 구현 | BE | 2시간 | 1-1 |
| 1-5 | IndexingJobManager 구현 | BE | 2시간 | 1-1 |
| 1-6 | Python Worker (embedding_worker.py) | BE | 4시간 | 1-1 |
| 1-7 | Python Worker (vector_store_indexer.py) | BE | 4시간 | 1-1, 1-6 |
| 1-8 | API Routes 구현 | BE | 6시간 | 1-2~1-5 |
| 1-9 | API 단위 테스트 | BE | 4시간 | 1-8 |
| 1-10 | 에러 핸들링 & 로깅 | BE | 2시간 | 1-2~1-8 |
| **합계** | | | **32시간 (≈ 4일)** | |

---

## Phase 2: 프론트엔드 UI 개발 (1주)

### 2.1 새 페이지 구조

#### 2.1.1 /chatbot/vector-stores (벡터스토어 관리)

```typescript
// app/chatbot/vector-stores/page.tsx

/**
 * 벡터스토어 관리 페이지
 * - 벡터스토어 목록 (카드/테이블)
 * - 생성, 수정, 삭제 기능
 * - 기본 벡터스토어 설정
 * - 상태 모니터링
 */
```

**주요 컴포넌트**:
1. VectorStoreList (카드/테이블 뷰)
2. VectorStoreCard (개별 벡터스토어 정보)
3. CreateVectorStoreDialog
4. EditVectorStoreDialog
5. DeleteVectorStoreDialog
6. VectorStoreMetrics (통계 대시보드)

---

#### 2.1.2 /chatbot/vector-stores/:id (벡터스토어 상세)

```typescript
// app/chatbot/vector-stores/[id]/page.tsx

/**
 * 벡터스토어 상세 & 문서 관리
 * - 벡터스토어 정보
 * - 포함된 문서 목록 (검색, 필터링)
 * - 문서 추가/삭제
 * - 인덱싱 진행률
 */
```

**주요 컴포넌트**:
1. VectorStoreDetailHeader
2. DocumentList (테이블)
3. DocumentSearchBar
4. AddDocumentModal
5. DocumentFilters
6. IndexingProgressBar
7. VectorStoreStatistics

---

#### 2.1.3 /chatbot/embedding-models (임베딩 모델 관리)

```typescript
// app/chatbot/embedding-models/page.tsx

/**
 * 임베딩 모델 관리 페이지
 * - Ollama에서 감지된 모델 목록
 * - 모델 정보 (파라미터, 크기, 형식 등)
 * - 모델 상태 모니터링
 * - 모델 선택 (기본값 설정)
 */
```

**주요 컴포넌트**:
1. EmbeddingModelList
2. ModelCard
3. ModelDetails
4. ModelStatusIndicator
5. ModelSelector (프로필)

---

### 2.2 컴포넌트 설계 (TypeScript 타입 안전성 준수)

#### 2.2.1 VectorStoreCard

```typescript
/**
 * 벡터스토어 정보 카드 컴포넌트
 *
 * @requires
 * - 모든 props에 명시적 타입
 * - null/undefined 체크 (early return)
 * - 옵셔널 체이닝 사용
 */
interface VectorStoreCardProps {
  store: VectorStoreMetadata
  isDefault?: boolean
  onSelect?: (id: string) => void
  onSetDefault?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function VectorStoreCard({
  store,
  isDefault = false,
  onSelect,
  onSetDefault,
  onEdit,
  onDelete,
}: VectorStoreCardProps): JSX.Element {
  const handleSelect = useCallback(() => {
    onSelect?.(store.id)
  }, [store.id, onSelect])

  return (
    // 카드 내용:
    // - 벡터스토어 이름 + 임베딩 모델
    // - 문서 수 + DB 크기
    // - 생성일 + 마지막 업데이트
    // - 상태 배지 (준비됨, 인덱싱 중, 실패)
    // - 액션 버튼 (기본값 설정, 편집, 삭제)
  )
}
```

#### 2.2.2 DocumentList

```typescript
/**
 * 벡터스토어 내 문서 목록 테이블
 *
 * @requires
 * - 검색 결과 필터링
 * - 카테고리별 그룹화 (선택사항)
 * - 페이지네이션 (100개+ 문서)
 * - 모든 이벤트 핸들러에 useCallback 적용
 */
interface DocumentListProps {
  vectorStoreId: string
  searchQuery?: string
  category?: string
  onAddDocument?: () => void
  onDeleteDocument?: (id: string) => void
}

export function DocumentList({
  vectorStoreId,
  searchQuery = '',
  category,
  onAddDocument,
  onDeleteDocument,
}: DocumentListProps): JSX.Element {
  // 테이블 컬럼:
  // - 제목
  // - 카테고리
  // - 토큰 수
  // - 생성일
  // - 액션 (수정, 삭제)
}
```

#### 2.2.3 AddDocumentModal

```typescript
/**
 * 벡터스토어에 문서 추가 모달
 *
 * @requires
 * - 다양한 입력 방식 지원
 * - 파일 업로드 유효성 검사
 * - 텍스트 길이 제한
 * - 에러 메시지 표시 (try-catch)
 */
interface AddDocumentModalProps {
  vectorStoreId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddDocumentModal({
  vectorStoreId,
  isOpen,
  onClose,
  onSuccess,
}: AddDocumentModalProps): JSX.Element {
  // 입력 방식:
  // - Textarea (직접 입력)
  // - File upload (TXT, PDF 등) with validation
  // - URL (웹페이지 크롤링)
  // - Clipboard paste
}
```

#### 2.2.4 IndexingProgressBar

```typescript
/**
 * 벡터스토어 인덱싱 진행률 표시
 *
 * @requires
 * - WebSocket 또는 polling으로 실시간 업데이트
 * - 진행률, ETA, 현재 처리 중인 문서 표시
 * - 취소 버튼 (선택사항)
 * - 에러 처리 및 재시도 로직
 */
interface IndexingProgressBarProps {
  jobId: string
  onComplete?: () => void
  onError?: (error: string) => void
}

export function IndexingProgressBar({
  jobId,
  onComplete,
  onError,
}: IndexingProgressBarProps): JSX.Element {
  // 표시 정보:
  // - 진행률 (%)
  // - 처리된 문서 / 전체 문서
  // - 예상 남은 시간 (ETA)
  // - 취소 버튼
  // - 에러 메시지 (실패 시)
}
```

#### 2.2.5 EmbeddingModelCard

```typescript
/**
 * 임베딩 모델 정보 카드
 *
 * @requires
 * - 모델 정보 정확도 (Ollama API에서 조회)
 * - 활성 상태 표시 (현재 로드된 모델)
 */
interface EmbeddingModelCardProps {
  model: OllamaModel
  isActive?: boolean
  onSelect?: (name: string) => void
}

export function EmbeddingModelCard({
  model,
  isActive = false,
  onSelect,
}: EmbeddingModelCardProps): JSX.Element {
  // 카드 내용:
  // - 모델명 + 파라미터
  // - 크기 (MB)
  // - 형식 (GGUF, SafeTensors 등)
  // - 활성 상태 표시 (뱃지)
  // - 상세 정보 링크 (선택사항)
}
```

---

### 2.3 상태 관리 (Hooks) - TypeScript 타입 안전성 준수

#### 2.3.1 useVectorStores

```typescript
/**
 * 벡터스토어 목록 및 CRUD 관리
 *
 * @requires
 * - 에러 처리 (try-catch)
 * - null/undefined 체크
 * - 로딩 상태 관리
 * - 모든 함수에 useCallback 적용
 */
interface UseVectorStoresReturn {
  stores: VectorStoreMetadata[]
  isLoading: boolean
  error: Error | null

  // CRUD operations
  createStore: (req: CreateVectorStoreRequest) => Promise<VectorStoreMetadata>
  updateStore: (id: string, updates: Partial<VectorStoreMetadata>) => Promise<void>
  deleteStore: (id: string) => Promise<void>
  setDefaultStore: (id: string) => Promise<void>

  // Refresh
  refresh: () => Promise<void>
}

export function useVectorStores(): UseVectorStoresReturn {
  // 구현 패턴:
  // 1. useState로 상태 관리 (stores, isLoading, error)
  // 2. useCallback으로 모든 API 호출 함수 래핑
  // 3. useEffect로 초기 데이터 로드
  // 4. 에러 처리 (try-catch + setError)
  // 5. 로딩 상태 관리 (setIsLoading)
}
```

#### 2.3.2 useDocuments

```typescript
/**
 * 벡터스토어 내 문서 관리
 *
 * @requires
 * - vectorStoreId 필수
 * - 에러 처리 (파일 유효성 검사 포함)
 * - 검색 필터링
 * - 카테고리 필터링
 */
interface UseDocumentsReturn {
  documents: UserDocument[]
  isLoading: boolean
  error: Error | null

  // CRUD
  addDocuments: (docs: UserDocument[]) => Promise<string[]>
  updateDocument: (id: string, updates: Partial<UserDocument>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>

  // Search & Filter
  search: (query: string) => Promise<UserDocument[]>
  filterByCategory: (category: string) => UserDocument[]
}

export function useDocuments(vectorStoreId: string): UseDocumentsReturn {
  // 구현 패턴:
  // 1. vectorStoreId 유효성 검사 (early return)
  // 2. 문서 목록 fetch (useEffect)
  // 3. CRUD 작업 (API 호출)
  // 4. 에러 처리 (파일 크기, 형식 검사)
  // 5. 로컬 필터링 (search, filterByCategory)
}
```

#### 2.3.3 useIndexingJob

```typescript
/**
 * 벡터스토어 인덱싱 작업 모니터링
 *
 * @requires
 * - WebSocket 또는 polling 기반 실시간 업데이트
 * - 작업 취소 기능
 * - 에러 복구 로직
 * - 타임아웃 처리
 */
interface UseIndexingJobReturn {
  jobId: string | null
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed'
  progress: number  // 0-100
  currentDocument: string | null
  estimatedTimeRemaining: number | null  // seconds
  errorMessage: string | null

  // Job management
  startIndexing: () => Promise<string>
  cancelIndexing: () => Promise<void>
}

export function useIndexingJob(): UseIndexingJobReturn {
  // 구현 패턴:
  // 1. 작업 상태 (jobId, status, progress, error)
  // 2. 실시간 업데이트 (WebSocket 또는 polling)
  // 3. 작업 취소 (cancel button)
  // 4. 에러 처리 및 재시도 로직
  // 5. 타임아웃 처리 (30분 이상 걸리면 경고)
}
```

#### 2.3.4 useEmbeddingModels

```typescript
/**
 * Ollama 임베딩 모델 목록 조회 및 캐싱
 *
 * @requires
 * - Ollama API 연결 확인
 * - 모델 캐싱 (5분)
 * - 수동 새로고침 버튼
 * - 오프라인 상태 처리
 */
interface UseEmbeddingModelsReturn {
  models: OllamaModel[]
  isLoading: boolean
  error: Error | null
  ollamaStatus: 'online' | 'offline'

  // Model management
  refresh: () => Promise<void>
  getModelInfo: (name: string) => OllamaModel | undefined
  filterByType: (type: 'embedding' | 'inference') => OllamaModel[]
}

export function useEmbeddingModels(): UseEmbeddingModelsReturn {
  // 구현 패턴:
  // 1. Ollama 연결 상태 확인
  // 2. 모델 목록 fetch (useEffect)
  // 3. 로컬 캐싱 (5분)
  // 4. 수동 새로고침 (useCallback)
  // 5. 오프라인 상태 처리
}
```

---

### 2.4 UI 레이아웃

```
/chatbot/vector-stores (메인 페이지)
├── Header
│   ├── 페이지 제목
│   ├── "새 벡터스토어" 버튼
│   └── "임베딩 모델 관리" 링크
├── Filters (선택사항)
│   ├── 상태 필터
│   └── 태그 검색
├── VectorStoreList
│   ├── VectorStoreCard 1
│   ├── VectorStoreCard 2
│   └── VectorStoreCard N
└── Dialogs
    ├── CreateVectorStoreDialog
    ├── EditVectorStoreDialog
    └── DeleteVectorStoreDialog

/chatbot/vector-stores/:id (상세 페이지)
├── Header
│   ├── 벡터스토어 정보
│   ├── 기본값 설정 버튼
│   └── 편집/삭제 버튼
├── Tabs
│   ├── Documents
│   │   ├── DocumentSearchBar
│   │   ├── DocumentList
│   │   └── "문서 추가" 버튼
│   ├── Settings
│   │   ├── 이름 수정
│   │   ├── 설명 수정
│   │   └── 태그 관리
│   └── Statistics
│       ├── 문서 수
│       ├── DB 크기
│       └── 인덱싱 시간
└── Modals
    ├── AddDocumentModal
    ├── EditDocumentModal
    └── DeleteDocumentDialog

/chatbot/embedding-models (임베딩 모델 페이지)
├── Header
│   ├── 페이지 제목
│   └── "모델 갱신" 버튼
├── Filters
│   ├── 타입 필터 (embedding/inference)
│   └── 상태 필터
└── ModelList
    ├── EmbeddingModelCard 1
    ├── EmbeddingModelCard 2
    └── EmbeddingModelCard N
```

---

### 2.5 구현 순서 (상세)

| 순번 | 작업 | 담당 | 소요 시간 | 의존성 |
|------|------|------|----------|--------|
| 2-1 | 타입 & 인터페이스 정의 | FE | 2시간 | Phase 1 완료 |
| 2-2 | Custom Hooks 구현 | FE | 4시간 | 2-1 |
| 2-3 | 벡터스토어 관리 페이지 | FE | 6시간 | 2-2 |
| 2-4 | 벡터스토어 상세 페이지 | FE | 6시간 | 2-2 |
| 2-5 | 임베딩 모델 페이지 | FE | 4시간 | 2-2 |
| 2-6 | 다이얼로그/모달 구현 | FE | 4시간 | 2-3, 2-4 |
| 2-7 | 문서 추가 UI (다양한 입력) | FE | 4시간 | 2-4 |
| 2-8 | 진행률 표시 & WebSocket | FE | 3시간 | 2-4 |
| 2-9 | 반응형 디자인 & 스타일 | FE | 3시간 | 2-3~2-8 |
| 2-10 | 접근성 & 다크 모드 | FE | 2시간 | 2-3~2-8 |
| **합계** | | | **38시간 (≈ 5일)** | |

---

## Phase 3: 통합 테스트 & QA (3-4일)

### 3.1 테스트 시나리오

#### 3.1.1 벡터스토어 CRUD 테스트
- [ ] 새 벡터스토어 생성 (다양한 임베딩 모델)
- [ ] 벡터스토어 목록 조회
- [ ] 벡터스토어 정보 수정
- [ ] 벡터스토어 삭제
- [ ] 기본 벡터스토어 설정

#### 3.1.2 문서 관리 테스트
- [ ] 텍스트 입력으로 문서 추가
- [ ] 파일 업로드로 문서 추가
- [ ] 문서 검색 (제목, 내용)
- [ ] 문서 수정
- [ ] 문서 삭제
- [ ] 배치 문서 처리

#### 3.1.3 임베딩 & 인덱싱 테스트
- [ ] Ollama 모델 자동 감지
- [ ] 벡터 임베딩 생성 (단일, 배치)
- [ ] 임베딩 유사도 검색
- [ ] 인덱싱 진행률 표시
- [ ] 인덱싱 실패 복구

#### 3.1.4 성능 테스트
- [ ] 1000개 문서 임베딩 시간
- [ ] 벡터 검색 응답 시간
- [ ] UI 반응성 (대량 데이터)
- [ ] 메모리 사용량

#### 3.1.5 에러 처리 테스트
- [ ] Ollama 연결 불가
- [ ] 모델 로드 실패
- [ ] 임베딩 실패 시 재시도
- [ ] 저장소 공간 부족
- [ ] 네트워크 오류 대응

---

### 3.2 성능 벤치마크

| 작업 | 목표 | 측정 방법 |
|------|------|----------|
| 100개 문서 임베딩 | < 30초 | 스톱워치 |
| 벡터 검색 (top-5) | < 500ms | 브라우저 DevTools |
| 페이지 로드 | < 2초 | Lighthouse |
| 메모리 사용 (1000개 문서) | < 500MB | Chrome DevTools |

---

### 3.3 호환성 테스트

| 환경 | 브라우저 | OS |
|------|----------|-----|
| 데스크탑 | Chrome, Edge, Firefox | Windows, macOS, Linux |
| 태블릿 | Chrome, Safari | iOS, Android |
| 모바일 | Chrome, Safari | iOS, Android |

---

## Phase 4: 배포 & 모니터링

### 4.1 배포 체크리스트

- [ ] 환경 변수 설정 (Ollama 엔드포인트, 타임아웃 등)
- [ ] 데이터 마이그레이션 (기존 벡터스토어)
- [ ] 문서화 작성
- [ ] 사용자 교육 자료
- [ ] 롤백 계획

### 4.2 모니터링 지표

- Ollama 연결 상태
- 인덱싱 작업 완료율
- 검색 응답 시간
- 에러 발생률
- 사용자 활동 (벡터스토어 생성 수)

---

## 📊 기술 스택

### 백엔드
- **언어**: TypeScript
- **런타임**: Node.js (Next.js 15)
- **DB**: IndexedDB (클라이언트), SQLite (벡터스토어)
- **Python**: NumPy, SciPy, Transformers (임베딩)
- **API**: REST + WebSocket (진행률)

### 프론트엔드
- **프레임워크**: React 19 + Next.js 15
- **UI 라이브러리**: shadcn/ui
- **상태 관리**: React Hooks (useState, useCallback)
- **데이터 페칭**: fetch API + React Query (선택)
- **실시간**: WebSocket (인덱싱 진행률)

### 외부 서비스
- **Ollama**: 임베딩 + 추론 모델 호스팅
- **CUDA**: GPU 가속 (선택)

---

## 🔐 보안 고려사항

1. **입력 검증**: 모든 사용자 입력 검증 (XSS 방지)
2. **인증**: 벡터스토어 소유권 확인 (향후 사용자 인증 추가 시)
3. **암호화**: 민감한 문서 내용 (선택적)
4. **접근 제어**: 벡터스토어별 접근 권한 (향후)
5. **감사 로그**: 문서 CRUD 작업 기록

---

## 📈 확장 계획 (Phase 5+)

### Phase 5: 고급 기능
- [ ] 벡터스토어 버전 관리
- [ ] 문서 변경 이력 추적
- [ ] 자동 재인덱싱 (정기 일정)
- [ ] 벡터스토어 비교/머지

### Phase 6: 협업 기능
- [ ] 벡터스토어 공유
- [ ] 팀 관리
- [ ] 접근 권한 관리
- [ ] 감사 로그

### Phase 7: 클라우드 연계
- [ ] 원격 벡터스토어 백업
- [ ] 클라우드 임베딩 API (OpenAI, Cohere)
- [ ] 분산 임베딩 처리

---

## 📚 참고 자료

### 임베딩 모델
- [Ollama Model Library](https://ollama.ai/library)
- [Hugging Face Embedding Models](https://huggingface.co/models?pipeline_tag=sentence-similarity)
- [Qwen3 Embedding](https://huggingface.co/Qwen/Qwen3-embedding)

### 벡터 데이터베이스
- [SQLite Vector Extension](https://github.com/asg017/sqlite-vec)
- [sql.js Documentation](https://sql.js.org/)
- [FTS5 (Full-Text Search)](https://www.sqlite.org/fts5.html)

### 임베딩 기술
- [Sentence Transformers](https://www.sbert.net/)
- [MTEB Benchmark](https://huggingface.co/spaces/mteb/leaderboard)

---

## 🎯 핵심 성공 지표

| 지표 | 목표 | 측정 단위 |
|------|------|----------|
| 벡터스토어 생성 시간 | < 1분 | 초 |
| 문서 추가 처리량 | 100 docs/min | 문서/분 |
| 검색 응답 시간 | < 500ms | ms |
| 시스템 가용성 | > 99.5% | % |
| 사용자 만족도 | > 4.5/5 | 점수 |

---

---

## 🔍 코딩 표준 준수 체크리스트

### TypeScript 타입 안전성
- ✅ **any 타입 절대 금지** → unknown + 타입 가드 사용
- ✅ **모든 함수에 명시적 타입** (파라미터 + 리턴값)
- ✅ **null/undefined 체크** (옵셔널 체이닝 `?.` 사용)
- ✅ **Non-null assertion (`!`) 금지** → 타입 가드로 해결
- ✅ **API 응답 검증** (try-catch + 타입 체크)

### 에러 처리
- ✅ **try-catch로 모든 비동기 작업 감싸기**
- ✅ **명확한 에러 메시지** (사용자 친화적)
- ✅ **HTTP 상태 코드 정확히** (400, 404, 500 등)
- ✅ **로깅** (console.error로 디버깅 정보 기록)

### React Hooks
- ✅ **useCallback 모든 핸들러에 적용** (성능 최적화)
- ✅ **useState로 상태 관리** (복잡한 로직은 useReducer)
- ✅ **useEffect로 데이터 페칭** (cleanup 함수 포함)
- ✅ **의존성 배열 정확히** (ESLint exhaustive-deps 준수)

---

## 💡 추가 개선 사항

### 1. 성능 최적화
- **가상화 (virtualization)**: 1000개+ 문서 목록을 위해 react-window 고려
- **메모이제이션**: VectorStoreCard, DocumentList에 React.memo 적용
- **API 캐싱**: 5분 내 동일 요청은 캐시 사용 (SWR 또는 React Query)
- **이미지 최적화**: next/image 사용

### 2. 접근성 (A11y)
- **ARIA 라벨**: 모든 버튼에 aria-label
- **키보드 네비게이션**: Tab, Enter, Escape 지원
- **색상 대비**: WCAG AA 이상 준수
- **스크린 리더**: 진행률 업데이트 aria-live="polite"

### 3. 보안 강화
- **입력 검증**: DOMPurify로 사용자 입력 sanitize
- **CSRF 토큰**: 상태 변경 API에 CSRF 보호 (필요 시)
- **Rate limiting**: API 호출 제한 (초당 10회)
- **콘텐츠 보안 정책 (CSP)**: next.config.js에서 설정

### 4. 모니터링 & 로깅
- **에러 추적**: Sentry 또는 Axiom 통합
- **성능 모니터링**: Web Vitals, Lighthouse CI
- **사용자 분석**: PostHog 또는 Mixpanel로 기능 사용 추적
- **로그 레벨**: DEBUG, INFO, WARN, ERROR 구분

### 5. 테스트 전략
- **단위 테스트**: Jest + React Testing Library (hooks, utils)
- **통합 테스트**: Playwright (사용자 플로우)
- **E2E 테스트**: Cypress 또는 Playwright
- **성능 테스트**: Lighthouse CI, web-vitals

---

## 🚨 예상 주의 사항

### Phase 1 구현 시
1. **SQLite 용량**: 벡터스토어 크기 제한 (최대 100MB 권장)
2. **Ollama 연결**: 네트워크 오류 시 재시도 로직 (exponential backoff)
3. **임베딩 품질**: 모델별 차원 일관성 검증 (1024 vs 768 vs 512)
4. **메모리**: 브라우저 IndexedDB 제한 (50MB 기본, 최대 250MB)

### Phase 2 구현 시
1. **상태 동기화**: 여러 탭에서 동시 수정 시 conflict 해결
2. **UI 복잡도**: 모달 중첩 방지 (최대 1단계)
3. **반응형**: 모바일에서 테이블은 카드 형태로 변경
4. **다크 모드**: 모든 색상이 다크 모드에서 테스트 필수

### Phase 3 테스트 시
1. **Ollama 오프라인**: 모델 감지 실패 시나리오
2. **대용량 임베딩**: 1000개 문서 처리 시간 (< 30초)
3. **브라우저 호환성**: IE11은 지원 불필요 (Edge, Chrome, Firefox, Safari)
4. **메모리 누수**: DevTools Memory 프로파일링으로 검증

---

## 📚 참고 자료

### 프로젝트 코딩 표준
- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙
- [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md) - any → unknown 패턴
- [STATISTICS_PAGE_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md) - 페이지 패턴

### 라이브러리 문서
- [Next.js 15 API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React 19 Hooks](https://react.dev/reference/react)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📊 구현 전 체크리스트

- [ ] CLAUDE.md 전체 읽음
- [ ] AI-CODING-RULES.md 숙지 (any vs unknown)
- [ ] TypeScript strict 모드 활성화 확인
- [ ] 기존 벡터스토어 마이그레이션 계획
- [ ] Ollama 오프라인 환경 테스트
- [ ] 데이터 백업 전략 수립

---

**작성일**: 2025-11-03
**버전**: 1.1 (코딩 표준 및 UI 분석 반영)
**상태**: ✅ 최종 검토 완료 (구현 준비 완료)
