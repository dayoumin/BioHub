# RAG Strategies 디렉토리

**목적**: RAG 컴포넌트를 플러그인으로 분리하여 쉽게 교체/테스트

---

## 📁 디렉토리 구조 (계획)

```
lib/rag/strategies/
├── base-strategy.ts          # 인터페이스 정의
├── registry.ts                # StrategyRegistry 구현
├── chunking/                  # 청킹 전략
│   ├── semantic-chunking.ts   # ✅ 구현됨 (Markdown/텍스트)
│   ├── docling-chunking.ts    # 🔜 PDF/DOCX용
│   ├── hwp-chunking.ts        # 🔜 HWP/HWPX용
│   ├── html-chunking.ts       # 🔜 HTML용
│   └── auto-select.ts         # 🔜 파일 타입 자동 감지
├── reranking/                 # 재순위화 전략
│   ├── llm-reranking.ts       # ✅ 구현됨 (Ollama)
│   ├── cross-encoder.ts       # 🔜 고성능
│   └── cohere-reranking.ts    # 🔜 API 기반
└── __tests__/                 # 전략 테스트
    ├── chunking.test.ts
    └── reranking.test.ts
```

---

## 🎯 현재 상태

### ✅ 구현 완료
1. **SemanticChunkingStrategy**
   - 위치: `scripts/rag/semantic-rechunk.ts` (빌드 타임)
   - 대상: Markdown, 텍스트 파일
   - 테스트: 19/19 통과

2. **LLMRerankingStrategy**
   - 위치: `lib/rag/providers/ollama-provider.ts:1501-1610`
   - 대상: 모든 검색 결과
   - 테스트: 21/21 통과

### 🔜 구현 예정

#### 우선순위 1: 파일 타입별 청킹
- [ ] HWP/HWPX Chunking (hwp.js 사용)
- [ ] Docling Chunking (PDF/DOCX)
- [ ] AutoSelect Chunking (자동 감지)

#### 우선순위 2: 고성능 Reranking
- [ ] Cross-Encoder Reranking
- [ ] A/B Test Framework

---

## 📄 지원 파일 타입 (계획)

| 파일 타입 | 라이브러리 | 전략 | 상태 |
|----------|----------|------|------|
| `.md` | RecursiveCharacterTextSplitter | Semantic | ✅ 구현 |
| `.txt` | RecursiveCharacterTextSplitter | Semantic | ✅ 구현 |
| `.pdf` | Docling | Structure-Aware | 🔜 계획 |
| `.docx` | Docling | Structure-Aware | 🔜 계획 |
| `.hwp` | hwp.js | Structure-Aware | 🔜 계획 |
| `.hwpx` | hwp.js | Structure-Aware | 🔜 계획 |
| `.html` | Cheerio/JSDOM | DOM-Based | 🔜 계획 |

---

## 🔧 인터페이스 설계

```typescript
// base-strategy.ts (계획)

export interface ChunkingStrategy {
  name: string
  supportedFormats: string[]

  chunk(document: Document): Promise<Chunk[]>
  getMetadata(): StrategyMetadata
}

export interface RerankingStrategy {
  name: string

  rerank(
    query: string,
    candidates: SearchResult[],
    topK: number
  ): Promise<SearchResult[]>

  getMetadata(): StrategyMetadata
}

export interface StrategyMetadata {
  name: string
  version: string
  latency?: string
  accuracy?: string
  params?: Record<string, any>
  paper?: string
  url?: string
}
```

---

## 🧪 테스트 전략

### Unit Tests
```typescript
// __tests__/chunking.test.ts
describe('ChunkingStrategies', () => {
  describe('SemanticChunking', () => {
    it('should chunk markdown correctly')
    it('should respect chunk size and overlap')
    it('should use hierarchical separators')
  })

  describe('HWPChunking', () => {
    it('should parse hwp file')
    it('should extract paragraphs')
    it('should preserve tables')
  })
})
```

### Integration Tests
```typescript
// __tests__/auto-select.test.ts
describe('AutoSelectChunking', () => {
  it('should select SemanticChunking for .md files')
  it('should select HWPChunking for .hwp files')
  it('should select DoclingChunking for .pdf files')
})
```

---

## 📚 참고 자료

### HWP/HWPX
- hwp.js: https://github.com/hahnlee/hwp.js
- hwp-rs: https://github.com/hahnlee/hwp-rs

### PDF
- Docling: https://github.com/DS4SD/docling

### Reranking
- Cross-Encoder: https://www.sbert.net/examples/applications/cross-encoder/
- Cohere Rerank: https://docs.cohere.com/docs/rerank-2

---

**다음 단계**: HWPChunkingStrategy 구현
