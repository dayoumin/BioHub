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
**목표**: SciPy/statsmodels 문서 크롤링 및 정제

**작업**:
- [ ] SciPy stats 문서 크롤링 (300+ 함수)
- [ ] statsmodels 문서 크롤링 (200+ 함수)
- [ ] pingouin API 문서 크롤링 (100+ 함수)
- [ ] 프로젝트 내부 문서 수집
  - [ ] `method-metadata.ts` 파싱 (60개 메서드)
  - [ ] `implementation-summary.md` 복사
  - [ ] Python Worker 코드 주석 추출
- [ ] 문서 정제 (HTML → Markdown)
- [ ] 메타데이터 추출 (함수명, 파라미터, 예제)

**산출물**:
- `data/scipy/*.md` (300+ 파일)
- `data/statsmodels/*.md` (200+ 파일)
- `data/project-docs/*.md` (60+ 파일)
- `scripts/crawl-*.py` (크롤링 스크립트)

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

**Vector Database**:
- Chroma (https://www.trychroma.com/) - 로컬 실행
- 대안: FAISS (https://github.com/facebookresearch/faiss)

**Embedding Model**:
- sentence-transformers/all-MiniLM-L6-v2
- 다운로드: `pip install sentence-transformers`

**LLM**:
- Ollama (https://ollama.ai/)
- 모델: Llama 3 (7B) 또는 Mistral (7B)
- 설치: `curl https://ollama.ai/install.sh | sh`

**Backend**:
- FastAPI (Python) - RAG 파이프라인 API
- uvicorn (ASGI 서버)

**Frontend**:
- Next.js 15 (기존)
- React Query (응답 캐싱)
- shadcn/ui (채팅 UI)

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