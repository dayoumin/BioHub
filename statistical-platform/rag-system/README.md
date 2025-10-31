# RAG (Retrieval-Augmented Generation) System

**목표**: 통계 라이브러리 문서 기반 컨텍스트 설명 제공

**개발 기간**: 2025-11-01 ~ 2025-12-06 (5주)

**개발 전략**:
- ✅ Master 브랜치에서 작업 (브랜치 혼란 방지)
- ✅ 독립 폴더로 격리 (`rag-system/`)
- ✅ UI 통합 전까지 기존 앱에 영향 없음

---

## 📁 폴더 구조

```
rag-system/
├── data/                    # 수집한 문서 (Step 1)
│   ├── scipy/              # SciPy 공식 문서 (크롤링)
│   ├── statsmodels/        # statsmodels 문서
│   ├── pingouin/           # pingouin 문서
│   └── project-docs/       # 프로젝트 내부 문서 (복사)
├── scripts/                 # 문서 수집 스크립트 (Step 1)
│   ├── crawl-scipy.py      # SciPy 문서 크롤러
│   ├── crawl-statsmodels.py
│   ├── parse-metadata.py   # method-metadata.ts 파싱
│   └── requirements.txt    # Python 의존성
├── vector-db/               # Vector Database (Step 2)
│   ├── chroma/             # Chroma DB 파일
│   └── index-builder.py    # 인덱싱 스크립트
├── embeddings/              # Embedding 모델 (Step 2)
│   └── all-MiniLM-L6-v2/   # 다운로드한 모델
├── pipeline/                # RAG 파이프라인 (Step 3)
│   ├── query.py            # 질의 처리
│   ├── retrieval.py        # 문서 검색
│   ├── generation.py       # LLM 응답 생성
│   └── api.py              # FastAPI 엔드포인트
└── README.md               # 이 파일
```

---

## 🚀 개발 일정 (5주)

### Week 1: 문서 수집 및 전처리 (2025-11-01 ~ 11-08)
**목표**: Crawl4AI로 SciPy/statsmodels 문서 크롤링

**Day 1: 통계 방법론 가이드 작성 (최우선!)**
- [ ] 통계 방법 선택 플로우차트 (`data/methodology-guide/statistical-decision-tree.md`)
  ```markdown
  # 예시
  ## 두 그룹 평균 비교
  - 정규성 + 등분산 → 독립표본 t-검정
  - 정규성 위반 → Mann-Whitney U 검정
  - 등분산 위반 → Welch's t-test
  ```
- [ ] 가정 검증 가이드 (`assumption-guide.md`)
- [ ] 결과 해석 가이드 (`interpretation-guide.md`)
- [ ] 메서드 비교표 (`method-comparison.md`)

**Day 2: Crawl4AI 셋업 및 샘플 테스트**
- [ ] Crawl4AI 설치 및 환경 구성
- [ ] 샘플 크롤링 테스트 (scipy.stats.ttest_ind)
- [ ] LaTeX, 표, 코드 블록 품질 확인

**Day 3: SciPy 핵심 함수 크롤링 (41개, 실제 사용 중)**
- [ ] Worker 코드에서 실제 사용 중인 함수 목록 추출
  ```python
  # scipy.stats 함수: ttest_ind, mannwhitneyu, kruskal,
  # shapiro, levene, chi2_contingency, pearsonr, etc.
  ```
- [ ] 비동기 병렬 크롤링 (Crawl4AI)
- [ ] Markdown 저장 (`data/scipy/*.md`, ~41 파일)

**Day 4: NumPy + 프로젝트 문서**
- [ ] NumPy 기초 통계 크롤링 (~20개)
- [ ] `method-metadata.ts` 파싱 (60개)
- [ ] `implementation-summary.md` 복사
- [ ] Python Worker 주석 추출

**Day 5-7: 품질 검증 + Prompt 설계**
- [ ] 문서 중복 제거 및 정리
- [ ] RAG Prompt Template 작성 (사용자 친화적)
- [ ] 샘플 질문-답변 테스트
- [ ] 최종 문서: ~130개 (app-guide 4 + scipy 41 + numpy 20 + project 65)

**산출물**:
- `data/methodology-guide/*.md` (~4 파일, 통계 방법론 가이드) ⭐ 최우선!
- `data/scipy/*.md` (~41 파일, 실제 사용 함수)
- `data/numpy/*.md` (~20 파일, 기초 통계)
- `data/project-docs/*.md` (~65 파일, 내부 문서)
- `scripts/create-methodology-guide.py` (통계 가이드 생성)
- `scripts/crawl-scipy.py` (Crawl4AI 크롤러)
- `scripts/parse-project-docs.py` (내부 문서 파서)
- `prompts/rag-system-prompt.md` (LLM Prompt Template, 석박사 대상)
- **총 ~130 문서** (방법론 중심 + 프로젝트 특화)

**커밋**:
```bash
git add rag-system/data/ rag-system/scripts/
git commit -m "feat(rag): Add document crawling and ~600 scraped docs"
```

---

### Week 2: Vector Database 구축 (2025-11-08 ~ 11-15)
**목표**: Chroma Vector DB + Embedding 모델 설정

**작업**:
- [ ] sentence-transformers 설치 (`all-MiniLM-L6-v2`)
- [ ] 문서 청킹 전략 구현
  - [ ] 라이브러리 문서: 함수별 분할 (300-500 tokens)
  - [ ] 프로젝트 문서: 섹션별 분할 (200-400 tokens)
- [ ] Embedding 생성 (600+ 문서)
- [ ] Chroma DB 인덱싱
- [ ] 검색 성능 테스트 (Top-K retrieval)

**산출물**:
- `vector-db/chroma/` (Chroma DB 파일)
- `embeddings/all-MiniLM-L6-v2/` (모델 파일)
- `vector-db/index-builder.py` (인덱싱 스크립트)

**커밋**:
```bash
git add rag-system/vector-db/ rag-system/embeddings/
git commit -m "feat(rag): Build vector database with 600+ indexed documents"
```

---

### Week 3-4: RAG 파이프라인 구현 (2025-11-15 ~ 11-29)
**목표**: 질의 → 검색 → 생성 파이프라인

**작업**:
- [ ] 질의 처리 (`pipeline/query.py`)
  - [ ] 사용자 질문 임베딩
  - [ ] 의도 분류 (메서드 추천, 결과 해석, 가정 검증, 에러 해결)
- [ ] 문서 검색 (`pipeline/retrieval.py`)
  - [ ] Top-K 유사 문서 추출 (K=5)
  - [ ] Re-ranking 알고리즘
- [ ] LLM 응답 생성 (`pipeline/generation.py`)
  - [ ] Ollama 연동 (Llama 3 / Mistral)
  - [ ] 프롬프트 템플릿 (검색 문서 + 사용자 질문)
  - [ ] 응답 포맷팅 (Markdown)
- [ ] FastAPI 엔드포인트 (`pipeline/api.py`)
  - [ ] POST `/rag/query` (질문 → 응답)
  - [ ] GET `/rag/health` (시스템 상태)

**산출물**:
- `pipeline/*.py` (RAG 파이프라인)
- `pipeline/prompts/` (프롬프트 템플릿)

**커밋**:
```bash
git add rag-system/pipeline/
git commit -m "feat(rag): Implement RAG pipeline with Ollama integration"
```

---

### Week 5: UI 통합 (2025-11-29 ~ 12-06)
**목표**: 결과 페이지에 채팅 인터페이스 추가

**작업**:
- [ ] RAG Service 생성 (`lib/services/rag-service.ts`)
  - [ ] FastAPI 호출 (fetch)
  - [ ] 응답 캐싱 (React Query)
- [ ] 채팅 UI 컴포넌트 (`app/components/chat/`)
  - [ ] `<RAGChatPanel>` (우측 사이드바)
  - [ ] `<ChatMessage>` (질문/응답 표시)
  - [ ] `<ChatInput>` (질문 입력)
- [ ] 결과 페이지 통합
  - [ ] `app/(dashboard)/statistics/[method]/results.tsx`
  - [ ] 레이아웃: 좌측 통계 결과 + 우측 RAG 채팅
- [ ] 예제 질문 버튼
  - [ ] "이 결과는 무슨 의미인가요?"
  - [ ] "가정 검증은 어떻게 하나요?"
  - [ ] "p-value가 낮으면 어떻게 해야 하나요?"

**산출물**:
- `lib/services/rag-service.ts`
- `app/components/chat/` (채팅 UI)
- 결과 페이지 업데이트

**커밋**:
```bash
git add app/components/chat/ lib/services/rag-service.ts
git add "app/(dashboard)/statistics/[method]/"
git commit -m "feat(rag): Integrate RAG chat interface into results pages"
```

---

## 🔧 기술 스택

**⚠️ 라이브러리 버전 검증 (2025-10-31 기준)**:
```bash
# Step 1: 문서 수집 (Crawling & Parsing)
pip install crawl4ai                    # Web Crawler (v0.7.6, 2025)
pip install docling                     # Advanced Parser (IBM Research, 2025)

# Step 2: RAG 파이프라인
pip install langchain>=1.0              # LangChain 1.0+ (안정화 버전)
pip install langchain-experimental      # SemanticChunker (실험적)
pip install langchain-cohere>=0.4.6     # Cohere Reranker (최신)
pip install sentence-transformers       # HuggingFace Embeddings
pip install chromadb                    # Vector Database
pip install rank-bm25                   # BM25 Retriever

# Step 3: Backend API
pip install fastapi uvicorn            # FastAPI + ASGI 서버
```

**⚠️ 실제 구현 시 주의사항**:
- 위 설치 명령어는 2025년 10월 공식 문서 기반
- 실제 구현 전 최신 공식 문서 재확인 권장
- Breaking changes 가능성 있음 (특히 experimental 패키지)

---

### Vector Database
- **Chroma** (https://www.trychroma.com/) - 로컬 실행, Python 네이티브
- 대안: FAISS (Facebook AI), Qdrant

### Embedding Model
- **sentence-transformers/all-MiniLM-L6-v2** - 384 차원, 빠른 속도
- 다운로드: `pip install sentence-transformers`
- 모델 크기: ~80MB (로컬 캐싱)

### LLM (Local)
- **Ollama** (https://ollama.ai/) - 로컬 LLM 실행
- 추천 모델: Llama 3 (7B) 또는 Mistral (7B)
- 설치: `curl https://ollama.ai/install.sh | sh`

### Backend
- **FastAPI** (Python) - RAG 파이프라인 API
- **uvicorn** - ASGI 서버

### Frontend
- **Next.js 15** (기존)
- **Vercel AI SDK** - Streaming 지원
- **shadcn/ui** (채팅 UI)

---

## 🚫 주의사항

### 1. 브랜치 전략
- ✅ **Master 브랜치 사용** (별도 브랜치 생성 안 함)
- ✅ 독립 폴더 (`rag-system/`)로 격리
- ✅ 기존 앱에 영향 없음 (UI 통합 전까지)

### 2. 데이터 프라이버시
- ✅ 모든 처리 로컬 실행 (Ollama + Chroma)
- ✅ 사용자 데이터는 RAG에 저장 안 됨
- ✅ 질문-답변만 처리 (분석 데이터 분리)

### 3. Git 관리
- ✅ `.gitignore`에 대용량 파일 추가
  ```
  # RAG System
  rag-system/vector-db/chroma/*.sqlite3
  rag-system/embeddings/all-MiniLM-L6-v2/
  rag-system/data/*.pdf
  ```
- ✅ 커밋 단위: 주 1회 (Weekly milestone)
- ✅ 브랜치 혼란 없음 (모든 작업 master)

---

## 📚 참고 문서

**RAG 시스템 설계**:
- [ROADMAP.md Phase 8-2](../ROADMAP.md#phase-8-ai-모델-통합--rag-시스템-선택-향후)

**통계 라이브러리 문서**:
- SciPy stats: https://docs.scipy.org/doc/scipy/reference/stats.html
- statsmodels: https://www.statsmodels.org/stable/index.html
- pingouin: https://pingouin-stats.org/api.html

**기술 문서**:
- Chroma: https://docs.trychroma.com/
- sentence-transformers: https://www.sbert.net/
- Ollama: https://github.com/ollama/ollama

---

**작성일**: 2025-10-31
**작성자**: Claude Code (AI)
**다음 마일스톤**: Week 1 - 문서 수집 (2025-11-01)