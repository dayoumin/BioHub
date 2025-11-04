# 벡터스토어 계획 vs 기존 코드 통합 분석

## 📌 개요

현재 프로젝트의 기존 모델 관리 구조와 신규 벡터스토어 관리 계획 간의 **연계점, 개선점, 통합 전략**을 분석합니다.

---

## 🔍 기존 코드 분석

### 1. 현재 모델 선택 구조

#### ModelSettings 컴포넌트 (model-settings.tsx)
```
┌─────────────────────────────────────────────┐
│ 모델 설정                                    │
├─────────────────────────────────────────────┤
│ [Vector Store 선택] | [추론 모델] | [검색모드] │ (grid cols-3)
├─────────────────────────────────────────────┤
│ 구조:                                        │
│ - VectorStoreSelector (col 1)               │
│ - 추론 모델 드롭다운 (col 2)                │
│ - 검색 모드 라디오 (col 3)                  │
└─────────────────────────────────────────────┘

Props:
✅ availableVectorStores: VectorStore[]
✅ selectedVectorStoreId: string | null
✅ availableModels: OllamaModel[]
❌ 임베딩 모델 선택: VectorStore의 embeddingModel에서 자동 설정
```

#### VectorStoreSelector 컴포넌트 (vector-store-selector.tsx)
```
역할: Vector Store 선택 → 임베딩 모델 자동 결정

구조:
- vectorStores.embeddingModel (읽기 전용)
- 선택 시 해당 벡터스토어의 embeddingModel 자동 적용
- 임베딩 모델을 사용자가 직접 선택 불가

Props:
✅ vectorStores: VectorStore[] (벡터스토어 목록)
✅ selectedStoreId: string | null
✅ onSelectStore: (storeId: string) => void
```

#### 현재 흐름
```
사용자가 Vector Store 선택
  ↓
VectorStoreSelector가 해당 벡터스토어의 embeddingModel 추출
  ↓
selectedEmbeddingModel 자동 업데이트 (부모 컴포넌트)
  ↓
RAG 쿼리 시 두 모델 사용:
  - embeddingModel: 벡터스토어의 모델 (자동)
  - inferenceModel: 사용자 선택 모델
```

---

## 🎯 신규 계획 분석

### 계획의 핵심: 다중 벡터스토어 + 동적 임베딩 모델 선택

```
목표:
✅ 여러 벡터스토어 생성 (다양한 임베딩 모델로)
✅ 각 벡터스토어가 고유한 임베딩 모델 사용
✅ 사용자가 벡터스토어 선택 시 임베딩 모델 자동 결정
✅ 필요시 다른 임베딩 모델로 새 벡터스토어 생성

구조 (Phase 2):
/chatbot/vector-stores (관리 페이지)
  └─ 벡터스토어 CRUD (생성/수정/삭제)
     └─ 각 벡터스토어마다 embeddingModel 명시
     └─ 사용 중인 문서 목록

/chatbot/vector-stores/:id (상세 페이지)
  └─ 문서 추가/삭제
  └─ 인덱싱 진행률
  └─ 벡터스토어 설정 수정

ModelSettings (기존 그대로)
  └─ VectorStore 선택
  └─ 추론 모델 선택
  └─ (임베딩 모델은 자동 설정)
```

---

## ⚙️ 통합 분석: 기존 코드 + 신규 계획

### 1. VectorStore 데이터 구조

#### 기존 (base-provider.ts)
```typescript
interface VectorStore {
  id: string
  name: string
  dbPath: string
  embeddingModel: string  // 고정됨 (예: 'qwen3-embedding:0.6b')
  dimensions: number
  docCount: number
  fileSize: string
  createdAt?: number
}
```

#### 신규 계획 (VECTOR_STORE_MANAGEMENT_PLAN.md)
```typescript
interface VectorStoreMetadata {
  id: string
  name: string
  description?: string
  embeddingModel: string  // ← 동일!
  embeddingDimensions: number
  documentCount: number
  totalTokens: number
  dbSize: number
  status: 'ready' | 'indexing' | 'failed'
  indexingProgress: number
  lastIndexedAt: number
  createdAt: number
  updatedAt: number
  isDefault: boolean
  tags?: string[]
}
```

**관찰**: 신규 구조가 기존 VectorStore를 포함하고 확장함
- ✅ embeddingModel: 동일 (벡터스토어 생성 시 결정)
- ✅ 추가 필드: status, indexingProgress, isDefault, tags 등
- ✅ 호환성: 기존 코드와 통합 가능

---

### 2. 모델 관리 흐름 비교

#### 기존 흐름
```
┌─────────────────────────────────────┐
│ Ollama /api/tags                    │
│ (전체 모델 목록)                    │
└──────────────┬──────────────────────┘
               ↓
    ┌──────────────────────────┐
    │ availableModels 로드      │
    │ (필터링 없음, 전체)       │
    └──────────────┬───────────┘
               ↓
    ┌─────────────────────────────────────┐
    │ ModelSettings 컴포넌트              │
    ├─────────────────────────────────────┤
    │ - VectorStore 선택                  │
    │   └─ embeddingModel 자동 결정      │
    │ - 추론 모델 선택                    │
    │   (filter: !includes('embed'))     │
    │ - 검색 모드 선택                    │
    └─────────────────────────────────────┘
```

#### 신규 흐름 (계획)
```
┌─────────────────────────────────────┐
│ Ollama /api/tags                    │
│ (전체 모델 목록)                    │
└──────────────┬──────────────────────┘
               ↓
    ┌───────────────────────────────────────┐
    │ OllamaModelManager (신규)             │
    │ 1. 모든 모델 조회                      │
    │ 2. 자동 분류:                         │
    │    - embeddingModels: includes embed │
    │    - inferenceModels: 나머지         │
    │ 3. useEmbeddingModels (Hook)로 제공 │
    └───────────────┬──────────────────────┘
                   ↓
    ┌────────────────────────────────────────┐
    │ ModelSettings 컴포넌트 (개선)         │
    ├────────────────────────────────────────┤
    │ - VectorStore 선택 (기존)             │
    │   └─ embeddingModel 자동 결정        │
    │ - 임베딩 모델 선택 (신규, 선택사항) │
    │   (수동으로 다른 벡터스토어 생성)   │
    │ - 추론 모델 선택 (기존)               │
    │   (filter: !includes('embed'))      │
    │ - 검색 모드 선택 (기존)               │
    └────────────────────────────────────────┘
```

---

## 🔧 구체적 통합 계획

### Phase 1: 백엔드 API (신규 + 기존 활용)

#### 1.1 OllamaModelManager (신규)
```typescript
// lib/rag/services/ollama-model-manager.ts

export class OllamaModelManager {
  // 기존 Ollama /api/tags 호출 로직 재사용
  async getAllModels(): Promise<{
    embeddings: OllamaModel[]
    inferences: OllamaModel[]
  }> {
    // 기존 fetchAvailableModels() 활용
    const allModels = await fetchAvailableModels()

    // 자동 분류
    return {
      embeddings: allModels.filter(m => m.name.includes('embed')),
      inferences: allModels.filter(m => !m.name.includes('embed'))
    }
  }
}
```

#### 1.2 VectorStoreManager (신규)
```typescript
// lib/rag/services/vector-store-manager.ts

export class VectorStoreManager {
  // 기존 VectorStore 타입 확장
  async createVectorStore(
    name: string,
    embeddingModel: string,
    documents?: UserDocument[]
  ): Promise<VectorStoreMetadata> {
    // 유효성 검사
    const models = await ollamaModelManager.getAllModels()
    const isValidEmbedding = models.embeddings.some(m => m.name === embeddingModel)

    if (!isValidEmbedding) {
      throw new Error(`Invalid embedding model: ${embeddingModel}`)
    }

    // 벡터스토어 생성 (기존 logic + 새로운 메타데이터)
    return {
      id: generateId(),
      name,
      embeddingModel,
      status: 'ready',
      // ... 기존 필드들
    }
  }
}
```

---

### Phase 2: 프론트엔드 UI (기존 개선)

#### 2.1 ModelSettings 컴포넌트 개선

**현재 구조**:
```
[Vector Store] [추론 모델] [검색모드]  (cols-3)
```

**개선안 1: 임베딩 모델 선택 추가 (선택사항)**
```
┌─────────────────────────────────────┐
│ 모델 설정                           │
├─────────────────────────────────────┤
│ Vector Store                        │
│ [현재 VS 선택] → 자동 임베딩 모델  │
├─────────────────────────────────────┤
│ 또는 수동 선택:                     │
│ ┌──────────────┬──────────────────┐│
│ │ 임베딩 모델   │ 추론 모델 (LLM) ││
│ │ [선택]       │ [선택]           ││
│ └──────────────┴──────────────────┘│
├─────────────────────────────────────┤
│ 검색 모드: [FTS5] [Vector] [Hybrid] │
└─────────────────────────────────────┘

Props 추가:
+ embeddingModels: OllamaModel[]  (useEmbeddingModels에서)
+ allowManualEmbeddingSelection?: boolean (선택사항)
```

**개선안 2: 코드 예시**
```typescript
export interface ModelSettingsProps {
  // 기존 Props들...

  // NEW: 임베딩 모델 관리 (선택사항)
  embeddingModels?: OllamaModel[]
  selectedEmbeddingModel?: string  // VectorStore 선택 시 자동
  onEmbeddingModelChange?: (model: string) => void
}

export function ModelSettings({
  // ...
  embeddingModels,
  selectedEmbeddingModel,
  onEmbeddingModelChange,
  // ...
}: ModelSettingsProps) {
  return (
    <Card>
      {/* Vector Store 선택 (기존) */}
      <VectorStoreSelector {...props} />

      {/* NEW: 현재 선택된 임베딩 모델 표시 */}
      {selectedEmbeddingModel && (
        <div className="text-sm text-muted-foreground">
          임베딩: {selectedEmbeddingModel}
        </div>
      )}

      {/* NEW: 수동 임베딩 모델 선택 (선택사항) */}
      {embeddingModels && (
        <Select
          value={selectedEmbeddingModel || ''}
          onValueChange={onEmbeddingModelChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="다른 임베딩 모델 선택" />
          </SelectTrigger>
          <SelectContent>
            {embeddingModels.map(model => (
              <SelectItem key={model.name} value={model.name}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 추론 모델 선택 (기존) */}
      {/* ... */}
    </Card>
  )
}
```

---

#### 2.2 VectorStoreSelector 변경 없음

✅ 기존 로직 유지:
```typescript
// VectorStoreSelector
// Vector Store 선택 → embeddingModel 자동 설정
// (변경 없음, 후방 호환성 유지)
```

---

### Phase 3: 신규 페이지 (벡터스토어 관리)

#### 3.1 /chatbot/vector-stores (목록)

```typescript
// app/chatbot/vector-stores/page.tsx

import { useVectorStores } from '@/lib/hooks/use-vector-stores'
import { useEmbeddingModels } from '@/lib/hooks/use-embedding-models'

export default function VectorStoresPage() {
  const { stores, createStore } = useVectorStores()
  const { models: embeddingModels } = useEmbeddingModels()

  const handleCreateVectorStore = async (
    name: string,
    embeddingModel: string
  ) => {
    // 유효성 검사
    const isValid = embeddingModels.some(m => m.name === embeddingModel)
    if (!isValid) throw new Error('Invalid model')

    // 벡터스토어 생성
    await createStore({
      name,
      embeddingModel,  // ← ModelSettings에서 선택
    })
  }

  return (
    <div>
      {/* 벡터스토어 목록 */}
      {stores.map(store => (
        <VectorStoreCard
          key={store.id}
          store={store}
          embeddingModel={store.embeddingModel}  // 표시만
        />
      ))}

      {/* 새 벡터스토어 생성 버튼 */}
      <CreateVectorStoreDialog
        availableModels={embeddingModels}
        onCreate={handleCreateVectorStore}
      />
    </div>
  )
}
```

---

## 📊 통합 요약

### 기존 코드의 사용처

| 기존 컴포넌트/함수 | 신규 계획에서 사용 | 방식 |
|------------------|-----------------|------|
| VectorStoreSelector | ModelSettings (기존) | 변경 없음 |
| ModelSettings | 기존대로 + 임베딩 모델 표시 | 일부 개선 |
| fetchAvailableModels() | OllamaModelManager | 래핑 + 분류 |
| VectorStore 타입 | VectorStoreMetadata | 확장 |
| rag-assistant 통합 | 기존대로 유지 | 변경 없음 |

---

### 신규 코드 추가

| 신규 항목 | 역할 | 의존성 |
|---------|------|--------|
| VectorStoreManager | 벡터스토어 CRUD | OllamaModelManager |
| DocumentManager | 문서 관리 | VectorStoreManager |
| OllamaModelManager | 모델 분류 | fetchAvailableModels |
| useVectorStores | Hook | VectorStoreManager |
| useDocuments | Hook | DocumentManager |
| useEmbeddingModels | Hook | OllamaModelManager |
| /chatbot/vector-stores | 페이지 | useVectorStores, useEmbeddingModels |
| /chatbot/vector-stores/:id | 페이지 | useDocuments |

---

## ✅ 호환성 확인

### 기존 RAG 기능에 미치는 영향

```
❌ 영향 없음 (변경 없음):
- rag-assistant.tsx (플로팅 챗봇)
- RAG 쿼리 로직
- VectorStore 선택 기능
- 추론 모델 선택 기능

✅ 선택적 개선:
+ ModelSettings에 임베딩 모델 표시 추가 (정보성)
+ 모델 분류 (임베딩 vs 추론) 개선
+ 부터 모델 감지 강화

🎯 새로운 기능:
+ 벡터스토어 생성/관리
+ 여러 임베딩 모델 지원
+ 문서 추가/삭제 UI
```

---

## 🚀 구현 우선순위 (수정안)

### Critical (필수, 기존 호환성 유지)
1. OllamaModelManager (모델 분류)
2. VectorStoreManager API
3. useVectorStores Hook
4. /chatbot/vector-stores 페이지

### High (권장, 기존 개선)
5. ModelSettings 개선 (임베딩 모델 표시)
6. useEmbeddingModels Hook
7. /chatbot/vector-stores/:id 상세 페이지
8. FloatingChatbot 벡터스토어 버튼

### Medium (선택, 향후)
9. 마이그레이션 전략
10. 성능 최적화

---

## 💡 주의사항

### 기존 코드 수정 최소화
```typescript
// ❌ 기존 코드 변경 금지:
interface VectorStore {
  // 필드 추가/삭제 금지
}

// ✅ 새로운 타입으로 확장:
interface VectorStoreMetadata extends VectorStore {
  // 새로운 필드만 추가
}
```

### 후방 호환성 유지
```typescript
// ❌ fetchAvailableModels() 시그니처 변경 금지
// ✅ OllamaModelManager로 래핑하여 개선

// 기존 코드:
const models = await fetchAvailableModels()

// 신규 코드:
const { embeddings, inferences } = await ollamaModelManager.getAllModels()
```

---

## 📝 요약

### 핵심 포인트
1. **기존 VectorStore 활용**: embeddingModel 필드가 이미 존재
2. **ModelSettings 확장**: 새로운 필드 추가로 기존 기능 유지
3. **OllamaModelManager 신규**: 모델 분류 로직 추가
4. **새로운 페이지**: 벡터스토어 관리 기능 분리
5. **후방 호환성**: 기존 RAG 기능에 영향 없음

### 최종 구조
```
기존 (Read-only Vector Store)
└─ VectorStore 선택 → embeddingModel 자동 설정
   (ModelSettings에서 표시만)

신규 (Vector Store 관리)
└─ 여러 벡터스토어 생성
   ├─ 각각 고유 embeddingModel 지정
   ├─ 문서 추가/삭제
   └─ 상태 모니터링

통합
└─ ModelSettings에서 VectorStore 선택 (기존)
   + 현재 사용 중인 embeddingModel 표시 (신규)
   + (선택사항) 수동 임베딩 모델 선택
```

---

**분석 완료일**: 2025-11-03
**상태**: ✅ 기존 코드와 신규 계획 완전 호환성 확인
**결론**: 기존 코드 수정 최소화하며 신규 기능 추가 가능
