# RAG 시스템 아키텍처 (Hybrid RAG + Semantic Chunking)

**목표**: 최고 정확도의 통계 문서 검색 시스템

**핵심 기술**:
- ✅ **Docling**: PDF/HTML → Markdown (수식/표 보존) - IBM Research, 2025년 공식 출시
- ✅ **Semantic Chunking**: 의미 기반 청킹 (문맥 보존) - LangChain Experimental
- ✅ **Hybrid Retrieval**: BM25 (정확 매칭) + Vector (의미 유사도)
- ✅ **Reranker**: Cross-encoder로 Top-K 재정렬

**⚠️ 라이브러리 버전 검증 필수**:
- 이 문서는 2025년 10월 기준 공식 문서를 기반으로 작성됨
- 실제 구현 전 최신 공식 문서 확인 권장 (Breaking changes 가능성)

---

## 📚 문서 소스 전략 (정확성 최우선)

### Tier 2: 공식 라이브러리 문서 (참고용 ⭐⭐⭐)

#### 6. SciPy Documentation
```
URL: https://docs.scipy.org/doc/scipy/reference/stats.html
버전: SciPy 1.14.x (Pyodide 버전과 일치)
범위: scipy.stats 모듈 (~300 함수)
상태: 프로젝트에서 실제 사용 중 (Worker 1-4 전체)
```

**크롤링 대상**:
- ✅ **API Reference**: 함수별 상세 문서
  - 예: `scipy.stats.ttest_ind`, `mannwhitneyu`, `kruskal`
- ✅ **Parameters**: 파라미터 설명, 타입, 기본값
- ✅ **Returns**: 리턴값 구조 (statistic, pvalue)
- ✅ **Mathematical Formulas**: LaTeX 수식 (검정 통계량 계산)
- ✅ **Examples**: 실제 사용 예제 (코드 + 해석)
- ✅ **Notes**: 가정, 제한사항, 주의사항

**URL 패턴**:
```
https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.{function}.html
```

---

#### 7. NumPy Documentation
```
URL: https://numpy.org/doc/stable/reference/routines.statistics.html
버전: NumPy 1.26.x
범위: 기술통계 함수 (~50 함수)
상태: 프로젝트에서 실제 사용 중 (Worker 1 주로)
```

**크롤링 대상**:
- ✅ **Basic Statistics**: `mean`, `median`, `std`, `var`
- ✅ **Percentiles**: `percentile`, `quantile` (Kruskal-Wallis, Friedman에서 사용)
- ✅ **Correlation**: `corrcoef`, `cov`
- ❌ **배열 연산 제외**: reshape, indexing 등 (RAG 불필요)

---

### Tier 0: 통계 방법론 가이드 (석박사 대상 ⭐⭐⭐⭐⭐)

#### 1. 통계 방법 선택 및 해석 가이드 (신규 작성 필요)
```
경로: rag-system/data/methodology-guide/
내용: 통계 방법론 중심 가이드 (앱 UI 무관)
- statistical-decision-tree.md: 연구 질문 → 통계 방법 선택
- assumption-guide.md: 가정 검증 및 위반 시 대안
- interpretation-guide.md: 결과 해석 (p-value, effect size)
- method-comparison.md: 유사 방법 비교 (t-test vs Mann-Whitney)
```

**RAG 활용** (통계 방법론 중심):
- ✅ **방법 선택**: "정규성 가정 위반 시 → Mann-Whitney U 검정"
- ✅ **가정 검증**: "Shapiro-Wilk p < 0.05 → 정규성 깨짐 → 비모수 검정"
- ✅ **결과 해석**: "Cohen's d = 0.8 → 큰 효과크기 (실질적 의미 있음)"
- ✅ **대안 제시**: "등분산 가정 위반 → Welch's t-test 사용"

**메서드 위치** (method-metadata.ts에서 자동 추출):
- ✅ **카테고리만 제공**: "이 방법은 '가설검정' 카테고리입니다"
- ✅ **검색 키워드**: "앱 검색창에 't-test' 또는 'mann-whitney' 입력"
- ❌ **상세 메뉴 경로 제외**: UI 변경 시 문서 수정 불필요

**우선순위**: **가장 높음** (석박사 연구자의 실제 니즈)

---

### Tier 1: 프로젝트 내부 문서 (핵심! ⭐⭐⭐⭐⭐)

#### 2. Method Metadata (60개 메서드)
```
경로: statistical-platform/lib/statistics/registry/method-metadata.ts
내용: 각 통계 메서드의 메타데이터
- 메서드 ID, 그룹 (descriptive/hypothesis/etc.)
- 의존성 패키지 (numpy, scipy)
- 예상 실행 시간
```

**RAG 활용**:
- ✅ 메서드 추천: "두 그룹 비교" → t-test, mann-whitney
- ✅ 의존성 확인: "이 메서드는 scipy가 필요합니다"
- ✅ 실행 시간 예측: "약 0.3초 소요됩니다"

---

#### 3. Implementation Summary
```
경로: statistical-platform/docs/implementation-summary.md
내용: 구현 현황 및 우선순위
- 구현 완료 (41개)
- 구현 필요 (24개)
- 메타데이터만 등록 (우선순위 3)
```

**RAG 활용**:
- ✅ 메서드 지원 여부: "이 메서드는 현재 구현되어 있습니다"
- ✅ 대안 제시: "A는 미구현, B를 대신 사용하세요"

---

#### 4. Python Worker 코드 주석
```
경로: statistical-platform/public/workers/python/worker*.py
내용: 실제 구현 코드 + 주석
- Worker 1: 기술통계 (214 lines)
- Worker 2: 가설검정 (338 lines)
- Worker 3: 비모수/ANOVA (614 lines)
- Worker 4: 회귀/고급 (656 lines)
```

**RAG 활용**:
- ✅ 구현 세부사항: "이 메서드는 scipy.stats.mannwhitneyu를 사용합니다"
- ✅ 에러 처리: "샘플 크기가 3 미만이면 에러 발생"
- ✅ 데이터 전처리: "None 값은 자동으로 제거됩니다"

---

### Tier 3: 향후 확장 (현재 미사용)

#### 5. statsmodels (Phase 7 이후)
```
URL: https://www.statsmodels.org/stable/index.html
현재 상태: 코드베이스에서 import 없음
계획: 회귀분석 고도화 시 도입 가능
보류 이유: 현재 scipy로 충분
```

#### 7. pingouin (Phase 8 이후)
```
URL: https://pingouin-stats.org/api.html
현재 상태: 코드베이스에서 import 없음
계획: Effect size 고도화 시 도입 가능
보류 이유: 현재 수동 계산으로 충분
```

---

### 문서 수집 우선순위 (Week 1 Day-by-Day)

**Day 1**: 통계 방법론 가이드 작성 (Tier 0, 최우선!)
- [ ] statistical-decision-tree.md: 연구 질문 → 통계 방법 선택
- [ ] assumption-guide.md: 가정 검증 및 위반 시 대안
- [ ] interpretation-guide.md: 결과 해석 (p-value, effect size, 신뢰구간)
- [ ] method-comparison.md: 유사 방법 비교 (모수 vs 비모수)

**Day 2**: Crawl4AI 셋업 + 샘플 테스트
- [ ] Crawl4AI 설치 및 환경 구성
- [ ] SciPy t-test 샘플 크롤링
- [ ] LaTeX, 표, 코드 블록 품질 확인

**Day 3**: SciPy 핵심 함수 크롤링 (41개)
```python
# Worker 코드에서 실제 사용 중인 함수만
scipy_functions = [
    'ttest_ind', 'mannwhitneyu', 'kruskal',
    'shapiro', 'levene', 'chi2_contingency',
    'pearsonr', 'spearmanr', # ... 총 41개
]
```

**Day 4**: NumPy 기초 통계 + 프로젝트 문서
- [ ] NumPy 기초 통계 크롤링 (~20개)
- [ ] method-metadata.ts 파싱 (60개)
- [ ] implementation-summary.md 복사
- [ ] Python Worker 주석 추출

**Day 5-7**: 품질 검증 + LLM Prompt 설계
- [ ] 문서 중복 제거 및 정리
- [ ] RAG Prompt Template 작성 (사용자 친화적)
- [ ] 샘플 질문-답변 테스트
- [ ] 최종 문서 개수: ~130개 (app-guide 4 + scipy 41 + numpy 20 + project 65)

---

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Document Processing (Week 1)                  │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Crawl4AI (Web Crawler)         │
    │  - 웹에서 HTML 다운로드          │
    │  - 비동기 병렬 크롤링 (6x fast) │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Docling (Parser, Optional)     │
    │  - HTML/PDF → 정교한 Markdown   │
    │  - AI 레이아웃 분석              │
    │  - 수식/표 정밀 추출             │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Semantic Chunker               │
    │  - 의미 기반 청킹                │
    │  - 문맥 보존 (문장 중간 안 잘림) │
    └────────────────┬────────────────┘
                     │
┌─────────────────────▼───────────────────────────────────┐
│  Phase 2: Vector Database (Week 2)                      │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Dual Indexing                  │
    ├─────────────────────────────────┤
    │  1. BM25 Index (Sparse)         │
    │     - 통계 용어 정확 매칭        │
    │  2. Chroma Vector DB (Dense)    │
    │     - HuggingFace Embeddings    │
    └────────────────┬────────────────┘
                     │
┌─────────────────────▼───────────────────────────────────┐
│  Phase 3: Query Pipeline (Week 3-4)                     │
└────────────────────┬────────────────────────────────────┘
                     │
         사용자 질문: "두 그룹 평균 비교?"
                     │
    ┌────────────────▼────────────────┐
    │  Hybrid Retriever               │
    ├─────────────────────────────────┤
    │  BM25 (k=10) + Vector (k=10)    │
    │  → 20개 후보 문서               │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Cohere Reranker                │
    │  - Cross-encoder로 재정렬        │
    │  → Top 5 문서 선정              │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Context Builder                │
    │  - 선택된 문서 포맷팅            │
    │  - 프롬프트 템플릿 적용          │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Ollama LLM (Llama 3)           │
    │  - 최종 답변 생성               │
    │  - Streaming 응답               │
    └────────────────┬────────────────┘
                     │
┌─────────────────────▼───────────────────────────────────┐
│  Phase 4: Frontend (Week 5)                             │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │  Vercel AI SDK (Next.js)        │
    │  - ChatGPT 스타일 UI            │
    │  - Streaming 실시간 표시        │
    └─────────────────────────────────┘
```

---

## 🔧 기술 스택 상세

### 1. Document Crawling & Parsing

#### 1-1. Crawl4AI (Web Crawler)

**설치**:
```bash
pip install crawl4ai  # v0.7.6 (2025)
```

**역할**: 웹에서 HTML 다운로드 + 기본 Markdown 변환
**기능**:
- ✅ 비동기 병렬 크롤링 (6x faster)
- ✅ JavaScript 렌더링 지원
- ✅ LLM-friendly Markdown 생성
- ✅ 노이즈 자동 제거 (fit_markdown)

**예시**:
```python
from crawl4ai import AsyncWebCrawler
from crawl4ai.markdown_generation import DefaultMarkdownGenerator

async with AsyncWebCrawler() as crawler:
    result = await crawler.arun(
        url="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html",
        markdown_generator=DefaultMarkdownGenerator()
    )

    # LLM-friendly Markdown (노이즈 제거됨)
    markdown = result.markdown_v2.fit_markdown
```

---

#### 1-2. Docling (Advanced Parser, Optional)

**설치**:
```bash
pip install docling  # IBM Research (2025)
```

**역할**: PDF/HTML → **정교한** Markdown 파싱 (AI 레이아웃 분석)
**기능**:
- ✅ LaTeX 수식 완벽 복원 (`$$...$$`)
- ✅ 복잡한 표 구조 보존 (94%+ 정확도)
- ✅ 레이아웃 분석 (제목, 본문, 각주, 2단 레이아웃)
- ✅ 이미지 분류 및 캡션 연결

**PyPDF2 vs Docling 비교**:
```python
# ❌ PyPDF2 (단순 텍스트 추출)
from PyPDF2 import PdfReader
text = PdfReader("paper.pdf").pages[0].extract_text()
# 결과: "t = (x 1 - x 2) / (s / n 1 + s / n 2)"  ← 수식 깨짐!

# ✅ Docling (AI 파싱)
from docling.document_converter import DocumentConverter
result = DocumentConverter().convert("paper.pdf")
markdown = result.document.export_to_markdown()
# 결과: "$$t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s^2}{n_1} + \frac{s^2}{n_2}}}$$"  ← 완벽!
```

**사용 시나리오**:
- ✅ PDF 논문 파싱 (통계 이론 참고 문헌)
- ✅ 복잡한 HTML (수식/표가 많은 경우)
- ❌ 단순 HTML (Crawl4AI만으로 충분)

---

#### 1-3. 파이프라인 선택 가이드

| 문서 소스 | 복잡도 | 추천 도구 | 이유 |
|-----------|--------|-----------|------|
| SciPy HTML | 낮음 | **Crawl4AI만** | Sphinx 템플릿 (구조 단순) |
| statsmodels HTML | 중간 | Crawl4AI → 샘플 테스트 | 품질 확인 후 결정 |
| 통계 논문 PDF | 높음 | **Docling 필수** | LaTeX 수식 복원 필요 |
| 프로젝트 문서 | 낮음 | 직접 복사 | 로컬 파일 |

**최종 전략**:
```python
# Step 1: Crawl4AI로 샘플 크롤링 테스트
sample = await crawl_with_crawl4ai("https://docs.scipy.org/.../ttest_ind.html")

# Step 2: 품질 검사
if has_latex_formulas(sample) and formulas_look_good(sample):
    # Crawl4AI만 사용 (빠름)
    use_crawl4ai_only()
else:
    # Crawl4AI + Docling 조합 (정교함)
    use_crawl4ai_then_docling()
```

---

### 2. Semantic Chunking (LangChain Experimental)

**설치**:
```bash
pip install langchain>=1.0 langchain-experimental
```

**3가지 Chunking 전략 비교**:

| 전략 | 방식 | 장점 | 단점 | 통계 문서 적합도 |
|------|------|------|------|------------------|
| **Fixed Size** | 고정 크기 (512 tokens) | 빠름 | 문맥 손실 | ⭐⭐ (비추천) |
| **Recursive** | 문단/문장 경계 | 균형 | 여전히 자름 | ⭐⭐⭐ (괜찮음) |
| **Semantic** | 임베딩 유사도 | 문맥 완벽 보존 | 느림 | ⭐⭐⭐⭐⭐ (최고) |

**Semantic Chunking 구현**:
```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.embeddings import HuggingFaceEmbeddings

# Embedding 모델
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Semantic Chunker (3가지 모드)
text_splitter = SemanticChunker(
    embeddings,
    breakpoint_threshold_type="percentile",  # 'percentile', 'standard_deviation', 'interquartile'
    breakpoint_threshold_amount=95  # 상위 5%만 경계로 인식 (더 큰 청크)
)

# 청킹 실행
chunks = text_splitter.create_documents([markdown_text])

# 결과: 의미적으로 완결된 청크
# Chunk 1: "scipy.stats.ttest_ind ... Formula: ... Parameters: ..."
# Chunk 2: "Returns: ... Examples: ..."
```

**왜 Semantic Chunking인가?**:
```python
# ❌ Fixed Size (512 tokens)
chunk1 = """
scipy.stats.ttest_ind calculates T-test for means.
Formula: t = (x1 - x2) / sqrt(s1^2/n1 + s2^"""  # ← 수식 중간 잘림!

# ✅ Semantic Chunking
chunk1 = """
scipy.stats.ttest_ind calculates T-test for means.
Formula: t = (x1 - x2) / sqrt(s1^2/n1 + s2^2/n2)
"""  # ← 수식 완전히 포함
chunk2 = """
Parameters:
- a: First sample
- b: Second sample
"""  # ← 파라미터 섹션 완전히 분리
```

---

### 3. Hybrid Retrieval (BM25 + Vector)

**설치**:
```bash
pip install rank-bm25 langchain-cohere
```

**구현**:
```python
from langchain.retrievers import BM25Retriever, EnsembleRetriever
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_cohere import CohereRerank

# 1. BM25 Retriever (키워드 매칭)
bm25_retriever = BM25Retriever.from_documents(chunks)
bm25_retriever.k = 10  # Top 10

# 2. Vector Retriever (의미 유사도)
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma.from_documents(chunks, embeddings, persist_directory="./chroma_db")
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# 3. Ensemble (Hybrid)
hybrid_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.5, 0.5]  # 동등 비중 (조정 가능)
)

# 4. Reranker (Top 5로 압축)
reranker = CohereRerank(
    model="rerank-english-v2.0",  # 또는 "rerank-multilingual-v2.0"
    top_n=5,
    cohere_api_key="YOUR_API_KEY"  # 무료 1000 requests/월
)

# 5. 최종 검색 파이프라인
def search(query: str):
    # Step 1: Hybrid 검색 (20개 후보)
    docs = hybrid_retriever.get_relevant_documents(query)

    # Step 2: Rerank (Top 5 선정)
    reranked = reranker.rerank(docs, query)

    return reranked[:5]
```

**성능 비교** (통계 문서 검색):
| 방식 | Recall@5 | Precision@5 | 예시 |
|------|----------|-------------|------|
| Vector만 | 65% | 70% | "두 그룹 비교" → mann-whitney (잘못된 결과) |
| BM25만 | 70% | 60% | "t-test" → 정확 매칭만 |
| **Hybrid + Rerank** | **85%** | **90%** | "두 그룹 평균 비교" → t-test ✓ |

---

### 4. Cohere Reranker (무료 API)

**왜 Reranker가 필요한가?**:
```python
# Hybrid 검색 후 (20개 문서)
[
  {"score": 0.85, "doc": "t-test for independent samples..."},
  {"score": 0.84, "doc": "mann-whitney U test..."},  # ← 비슷한 점수
  {"score": 0.83, "doc": "ANOVA for multiple groups..."},
]

# Reranker 적용 후 (Cross-encoder로 재점수화)
[
  {"score": 0.95, "doc": "t-test for independent samples..."},  # ← 확실한 1위
  {"score": 0.62, "doc": "ANOVA for multiple groups..."},
  {"score": 0.58, "doc": "mann-whitney U test..."},
]
```

**Cohere Rerank API** (무료 티어):
- ✅ 월 1000 requests (충분함)
- ✅ 무료 API Key: https://dashboard.cohere.com/
- ✅ Multilingual 지원 (한국어 질문 가능)

**대안** (완전 무료):
```python
from sentence_transformers import CrossEncoder

# Hugging Face Cross-encoder (로컬 실행)
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank(query, docs):
    pairs = [(query, doc.page_content) for doc in docs]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in ranked[:5]]
```

---

### 5. Frontend (Vercel AI SDK)

**설치**:
```bash
npm install ai @langchain/community
```

**API Route** (`app/api/rag/route.ts`):
```typescript
import { StreamingTextResponse } from 'ai'
import { Ollama } from '@langchain/community/llms/ollama'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const userQuery = messages[messages.length - 1].content

  // Python FastAPI 호출 (Hybrid Retrieval)
  const response = await fetch('http://localhost:8000/search', {
    method: 'POST',
    body: JSON.stringify({ query: userQuery })
  })
  const { docs } = await response.json()

  // LLM 프롬프트 구성
  const context = docs.map((d: any) => d.page_content).join('\n\n')
  const prompt = `Based on the following documentation:

${context}

Answer the user's question: ${userQuery}`

  // Ollama LLM (Streaming)
  const llm = new Ollama({ model: 'llama3', baseUrl: 'http://localhost:11434' })
  const stream = await llm.stream(prompt)

  return new StreamingTextResponse(stream)
}
```

**Chat UI** (`app/components/chat/ChatPanel.tsx`):
```typescript
'use client'
import { useChat } from 'ai/react'

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/rag'
  })

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 표시 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className="inline-block p-3 rounded-lg bg-muted">
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="질문을 입력하세요..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  )
}
```

---

## 📊 예상 정확도 비교

| 구성 | Recall@5 | Precision@5 | 사용자 만족도 |
|------|----------|-------------|--------------|
| Vector만 | 65% | 70% | ⭐⭐⭐ |
| BM25만 | 70% | 60% | ⭐⭐ |
| Hybrid (no rerank) | 75% | 75% | ⭐⭐⭐⭐ |
| **Hybrid + Rerank** | **85%** | **90%** | ⭐⭐⭐⭐⭐ |
| + Semantic Chunking | **90%** | **92%** | ⭐⭐⭐⭐⭐ |

**예상 개발 시간**: 3주 (5주 → 3주)

---

## 🚀 구현 순서 (3주)

### Week 1: Document Processing + Chunking
- [ ] Docling으로 SciPy/statsmodels 문서 파싱
- [ ] Semantic Chunking 적용
- [ ] 600+ 청크 생성

### Week 2: Hybrid Indexing
- [ ] BM25 인덱스 구축
- [ ] Chroma Vector DB 구축
- [ ] Hybrid Retriever 구현

### Week 3: Reranker + Frontend
- [ ] Cohere Reranker 통합 (또는 로컬 Cross-encoder)
- [ ] FastAPI 엔드포인트 (`/search`)
- [ ] Vercel AI SDK + Streaming UI

---

**작성일**: 2025-10-31
**다음 단계**: Week 1 시작 (Docling 설치 + 문서 파싱)