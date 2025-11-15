# RAG 시스템 개선 계획 2025

**작성일**: 2025-11-15
**목표**: 최신 RAG 기술 적용으로 검색 정확도 및 사용자 경험 향상

---

## 🎯 현재 상태 분석

### ✅ 구현된 기능
1. **기본 RAG 파이프라인**
   - Ollama 기반 완전 로컬 실행
   - SQLite Vector Store (sql.js)
   - 문장 경계 기반 청킹 (500 tokens, 50 overlap)
   - Cosine Similarity 검색 (Top-K=5)
   - nomic-embed-text 임베딩 모델
   - qwen2.5 추론 모델

2. **인프라**
   - IndexedDB 기반 Vector Store 캐싱
   - 완전 오프라인 동작 (CDN 의존성 없음)
   - 브라우저 기반 Vector 검색

### ❌ 현재 한계점
1. **청킹 방식**: 단순 문장 경계 분할 → 의미적 맥락 손실
2. **검색 방식**: Vector Only → 키워드 누락 가능
3. **순위 재조정**: 없음 → 부정확한 Top-K
4. **쿼리 확장**: 없음 → 유사 문서 누락
5. **Context 보존**: 없음 → 청크 간 맥락 단절

---

## 📊 2025년 최신 RAG 기술 트렌드

### 1. **시맨틱 청킹 (Semantic Chunking)** ⭐ 최우선
**왜 인기?**
- 문장 임베딩 기반 의미 경계 인식
- 9% 리콜 향상 (vs 문장 분할)
- 문맥 일관성 유지

**구현 방법**:
- **LangChain SemanticChunker** (실험적, 가장 선진)
  - Percentile 기반: 문장 간 유사도 X% 이상 차이에서 분할
  - Standard Deviation 기반: X σ 이상 차이에서 분할
  - IQR 기반: 사분위수 범위 기반 분할

- **Max-Min Semantic Chunking** (2025년 논문)
  - 의미 일관성 + 청크 길이 균형
  - Llama Semantic Splitter 대비 우수 성능

**장점**:
- 주제 변화 지점에서 자연스럽게 분할
- 청크 내 문맥 일관성 100%
- RAG 정확도 대폭 향상

**단점**:
- 임베딩 계산 오버헤드 (문장마다)
- 처리 시간 증가 (10-20%)

---

### 2. **Hybrid Search (하이브리드 검색)** ⭐⭐
**왜 중요?**
- Vector Search: 의미 유사도 검색 (예: "평균 차이" → "t-test")
- Keyword Search: 정확한 용어 매칭 (예: "scipy.stats.ttest_ind")
- **결합**: 둘의 장점 통합 → 정확도 향상

**구현 방법**:
- **BM25** (Keyword) + **Vector Search** 결합
- **Reciprocal Rank Fusion (RRF)** 알고리즘
  ```
  RRF(d) = Σ 1 / (k + rank_i(d))
  k = 60 (상수)
  ```

**성능**:
- Vector Only 대비 15-25% 정확도 향상
- 특히 전문 용어 검색에 효과적 (예: "ANOVA", "Kolmogorov-Smirnov")

**난이도**: Medium (BM25 라이브러리 추가 필요)

---

### 3. **Reranking (순위 재조정)** ⭐⭐⭐ 필수
**왜 필수?**
- 초기 검색(Retrieval)은 빠르지만 부정확
- Reranking은 느리지만 매우 정확
- **2단계 전략**: Fast Retrieval (Top-50) → Accurate Reranking (Top-5)

**구현 방법**:
- **Cross-Encoder 모델** (예: ms-marco-MiniLM)
  - Query와 Document를 함께 입력 → Relevance Score 출력
  - Bi-Encoder(기존)보다 2-3배 정확

- **Ollama Reranking** (로컬 실행)
  - LLM에게 직접 순위 매기도록 요청
  - 프롬프트: "다음 문서들을 질문과의 관련성 순으로 정렬하시오"

**성능**:
- Microsoft: 2배 정확도 향상 (vs 이전 Ranker)
- 50개 문서 Reranking: 158ms (매우 빠름)

**난이도**: Medium-High (Cross-Encoder 모델 또는 Ollama API)

---

### 4. **Query Expansion (쿼리 확장)** ⭐
**왜 유용?**
- 사용자 질문이 모호하거나 간결할 때 효과적
- 예시:
  - 원본: "두 그룹 비교"
  - 확장: "두 그룹 평균 비교", "independent t-test", "Mann-Whitney U test"

**구현 방법**:
- **LLM 기반 Rewriting** (10개 변형 생성)
  - Microsoft: 10개 rewrite → 32 token query → 147ms
  - 리콜 향상 (더 많은 관련 문서 검색)

- **동의어 확장** (간단한 방법)
  - "평균" → ["mean", "average", "μ"]
  - "표준편차" → ["standard deviation", "SD", "σ"]

**성능**:
- 리콜 15-30% 향상
- Reranking과 결합 시 최상의 효과

**난이도**: Low-Medium (LLM 프롬프트 또는 동의어 사전)

---

### 5. **Contextual Retrieval (맥락 보존)** ⭐⭐
**왜 필요?**
- 청크 단위 검색 시 전체 문맥 손실
- 예시:
  - 청크: "이 검정은 정규성을 가정한다"
  - 전체: "[제목: t-test] 이 검정은 정규성을 가정한다"

**구현 방법**:
- **Late Chunking**: 임베딩 후 청킹 (효율적)
- **Contextual Retrieval**: 각 청크에 전체 문서 요약 추가
  - 청크 임베딩 = embed(문서요약 + 청크내용)

**성능**:
- Contextual Retrieval: 4% 정확도 향상
- 계산 비용 증가 (임베딩 2배)

**난이도**: High (임베딩 파이프라인 재설계 필요)

---

## 🚀 우선순위별 개선 계획

### **Phase A: 빠른 개선 (1-2주)** ✅ 즉시 시작 가능

#### A-1. Reranking 추가 (가장 효과적) ⭐⭐⭐
**목표**: 검색 정확도 2배 향상
**방법**: Ollama LLM 기반 Reranking

**구현**:
1. 초기 Vector Search → Top-20 추출
2. LLM Prompt로 Reranking:
   ```
   질문: {user_query}

   다음 문서들을 질문과의 관련성 순으로 1-20 순위를 매기시오:
   [문서 1] ...
   [문서 2] ...
   ...
   ```
3. Top-5만 최종 컨텍스트로 사용

**예상 효과**: 정확도 +50-100%
**난이도**: Low
**시간**: 2-3일

---

#### A-2. Query Expansion (동의어 사전) ⭐
**목표**: 리콜 15-20% 향상
**방법**: 통계 용어 동의어 사전

**구현**:
```typescript
const STATS_SYNONYMS = {
  "평균": ["mean", "average", "μ", "arithmetic mean"],
  "표준편차": ["standard deviation", "SD", "σ"],
  "상관관계": ["correlation", "r", "Pearson", "Spearman"],
  "t-test": ["t검정", "student's t-test", "independent t-test"],
  // ... 100+ 용어
}

function expandQuery(query: string): string[] {
  const expanded = [query]
  for (const [ko, synonyms] of Object.entries(STATS_SYNONYMS)) {
    if (query.includes(ko)) {
      synonyms.forEach(syn => expanded.push(query.replace(ko, syn)))
    }
  }
  return expanded.slice(0, 5) // Top-5 변형
}
```

**예상 효과**: 리콜 +15-20%
**난이도**: Low
**시간**: 1-2일

---

#### A-3. 청킹 설정 최적화 ⭐
**목표**: 현재 청킹 성능 극대화
**방법**: 토큰 크기 및 오버랩 튜닝

**현재 설정**:
```typescript
maxTokens: 500
overlapTokens: 50
```

**최적 설정** (2025 연구 결과):
```typescript
maxTokens: 400-512  // Chroma 테스트: 85-90% recall
overlapTokens: 100  // 오버랩 증가 → 맥락 보존
preserveBoundaries: true
```

**예상 효과**: 리콜 +5-10%
**난이도**: Very Low
**시간**: 1시간

---

### **Phase B: 시맨틱 청킹 도입 (2-3주)** 🔄 Phase A 완료 후

#### B-1. LangChain SemanticChunker 통합 ⭐⭐⭐
**목표**: 의미 기반 청킹으로 정확도 9% 향상

**라이브러리**: `langchain`
```bash
npm install langchain @langchain/community
```

**구현**:
```typescript
import { SemanticChunker } from 'langchain_experimental/text_splitter'
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama'

const embeddings = new OllamaEmbeddings({
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text'
})

const splitter = new SemanticChunker(embeddings, {
  breakpointThresholdType: 'percentile', // or 'standard_deviation', 'interquartile'
  breakpointThresholdAmount: 95 // Top 5% 유사도 차이에서 분할
})

const chunks = await splitter.splitText(document)
```

**장점**:
- 주제 변화 지점 자동 감지
- 문맥 일관성 유지
- 9% 리콜 향상

**단점**:
- 처리 시간 증가 (임베딩 계산)
- 문서 추가 시 시간 소요 (배치 처리 권장)

**예상 효과**: 리콜 +9%
**난이도**: Medium
**시간**: 1주

---

#### B-2. 문서 재인덱싱
**목표**: 기존 문서를 시맨틱 청킹으로 재처리

**작업**:
1. 기존 Vector Store 백업
2. 모든 문서 재청킹 (SemanticChunker)
3. 새 Vector Store 생성
4. A/B 테스트 (기존 vs 신규)

**예상 시간**: 2-3일 (문서 수에 따라)

---

### **Phase C: Hybrid Search (3-4주)** 🔜 Phase B 완료 후

#### C-1. BM25 Keyword Search 추가 ⭐⭐
**목표**: Vector + Keyword 하이브리드 검색

**라이브러리**: `bm25` (JavaScript)
```bash
npm install bm25
```

**구현**:
```typescript
import BM25 from 'bm25'

// 1. BM25 인덱스 생성 (문서 추가 시)
const corpus = documents.map(doc => doc.content.split(' '))
const bm25 = new BM25(corpus)

// 2. Hybrid Search
async function hybridSearch(query: string, topK: number) {
  // Vector Search
  const vectorResults = await vectorSearch(query, topK * 2) // Top-10

  // Keyword Search (BM25)
  const keywords = query.split(' ')
  const bm25Results = bm25.search(keywords, topK * 2) // Top-10

  // RRF Fusion
  const fused = reciprocalRankFusion([vectorResults, bm25Results], k=60)

  return fused.slice(0, topK) // Top-5
}

function reciprocalRankFusion(results: SearchResult[][], k=60) {
  const scores = new Map<string, number>()

  results.forEach(rankedList => {
    rankedList.forEach((doc, rank) => {
      const score = 1 / (k + rank + 1)
      scores.set(doc.id, (scores.get(doc.id) || 0) + score)
    })
  })

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ id, score }))
}
```

**예상 효과**: 정확도 +15-25%
**난이도**: Medium
**시간**: 1-2주

---

#### C-2. Reranking 고도화
**방법**: Ollama → Cross-Encoder 모델 (선택)

**장점**: 더 빠르고 정확
**단점**: 추가 모델 다운로드 필요

---

### **Phase D: Advanced Features (선택, 4주+)** 🔮 장기

#### D-1. Contextual Retrieval
- 각 청크에 문서 요약 추가
- 임베딩 파이프라인 재설계

#### D-2. LLM Query Rewriting
- 10개 변형 쿼리 생성
- 리콜 대폭 향상

#### D-3. Graph RAG (선택)
- 문서 간 관계 그래프
- Neo4j 또는 NetworkX

---

## 📈 예상 성능 개선

| Phase | 기능 | 정확도 향상 | 리콜 향상 | 난이도 | 시간 |
|-------|------|------------|---------|--------|------|
| **현재** | 기본 RAG | - | - | - | - |
| **A-1** | Reranking | +50-100% | +10% | Low | 2-3일 |
| **A-2** | Query Expansion | +5% | +15-20% | Low | 1-2일 |
| **A-3** | 청킹 최적화 | +5% | +5-10% | Very Low | 1시간 |
| **B-1** | Semantic Chunking | +10% | +9% | Medium | 1주 |
| **C-1** | Hybrid Search | +15-25% | +20% | Medium | 1-2주 |
| **총계** | **Phase A-C** | **+85-145%** | **+59-69%** | - | **3-4주** |

---

## 🎯 권장 실행 계획

### **즉시 시작 (이번 주)**
1. ✅ **A-3**: 청킹 설정 최적화 (1시간)
   - `maxTokens: 512, overlapTokens: 100`

2. ✅ **A-2**: 동의어 사전 구축 (1-2일)
   - 통계 용어 100개 동의어 정리

3. ✅ **A-1**: Ollama Reranking (2-3일)
   - Top-20 → LLM Reranking → Top-5

**예상 효과**: 정확도 +60%, 리콜 +30-35%
**총 소요 시간**: 3-4일

---

### **다음 단계 (2-3주 후)**
4. 🔄 **B-1**: LangChain SemanticChunker (1주)
5. 🔄 **B-2**: 문서 재인덱싱 (2-3일)

**예상 효과**: +10% 정확도, +9% 리콜
**총 소요 시간**: 1-2주

---

### **장기 계획 (1-2개월 후)**
6. 🔮 **C-1**: Hybrid Search (BM25 + Vector)
7. 🔮 **C-2**: Cross-Encoder Reranking

---

## 🛠️ 기술 스택 변경

### 추가 라이브러리
```bash
# Phase A (필수 없음, 기존 기술로 구현)

# Phase B
npm install langchain @langchain/community

# Phase C
npm install bm25

# Phase D (선택)
# Cross-Encoder: Ollama로 대체 가능
```

### 기존 유지
- ✅ Ollama (임베딩 + 추론)
- ✅ sql.js (Vector Store)
- ✅ IndexedDB (캐싱)

---

## 📊 성공 지표

### 정량적 지표
- **리콜**: 관련 문서 검색 비율 (목표: +50%)
- **정밀도**: Top-5 문서 정확도 (목표: +80%)
- **MRR** (Mean Reciprocal Rank): 첫 관련 문서 순위 (목표: 0.8+)

### 정성적 지표
- **사용자 만족도**: RAG 응답 품질 (목표: 4.5/5)
- **응답 시간**: <2초 유지

---

## 🚨 주의사항

### 1. 성능 vs 정확도 트레이드오프
- Semantic Chunking: 처리 시간 +10-20%
- Reranking: 응답 시간 +0.2-0.5초
- **권장**: Phase A 먼저 구현 (성능 영향 최소)

### 2. 오프라인 동작 보장
- 모든 라이브러리 로컬 실행 확인
- CDN 의존성 제거
- Ollama 로컬 모델만 사용

### 3. A/B 테스트 필수
- 기존 시스템 백업
- 신규 기능 점진적 도입
- 성능 회귀 모니터링

---

## 📝 다음 단계

1. **Phase A-3 즉시 시작** (1시간)
   - 청킹 설정 변경 및 테스트

2. **Phase A-2 병렬 진행** (1-2일)
   - 통계 용어 동의어 사전 작성

3. **Phase A-1 구현** (2-3일)
   - Ollama Reranking 파이프라인

4. **성능 측정 및 리뷰** (1일)
   - A/B 테스트 결과 분석
   - Phase B 진행 여부 결정

---

**작성자**: Claude Code
**검토**: 사용자 승인 대기
**다음 업데이트**: Phase A 완료 후
