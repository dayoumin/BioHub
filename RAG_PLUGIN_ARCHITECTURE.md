# RAG 플러그인 아키텍처

**작성일**: 2025-11-15
**목적**: 새로운 RAG 기술을 쉽게 테스트하고 교체할 수 있는 확장 가능한 구조

---

## 🎯 핵심 원칙

### 1. Strategy Pattern 기반
- 각 RAG 구성 요소를 독립적인 전략으로 분리
- 런타임에 전략 교체 가능
- 성능 비교 및 A/B 테스트 지원

### 2. 플러그인 가능 컴포넌트
```
RAG Pipeline:
  Document Loader (Docling 등)
    ↓
  Chunking Strategy (Semantic, Fixed, Agentic 등)
    ↓
  Embedding Model (Ollama, OpenAI 등)
    ↓
  Vector Store (SQLite, Chroma, Pinecone 등)
    ↓
  Retrieval Strategy (Hybrid, Vector, BM25 등)
    ↓
  Reranking (LLM, Cross-Encoder 등)
    ↓
  Generation (Ollama, GPT-4 등)
```

### 3. 설정 기반 전환
```typescript
// config/rag-strategies.ts
export const RAG_STRATEGIES = {
  chunking: 'semantic',      // 'semantic' | 'fixed' | 'agentic'
  embedding: 'nomic',        // 'nomic' | 'openai' | 'qwen3'
  retrieval: 'hybrid',       // 'hybrid' | 'vector' | 'bm25'
  reranking: 'llm'           // 'llm' | 'cross-encoder' | 'none'
}
```

---

## 🏗️ 아키텍처 설계

### Phase 1: 현재 구조 (Monolithic)

```
OllamaProvider
├── hardcoded chunking (문장 경계)
├── hardcoded embedding (Ollama)
├── hardcoded search (Hybrid)
└── hardcoded reranking (LLM)
```

**문제점**:
- 새 방법 추가 시 기존 코드 수정 필요
- A/B 테스트 어려움
- 성능 비교 불가능

---

### Phase 2: 플러그인 아키텍처 (제안)

```typescript
// lib/rag/strategies/base-strategy.ts

export interface ChunkingStrategy {
  name: string
  chunk(document: Document): Promise<Chunk[]>
  getMetadata(): StrategyMetadata
}

export interface EmbeddingStrategy {
  name: string
  embed(text: string): Promise<number[]>
  getDimensions(): number
}

export interface RetrievalStrategy {
  name: string
  search(query: string, limit: number): Promise<SearchResult[]>
}

export interface RerankingStrategy {
  name: string
  rerank(query: string, candidates: SearchResult[], topK: number): Promise<SearchResult[]>
}
```

---

## 📦 플러그인 구현 예시

### 1. Chunking Strategies

#### A. Semantic Chunking (현재 구현)
```typescript
// lib/rag/strategies/chunking/semantic-chunking.ts
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

export class SemanticChunkingStrategy implements ChunkingStrategy {
  name = 'semantic'

  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
    separators: ["\n\n\n", "\n\n", "\n", ". ", " ", ""]
  })

  async chunk(document: Document): Promise<Chunk[]> {
    const texts = await this.splitter.splitText(document.content)
    return texts.map((text, i) => ({
      doc_id: `${document.doc_id}_chunk_${i}`,
      content: text,
      chunk_index: i,
      total_chunks: texts.length
    }))
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'Semantic Chunking',
      version: '1.0',
      params: { chunkSize: 512, overlap: 100 },
      paper: 'https://arxiv.org/abs/...'
    }
  }
}
```

#### B. Agentic Chunking (신규 - 2025 트렌드)
```typescript
// lib/rag/strategies/chunking/agentic-chunking.ts
export class AgenticChunkingStrategy implements ChunkingStrategy {
  name = 'agentic'

  async chunk(document: Document): Promise<Chunk[]> {
    // LLM이 문서 구조를 이해하고 최적의 경계 결정
    const propositions = await this.llm.extractPropositions(document.content)
    return this.mergePropositions(propositions)
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'Agentic Chunking',
      version: '1.0',
      paper: 'https://github.com/anthropics/anthropic-cookbook/blob/main/skills/contextual-embeddings/guide.ipynb'
    }
  }
}
```

#### C. Docling Structure-Aware Chunking (PDF용)
```typescript
// lib/rag/strategies/chunking/docling-chunking.ts
import { DoclingParser } from '@docling/core'

export class DoclingChunkingStrategy implements ChunkingStrategy {
  name = 'docling'

  async chunk(document: Document): Promise<Chunk[]> {
    // Docling이 PDF 구조 분석 (제목, 표, 그림 등)
    const parsed = await DoclingParser.parse(document.pdfPath)

    // 구조 기반 청킹
    return [
      ...this.chunkSections(parsed.sections),
      ...this.chunkTables(parsed.tables),
      ...this.chunkFigures(parsed.figures)
    ]
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'Docling Structure-Aware Chunking',
      version: '1.0',
      supports: ['pdf', 'docx'],
      url: 'https://github.com/DS4SD/docling'
    }
  }
}
```

---

### 2. Reranking Strategies

#### A. LLM Reranking (현재 구현)
```typescript
// lib/rag/strategies/reranking/llm-reranking.ts
export class LLMRerankingStrategy implements RerankingStrategy {
  name = 'llm'

  async rerank(query: string, candidates: SearchResult[], topK: number): Promise<SearchResult[]> {
    // Ollama LLM으로 재순위화 (현재 구현)
    const prompt = `질문: ${query}\n\n다음 문서들을 관련성 순으로 정렬...`
    const response = await this.llm.generate(prompt)
    return this.parseRanking(response, candidates, topK)
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'LLM Reranking',
      latency: '300-600ms',
      accuracy: '+50-100%'
    }
  }
}
```

#### B. Cross-Encoder Reranking (고성능)
```typescript
// lib/rag/strategies/reranking/cross-encoder-reranking.ts
export class CrossEncoderRerankingStrategy implements RerankingStrategy {
  name = 'cross-encoder'

  async rerank(query: string, candidates: SearchResult[], topK: number): Promise<SearchResult[]> {
    // Cross-Encoder 모델 사용 (더 정확, 더 느림)
    const scores = await Promise.all(
      candidates.map(c => this.model.score(query, c.content))
    )

    return candidates
      .map((c, i) => ({ ...c, score: scores[i] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'Cross-Encoder Reranking',
      model: 'ms-marco-MiniLM-L-12-v2',
      latency: '500-1000ms',
      accuracy: '+70-120%'
    }
  }
}
```

#### C. Cohere Rerank (API 기반)
```typescript
// lib/rag/strategies/reranking/cohere-reranking.ts
export class CohereRerankingStrategy implements RerankingStrategy {
  name = 'cohere'

  async rerank(query: string, candidates: SearchResult[], topK: number): Promise<SearchResult[]> {
    // Cohere Rerank API 호출
    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        documents: candidates.map(c => c.content),
        top_n: topK,
        model: 'rerank-english-v2.0'
      })
    })

    const data = await response.json()
    return this.mapResults(data.results, candidates)
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'Cohere Rerank',
      latency: '200-400ms',
      accuracy: '+80-130%',
      cost: '$1/1000 searches'
    }
  }
}
```

---

## 🔧 Strategy Registry 패턴

```typescript
// lib/rag/strategies/registry.ts

class StrategyRegistry {
  private strategies = new Map<string, Map<string, any>>()

  // 전략 등록
  register<T>(category: string, name: string, strategy: T): void {
    if (!this.strategies.has(category)) {
      this.strategies.set(category, new Map())
    }
    this.strategies.get(category)!.set(name, strategy)
  }

  // 전략 조회
  get<T>(category: string, name: string): T | null {
    return this.strategies.get(category)?.get(name) ?? null
  }

  // 카테고리별 전체 전략 조회
  getAll(category: string): Map<string, any> {
    return this.strategies.get(category) ?? new Map()
  }

  // 전략 목록
  list(category: string): string[] {
    return Array.from(this.strategies.get(category)?.keys() ?? [])
  }
}

export const strategyRegistry = new StrategyRegistry()

// 전략 등록
strategyRegistry.register('chunking', 'semantic', new SemanticChunkingStrategy())
strategyRegistry.register('chunking', 'agentic', new AgenticChunkingStrategy())
strategyRegistry.register('chunking', 'docling', new DoclingChunkingStrategy())

strategyRegistry.register('reranking', 'llm', new LLMRerankingStrategy())
strategyRegistry.register('reranking', 'cross-encoder', new CrossEncoderRerankingStrategy())
strategyRegistry.register('reranking', 'cohere', new CohereRerankingStrategy())
```

---

## 🎛️ 설정 기반 전환

```typescript
// config/rag-config.ts
export interface RAGConfig {
  chunking: {
    strategy: 'semantic' | 'agentic' | 'docling' | 'fixed'
    params?: Record<string, any>
  }
  embedding: {
    strategy: 'nomic' | 'openai' | 'qwen3'
    model: string
  }
  retrieval: {
    strategy: 'hybrid' | 'vector' | 'bm25'
    topK: number
  }
  reranking: {
    strategy: 'llm' | 'cross-encoder' | 'cohere' | 'none'
    enabled: boolean
  }
}

export const DEFAULT_CONFIG: RAGConfig = {
  chunking: {
    strategy: 'semantic',
    params: { chunkSize: 512, overlap: 100 }
  },
  embedding: {
    strategy: 'nomic',
    model: 'nomic-embed-text'
  },
  retrieval: {
    strategy: 'hybrid',
    topK: 20
  },
  reranking: {
    strategy: 'llm',
    enabled: true
  }
}
```

---

## 🧪 A/B 테스트 프레임워크

```typescript
// lib/rag/testing/ab-test.ts

interface TestConfig {
  name: string
  config: RAGConfig
}

export class RAGABTest {
  async compare(
    queries: string[],
    configA: TestConfig,
    configB: TestConfig
  ): Promise<ComparisonResult> {
    const resultsA = await this.runQueries(queries, configA.config)
    const resultsB = await this.runQueries(queries, configB.config)

    return {
      configA: {
        name: configA.name,
        avgLatency: this.avgLatency(resultsA),
        avgRelevance: this.avgRelevance(resultsA),
        results: resultsA
      },
      configB: {
        name: configB.name,
        avgLatency: this.avgLatency(resultsB),
        avgRelevance: this.avgRelevance(resultsB),
        results: resultsB
      },
      winner: this.determineWinner(resultsA, resultsB)
    }
  }

  private async runQueries(queries: string[], config: RAGConfig): Promise<QueryResult[]> {
    const service = new RAGService(config)
    return Promise.all(queries.map(q => service.query({ query: q })))
  }
}

// 사용 예시
const test = new RAGABTest()

const result = await test.compare(
  ['t-test 정규성 가정', 'ANOVA 사후검정', '회귀분석 가정'],
  { name: 'Current (LLM Rerank)', config: { ...DEFAULT_CONFIG, reranking: { strategy: 'llm', enabled: true } } },
  { name: 'Cohere Rerank', config: { ...DEFAULT_CONFIG, reranking: { strategy: 'cohere', enabled: true } } }
)

console.log(`Winner: ${result.winner}`)
console.log(`Latency A: ${result.configA.avgLatency}ms vs B: ${result.configB.avgLatency}ms`)
console.log(`Relevance A: ${result.configA.avgRelevance} vs B: ${result.configB.avgRelevance}`)
```

---

## 📊 성능 벤치마크 예시

```typescript
// scripts/rag/benchmark-strategies.ts

const strategies = {
  chunking: ['semantic', 'agentic', 'docling'],
  reranking: ['llm', 'cross-encoder', 'cohere', 'none']
}

const results = await benchmarkAll(strategies)

// 결과 예시:
// ┌─────────────┬──────────┬────────────┬──────────┐
// │ Strategy    │ Latency  │ Accuracy   │ Cost     │
// ├─────────────┼──────────┼────────────┼──────────┤
// │ LLM         │ 450ms    │ +70%       │ Free     │
// │ Cross-Enc   │ 750ms    │ +95%       │ Free     │
// │ Cohere      │ 300ms    │ +110%      │ $0.001   │
// │ None        │ 0ms      │ Baseline   │ Free     │
// └─────────────┴──────────┴────────────┴──────────┘
```

---

## 🚀 구현 로드맵

### Phase 1: 인터페이스 정의 (1일)
- ✅ ChunkingStrategy, RerankingStrategy 등 인터페이스
- ✅ StrategyRegistry 구현

### Phase 2: 현재 구현을 플러그인으로 변환 (2일)
- ✅ SemanticChunkingStrategy
- ✅ LLMRerankingStrategy
- ✅ OllamaProvider를 Strategy 기반으로 수정

### Phase 3: 새로운 전략 추가 (선택)
- 🔜 AgenticChunkingStrategy (Anthropic Cookbook)
- 🔜 DoclingChunkingStrategy (PDF 구조 분석)
- 🔜 CrossEncoderRerankingStrategy
- 🔜 CohereRerankingStrategy

### Phase 4: A/B 테스트 프레임워크 (1일)
- 🔜 RAGABTest 클래스
- 🔜 벤치마크 스크립트
- 🔜 결과 시각화

---

## 🎯 파일 타입별 전략 분리

**핵심**: 파일 타입에 따라 최적의 청킹 전략 자동 선택

### 전략 선택 로직

```typescript
// lib/rag/strategies/chunking/auto-select.ts
export class AutoChunkingStrategy implements ChunkingStrategy {
  name = 'auto'

  async chunk(document: Document): Promise<Chunk[]> {
    const fileType = this.detectFileType(document)

    switch (fileType) {
      case 'pdf':
        // PDF: Docling으로 구조 분석
        return new DoclingChunkingStrategy().chunk(document)

      case 'md':
      case 'txt':
        // Markdown/텍스트: 시맨틱 청킹
        return new SemanticChunkingStrategy().chunk(document)

      case 'docx':
        // Word: Docling (구조 보존)
        return new DoclingChunkingStrategy().chunk(document)

      case 'html':
        // HTML: DOM 구조 기반
        return new HTMLChunkingStrategy().chunk(document)

      default:
        // 기본: 시맨틱 청킹
        return new SemanticChunkingStrategy().chunk(document)
    }
  }

  private detectFileType(document: Document): string {
    if (document.pdfPath?.endsWith('.pdf')) return 'pdf'
    if (document.filePath?.endsWith('.md')) return 'md'
    if (document.filePath?.endsWith('.docx')) return 'docx'
    if (document.content?.startsWith('<!DOCTYPE html')) return 'html'
    return 'txt'
  }
}
```

---

## 📄 파일 타입별 최적 전략 비교

| 파일 타입 | 권장 전략 | 이유 | 장점 | 단점 |
|----------|---------|------|------|------|
| **Markdown (.md)** | Semantic Chunking | 단순 구조 | 빠름, 효과적 | - |
| **텍스트 (.txt)** | Semantic Chunking | 구조 없음 | 빠름 | - |
| **PDF (.pdf)** | Docling Chunking | 복잡한 레이아웃 | 표/그림/수식 보존 | 느림 |
| **Word (.docx)** | Docling Chunking | 구조 보존 필요 | 서식 유지 | 느림 |
| **HTML (.html)** | HTML Chunking | DOM 구조 활용 | 정확한 섹션 분리 | - |
| **Code (.py, .ts)** | Code-Aware Chunking | AST 분석 | 함수/클래스 단위 | 언어별 파서 필요 |

---

## 📄 파일 타입별 최적 전략

### 1. Markdown/텍스트 파일 → Semantic Chunking

**이유**:
- ✅ 구조가 단순 (제목, 문단만)
- ✅ RecursiveCharacterTextSplitter가 효과적
- ✅ 빠른 처리 속도

**현재 구현**:
```typescript
// 이미 구현됨: scripts/rag/semantic-rechunk.ts
chunkSize: 512
chunkOverlap: 100
separators: ["\n\n\n", "\n\n", "\n", ". ", " ", ""]
```

---

### 2. PDF 파일 → Docling Chunking

**이유**:
- ✅ 복잡한 구조 (제목, 표, 그림, 수식)
- ✅ Docling이 구조 분석 최고 성능
- ✅ 표/수식 보존 필수

### Docling 전략 구현 (우선순위 높음)

```typescript
// lib/rag/strategies/chunking/docling-chunking.ts
export class DoclingChunkingStrategy implements ChunkingStrategy {
  name = 'docling'

  async chunk(document: Document): Promise<Chunk[]> {
    // PDF 파일 경로 확인
    if (!document.pdfPath) {
      throw new Error('PDF path required for Docling strategy')
    }

    // Docling으로 PDF 파싱
    const parsed = await this.parseWithDocling(document.pdfPath)

    // 구조 기반 청킹
    const chunks: Chunk[] = []

    // 1. 섹션별 청킹
    for (const section of parsed.sections) {
      chunks.push({
        doc_id: `${document.doc_id}_section_${section.id}`,
        content: section.text,
        metadata: {
          type: 'section',
          heading: section.heading,
          level: section.level
        }
      })
    }

    // 2. 표 청킹 (표는 분리하지 않음)
    for (const table of parsed.tables) {
      chunks.push({
        doc_id: `${document.doc_id}_table_${table.id}`,
        content: this.tableToMarkdown(table),
        metadata: {
          type: 'table',
          caption: table.caption
        }
      })
    }

    // 3. 수식 청킹
    for (const equation of parsed.equations) {
      chunks.push({
        doc_id: `${document.doc_id}_eq_${equation.id}`,
        content: equation.latex,
        metadata: {
          type: 'equation'
        }
      })
    }

    return chunks
  }

  private async parseWithDocling(pdfPath: string) {
    // Docling 호출 (현재 구현 재사용)
    // ...
  }

  private tableToMarkdown(table: Table): string {
    // 표 → Markdown 변환
    // ...
  }
}
```

---

## 📖 참고 자료

### 2025 RAG 트렌드
1. **Agentic Chunking**
   - https://github.com/anthropics/anthropic-cookbook/blob/main/skills/contextual-embeddings/guide.ipynb
   - LLM이 문서 구조 이해하고 최적 경계 결정

2. **Contextual Retrieval**
   - https://www.anthropic.com/news/contextual-retrieval
   - 각 청크에 컨텍스트 정보 추가

3. **Hybrid Search Evolution**
   - BM25 + Dense + Sparse Hybrid
   - https://www.pinecone.io/learn/hybrid-search-intro/

4. **Cross-Encoder Reranking**
   - https://www.sbert.net/examples/applications/cross-encoder/README.html
   - LLM보다 빠르고 정확

5. **Docling (IBM Research)**
   - https://github.com/DS4SD/docling
   - PDF 구조 분석 최고 성능

---

## ✅ 즉시 실행 가능한 작업

### 1. Docling Strategy 구현 (우선)
```bash
npm install @docling/core
```

### 2. Cross-Encoder Reranking (무료, 고성능)
```bash
npm install @xenova/transformers
```

### 3. A/B 테스트 프레임워크
- 현재 LLM Reranking vs Cross-Encoder 비교
- 결과를 표로 출력

---

**다음 단계**: 어떤 전략부터 구현할까요?
1. Docling 청킹 전략 (PDF 대비)
2. Cross-Encoder Reranking (성능 개선)
3. A/B 테스트 프레임워크 (비교 도구)
