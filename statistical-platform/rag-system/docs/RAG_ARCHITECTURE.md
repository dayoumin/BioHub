# RAG System 아키텍처 설계

**작성일**: 2025-10-31
**목적**: 모델 교체 가능한 RAG 시스템 설계
**설계 원칙**: Provider Pattern + 테스트 페이지 분리

---

## 🎯 설계 목표

1. **모델 교체 용이성**: Claude ↔ 로컬 RAG 간 전환 시 기존 코드 변경 최소화
2. **A/B 테스트 지원**: 두 모델을 동시에 테스트하고 성능 비교
3. **단계별 구현**: Week 1 (현재) → Week 2-4 (로컬 RAG 구현)
4. **테스트 페이지 분리**: 개발/테스트 전용 페이지로 실험

---

## 📐 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    통계 페이지 (45개)                        │
│  (t-test, ANOVA, regression, PCA 등)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │  useRAGAssistant Hook  │  ← 기존 페이지 통합용
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │     RAG Service        │  ← Singleton, Provider 관리
         │  (rag-service.ts)      │
         └───────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│  Claude Provider  │  │ Local RAG Provider│
│ (claude-provider) │  │(local-rag-provider)│
└──────────────────┘  └──────────────────┘
         │                     │
         ↓                     ↓
  Claude API 3.5         ┌─────────────┐
  Sonnet (현재)          │  Embedding   │
                         │  (MiniLM)    │
                         ├─────────────┤
                         │  Vector DB   │
                         │  (ChromaDB)  │
                         ├─────────────┤
                         │  Inference   │
                         │  (Llama 3.2) │
                         └─────────────┘
                         (Week 2-4 구현)
```

---

## 📁 파일 구조

```
statistical-platform/
├── lib/rag/
│   ├── providers/
│   │   ├── base-provider.ts          ← 인터페이스 (BaseRAGProvider)
│   │   ├── claude-provider.ts        ← Claude API 구현 (현재 ✅)
│   │   └── local-rag-provider.ts     ← 로컬 RAG 스켈레톤 (Week 2-4 🔜)
│   ├── hooks/
│   │   └── use-rag-assistant.ts      ← 통계 페이지 통합 Hook
│   └── rag-service.ts                ← 통합 서비스 (Singleton)
├── app/
│   ├── (dashboard)/statistics/
│   │   └── [method]/page.tsx         ← 기존 통계 페이지 (변경 최소)
│   └── rag-test/
│       └── page.tsx                  ← 🆕 RAG 테스트 페이지 (핵심!)
└── .env.local.example                ← 환경 변수 예시
```

---

## 🔑 핵심 컴포넌트 설명

### 1. BaseRAGProvider (추상 클래스)

**목적**: 모든 RAG Provider가 구현해야 하는 인터페이스

**파일**: `lib/rag/providers/base-provider.ts`

**핵심 메서드**:
```typescript
abstract class BaseRAGProvider {
  // 쿼리 실행 (필수)
  abstract query(context: RAGContext): Promise<RAGResponse>

  // Provider 초기화 (선택, 로컬 RAG에서 중요)
  async initialize(): Promise<void>

  // 준비 상태 확인 (필수)
  abstract isReady(): Promise<boolean>

  // 정리 (선택)
  async cleanup(): Promise<void>
}
```

**타입 정의**:
```typescript
interface RAGContext {
  query: string                // 사용자 질문
  method?: string              // 통계 메서드 (예: 'tTest')
  analysisData?: unknown       // 분석 데이터 (선택)
  conversationHistory?: Array  // 대화 히스토리 (선택)
}

interface RAGResponse {
  answer: string               // 생성된 응답
  sources?: Array<{            // 참조 문서 (로컬 RAG만)
    title: string
    content: string
    score: number
  }>
  model: {                     // 모델 정보
    provider: string
    embedding?: string
    inference?: string
  }
  metadata?: {                 // 메타데이터
    tokensUsed?: number
    responseTime?: number
  }
}
```

---

### 2. ClaudeRAGProvider (현재 구현 ✅)

**목적**: Anthropic Claude API 사용

**파일**: `lib/rag/providers/claude-provider.ts`

**특징**:
- 임베딩 불필요 (Claude가 직접 문서 이해)
- API 호출만으로 작동
- 초기화 시간 0초

**구성**:
```typescript
class ClaudeRAGProvider extends BaseRAGProvider {
  constructor(config: ClaudeProviderConfig) {
    // API 키, 모델 설정
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    // 1. 시스템 프롬프트 생성
    // 2. Claude API 호출 (https://api.anthropic.com/v1/messages)
    // 3. 응답 파싱
  }
}
```

**환경 변수**:
```env
NEXT_PUBLIC_RAG_PROVIDER=claude
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_api_key
```

---

### 3. LocalRAGProvider (Week 2-4 구현 예정 🔜)

**목적**: 로컬 임베딩 + 벡터 DB + 추론 모델 사용

**파일**: `lib/rag/providers/local-rag-provider.ts`

**특징**:
- 데이터 외부 유출 없음 (100% 로컬)
- 초기화 시간 ~10-30초 (모델 로딩)
- 검색 결과 (sources) 제공

**구성 (예정)**:
```typescript
class LocalRAGProvider extends BaseRAGProvider {
  private embeddingModel: SentenceTransformer  // Week 2
  private vectorDb: ChromaDB                   // Week 2
  private inferenceModel: LlamaModel           // Week 3-4

  async initialize() {
    // 1. 임베딩 모델 로드 (all-MiniLM-L6-v2)
    // 2. 벡터 DB 연결 (ChromaDB)
    // 3. 추론 모델 로드 (Llama 3.2 or Claude API)
  }

  async query(context: RAGContext) {
    // 1. 쿼리 임베딩 생성
    // 2. 벡터 DB 검색 (Top-5)
    // 3. 관련 문서 + 쿼리 → 추론 모델
    // 4. 응답 생성 (sources 포함)
  }
}
```

**환경 변수 (Week 2-4)**:
```env
NEXT_PUBLIC_RAG_PROVIDER=local
NEXT_PUBLIC_EMBEDDING_MODEL_PATH=./rag-system/models/all-MiniLM-L6-v2
NEXT_PUBLIC_VECTOR_DB_PATH=./rag-system/data/vector_db
```

---

### 4. RAGService (통합 레이어)

**목적**: 전체 앱에서 사용하는 단일 인터페이스

**파일**: `lib/rag/rag-service.ts`

**설계 패턴**: Singleton

**핵심 기능**:
```typescript
class RAGService {
  // Singleton 인스턴스
  static getInstance(): RAGService

  // Provider 초기화 (환경 변수 기반)
  async initialize(): Promise<void>

  // 쿼리 실행
  async query(context: RAGContext): Promise<RAGResponse>

  // Provider 전환 (런타임)
  async switchProvider(newProvider: 'claude' | 'local'): Promise<void>

  // 현재 Provider 확인
  getProviderType(): 'claude' | 'local'
}
```

**사용 예시**:
```typescript
// 간단한 사용
import { queryRAG } from '@/lib/rag/rag-service'

const response = await queryRAG({
  query: 't-test와 ANOVA의 차이는?',
  method: 'tTest'
})
console.log(response.answer)

// 고급 사용 (Provider 전환)
const ragService = RAGService.getInstance()
await ragService.switchProvider('local')  // Claude → 로컬 RAG
```

---

### 5. useRAGAssistant Hook (통계 페이지 통합)

**목적**: 기존 통계 페이지에서 RAG 도우미 사용

**파일**: `lib/rag/hooks/use-rag-assistant.ts`

**사용 예시**:
```typescript
function TTestPage() {
  const { ask, answer, isLoading, error } = useRAGAssistant({
    method: 'tTest'
  })

  return (
    <div>
      {/* 기존 통계 분석 UI */}
      ...

      {/* RAG 도우미 추가 (최소 변경) */}
      <Button onClick={() => ask('대립가설과 귀무가설의 차이는?')}>
        질문하기
      </Button>

      {isLoading && <Loader />}
      {answer && <div>{answer}</div>}
    </div>
  )
}
```

**특징**:
- 기존 페이지 코드 변경 최소화 (3-5줄 추가)
- Provider 전환 자동 처리
- 에러 처리 내장

---

### 6. RAG 테스트 페이지 (핵심!)

**목적**: Claude vs 로컬 RAG 성능 비교 및 디버깅

**파일**: `app/rag-test/page.tsx`

**주요 기능**:

#### 6-1. 단일 쿼리 테스트
```
┌────────────────────────────────┐
│  질문: t-test와 ANOVA의 차이는?  │
│  메서드: tTest (선택)            │
│  Provider: ● Claude  ○ Local    │
│  [쿼리 실행]                     │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  응답 (Claude)                  │
│  ────────────────────────────  │
│  t-test는 두 집단 비교...        │
│                                │
│  메타데이터:                    │
│  - Tokens: 450                 │
│  - 응답 시간: 1,240ms           │
└────────────────────────────────┘
```

#### 6-2. A/B 테스트 (핵심 기능!)
```
┌────────────────────────────────┐
│  질문: 정규성 검정이 왜 필요한가?│
│  [A/B 테스트 (두 Provider 동시)]│
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  응답 (Claude)                  │
│  정규성 검정은 모수 통계...       │
│  Tokens: 520  |  Time: 1,100ms │
└────────────────────────────────┘
         +
┌────────────────────────────────┐
│  응답 (Local RAG)               │
│  정규성 검정(Normality Test)은...│
│  Tokens: 480  |  Time: 850ms   │
│  참조 문서:                     │
│  - scipy.stats.shapiro (0.92)  │
│  - normality_test (0.87)       │
└────────────────────────────────┘
```

**비교 항목**:
1. **응답 품질**: 정확성, 상세도, 이해도
2. **응답 시간**: Claude vs 로컬 RAG 속도
3. **비용**: API 비용 vs 로컬 하드웨어
4. **참조 문서**: 로컬 RAG만 제공 (검색 결과)

---

## 🚀 단계별 구현 로드맵

### ✅ Week 1 (현재 완료)
- [x] Provider 추상화 레이어 설계
- [x] Claude Provider 구현 (현재 시스템)
- [x] 로컬 RAG Provider 스켈레톤
- [x] RAG Service 통합 레이어
- [x] RAG 테스트 페이지 (UI 완성)
- [x] useRAGAssistant Hook
- [x] 환경 변수 설정

**현재 상태**: Claude API만 작동, 로컬 RAG는 더미 응답

---

### 🔜 Week 2: Embedding & Vector DB
- [ ] 임베딩 모델 선정 및 다운로드
  - all-MiniLM-L6-v2 (Sentence Transformers)
  - 통계 용어 특화 모델 조사
- [ ] 101개 문서 임베딩 생성
  - 문서 청킹 (512 tokens)
  - 벡터 생성 및 저장
- [ ] Vector DB 구축
  - ChromaDB or FAISS 선택
  - 인덱싱 및 검색 테스트
- [ ] LocalRAGProvider 임베딩 부분 구현
  - `initialize()`: 모델 로드
  - `embed()`: 쿼리 임베딩
  - `search()`: Top-K 검색

**Week 2 완료 기준**: RAG 테스트 페이지에서 검색 결과(sources) 확인 가능

---

### 🔜 Week 3-4: Inference Model
- [ ] 추론 모델 선정
  - Llama 3.2 (로컬) vs Claude API (하이브리드)
- [ ] LocalRAGProvider 추론 부분 구현
  - `generate()`: 응답 생성
  - Prompt Engineering (RAG-specific)
- [ ] A/B 테스트 실행
  - Claude vs 로컬 RAG 성능 비교
  - 응답 품질, 속도, 비용 평가
- [ ] 최종 Provider 선택

**Week 3-4 완료 기준**: 로컬 RAG가 Claude 수준의 응답 생성

---

## 🔄 Provider 전환 방법

### 방법 1: 환경 변수 (배포 시)

`.env.local` 파일 수정:
```env
# Claude 사용
NEXT_PUBLIC_RAG_PROVIDER=claude

# 로컬 RAG 사용
NEXT_PUBLIC_RAG_PROVIDER=local
```

재시작 후 전체 앱에서 새 Provider 사용

---

### 방법 2: 런타임 전환 (테스트 페이지)

```typescript
// RAG 테스트 페이지에서
const ragService = RAGService.getInstance()

// Claude → 로컬 RAG
await ragService.switchProvider('local')

// 로컬 RAG → Claude
await ragService.switchProvider('claude')
```

재시작 불필요, 즉시 전환

---

## 📊 성능 비교 기준 (Week 4)

| 항목 | Claude API | 로컬 RAG | 가중치 |
|------|-----------|----------|--------|
| **응답 정확도** | ? | ? | 40% |
| **응답 시간** | ~1,200ms | ~800ms (예상) | 20% |
| **비용** | $0.015/1K tokens | 무료 (하드웨어) | 20% |
| **데이터 프라이버시** | ⚠️ 외부 전송 | ✅ 100% 로컬 | 15% |
| **유지보수** | ✅ 간단 | ⚠️ 모델 관리 | 5% |

**목표**: 로컬 RAG가 Claude 대비 80% 이상 성능 달성

---

## 🎯 최종 통합 계획

### Phase 1: 테스트 페이지만 사용 (Week 2-4)
- RAG 테스트 페이지에서만 로컬 RAG 실험
- 기존 통계 페이지는 Claude API 유지
- 성능 비교 및 평가

### Phase 2: 일부 페이지 통합 (Week 5)
- 선택된 3-5개 통계 페이지에 `useRAGAssistant` 통합
- 사용자 피드백 수집
- 버그 수정

### Phase 3: 전체 통합 (Week 6)
- 45개 통계 페이지 전체에 RAG 도우미 추가
- 환경 변수로 Provider 선택
- 프로덕션 배포

---

## 🛠️ 개발 가이드

### 새 Provider 추가 방법

1. **Provider 클래스 작성**
   ```typescript
   // lib/rag/providers/my-provider.ts
   class MyRAGProvider extends BaseRAGProvider {
     async query(context) { ... }
     async isReady() { ... }
   }
   ```

2. **RAGService에 등록**
   ```typescript
   // lib/rag/rag-service.ts
   switch (this.providerType) {
     case 'my-provider':
       this.provider = new MyRAGProvider({...})
       break
   }
   ```

3. **환경 변수 추가**
   ```env
   NEXT_PUBLIC_RAG_PROVIDER=my-provider
   ```

---

## 🔍 디버깅 팁

### Provider 상태 확인
```typescript
const ragService = RAGService.getInstance()
console.log('현재 Provider:', ragService.getProviderType())
console.log('준비 상태:', await ragService.isReady())
```

### RAG 테스트 페이지 활용
- URL: `http://localhost:3000/rag-test`
- A/B 테스트로 두 Provider 동시 비교
- 브라우저 콘솔에서 상세 로그 확인

### 에러 처리
- `initialize()` 실패 → Provider 설정 확인
- `query()` 실패 → API 키 또는 모델 경로 확인
- `isReady()` false → 모델 로딩 중 또는 실패

---

## 📝 요약

### 핵심 설계 원칙
1. **Provider Pattern**: 모델 교체 시 기존 코드 변경 최소화
2. **Singleton Service**: 앱 전체에서 단일 인스턴스 사용
3. **테스트 페이지 분리**: 실험용 페이지로 위험 없이 테스트
4. **단계별 구현**: Week 1 (현재) → Week 2-4 (로컬 RAG)

### 현재 상태 (Week 1 완료)
- ✅ Provider 추상화 완료
- ✅ Claude Provider 작동
- ✅ RAG 테스트 페이지 완성
- ✅ 기존 페이지 통합 준비 (useRAGAssistant)
- 🔜 로컬 RAG는 Week 2-4에서 구현

### 다음 단계
**Week 2**: 임베딩 + 벡터 DB 구축 → 검색 결과 확인

---

**작성자**: Claude (AI Assistant)
**최종 업데이트**: 2025-10-31
