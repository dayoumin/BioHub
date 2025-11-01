# Vector Store UI 구현 계획 (다음 세션)

**생성일**: 2025-11-01
**상태**: 계획 단계
**우선순위**: High

---

## 📋 개요

현재 RAG 테스트 페이지에서 임베딩 모델을 수동으로 선택하는 UI를 **Vector Store 선택 방식**으로 변경합니다.

**목표**:
- 사용자는 Vector Store만 선택
- 임베딩 모델은 DB 메타데이터에서 자동 설정
- Vector Space 불일치 방지 (Critical!)

---

## 🚨 현재 문제점

### Before (현재 - 잘못된 방식):
```
사용자가 임베딩 모델 선택: qwen3-embedding:0.6b
      ↓
사용자가 DB 파일 선택: /rag-data/rag-mxbai-embed-large.db
      ↓
❌ Vector Space 불일치! (qwen3 쿼리 ≠ mxbai 문서)
```

### After (다음 세션 - 올바른 방식):
```
사용자가 Vector Store 선택: "Qwen3 Embedding (0.6B)"
      ↓
자동으로 설정됨:
  - DB Path: /rag-data/rag-qwen3-embedding-0.6b.db
  - 임베딩 모델: qwen3-embedding:0.6b (DB에서 읽음)
      ↓
✅ Vector Space 일치 보장!
```

---

## 📝 구현 작업 (Step-by-Step)

### Phase 1: UI 컴포넌트 분리 (필수)

**현재 상태**: `app/rag-test/page.tsx` = **1,508 lines** (너무 큼!)

**컴포넌트 분리 계획**:
```
app/rag-test/
├── page.tsx (200 lines) - 메인 컨테이너
└── components/
    ├── VectorStoreSelector.tsx (80 lines)
    │   - Vector Store 드롭다운
    │   - 자동 설정된 임베딩 모델 표시 (읽기 전용 + 툴팁)
    │
    ├── ModelSettings.tsx (100 lines)
    │   - 추론 모델 선택
    │   - Ollama 엔드포인트 설정
    │
    ├── QueryForm.tsx (150 lines)
    │   - 쿼리 입력
    │   - 검색 모드 선택 (FTS5/Vector/Hybrid)
    │   - 실행 버튼
    │
    ├── DatabaseManager.tsx (400 lines)
    │   - DB CRUD 작업
    │   - Vector Store 빌드
    │
    └── ResultsList.tsx (300 lines)
        - 쿼리 결과 표시
        - Sources 표시
```

---

### Phase 2: Vector Store 선택 UI 구현

#### 2-1. `VectorStoreSelector.tsx` 생성

```tsx
import { getAvailableVectorStores } from '@/lib/rag/rag-service'
import type { VectorStore } from '@/lib/rag/providers/base-provider'

interface Props {
  value: string | null  // Vector Store ID
  onChange: (storeId: string) => void
  disabled?: boolean
}

export function VectorStoreSelector({ value, onChange, disabled }: Props) {
  const [stores, setStores] = useState<VectorStore[]>([])
  const [autoModel, setAutoModel] = useState<string>('')

  // Vector Store 목록 로드
  useEffect(() => {
    getAvailableVectorStores().then(setStores)
  }, [])

  // 선택된 Vector Store의 임베딩 모델 표시
  useEffect(() => {
    const selectedStore = stores.find(s => s.id === value)
    if (selectedStore) {
      setAutoModel(selectedStore.embeddingModel)
    }
  }, [value, stores])

  return (
    <div className="space-y-2">
      {/* Vector Store 드롭다운 */}
      <Label>Vector Store</Label>
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Vector Store 선택" />
        </SelectTrigger>
        <SelectContent>
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              {store.name} ({store.docCount}개 문서, {store.fileSize})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 자동 설정된 임베딩 모델 표시 (읽기 전용) */}
      {autoModel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <InfoIcon className="h-4 w-4" />
          <span>임베딩 모델: <code>{autoModel}</code></span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>임베딩 모델은 Vector Store에서 자동으로 설정됩니다.</p>
                <p>Vector Space 일치성을 보장하기 위해 변경할 수 없습니다.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
```

#### 2-2. `page.tsx` 수정

```tsx
// Before (제거)
const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<string>('')

// After (추가)
const [selectedVectorStoreId, setSelectedVectorStoreId] = useState<string | null>(null)

// handleQuery() 수정
const handleQuery = async () => {
  if (!selectedVectorStoreId) {
    toast.error('Vector Store를 선택하세요')
    return
  }

  // RAG Service 초기화 (vectorStoreId 전달)
  await ragService.initialize({
    vectorStoreId: selectedVectorStoreId,  // ✅ 자동으로 임베딩 모델 설정됨
    inferenceModel: selectedInferenceModel,
    ollamaEndpoint,
    topK: 5
  })

  // 쿼리 실행
  const response = await ragService.query({ query, searchMode })
  // ...
}
```

---

### Phase 3: Vector Store 빌드 UI (선택 사항)

**Database Management 탭에 추가**:

```tsx
<Tabs value="vector-store-build">
  <TabsContent>
    <Card>
      <CardHeader>
        <CardTitle>Vector Store 생성</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 임베딩 모델 선택 */}
        <Select value={buildEmbeddingModel} onValueChange={setBuildEmbeddingModel}>
          <SelectTrigger>
            <SelectValue placeholder="임베딩 모델 선택" />
          </SelectTrigger>
          <SelectContent>
            {availableModels
              .filter(m => m.name.includes('embed'))
              .map(m => (
                <SelectItem key={m.name} value={m.name}>
                  {m.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* 빌드 버튼 */}
        <Button onClick={handleBuildVectorStore} disabled={isBuilding}>
          {isBuilding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              빌드 중... ({buildProgress}%)
            </>
          ) : (
            'Vector Store 빌드'
          )}
        </Button>

        {/* 진행 상황 */}
        {isBuilding && <Progress value={buildProgress} />}
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

**빌드 로직** (Python 스크립트 호출):
```tsx
const handleBuildVectorStore = async () => {
  setIsBuilding(true)
  try {
    // Python 스크립트 실행 (API 엔드포인트 또는 직접 호출)
    const response = await fetch('/api/build-vector-store', {
      method: 'POST',
      body: JSON.stringify({ embeddingModel: buildEmbeddingModel })
    })

    // 또는 사용자에게 명령어 안내
    toast.success(
      `다음 명령어를 터미널에서 실행하세요:\n` +
      `cd statistical-platform/rag-system\n` +
      `python scripts/build_sqlite_db.py --model ${buildEmbeddingModel}`
    )
  } finally {
    setIsBuilding(false)
  }
}
```

---

## 🧪 테스트 계획

### 1. Unit Tests
```typescript
// __tests__/components/VectorStoreSelector.test.tsx
describe('VectorStoreSelector', () => {
  it('Vector Store 목록을 로드해야 함', async () => {
    const stores = await getAvailableVectorStores()
    expect(stores.length).toBeGreaterThan(0)
  })

  it('선택된 Vector Store의 임베딩 모델을 자동 표시해야 함', () => {
    // ...
  })
})
```

### 2. Integration Tests
```typescript
// __tests__/rag/vector-store-integration.test.ts
describe('Vector Store Integration', () => {
  it('Vector Store 선택 시 올바른 임베딩 모델이 설정되어야 함', async () => {
    const ragService = RAGService.getInstance()
    await ragService.initialize({
      vectorStoreId: 'qwen3-embedding-0.6b'
    })

    // Provider의 임베딩 모델 확인
    // expect(provider.embeddingModel).toBe('qwen3-embedding:0.6b')
  })
})
```

### 3. Manual Tests
- [ ] Vector Store 드롭다운에서 선택 시 임베딩 모델 자동 표시
- [ ] 툴팁 표시 정상 작동
- [ ] 쿼리 실행 시 올바른 Vector Store 사용
- [ ] 콘솔 로그에서 임베딩 모델 자동 변경 메시지 확인
- [ ] 두 개의 Vector Store 간 전환 시 정상 작동

---

## 📊 파일 변경 예상

| 파일 | 현재 | 변경 후 | 작업 |
|------|------|---------|------|
| `page.tsx` | 1,508 lines | ~200 lines | 컴포넌트 분리 |
| `VectorStoreSelector.tsx` | 없음 | ~80 lines | 신규 생성 |
| `ModelSettings.tsx` | 없음 | ~100 lines | 신규 생성 |
| `QueryForm.tsx` | 없음 | ~150 lines | 신규 생성 |
| `DatabaseManager.tsx` | 없음 | ~400 lines | 신규 생성 |
| `ResultsList.tsx` | 없음 | ~300 lines | 신규 생성 |

**총 작업량**: ~6시간 (숙련자 기준)

---

## ✅ 완료 조건

- [ ] `page.tsx`가 200 lines 이하로 줄어듦
- [ ] Vector Store 선택 UI 구현 완료
- [ ] 임베딩 모델 자동 설정 동작 확인
- [ ] 툴팁으로 사용자 안내 제공
- [ ] 수동 테스트 체크리스트 100% 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] 기존 기능 정상 작동 (회귀 테스트)

---

## 🔗 관련 파일

**백엔드 (완료)**:
- [base-provider.ts](../../statistical-platform/lib/rag/providers/base-provider.ts) - `VectorStore` 인터페이스 정의
- [rag-service.ts](../../statistical-platform/lib/rag/rag-service.ts) - Vector Store 관리 함수
- [ollama-provider.ts](../../statistical-platform/lib/rag/providers/ollama-provider.ts) - DB 임베딩 모델 자동 감지

**프론트엔드 (다음 세션)**:
- [page.tsx](../../statistical-platform/app/rag-test/page.tsx) - 메인 페이지 (분리 필요)
- `components/VectorStoreSelector.tsx` (신규 생성)

**검증 스크립트**:
- [verify-vector-stores.js](../../statistical-platform/scripts/verify-vector-stores.js) - Vector Store 검증

---

## 📌 주의사항

1. **컴포넌트 분리 우선**: UI 작업 전에 반드시 컴포넌트 분리 완료
2. **하위 호환성**: 기존 `vectorDbPath` 방식도 계속 지원 (deprecation 경고만)
3. **에러 처리**: Vector Store 목록 로드 실패 시 fallback 처리
4. **타입 안전성**: `any` 타입 절대 금지, `unknown` + 타입 가드 사용
5. **사용자 경험**: 로딩 상태, 에러 메시지, 툴팁 명확하게 제공

---

**Next Session Actions**:
1. `page.tsx` 컴포넌트 분리 (1시간)
2. `VectorStoreSelector.tsx` 구현 (30분)
3. `page.tsx` 통합 및 테스트 (30분)
4. 수동 테스트 (30분)
5. 문서 업데이트 (15분)

**Total**: ~2.5시간
