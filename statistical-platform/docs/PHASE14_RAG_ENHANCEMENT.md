# Phase 14: RAG 시스템 고도화 구현 문서

**작성일**: 2026-02-04
**최종 수정**: 2026-02-04 (v2 — Ollama API 검증 반영)
**상태**: 구현 대기
**우선순위**: Phase 14-1 (High) → Phase 14-2 (High) → Phase 14-3 (Medium) → Phase 14-4 (Low)

---

## 1. 현재 상태

### 1.1 아키텍처

```
브라우저 (100% 클라이언트)              외부 (필수)
+-----------------------------+     +----------------+
| Next.js static export       |---->| Ollama 서버    |
| - sql.js (벡터 DB, WASM)    |     | (v0.15.x)      |
| - IndexedDB (영구 저장)     |     | - 임베딩       |
| - 사전빌드 .db 파일         |     | - LLM 추론     |
+-----------------------------+     +----------------+
    output: 'export'
    = 순수 HTML/JS/CSS
    API 라우트 없음
```

### 1.2 기존 RAG 파일 구조

```
lib/rag/
├── rag-service.ts                  # Singleton 서비스 (진입점)
├── rag-config.ts                   # localStorage 설정 관리
├── indexeddb-storage.ts            # IndexedDB 스토리지 (DB_VERSION 3)
├── providers/
│   ├── base-provider.ts            # 추상 인터페이스 + 타입 정의
│   └── ollama-provider.ts          # Ollama 구현 (2400줄)
├── hooks/
│   └── use-rag-assistant.ts        # React hook
├── utils/
│   ├── sql-indexeddb.ts            # sql.js + absurd-sql 브릿지
│   ├── model-recommender.ts        # GPU RAM 기반 모델 추천
│   ├── ollama-check.ts             # 헬스체크
│   ├── chunking.ts                 # 문서 청킹
│   ├── blob-utils.ts               # 벡터 직렬화
│   └── error-handler.ts            # 에러 분류
├── parsers/                        # PDF, MD, HWP 파서
├── strategies/                     # 청킹 전략
└── config/                         # UI 상수

components/rag/
├── model-settings.tsx              # 모델 설정 패널
├── vector-store-selector.tsx       # 벡터스토어 드롭다운
├── document-manager.tsx            # 문서 CRUD + 리빌드
├── rag-chat-interface.tsx          # 채팅 UI
├── rag-assistant.tsx               # 사이드바 어시스턴트
├── file-uploader.tsx               # 파일 업로드
└── environment-indicator.tsx       # Ollama 상태 표시
```

### 1.3 이미 사용 중인 Ollama API

| API | 현재 용도 | 위치 | 비고 |
|-----|----------|------|------|
| `GET /api/tags` | 모델 목록 조회 | ollama-provider.ts:165 | |
| `POST /api/embeddings` | 임베딩 생성 | ollama-provider.ts:1743 | **Deprecated** → `/api/embed`로 마이그레이션 필요 |
| `POST /api/generate` | 추론 (스트리밍) | ollama-provider.ts:1976, 2138 | |
| `POST /api/show` | 모델 상세 | model-recommender.ts | `capabilities` 필드 미활용 |

### 1.4 미사용 Ollama API (구현 대상)

| API | 용도 | static export | 비고 |
|-----|------|:---:|------|
| `POST /api/pull` | 모델 다운로드 (스트리밍 진행률) | O | |
| `DELETE /api/delete` | 모델 삭제 | O | body 필드: `model` (not `name`) |

### 1.5 Ollama API 마이그레이션 (Phase 14 선행작업)

**`/api/embeddings` → `/api/embed` 마이그레이션** (기존 코드 버그 수정 포함)

| | `/api/embeddings` (현재, deprecated) | `/api/embed` (신규, 권장) |
|---|---|---|
| 상태 | **Superseded** | 현행 API |
| 입력 필드 | `prompt` (단일 문자열) | `input` (문자열 또는 문자열 배열) |
| 배치 | X | O (배열 입력) |
| L2 정규화 | 미적용 | 자동 적용 |
| 자동 Truncation | X | O |
| 차원 축소 | X | O (`dimensions` 파라미터) |
| 데이터 타입 | float64 | float32 |
| 응답 필드 | `{ embedding: number[] }` | `{ embeddings: number[][] }` |
| 메트릭 | 없음 | `total_duration`, `load_duration`, `prompt_eval_count` |

**현재 코드 문제점**: ollama-provider.ts:1743에서 deprecated `/api/embeddings`에 `input` 필드를 보내고 있음.
정상 동작하는 이유: Ollama가 하위 호환으로 둘 다 허용하기 때문. 하지만 불안정.

**수정 계획**: Step 1 (`ollama-embeddings.ts`)에서 `/api/embed` 사용 + Step 15에서 OllamaProvider의 private 메서드를 새 유틸로 교체.

### 1.6 Ollama 최신 기능 참고 (v0.12 ~ v0.15)

> Phase 14 범위 밖이지만, 후속 참고용으로 기록

| 버전 | 기능 | 관련성 |
|------|------|--------|
| v0.12.11 | Logprobs 지원, Vulkan GPU 가속 | 낮음 |
| v0.13.0 | Anthropic API 호환 (`/v1/messages`), Flash Attention 기본값 | 중간 (호환 API 활용 가능) |
| v0.13.3 | OpenAI Responses API (`/v1/responses`) | 중간 |
| v0.15.x | 이미지 생성, `ollama launch` 명령어 | 낮음 |

---

## 2. Phase 14-1: 모델 관리 UI

### 2.1 목표

사용자가 브라우저에서 직접 Ollama 모델을 관리할 수 있도록 한다.
- 설치된 모델 목록 (임베딩/추론 분리)
- 새 모델 다운로드 (진행률 표시)
- 모델 삭제 (확인 다이얼로그)
- 모델 상세 정보 (크기, 파라미터, 양자화)
- 추천 모델 목록

### 2.2 신규 파일

#### `lib/rag/utils/ollama-embeddings.ts`
- OllamaProvider의 private `generateEmbedding`을 공용 함수로 추출
- **`/api/embed` (신규 API)** 사용 — deprecated `/api/embeddings` 아님
- Phase 14-2에서도 사용 (벡터스토어 생성 시 배치 임베딩 생성)

```typescript
// 단일 텍스트 임베딩
export async function generateEmbeddingViaOllama(
  endpoint: string,
  model: string,
  text: string
): Promise<number[]>

// 배치 임베딩 (벡터스토어 생성용)
export async function generateBatchEmbeddingsViaOllama(
  endpoint: string,
  model: string,
  texts: string[],
  signal?: AbortSignal
): Promise<number[][]>
```

**구현 핵심**:
```typescript
// POST /api/embed (NOT /api/embeddings)
const response = await fetch(`${endpoint}/api/embed`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, input: texts }),  // input: 배열 지원
  signal,
})
const data = await response.json()
return data.embeddings  // number[][] (NOT data.embedding)
```

#### `lib/rag/constants/recommended-models.ts`
- 임베딩/추론별 추천 모델 정적 목록
- 모델명, 설명, 파라미터 크기, 최소 VRAM

```typescript
export interface RecommendedModel {
  name: string
  description: string
  parameterSize: string
  category: 'embedding' | 'inference'
  minVram: number  // GB
}

export const RECOMMENDED_EMBEDDING_MODELS: RecommendedModel[]
export const RECOMMENDED_INFERENCE_MODELS: RecommendedModel[]
```

#### `lib/rag/services/ollama-model-service.ts`
- 모델 관리 전용 서비스 (RAGService와 독립)

```typescript
// 기존 model-recommender.ts의 OllamaModel을 확장
// → model-recommender.ts에서 OllamaModel, OllamaModelDetail, calculateModelVram을 export 필요
export interface OllamaModelInfo {
  name: string
  size: number                       // bytes
  modifiedAt: string
  digest: string
  details: {
    family: string
    families: string[]
    parameterSize: string            // "7B", "0.6B"
    quantizationLevel: string        // "Q4_K_M"
    format: string
  }
  capabilities: string[]             // /api/show에서 조회 ['completion'] | ['completion', 'embedding']
  estimatedVram: number              // GB (calculateModelVram 재사용)
  category: 'embedding' | 'inference'
}

export interface ModelPullProgress {
  status: string
  digest?: string
  total?: number
  completed?: number
  percentage: number                 // 0-100
}

// 핵심 메서드
export class OllamaModelService {
  // AbortController를 static 프로퍼티로 관리
  private static pullController: AbortController | null = null

  static async listModels(endpoint: string): Promise<OllamaModelInfo[]>
  // → getInstalledModels() 재사용 + /api/show로 capabilities 조회 → category 결정
  //    capabilities에 'embedding' 포함 → 'embedding', 아니면 → 'inference'
  //    (기존 이름 패턴 매칭은 fallback으로만 사용)

  static async showModelDetails(endpoint: string, name: string): Promise<unknown>

  static async pullModel(
    endpoint: string,
    name: string,
    onProgress: (p: ModelPullProgress) => void
  ): Promise<void>
  // NDJSON 스트리밍 + AbortController

  static cancelPull(): void
  // → OllamaModelService.pullController?.abort()

  static async deleteModel(endpoint: string, name: string): Promise<boolean>
  // → DELETE /api/delete, body: { model: name }  ← 필드명 "model" (NOT "name")
}
```

**pullModel 구현 핵심**: `POST /api/pull` + `stream: true` → NDJSON 파싱
```
{"status":"pulling manifest"}
{"status":"downloading ...","digest":"sha256:...","total":4109853696,"completed":1024000}
{"status":"verifying sha256 digest"}
{"status":"writing manifest"}
{"status":"removing any unused layers"}
{"status":"success"}
```

**deleteModel 구현 핵심**: `DELETE /api/delete`
```typescript
// 주의: body 필드는 "model" (Ollama 공식 API)
await fetch(`${endpoint}/api/delete`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: name }),  // { model: "llama3:13b" }
})
```

**카테고리 분류 전략**:
```
1순위: /api/show의 capabilities 배열 확인
       capabilities.includes('embedding') → 'embedding'
       그 외 → 'inference'
2순위 (fallback): 모델명 패턴 매칭
       name.includes('embed') → 'embedding'
```

#### `components/rag/model-manager/` (5개 파일)

```
ModelManager.tsx          # Tabs: "설치된 모델" / "모델 다운로드"
├── ModelList.tsx         # 설치 목록 (임베딩/추론 분리, 카드 형태)
│   └── ModelCard.tsx     # 이름, 패밀리, 크기, 양자화, VRAM, 삭제 버튼
└── ModelPullPanel.tsx    # 추천 목록 그리드 + 커스텀 입력
    └── ModelPullProgress.tsx  # Progress bar + 상태 + 취소
```

**컴포넌트 구조**:
```
ModelManager (Tabs)
|
+-- Tab "설치된 모델"
|   +-- ModelList
|       +-- ModelCard x N
|           - 이름, 패밀리, 크기 (formatBytes), 양자화
|           - 카테고리 뱃지 (임베딩/추론)
|           - 삭제 버튼 -> AlertDialog 확인
|
+-- Tab "모델 다운로드"
    +-- ModelPullPanel
        +-- 추천 임베딩 모델 그리드
        +-- 추천 추론 모델 그리드
        +-- 커스텀 모델명 Input + 다운로드 Button
        +-- ModelPullProgress (다운로드 중일 때만)
            - 모델명, 상태 텍스트
            - Progress bar (percentage)
            - 취소 버튼 (AbortController)
```

#### `app/(dashboard)/rag/models/page.tsx`
- 모델 관리 전체 페이지 라우트

### 2.3 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `components/rag/model-settings.tsx` | "모델 관리" 버튼 추가 → Sheet로 ModelManager 열기 |
| `lib/rag/utils/model-recommender.ts` | `OllamaModel`, `OllamaModelDetail`, `calculateModelVram` export 추가 |

### 2.4 상태 관리

- **Zustand 불필요** — DocumentManager 패턴 따름
- `useState` + `useCallback` + Ollama API 직접 호출
- 모델 목록: 컴포넌트 마운트 시 `listModels()` 호출
- 다운로드 진행률: 일시적 UI 상태
- AbortController: `OllamaModelService.pullController` (static 프로퍼티)

### 2.5 에러 처리

| 시나리오 | 대응 |
|----------|------|
| Ollama 미실행 | "Ollama 서버에 연결할 수 없습니다" + 재시도 버튼 |
| 모델 다운로드 실패 | "다운로드 실패: {에러}" + 재시도 |
| 모델 삭제 실패 | "삭제 실패: {에러}" 토스트 |
| CORS 에러 | Ollama CORS 설정 안내 메시지 |

### 2.6 검증

1. `pnpm tsc --noEmit` — 타입 에러 0
2. `/rag/models` 접속 → 설치된 모델 목록 표시
3. 추천 모델 다운로드 → 진행률 → 완료 → 목록 갱신
4. 모델 삭제 → AlertDialog → 삭제 → 목록 갱신
5. Ollama 미실행 시 에러 메시지

---

## 3. Phase 14-2: 벡터스토어 CRUD

### 3.1 목표

사용자가 브라우저에서 직접 벡터스토어를 생성/삭제/선택한다.
- 사전빌드 스토어: 기존 `/rag-data/*.db` (변경 없음)
- 사용자 스토어: IndexedDB에 저장 (신규)

### 3.2 IndexedDB 스키마 확장

**현재 (DB_VERSION 3)**:
```
RAGSystemDB
├── userDocuments (doc_id, library, created_at)
└── embeddings (doc_id, doc_chunk, embedding_model)
```

**확장 (DB_VERSION 4)**:
```
RAGSystemDB
├── userDocuments (기존)
├── embeddings (기존 + storeId 인덱스 추가)
└── vectorStores (신규)
    - keyPath: id
    - 인덱스: embeddingModel, createdAt
```

> **주의**: IndexedDB 버전 업그레이드는 비가역적. DB_VERSION 3→4로 올라가면 되돌릴 수 없음.
> 기존 embeddings 레코드에 storeId 필드가 없으므로 undefined로 인덱싱됨 (정상 — 기존 임베딩은 사용자 스토어 소속이 아님).

### 3.3 신규/수정 타입

```typescript
// indexeddb-storage.ts — StoredEmbedding 확장 (storeId 필드 추가)
export interface StoredEmbedding {
  id?: number
  doc_id: string
  chunk_index: number
  chunk_text: string
  chunk_tokens: number
  embedding: ArrayBuffer
  embedding_model: string
  created_at: number
  storeId?: string             // 신규: 사용자 벡터스토어 ID (기존 레코드는 undefined)
}

// indexeddb-storage.ts — 신규 타입
export interface StoredVectorStore {
  id: string                // 'user-1707012345678'
  name: string              // 사용자 지정 이름
  embeddingModel: string    // 임베딩에 사용한 모델
  dimensions: number        // 임베딩 차원수
  docCount: number          // 포함된 문서 수
  chunkCount: number        // 총 청크 수
  createdAt: number         // 생성 시각
  updatedAt: number         // 수정 시각
  source: 'user'            // 항상 'user'
  docIds: string[]          // 포함된 문서 ID 목록
}

// base-provider.ts VectorStore 확장
export interface VectorStore {
  // ... 기존 필드 (id, name, dbPath, embeddingModel, dimensions, docCount, fileSize, createdAt)
  source?: 'prebuilt' | 'user'  // 신규
}
```

### 3.4 신규 파일

#### `lib/rag/services/vector-store-service.ts`

```typescript
export class VectorStoreService {
  // 생성 취소용 AbortController
  private static createController: AbortController | null = null

  // 전체 스토어 목록 (사전빌드 + 사용자)
  static async getAllStores(): Promise<VectorStore[]>

  // 사용자 스토어 생성
  static async createStore(params: {
    name: string
    embeddingModel: string
    ollamaEndpoint: string           // 임베딩 생성에 필요
    docIds: string[]
    onProgress?: (percent: number, current: number, total: number, title: string) => void
  }): Promise<StoredVectorStore>

  // 사용자 스토어 삭제
  static async deleteStore(storeId: string): Promise<boolean>

  // 생성 취소
  static cancelCreate(): void
}
```

**createStore 플로우**:
```
1. storeId 생성 ('user-' + timestamp)
2. 선택된 문서 가져오기 (IndexedDB userDocuments)
3. 각 문서:
   a. 청크 분할 (chunking.ts)
   b. 청크 배치 → Ollama /api/embed 배치 임베딩 (ollama-embeddings.ts)
   c. IndexedDB embeddings에 저장 (storeId 태깅)
   d. onProgress 콜백
4. IndexedDB vectorStores에 메타데이터 저장
```

**배치 임베딩**: 청크를 적절한 크기(예: 32개)로 나누어 `/api/embed`에 배열로 전달.
한 번에 하나씩 보내는 것보다 성능이 크게 향상됨.

#### `components/rag/vector-store-manager/` (3개 파일)

```
VectorStoreManager.tsx       # 스토어 목록 + "새 스토어" 버튼
├── VectorStoreCard.tsx      # 이름, 모델, 문서수, 소스 뱃지, 선택/삭제
└── CreateVectorStoreDialog.tsx  # 생성 다이얼로그
    - 이름 Input
    - 임베딩 모델 Select (설치된 임베딩 모델 중 선택)
    - 문서 체크리스트 (Checkbox 목록)
    - 진행률 (생성 중)
    - 취소 버튼 (생성 중)
```

#### `app/(dashboard)/rag/vector-stores/page.tsx`
- 벡터스토어 관리 전체 페이지 라우트

### 3.5 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `lib/rag/indexeddb-storage.ts` | DB_VERSION 4, vectorStores 스토어, storeId 인덱스, StoredEmbedding에 storeId 추가, CRUD 메서드 |
| `lib/rag/providers/base-provider.ts` | `VectorStore.source` 필드 추가 |
| `lib/rag/providers/ollama-provider.ts` | (1) 사용자 스토어 모드 검색 추가, (2) private `generateEmbedding` → `generateEmbeddingViaOllama` 유틸 호출로 교체 |
| `lib/rag/rag-service.ts` | `initialize()`에 storeSource 전달 |
| `components/rag/vector-store-selector.tsx` | 사용자 스토어 포함 + 소스 뱃지 |
| `components/rag/model-settings.tsx` | "Vector Store 관리" 버튼 추가 |

### 3.6 사용자 스토어 검색 통합

**OllamaProvider 수정 핵심**:

```
initialize() 분기:
├── storeSource === 'prebuilt'
│   → 기존 로직: /rag-data/*.db 로드 (sql.js)
└── storeSource === 'user'
    → IndexedDB에서 storeId로 임베딩 로드
    → 메모리에 Float32Array[] 캐시

searchByVector() 분기:
├── prebuilt → 기존 SQLite 쿼리
└── user → 캐시된 임베딩과 코사인 유사도 계산
```

**성능 고려사항**: 사용자 스토어의 인메모리 코사인 유사도 검색은 O(n).
- 1,000 청크 이하: 문제없음 (< 50ms)
- 10,000+ 청크: 느려질 수 있음 → 추후 Phase 14-3에서 인덱싱 개선 검토
- v1에서는 청크 수 상한 경고 UI만 추가

### 3.7 검증

1. `pnpm tsc --noEmit` — 타입 에러 0
2. `/rag/vector-stores` 접속 → 사전빌드 + 사용자 스토어 목록
3. 새 스토어 생성: 문서 선택 → 임베딩 진행률 → 완료
4. 생성된 스토어 선택 → RAG 채팅에서 검색 동작 확인
5. 사용자 스토어 삭제 → 확인 → 목록 제거
6. 사전빌드 스토어 삭제 버튼 비활성화
7. 벡터스토어 생성 중 취소 → 취소 확인 → 부분 데이터 정리

---

## 4. 구현 순서 (24단계)

### 공통 유틸리티 + 마이그레이션 (Step 1-2)

| # | 파일 | 유형 | 비고 |
|---|------|------|------|
| 1 | `lib/rag/utils/ollama-embeddings.ts` | 신규 | `/api/embed` 사용, 단일+배치 함수 |
| 2 | `lib/rag/constants/recommended-models.ts` | 신규 | |

### Phase 14-1: 모델 관리 (Step 3-12)

| # | 파일 | 유형 | 비고 |
|---|------|------|------|
| 3 | `lib/rag/utils/model-recommender.ts` | 수정 | `OllamaModel`, `OllamaModelDetail`, `calculateModelVram` export |
| 4 | `lib/rag/services/ollama-model-service.ts` | 신규 | |
| 5 | `components/rag/model-manager/ModelCard.tsx` | 신규 | |
| 6 | `components/rag/model-manager/ModelPullProgress.tsx` | 신규 | |
| 7 | `components/rag/model-manager/ModelList.tsx` | 신규 | |
| 8 | `components/rag/model-manager/ModelPullPanel.tsx` | 신규 | |
| 9 | `components/rag/model-manager/ModelManager.tsx` | 신규 | |
| 10 | `app/(dashboard)/rag/models/page.tsx` | 신규 | |
| 11 | `components/rag/model-settings.tsx` | 수정 | "모델 관리" 버튼 |
| 12 | (선택) 설정 모달 링크 | 수정 | |

### Phase 14-2: 벡터스토어 CRUD (Step 13-24)

| # | 파일 | 유형 | 비고 |
|---|------|------|------|
| 13 | `lib/rag/indexeddb-storage.ts` | 수정 | DB_VERSION 4, StoredEmbedding.storeId |
| 14 | `lib/rag/providers/base-provider.ts` | 수정 | VectorStore.source |
| 15 | `lib/rag/services/vector-store-service.ts` | 신규 | ollamaEndpoint 파라미터, 배치 임베딩, 취소 |
| 16 | `lib/rag/providers/ollama-provider.ts` | 수정 | (1) 사용자 스토어 검색, (2) generateEmbedding → 유틸 교체 |
| 17 | `lib/rag/rag-service.ts` | 수정 | storeSource 전달 |
| 18 | `components/rag/vector-store-manager/VectorStoreCard.tsx` | 신규 | |
| 19 | `components/rag/vector-store-manager/CreateVectorStoreDialog.tsx` | 신규 | 취소 버튼 포함 |
| 20 | `components/rag/vector-store-manager/VectorStoreManager.tsx` | 신규 | |
| 21 | `app/(dashboard)/rag/vector-stores/page.tsx` | 신규 | |
| 22 | `components/rag/vector-store-selector.tsx` | 수정 | 사용자 스토어 + 소스 뱃지 |
| 23 | `components/rag/model-settings.tsx` | 수정 | "Vector Store 관리" 버튼 |
| 24 | (선택) 네비게이션 엔트리 | 수정 | 사이드바에 RAG 모델/벡터스토어 링크 |

---

## 5. 파일 요약

| 구분 | 개수 | 파일 |
|------|:---:|------|
| 신규 | 14 | 유틸 2 + 서비스 2 + 컴포넌트 8 + 페이지 2 |
| 수정 | 8 | model-recommender, indexeddb-storage, base-provider, ollama-provider, rag-service, model-settings, vector-store-selector, (settings-modal) |

---

## 6. Phase 14-3: 검색 품질 개선 (후속)

> Phase 14-1, 14-2 완료 후 진행

- Parent-Child 청킹: 작은 청크 정밀도 + 큰 청크 문맥
- Query Rewriting: LLM으로 검색 쿼리 개선
- RRF 가중치 최적화: FTS5 / Vector 비율 조정
- 대규모 사용자 스토어 인메모리 검색 최적화 (ANN 인덱스 등)

---

## 7. Phase 14-4: Server Mode + LightRAG (선택)

> Phase 14-3 완료 후 검색 품질 부족 시만 검토

**판단 기준**: Gold-Standard QA 100개 질문 대비 정확도 85% 미만이면 KG 도입 고려

- `output: 'export'` 제거 → Next.js API Routes 활용
- 또는 별도 FastAPI + LightRAG
- Feature flag로 클라이언트/서버 모드 분기

---

## 8. 주의사항

1. **static export 유지**: 모든 기능은 브라우저 + Ollama REST API로 구현
2. **CORS**: Ollama가 localhost에서 실행되므로 일반적으로 문제없음. 원격 Ollama 시 `OLLAMA_ORIGINS` 환경변수 설정 필요
3. **IndexedDB 용량**: 브라우저별 GB 단위 허용, 대량 문서 시 용량 경고 UI 필요
4. **임베딩 모델 일관성**: 하나의 벡터스토어 내 모든 문서는 동일 임베딩 모델 사용
5. **대용량 모델 다운로드**: 4-12GB 모델은 네트워크 상태에 따라 장시간 소요, 진행률 필수
6. **기존 코드 재사용**: `model-recommender.ts`의 타입/유틸, `error-handler.ts`의 에러 분류 활용
7. **IndexedDB 버전 업그레이드 비가역**: DB_VERSION 3→4 변경 후 되돌릴 수 없음. 스키마 마이그레이션 코드 신중히 테스트
8. **Ollama API 필드명 주의**: `/api/delete` body는 `{ model: name }` (not `{ name: name }`), `/api/embed` input 필드는 `input` (not `prompt`)
9. **임베딩 정규화 차이**: `/api/embed`는 L2 정규화, 기존 `/api/embeddings`는 미정규화. 마이그레이션 후 기존 사전빌드 DB와 사용자 스토어의 임베딩 정규화가 다를 수 있음. 코사인 유사도에는 큰 영향 없으나 인지 필요

---

## 9. 점검 이력

### v2 (2026-02-04) — Ollama API 검증 반영

| # | 항목 | 수정 내용 |
|---|------|----------|
| 1 | 임베딩 API 마이그레이션 | `/api/embeddings` → `/api/embed` 전환 명시 (Section 1.5 신설) |
| 2 | StoredEmbedding.storeId | 인터페이스에 `storeId?: string` 필드 명시 (Section 3.3) |
| 3 | OllamaProvider 리팩토링 | Step 16에 generateEmbedding → 유틸 교체 명시 |
| 4 | model-recommender.ts export | 타입/함수 export 추가 단계 명시 (Step 3) |
| 5 | createStore 파라미터 | `ollamaEndpoint` 추가, AbortController 추가 |
| 6 | /api/delete body 필드 | `model` (not `name`) 명시 |
| 7 | capabilities 기반 카테고리 | `/api/show` 응답의 `capabilities` 배열로 분류 |
| 8 | 배치 임베딩 | `generateBatchEmbeddingsViaOllama` 함수 추가 |
| 9 | 벡터스토어 생성 취소 | `cancelCreate()` 메서드 + CreateVectorStoreDialog 취소 버튼 |
| 10 | 인메모리 검색 성능 | 대규모 스토어 성능 경고 추가 (Section 3.6) |
| 11 | IndexedDB 비가역성 | 주의사항에 명시 (Section 8.7) |
| 12 | 네비게이션 | Step 24 선택 항목으로 추가 |
| 13 | Ollama 최신 기능 | v0.12~v0.15 참고 정보 추가 (Section 1.6) |

---

*작성: 2026-02-04 | Phase 14 구현 문서 v2*
