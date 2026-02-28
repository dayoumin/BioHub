# 📋 통계 분석 플랫폼 로드맵

**프로젝트**: 전문가급 통계 분석 플랫폼 (SPSS/R Studio 급)
**목표**: 웹버전 (Vercel) + 로컬버전 (오프라인 HTML)
**기술**: Next.js 15 + TypeScript + Pyodide + Ollama (RAG)

---

## 🎯 전체 개요

```
Phase 1-4: 핵심 기능 구축 (2025-09 ~ 10)
Phase 5: Registry + 성능 최적화 (2025-10 ~)
Phase 6+: 고도화 (예정)
```

---

## ✅ 완료된 Phase

### Phase 1: 기반 구축 (2025-09-11 ~ 09-26) ✅

**목표**: Next.js 15 + shadcn/ui 프로젝트 구축

**성과**:
- ✅ Next.js 15 + TypeScript 환경 구성
- ✅ shadcn/ui + Tailwind CSS 통합
- ✅ 38개 통계 페이지 100% 구현
- ✅ 스마트 분석 플로우 (파일 업로드 → 검증 → 분석 → 결과)
- ✅ 4단계 워크플로우 UI (방법론 소개 → 데이터 → 변수 선택 → 결과)

**핵심 산출물**:
- `app/(dashboard)/statistics/` - 38개 통계 페이지
- `components/StatisticsPageLayout.tsx` - 4단계 마법사
- `components/smart-flow/` - 스마트 분석 플로우

---

### Phase 2: 통계 엔진 리팩토링 (2025-10-01) ✅

**목표**: 2,488줄 Switch 문 → 112줄 라우터 기반 (95.5% 감소)

**성과**:
- ✅ 50/50 메서드 (100% 완료)
- ✅ 16개 핸들러 파일 (6,651줄)
- ✅ 27개 테스트 100% 통과
- ✅ 코드 리뷰 평균 97.5/100점

**핵심 산출물**:
- `lib/statistics/method-router.ts` (112줄) - 라우터
- `lib/statistics/calculator-handlers/` - 16개 핸들러 파일
- `lib/statistics/calculator-types.ts` - 타입 정의

**문서**:
- [phase2-complete.md](stats/docs/phase2-complete.md)

---

### Phase 3: Pyodide Python 구현 (2025-10-01) ✅

**목표**: Groups 5-6 고급 통계 메서드 9개 Python 구현 완료

**성과**:
- ✅ pyodide-statistics.ts (2,518 → 3,434줄, +916줄)
- ✅ 9개 Python 메서드 (936줄)
- ✅ 17개 통합 테스트 100% 통과
- ✅ **50/50 메서드 Python 구현 완료**

**핵심 산출물**:
- `lib/services/pyodide-statistics.ts` (3,434줄) - 50개 Python 메서드

**문서**:
- [phase3-complete.md](stats/docs/phase3-complete.md)

---

### Phase 4-1: Pyodide 런타임 테스트 (2025-10-02) ✅

**목표**: Pyodide 런타임 검증 및 성능 측정

**성과**:
- ✅ E2E 테스트 3/3 통과 (100%)
- ✅ 30개 Python 메서드 import 문제 해결
- ✅ 싱글톤 패턴 44배 성능 개선 검증 (11.8초 → 0.27초)
- ✅ Pyodide + NumPy + SciPy 브라우저 작동 확인

**성능 지표**:
- 첫 계산: 11.8초 (Pyodide 초기화 포함)
- 두 번째 계산: 0.27초 (캐싱 활용)
- 성능 개선: 97.7% (44배)

**문서**:
- [phase4-runtime-test-complete.md](stats/docs/phase4-runtime-test-complete.md)

---

### Phase 5-1: Registry Pattern 구축 (2025-10-10) ✅

**목표**: Registry Pattern + Groups 구조 완성

**성과**:
- ✅ method-metadata.ts: 60개 메서드 메타데이터 등록
- ✅ Groups 6개 생성 (descriptive, hypothesis, regression, nonparametric, anova, advanced)
- ✅ statistical-registry.ts: 동적 import 메커니즘 구현
- ✅ pyodide-statistics.ts: 41개 메서드 Python 구현 완료

**아키텍처**:
```
사용자 → Groups (TypeScript) → PyodideService → Python (SciPy/statsmodels)
         ↓                       ↓
    데이터 가공/검증         통계 계산 실행
    UI 포맷팅               (Pyodide Worker)
```

**핵심 산출물**:
- `lib/statistics/registry/method-metadata.ts` (60개)
- `lib/statistics/registry/statistical-registry.ts`
- `lib/statistics/groups/` (6개 그룹 파일)

**문서**:
- [phase5-architecture.md](stats/docs/phase5-architecture.md)
- [phase5-implementation-plan.md](stats/docs/phase5-implementation-plan.md)
- [phase5-migration-guide.md](stats/docs/phase5-migration-guide.md)

---

## 🔄 진행 중인 Phase

### Phase 6: PyodideCore Direct Connection (2025-10-17) ✅

**목표**: PyodideStatistics Facade 제거 및 PyodideCore 직접 연결

**성과**:
- ✅ **아키텍처 단순화**: PyodideStatistics 2,110줄 완전 제거
- ✅ **타입 안전성 강화**: Worker enum + 80+ 공통 타입
- ✅ **10개 핸들러 100% 변환**: 39개 메서드 (descriptive, hypothesis-tests, anova, nonparametric, regression, crosstab, proportion-test, reliability, hypothesis, **advanced**)
- ✅ **TypeScript 컴파일 에러 0개**
- ✅ **코드 품질**: 4.9/5

**핵심 산출물**:
- `lib/services/pyodide/core/pyodide-worker.enum.ts` (97줄) - Worker enum
- `types/pyodide-results.ts` (500+줄) - 100+ 공통 타입
- `lib/statistics/calculator-handlers/*.ts` (10개 핸들러 변환)

**아키텍처 변경**:
```
Before: Groups → PyodideStatistics (Facade) → PyodideCore → Python Workers
After:  Groups → PyodideCore → Python Workers (10-15% 성능 향상)
```

**문서**:
- [CODE_REVIEW_PHASE6_2025-10-17.md](docs/CODE_REVIEW_PHASE6_2025-10-17.md) - 상세 코드 리뷰

---

### Phase 5-2: 구현 검증 및 TypeScript 래퍼 추가 (보류)

**목표**: Python Worker 구현 100% TypeScript 래퍼 완성

**정확한 현황** (2025-10-15 검증):
- ✅ **Python Worker 함수**: 55개 (100% 완성)
- ✅ **TypeScript 메서드**: 76개 (별칭 포함)
- ✅ **완전 매칭**: 43개 (78%)
- ⚠️ **TypeScript 래퍼 필요**: 12개 (22%)

**작업 내용**:
1. ✅ 실제 파일 검증 스크립트 작성 (generate-complete-mapping.js)
2. ✅ 정확한 매핑 테이블 생성 (implementation-status.md)
3. 🔄 TypeScript 래퍼 12개 추가
4. ✅ 문서 전면 업데이트

**TypeScript 래퍼 추가 필요 (12개)** - 모두 Worker 4:
| # | Python 함수 | TypeScript 메서드 | 우선순위 |
|---|-------------|------------------|---------|
| 1 | linear_regression | linearRegression | High |
| 2 | pca_analysis | pcaAnalysis | High |
| 3 | curve_estimation | curveEstimation | High |
| 4 | binary_logistic | binaryLogistic | High |
| 5 | nonlinear_regression | nonlinearRegression | Medium |
| 6 | stepwise_regression | stepwiseRegression | Medium |
| 7 | multinomial_logistic | multinomialLogistic | Medium |
| 8 | ordinal_logistic | ordinalLogistic | Medium |
| 9 | probit_regression | probitRegression | Medium |
| 10 | poisson_regression | poissonRegression | Medium |
| 11 | durbin_watson_test | durbinWatsonTest | Medium |
| 12 | negative_binomial_regression | negativeBinomialRegression | Low |

**최종 목표**:
- 현재: 43/55 (78%)
- 목표: 55/55 (100%)
- 예상 시간: 3시간

**문서** (✅ 최신):
- **[implementation-status.md](docs/implementation-status.md)** ⭐ 정확한 매핑 테이블
- [complete-mapping.json](stats/complete-mapping.json) - 기계 판독용
- [generate-complete-mapping.js](stats/generate-complete-mapping.js) - 검증 스크립트

---

## ⏳ 예정된 Phase

### Phase 5-3: Worker Pool 통합 (🔜 준비 완료, 시작 대기 중)

**목표**: 2+2 Adaptive Worker Pool 구축

**기대 효과**:
- 초기 로딩: 83% 빠름 (3초 → 0.5초)
- 첫 계산: 74% 빠름 (11.8초 → 3초)
- UI 블로킹: 100% 제거 (11.8초 → 0초)
- 병렬 처리: 89% 빠름 (35.4초 → 3.8초)

**작업 내용**:
1. AdaptiveWorkerPool 클래스 구현
2. Worker별 Pyodide 인스턴스 최적화
3. Worker 메시지 프로토콜 정의
4. 20분 미사용 시 확장 Worker 종료 로직

**Worker 매핑**:
- Worker 1: Descriptive (10개)
- Worker 2: Hypothesis (8개)
- Worker 3: Nonparametric + ANOVA (18개)
- Worker 4: Regression + Advanced (24개)

**✅ 사전 준비 완료 (2025-10-29)**:
- ✅ Worker 환경 검증 시스템 ([WORKER_ENVIRONMENT_VERIFICATION.md](docs/WORKER_ENVIRONMENT_VERIFICATION.md))
- ✅ 성능 회귀 테스트 시스템 ([PERFORMANCE_REGRESSION_TESTING.md](docs/PERFORMANCE_REGRESSION_TESTING.md))
- ✅ CI/CD 자동화 (GitHub Actions)
- ✅ Phase 5-3 준비 가이드 ([phase5-3-readiness-guide.md](docs/planning/phase5-3-readiness-guide.md))
- ✅ Phase 5-3 체크리스트 ([phase5-3-checklist.md](docs/planning/phase5-3-checklist.md))

**시작 조건**:
- 현재 리팩토링 작업 완료
- Git working directory clean
- 성능 baseline 측정 완료

---

### Phase 6: 추가 메서드 구현 (예정)

**목표**: 나머지 통계 메서드 구현

**대상 메서드**:
- 우선순위 3-4: 약 20개 메서드
- 수산과학 특화 기능
- 고급 시각화

---

### Phase 7: 배포 환경 구성 (진행 중)

**목표**: 웹버전 + 로컬버전 양방향 배포

#### 7-1. 웹버전 (Vercel 배포) ⭐ 우선
**배포 URL**: https://stats-nifs.vercel.app (예정)

**특징**:
- ✅ CDN을 통한 Pyodide 로드 (빠른 초기 로딩)
- ✅ 인터넷 연결 필수 (첫 방문 시)
- ✅ Service Worker 캐싱 (두 번째 방문부터 오프라인 가능)
- ⚠️ RAG 기능: 사용자 PC에 Ollama 설치 필요

**현재 상태** (2025-11-10 수정):
- ✅ `next.config.ts`: `output: 'export'` (정적 HTML 생성)
- ✅ Service Worker: Pyodide CDN 캐싱 (365일)
- ✅ localhost 우회 로직 (Ollama 연결 지원)
- ✅ `vercel.json`: rewrite 규칙 제거 (정적 export 최적화)
- ✅ `/rag-test`: 프로덕션 환경 숨김 처리
- ✅ `public/pyodide/`: .gitignore 추가 (800MB+)

**배포 크기**: ~5 MB (Pyodide 제외)

---

#### 7-2. 로컬버전 (오프라인 HTML) 🔜 추후 구현
**대상**: 인터넷 차단 환경 (내부망)

**특징**:
- ⏳ 완전 오프라인 동작 (인터넷 불필요)
- ⏳ Pyodide 로컬 번들링 (~200 MB)
- ⏳ Ollama + 모델 USB 전달
- ⏳ USB 또는 내부 공유로 배포

**현재 상태** (2025-11-10):
- ✅ `.env.local`: `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true` 지원 준비
- ✅ `lib/constants.ts`: 로컬 Pyodide 경로 지원
- ✅ 오프라인 배포 가이드 문서 완료
- ✅ `scripts/build/download-pyodide.js`: Pyodide 0.29.0 다운로드 스크립트
- ✅ `scripts/verify-offline-build.js`: 오프라인 빌드 검증 스크립트 강화
- ⏳ **실제 Pyodide packages 다운로드**: 추후 필요 시 구현 (343MB)

**배포 크기 (예상)**: ~2.55 GB (Pyodide + Ollama + 모델 포함)

**전달 파일 (계획)**:
```
USB/
├── statistics-offline.zip     (~250 MB) - 빌드된 정적 파일
├── OllamaSetup.exe            (~100 MB) - Ollama 설치 파일
├── ollama-models.zip          (~2.2 GB) - AI 모델 (nomic-embed-text, qwen2.5)
└── README-OFFLINE.txt         - 설치 가이드
```

**참고 문서**:
- [OFFLINE_DEPLOYMENT_GUIDE.md](stats/docs/OFFLINE_DEPLOYMENT_GUIDE.md)
- [OFFLINE_DEPLOYMENT_CHECKLIST.md](stats/docs/OFFLINE_DEPLOYMENT_CHECKLIST.md)

**TODO (추후 작업)**:
- Pyodide packages 다운로드 (필수 패키지만: numpy, scipy, pandas ~170MB)
- 압축 해제 스크립트 개선 (Python tarfile 모듈 활용)
- 오프라인 빌드 자동화 (npm run build:offline)
- deployment-package 재빌드 및 검증

---

#### 7-3. 외부 의존성 현황

| 컴포넌트 | 웹버전 | 로컬버전 | 비고 |
|---------|--------|---------|------|
| **Pyodide** | CDN | 로컬 번들 | 환경 변수로 전환 |
| **Google Fonts** | 자동 번들 | 자동 번들 | Next.js 기능 |
| **Ollama** | 사용자 설치 | 사용자 설치 | RAG 기능용 |
| **통계 계산** | 브라우저 | 브라우저 | - |
| **Vector Store** | IndexedDB | IndexedDB | - |

**⚠️ Docling 의존성**: 없음
- Docling은 **문서 크롤링 도구**로 개발 단계에서만 사용
- `rag-system/scripts/parse_openintro_pdf.py` (PDF → Markdown 변환)
- 런타임에는 필요 없음 (이미 변환된 Markdown 사용)

---

### Phase 7.5: 챗봇 고도화 (예정)

**목표**: 챗봇 UX 개선 및 추가 기능 구현

**추가 기능**:
1. **다크모드 테마** (우선순위: Medium)
   - 설정에서 light/dark/system 테마 선택
   - 실제 CSS 변수 기반 테마 적용
   - 챗봇 인터페이스 전체 다크모드 지원
   - 예상 시간: 20분

2. **드래그 앤 드롭 파일 첨부** (우선순위: Medium)
   - 채팅 입력 영역에 파일 드래그 앤 드롭
   - 이미지/문서 파일 업로드 지원
   - 파일 미리보기 기능
   - 예상 시간: 1시간

3. **메시지 검색** (우선순위: Low)
   - 세션 내 메시지 검색 기능
   - 키워드 하이라이트
   - 검색 결과 네비게이션

4. **메시지 북마크** (우선순위: Low)
   - 중요한 메시지 북마크
   - 북마크 목록 관리
   - 빠른 접근

**완료 현황**:
- ✅ Grok 스타일 사이드바
- ✅ 프로젝트 관리 (생성/편집/삭제)
- ✅ 세션 관리 (이동/즐겨찾기/삭제)
- ✅ 메시지 편집 UI (2025-11-07)
- ✅ 검색 기능
- ✅ 퀵 프롬프트
- ✅ 키보드 단축키

---

### Phase 8: AI 모델 통합 + RAG 시스템 ✅ **완료 (100%)** (2025-11-16)

**목표**: Ollama 기반 로컬 AI 모델 + 통계 문서 RAG 통합

#### 8-1. AI 모델 통합 (기존)
**기능**:
- 분석 방법 자동 추천
- 자동 데이터 품질 검사
- 지능적 결과 해석
- 동적 워크플로 생성

#### 8-2. RAG (Retrieval-Augmented Generation) 시스템 ✅ **완료 (100%)**
**목표**: 통계 라이브러리 문서 기반 컨텍스트 설명 제공

**완료 현황** (2025-11-18 최종 확인):
- ✅ **Vector DB 구축 완료**: Ollama embeddings (mxbai-embed-large) + ChromaDB
- ✅ **문서 수집 완료**: SciPy, statsmodels, pingouin 등 통계 라이브러리 문서
- ✅ **RAG 백엔드 완료**: `/chatbot` 페이지에서 Grok 스타일 UI로 사용 가능
- ✅ **FloatingChatbot 컴포넌트**: 전역 플로팅 버튼 (Intercom 스타일)
- ✅ **RAGAssistantCompact 컴포넌트**: 우측 패널용 컴팩트 버전
- ✅ **우측 ChatPanel 완료**: Layout 레벨에서 전역 우측 패널 구현 (2025-11-16)

**구현된 구조** (2025-11-16 완료):
```
app/layout.tsx (Root Layout)
├── Main Area (flex-1)
│   ├── Header
│   │   └── MessageCircle 버튼 (우측 패널 열기)
│   └── {children} (통계 페이지들)
└── LayoutContent (우측 패널)
    └── ChatPanel (조건부 렌더링)
        └── RAGAssistantCompact
```

**주요 기능**:
1. **Header 버튼**: `MessageCircle` 아이콘 클릭 → 우측 패널 열기
2. **ChatPanel**: 320px~800px 리사이징 가능, 접기/펼치기 (48px collapsed)
3. **상태 관리**: UIContext (`isChatPanelOpen`, `openChatPanel()`, `toggleChatPanel()`)
4. **전역 사용**: 모든 페이지에서 Header 버튼으로 접근 가능

**사용 방법**:
- 우측 패널 열기: Header의 `MessageCircle` (💬) 아이콘 클릭
- 패널 닫기: 패널 좌측 `ChevronRight` 버튼 클릭
- 너비 조절: 패널 좌측 경계선 드래그

**우선순위**: ✅ 완료 (2025-11-16)

**문서 소스**:
1. **공식 라이브러리 문서**:
   - SciPy documentation (https://docs.scipy.org/doc/scipy/reference/stats.html)
   - statsmodels documentation (https://www.statsmodels.org/stable/index.html)
   - pingouin documentation (https://pingouin-stats.org/api.html)
   - scikit-learn documentation (https://scikit-learn.org/stable/modules/classes.html)

2. **프로젝트 내부 문서**:
   - 60개 통계 메서드 메타데이터 (method-metadata.ts)
   - 통계 가정 및 요구사항
   - 일반적인 통계 오류 및 해결 방법
   - 결과 해석 가이드 (implementation-summary.md)
   - Python Worker 구현 코드 주석

**RAG 활용 사례**:
1. **메서드 추천**:
   ```
   사용자: "두 그룹의 평균 차이를 비교하고 싶어요"
   RAG: SciPy t-test 문서 검색 → 가정 확인 (정규성, 등분산성)
        → t-test 또는 Mann-Whitney U 추천
   ```

2. **결과 해석**:
   ```
   사용자: "p-value가 0.03인데 무슨 의미인가요?"
   RAG: statsmodels 통계 검정 문서 검색
        → "귀무가설을 기각할 수 있습니다 (α=0.05 기준)"
        → 효과 크기(effect size) 함께 제공
   ```

3. **가정 검증 가이드**:
   ```
   사용자: "ANOVA를 사용하기 전에 뭘 확인해야 하나요?"
   RAG: SciPy ANOVA 문서 + 프로젝트 가이드 검색
        → "1. 정규성 검정 (Shapiro-Wilk)"
        → "2. 등분산성 검정 (Levene's test)"
        → "3. 독립성 가정"
   ```

4. **에러 해결**:
   ```
   사용자: "샘플 크기 부족 오류가 발생했어요"
   RAG: 프로젝트 트러블슈팅 문서 검색
        → 최소 샘플 크기 요구사항 설명
        → 대안 비모수 검정 추천
   ```

**기술 스택**:
- **Vector DB**: Chroma / FAISS (로컬 실행)
- **Embedding Model**: sentence-transformers (all-MiniLM-L6-v2)
- **LLM**: Ollama (Llama 3 / Mistral)
- **Chunking Strategy**:
  - 라이브러리 문서: 함수별 분할 (300-500 tokens)
  - 프로젝트 문서: 섹션별 분할 (200-400 tokens)

**구현 계획**:
1. **Step 1**: 문서 수집 및 전처리 (1주)
   - SciPy/statsmodels 공식 문서 크롤링
   - 프로젝트 내부 문서 마크다운 파싱
   - 메타데이터 추출 (메서드명, 파라미터, 예제)

2. **Step 2**: Vector DB 구축 (1주)
   - 문서 청킹 (함수/섹션별)
   - Embedding 생성 (sentence-transformers)
   - Chroma/FAISS 인덱싱

3. **Step 3**: RAG 파이프라인 구현 (2주)
   - 질의 → Vector 검색 → Top-K 문서 추출
   - LLM 프롬프트 구성 (검색된 문서 + 사용자 질문)
   - 응답 생성 및 포맷팅

4. **Step 4**: UI 통합 (1주)
   - 채팅 인터페이스 추가 (결과 페이지 우측)
   - 실시간 질문-답변 시스템
   - 관련 문서 링크 제공

**데이터 프라이버시**:
- ✅ 모든 처리 로컬 실행 (Ollama + Chroma)
- ✅ 사용자 데이터는 RAG에 저장 안 됨
- ✅ 질문-답변만 처리 (분석 데이터 분리)

**문서**:
- [AI_MODEL_INTEGRATION_PLAN.md](AI_MODEL_INTEGRATION_PLAN.md) (기존)
- 📝 RAG_SYSTEM_DESIGN.md (작성 예정)

---

### Phase 9: 배포 전 리팩토링 및 최적화 (예정)

**목표**: 프로덕션 배포를 위한 코드 품질 및 성능 최적화

#### 9-1. 코드 리팩토링
- ✅ 타입 안전성 100% 달성
  - `any` 타입 완전 제거 → `unknown` + 타입 가드
  - Non-null assertion (`!`) 제거 → 타입 가드로 대체
  - 모든 함수 명시적 타입 지정 검증
- ✅ **setTimeout 패턴 제거 (Phase 1)** (2025-10-30 완료)
  - **현황**: 45개 페이지 중 27개(60%) → **0개 (100% 완료)** ✅
  - **목표**: 표준 패턴(await)으로 전환 → **달성 완료**
  - **작업 완료**:
    1. ✅ 코딩 표준 문서 업데이트 (2025-10-29)
    2. ✅ CLAUDE.md에 레거시 참고 섹션 추가 (2025-10-29)
    3. ✅ 27개 레거시 페이지 목록 작성 및 우선순위 분류 (2025-10-29)
    4. ✅ **27/27 페이지 setTimeout 제거 완료** (2025-10-30)
    5. ✅ **isAnalyzing Critical 버그 10개 파일 수정** (2025-10-30)
    6. ✅ Phase 1 완료 보고서 작성
    7. ✅ isAnalyzing 트러블슈팅 가이드 작성
  - **우선순위별 완료 현황**:
    - ✅ High (5개): descriptive, anova, correlation, regression, chi-square
    - ✅ Medium (5개): ks-test, power-analysis, means-plot, one-sample-t, normality-test
    - ✅ Low (17개): repeated-measures, welch-t, sign-test, runs-test, poisson, pca, ordinal-regression, non-parametric, mcnemar, explore-data, discriminant, ancova, proportion-test, frequency-table, cross-tabulation, wilcoxon, mann-whitney
  - **Critical 버그 수정** (10개 파일):
    - sign-test, poisson, ordinal-regression (이전 발견 3개)
    - chi-square-goodness, chi-square-independence, friedman, kruskal-wallis, mann-whitney, mixed-model, reliability (추가 발견 7개)
    - **패턴**: `actions.setResults() + setCurrentStep()` → `actions.completeAnalysis(result, step)`
    - **증상**: 분석 버튼 영구 비활성화 (isAnalyzing=true 고정), 재분석 불가능
    - **해결**: 사용자가 페이지 새로고침 없이 재분석 가능
  - **성능 개선**:
    - ✅ UI 반응성 개선 (1500ms 지연 제거 → 즉시 실행)
    - ✅ 코드 일관성 100% (모든 페이지 표준 패턴 사용)
    - ✅ React 18 automatic batching 활용 (setTimeout 불필요)
  - **문서화**:
    - [phase1-settimeout-removal-complete.md](stats/docs/phase1-settimeout-removal-complete.md)
    - [TROUBLESHOOTING_ISANALYZING_BUG.md](stats/docs/TROUBLESHOOTING_ISANALYZING_BUG.md)
    - [STATISTICS_PAGE_CODING_STANDARDS.md Section 8](stats/docs/STATISTICS_PAGE_CODING_STANDARDS.md)
  - **Git Commits**:
    - `527638f` - feat(medium): Medium Priority 5개 setTimeout 제거
    - `869aba9` - feat(low): Low Priority 일부 setTimeout 제거
    - `45dd836` - fix(critical): Fix isAnalyzing bug in 7 statistics pages
- ✅ **AI-First Test Strategy** (2025-10-30 완료)
  - **Philosophy**: "Tests as Regeneration Recipes, Not Maintained Code"
  - **작업 완료**:
    - ✅ 14개 Stale 테스트 삭제 (2,378 lines, TypeScript 에러 869 → 777)
    - ✅ 5개 Core 테스트 보존 (아키텍처 검증, 성능 테스트)
    - ✅ 2개 AI 템플릿 생성 (테스트 재생성 가이드)
  - **효율성**:
    - 테스트 수정: 4-6시간 → 템플릿 재생성: 30분 (90% 단축)
    - AI 컨텍스트: 10,000 → 2,500 tokens (75% 감소)
  - **문서화**:
    - [__tests__/_templates/README.md](stats/__tests__/_templates/README.md)
    - [__tests__/_templates/statistics-page-test.md](stats/__tests__/_templates/statistics-page-test.md)
  - **Git Commit**: `8be447b` - refactor(tests): Implement AI-first test strategy (Option C)
- ✅ 코드 정리
  - 사용하지 않는 import 제거
  - Dead code 제거 (주석 처리된 코드, 미사용 함수)
  - 임시 파일 제거 (`.backup`, `.old`, `.new`, `__pycache__` 등)
  - 중복 코드 제거 및 공통 유틸리티로 통합
- ✅ 네이밍 일관성
  - 변수명/함수명 통일 (camelCase, PascalCase 규칙)
  - 파일명 규칙 통일
  - 주석/문서에서 이전 명칭 업데이트

#### 9-2. 성능 최적화
- ✅ 번들 크기 최적화
  - Tree shaking 검증
  - Dynamic import 적용 범위 확대
  - 사용하지 않는 라이브러리 제거
  - 번들 분석 (webpack-bundle-analyzer)
- ✅ 런타임 성능
  - React 컴포넌트 메모이제이션 (React.memo, useMemo)
  - 불필요한 리렌더링 제거
  - 이미지/에셋 최적화
  - Lazy loading 적용

#### 9-3. 테스트 강화
- ✅ 테스트 커버리지 90% 이상
  - 모든 통계 메서드 단위 테스트
  - Groups 통합 테스트
  - E2E 테스트 확장
- ✅ 엣지 케이스 테스트
  - 빈 데이터셋
  - 극단값 처리
  - 에러 처리 검증
- ✅ 성능 테스트
  - 대용량 데이터셋 테스트 (10,000+ 행)
  - 동시 계산 부하 테스트

#### 9-4. 문서화
- ✅ API 문서
  - 모든 public 메서드 JSDoc 작성
  - 타입 정의 문서화
  - 사용 예제 작성
- ✅ 사용자 가이드
  - 통계 메서드별 사용법
  - 데이터 형식 가이드
  - 문제 해결 가이드 (FAQ)
- ✅ 개발자 문서
  - 아키텍처 다이어그램
  - 기여 가이드
  - 개발 환경 설정 가이드

#### 9-5. 보안 및 안정성
- ✅ 보안 검증
  - ✅ 의존성 취약점 스캔 (`npm audit`) - xlsx 0.20.3 업데이트 완료 (2025-10-15)
  - XSS/CSRF 방어 검증
  - 사용자 입력 검증 강화
- 🔄 라이브러리 마이그레이션 (장기 계획)
  - xlsx → ExcelJS 전환 (CDN 링크 불안정 시 또는 고급 기능 필요 시)
  - 예상 작업: 6-10시간 (excel-processor.ts 재작성 + 23개 파일 검증)
  - 우선순위: Low (현재 xlsx 0.20.3 CDN 버전 안정적)
- ✅ 에러 처리
  - 전역 에러 핸들러 구현
  - 사용자 친화적 에러 메시지
  - 에러 로깅 시스템 구축
- ✅ 접근성 (a11y)
  - WCAG 2.1 AA 준수
  - 키보드 네비게이션 지원
  - 스크린 리더 호환성

---

### Phase 9.5: 시각화 기능 확장 (선택, 향후)

**목표**: 통계 결과 시각화 고도화 및 사용자 경험 개선

#### 9.5-1. 현재 구현 상태 (2025-11-10 확인)

**✅ Python 기반 시각화 (Pyodide + matplotlib)**
- **파일**: [lib/pyodide-visualizations.ts](stats/lib/pyodide-visualizations.ts) (418 lines)
- **지원 차트 (7종)**:
  1. `createHistogram()` - 히스토그램 + 정규분포 피팅
  2. `createBoxplot()` - 박스플롯 (그룹 비교)
  3. `createScatterPlot()` - 산점도 + 회귀선
  4. `createQQPlot()` - Q-Q Plot (정규성 검정)
  5. `createHeatmap()` - 히트맵 (상관계수 행렬)
  6. `createBarChart()` - 막대 그래프 (오차 막대 포함)
  7. `createLineChart()` - 선 그래프 (시계열)
- **장점**:
  - 브라우저에서 직접 렌더링 (서버 불필요)
  - base64 이미지 생성
  - SPSS/R 수준의 고품질 차트

**✅ Plotly 기반 시각화 (부분 구현)**
- **파일**: [lib/pyodide-plotly-visualizations.ts](stats/lib/pyodide-plotly-visualizations.ts)
- **장점**: 인터랙티브 (줌, 팬, 호버)

#### 9.5-2. 추가 개선 사항

**1. 차트 커스터마이징** (우선순위: Medium)
- 색상 팔레트 선택 (ColorBrewer, Viridis 등)
- 폰트 크기 조정 (Small, Medium, Large)
- 범례 위치 변경 (상/하/좌/우)
- 축 범위 수동 설정
- 예상 시간: 2-3일

**2. 고급 통계 차트** (우선순위: Low)
- Violin Plot (분포 + 박스플롯 결합)
- Pair Plot (다변량 산점도 행렬)
- 잔차 진단 플롯 (회귀분석용 - 4 plots)
- Forest Plot (메타분석용)
- 예상 시간: 3-4일

**3. 차트 내보내기** (우선순위: High)
- PNG/SVG 다운로드 버튼
- 고해상도 이미지 (300 DPI, 출판용)
- 차트만 따로 PDF 저장
- 클립보드 복사 (→ Word/PowerPoint 직접 붙여넣기)
- 예상 시간: 1-2일

**4. 실시간 프리뷰** (우선순위: Medium)
- 변수 선택 시 즉시 차트 미리보기
- 옵션 변경 시 실시간 업데이트
- 예상 시간: 2일

**총 예상 시간**: 1-2주 (우선순위 High 항목만 구현 시 3-4일)

---

### Phase 10: 배포 준비 (예정)

**목표**: 프로덕션 환경 배포를 위한 인프라 구성

#### 10-0. Cloudflare Pages 배포 (개인용 - 즉시 가능) ⭐ NEW

**현재 상태**: `output: 'export'` (정적 빌드)이므로 Cloudflare Pages에 바로 배포 가능

| 항목 | 현재 상태 | Cloudflare Pages 제한 | 판정 |
|------|----------|---------------------|------|
| 빌드 크기 | ~34MB | 제한 없음 | OK |
| 최대 파일 | 4.4MB (Plotly 청크) | 25MB | OK |
| 서버 런타임 | 없음 (순수 정적) | 정적만 가능 | OK |
| Pyodide | CDN 로드 (~40MB) | 사용자 브라우저 캐싱 | OK |
| API routes | 없음 | 없음 | OK |

**배포 명령**:
```bash
cd stats
pnpm build
npx wrangler pages deploy out --project-name=stats
```

**필수 설정**:
- `public/_redirects`: `/* /index.html 200` (SPA 라우팅)
- `public/_headers`: Pyodide WASM 장기 캐시 (`max-age=31536000`)
- Pages 대시보드: `NEXT_PUBLIC_*` 환경변수 설정 (빌드 시 주입)

**서비스 전환 시 필요 사항**:

| 문제 | 개인용 | 서비스 시 |
|------|--------|----------|
| API 키 노출 | `NEXT_PUBLIC_` 브라우저 노출 | Cloudflare Workers 프록시 필수 |
| 사용자 인증 | 없음 | Cloudflare Access 또는 자체 auth |
| Rate Limiting | 본인만 사용 | Workers에서 사용자별 제한 |
| 대역폭 | 무료 100GB/월 (~2,500명) | 유료 플랜 검토 |
| CORS 프록시 | 불필요 | NCBI 등 일부 API 필요 |

**Workers 프록시 아키텍처** (서비스 시):
```
[브라우저] → Cloudflare Pages (정적 파일)
         → Cloudflare Workers (/api/*)
            ├─ /api/llm → OpenRouter (키 숨김)
            ├─ /api/ncbi → NCBI Entrez (CORS 프록시)
            └─ /api/fishbase → FishBase (CORS 프록시)
```

**아키텍처 장점**:
- 통계 계산 전부 브라우저(Pyodide)에서 실행 → 서버 컴퓨팅 비용 = 0
- 사용자 데이터가 서버를 거치지 않음 → 프라이버시 강점
- 동시 접속 스케일링 문제 없음

#### 10-1. 빌드 및 배포 설정
- ✅ 프로덕션 빌드 최적화
  - 환경 변수 관리 (.env.production)
  - Source map 설정 (에러 추적용)
  - 압축 및 minification 검증
- ✅ CI/CD 파이프라인
  - GitHub Actions 워크플로우 설정
  - 자동 테스트 실행
  - 자동 배포 스크립트
- ✅ 호스팅 플랫폼 선정
  - ✅ **Cloudflare Pages** 선정 (정적 배포, 무료 티어 충분)
  - CDN 설정 (Cloudflare 내장)
  - 도메인 연결

#### 10-2. 모니터링 및 분석
- ✅ 성능 모니터링
  - Google Analytics / Mixpanel 연동
  - 성능 메트릭 수집 (Core Web Vitals)
  - 에러 추적 (Sentry)
- ✅ 사용자 피드백
  - 피드백 수집 시스템
  - 버그 리포트 시스템
  - 사용자 행동 분석


#### 10-2.5. 커뮤니티 및 피드백 시스템
- ✅ 게시판 기능
  - 사용자 피드백 및 의견교환
  - 통계 분석 질문 & 답변
  - 기능 요청 및 버그 리포트
- ✅ 댓글 및 토론 시스템
- ✅ 태그 기반 분류 (통계 메서드별)
- ✅ 검색 및 필터링

#### 10-3. 법적 준비
- ✅ 라이선스 확인
  - 오픈소스 라이선스 검토
  - LICENSE 파일 작성
  - 의존성 라이선스 컴플라이언스
- ✅ 개인정보 처리
  - 개인정보 처리방침 작성 (필요 시)
  - GDPR/CCPA 준수 검토 (필요 시)
  - 쿠키 정책 (필요 시)

#### 10-4. 배포 체크리스트
- [ ] TypeScript 빌드 에러 0개 (`npx tsc --noEmit`)
- [ ] 모든 테스트 통과 (`npm test`)
- [ ] 번들 크기 < 2MB (gzip 압축 후)
- [ ] Lighthouse 스코어 > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] 크로스 브라우저 테스트 (Chrome, Firefox, Safari, Edge)
- [ ] 모바일 반응형 테스트
- [ ] 프로덕션 환경 변수 설정 완료
- [ ] 도메인 및 SSL 인증서 설정
- [ ] 백업 및 롤백 계획 수립
- [ ] 사용자 문서 및 튜토리얼 작성 완료

---

### Phase 10.5: 결과 내보내기 기능 (예정)

**목표**: 통계 결과 + LLM 해석을 함께 내보내기

**내보내기 내용**:
- 기본 통계 결과 (테이블, 가정검정, 사후검정 등)
- LLM 해석 텍스트 (한줄 요약 + 상세 해석)

**구현 우선순위**:

| 순위 | 기능 | 예상 시간 | 사용 시나리오 |
|------|------|----------|-------------|
| 1 | **클립보드 복사 (HTML)** | 반나절 | 결과 → 논문/보고서에 서식 유지 붙여넣기 |
| 2 | **CSV 내보내기** | 0.5일 | 결과 테이블 데이터 재활용 |
| 3 | **PDF 리포트** | 필요시 | 독립 문서로 공유/인쇄 |

**의존성**: LLM 결과 해석 포맷 확정 후 진행

---

### Phase 11: Tauri 데스크탑 앱 (예정)

**목표**: 크로스 플랫폼 데스크탑 앱 개발 (Windows, macOS, Linux)

**기술 스택**:
- **Tauri 2.0**: Rust 기반 경량 데스크탑 프레임워크
- **기존 Next.js 앱**: 그대로 사용 (SSG 빌드)
- **로컬 파일 시스템**: 네이티브 파일 접근
- **시스템 트레이**: 백그라운드 실행

**핵심 기능**:
1. **완전 오프라인 동작**
   - Pyodide 로컬 번들링
   - Ollama 로컬 통합
   - 인터넷 연결 불필요

2. **네이티브 기능**
   - 파일 시스템 직접 접근 (대용량 파일 처리)
   - 시스템 알림 (분석 완료 시)
   - 자동 업데이트 기능
   - 시스템 트레이 통합

3. **성능 최적화**
   - 웹 버전보다 빠른 로딩
   - 메모리 효율적 관리
   - 백그라운드 계산 지원

**배포 크기**:
- Windows: ~250MB (Pyodide 포함)
- macOS: ~300MB (Universal Binary)
- Linux: ~250MB (AppImage/deb)

**개발 예상 시간**: 2-3주
- Week 1: Tauri 통합 + 빌드 설정
- Week 2: 네이티브 기능 구현
- Week 3: 테스트 + 배포 패키징

**우선순위**: Low (웹 버전 완성 후 진행)

---

## 📊 현재 구현 현황 (2025-10-15 검증)

### 통계 메서드 구현 상태 (정확한 현황)

| Worker | Python 함수 | TypeScript 래퍼 | 완료율 |
|--------|------------|----------------|--------|
| **Worker 1: Descriptive** | 8개 | 8개 | **100%** ✅ |
| **Worker 2: Hypothesis** | 12개 | 12개 | **100%** ✅ |
| **Worker 3: Nonparametric + ANOVA** | 18개 | 18개 | **100%** ✅ |
| **Worker 4: Regression + Advanced** | 17개 | 5개 | **29%** ⚠️ |
| **합계** | **55개** | **43개** | **78%** |

### Worker별 상세 현황

**✅ Worker 1-3: 완전 구현** (38/38, 100%)
- Worker 1: descriptive_stats, normality_test, outlier_detection, frequency_analysis, crosstab_analysis, one_sample_proportion_test, cronbach_alpha, kolmogorov_smirnov_test
- Worker 2: 모든 t-test 변형, z_test, chi_square (3종), binomial_test, correlation_test, partial_correlation, levene_test, bartlett_test
- Worker 3: 모든 비모수 검정 (9개), 모든 ANOVA (9개)

**⚠️ Worker 4: 부분 구현** (5/17, 29%)
- ✅ 구현: multiple_regression, logistic_regression, factor_analysis, cluster_analysis, time_series_analysis
- ❌ 미구현: linear_regression, pca_analysis, curve_estimation, binary_logistic, multinomial_logistic, ordinal_logistic, probit_regression, poisson_regression, negative_binomial_regression, nonlinear_regression, stepwise_regression, durbin_watson_test (12개)

### 다음 단계 (Phase 5-2)
**Worker 4 TypeScript 래퍼 12개 추가** → **100% 달성** (43개 → 55개)

---

## 🎯 성공 지표

### 성능 지표 (현재 vs 목표)

| 지표 | Phase 4-1 | Phase 5 목표 | 상태 |
|------|-----------|-------------|------|
| 앱 시작 | 2.8초 | <0.5초 | 🔄 Phase 5-3 |
| 첫 계산 | 11.8초 | <3초 | 🔄 Phase 5-3 |
| 캐싱 계산 | 0.27초 | <0.1초 | ✅ 달성 |
| UI 블로킹 | 11.8초 | 0초 | 🔄 Phase 5-3 |

### 품질 지표

| 지표 | 목표 | 현재 상태 |
|------|------|----------|
| 통계 메서드 구현 | 100% | 68% (41/60) |
| 테스트 커버리지 | 90%+ | ✅ 27개 통과 |
| 타입 안전성 | 100% | ⚠️ 개선 중 |
| 빌드 성공률 | 100% | ✅ 정상 |

---

## 📚 참조 문서

### 개발 가이드
- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙 (최신)
- [AI-CODING-RULES.md](stats/docs/AI-CODING-RULES.md) - any → unknown 예제

### 아키텍처
- [phase5-architecture.md](stats/docs/phase5-architecture.md) - Phase 5 아키텍처
- [phase5-implementation-plan.md](stats/docs/phase5-implementation-plan.md) - Day 1-10 계획

### 구현 현황
- [implementation-summary.md](stats/docs/implementation-summary.md) - 최신 구현 현황
- [priority1-implementation.md](stats/docs/priority1-implementation.md) - 우선순위 1 (11개)
- [priority2-implementation.md](stats/docs/priority2-implementation.md) - 우선순위 2 (13개)

### 완료 보고서
- [phase2-complete.md](stats/docs/phase2-complete.md) - 리팩토링 상세
- [phase3-complete.md](stats/docs/phase3-complete.md) - Pyodide 통합
- [phase4-runtime-test-complete.md](stats/docs/phase4-runtime-test-complete.md) - E2E 테스트

### 초기 계획 (참고)
- [PROJECT_INITIAL_VISION.md](PROJECT_INITIAL_VISION.md) - 초기 비전 문서
- [AI_MODEL_INTEGRATION_PLAN.md](AI_MODEL_INTEGRATION_PLAN.md) - AI 통합 계획 (Phase 8+)

---

## 🧪 Phase 11: E2E 테스트 (예정)

**목표**: 핵심 사용자 플로우의 브라우저 기반 자동 검증

**현재 상태**:
- ✅ Golden Values 테스트 44/44 통과 (통계 계산 정확성 보장)
- ✅ Vitest 단위 테스트 214개 (Store/로직 검증)
- 🔄 E2E 12개 기반 구축 완료

**내용**:
- Playwright로 실제 사용자 플로우 검증
- 데이터 업로드 → 분석 → 결과 확인 → LLM 해석 표시
- 핵심 통계 메서드 우선 커버

**산출물**:
- `e2e/statistics/*.spec.ts`
- `e2e/fixtures/*.csv`

---


---

## 🐟 Phase 12: 수산과학 도메인 전환 (완료, 2025-11-24)

**목표**: 통계 예시를 수산과학 도메인으로 통일하여 전문성 강화

### 완료 현황 (Phase 1: 핵심 파일) ✅

**작업 범위**:
- ✅ **도메인 예시 중앙화**: `lib/constants/domain-examples.ts` 생성 (310줄)
- ✅ **변수 선택 가이드**: `VARIABLE_SELECTION_GUIDE.md` 수정 (11개 예시)
- ✅ **변수 요구사항**: `variable-requirements.ts` 수정 (68개 예시)
- ✅ **테스트 데이터**: 24개 CSV 파일 수정 (15개 파일명 + 7개 내용)
- ✅ **TypeScript 검증**: 수정 파일 컴파일 통과 (0 errors)

**수산과학 도메인 체계**:

```typescript
// lib/constants/domain-examples.ts
DOMAIN_EXAMPLES.fisheries = {
  continuous: {
    physical: ['체중_g', '체장_cm', '전장_cm', '비만도'],
    environment: ['수온_C', '염분도_ppt', 'pH', '용존산소_mg_L'],
    nutrition: ['사료섭취량_g', '단백질함량_%', '지질함량_%'],
    production: ['생산량_kg', '생존율_%', '사료효율_FCR'],
    biochemical: ['간중량지수_HSI', '생식소중량지수_GSI'],
  },
  categorical: {
    species: ['넙치', '조피볼락', '전복', '참돔', '방어'],
    treatment: ['사료종류_A', '사료종류_B', '대조구'],
    location: ['양식장_1', '수조_A', '해역_동해'],
    quality: ['품질등급_상', '선도_A'],
    bio: ['성별_암', '성별_수', '연령_1년생'],
  }
}

// 헬퍼 함수
getExample('continuous', 'physical', 2) // → "체중_g, 체장_cm"
getExamplesArray('categorical', 'treatment', 3) // → ["사료종류_A", "사료종류_B", "사료종류_C"]

// 통계 방법별 프리셋 (43개)
STATISTICS_EXAMPLES.oneWayAnova = {
  dependent: "체중_g",
  factor: "사료종류_A",
  description: "사료 종류(A, B, C)가 넙치 체중에 미치는 영향을 분석합니다."
}
```

**주요 용어 매핑**:

| 기존 (혼재) | 수산과학 (표준) | 영문 | 단위 |
|-------------|----------------|------|------|
| 키, 신장 | 체장 (또는 전장) | Body_Length | cm |
| 몸무게, 체중 | 체중 | Body_Weight | g, kg |
| 온도 | 수온 | Water_Temperature | °C |
| 농도 | 염분도 | Salinity | ppt, psu |
| 치료법 | 사료 종류 | Feed_Type | A, B, C |
| 환자ID | 개체 번호 | Fish_ID | - |
| 실험군 | 처리구 | Treatment_Group | - |
| 대조군 | 대조구 | Control_Group | - |

**CSV 파일 변환** (15개):
- 일원분산분석_**치료법**비교.csv → 일원분산분석_**사료종류**비교.csv
- 독립표본t검정_성별차이.csv → 독립표본t검정_**암수**차이.csv
- 로지스틱회귀_**합격여부**.csv → 로지스틱회귀_**생존여부**.csv
- 상관분석_**키와몸무게**.csv → 상관분석_**체중체장**.csv
- 클러스터링_**고객세분화**.csv → 클러스터링_**개체군집**.csv

**달성 효과**:
- ✅ **일관성 100% 확보**: 단일 소스 관리 (`domain-examples.ts`)
- ✅ **전문성 강화**: "수산과학 전문 통계 플랫폼" 포지셔닝 명확화
- ✅ **유지보수 효율화**: 예시 변경 시 1개 파일만 수정
- ✅ **확장 가능**: 다른 도메인 추가 용이 (medical, education 이미 정의됨)

---

### Phase 12-2: ~~통계 페이지 UI 업데이트~~ (보류 — 레거시)

**상태**: ⏸️ 보류 (2026-02-13 아키텍처 결정)
- 개별 `/statistics/*` 43개 페이지는 레거시로 전환됨
- Smart Flow가 유일한 통계 진입점이므로 개별 페이지 UI 업데이트 우선순위 낮음
- 필요 시 향후 재검토

---

### Phase 12-3: 다국어 + 다중 도메인 지원 (예정)

**목표**: 언어와 도메인을 분리하여 확장 가능한 구조 구축

**현재 상태** (2026-02):
- Terminology System 완성: `useTerminology()` 훅 기반, 25+ 컴포넌트 전환 완료
- 사전 2개: `aquaculture` (한국어+수산과학), `generic` (영어+범용)
- 런타임 전환 가능: `setDomain()` + localStorage 유지

**설계 원칙**:
- 한국어는 수산과학 도메인만 특화, 나머지 도메인은 영어 기반 `generic`을 표준으로 통일
- 새 언어 추가 시 `generic` 사전을 번역 → 코드 수정 없이 사전 파일만 추가
- `TerminologyDictionary` 타입이 모든 필드를 required로 강제 → 번역 누락 시 컴파일 에러

**확장 전략**:
```
현재:   aquaculture (한국어) ← 수산과학 특화
        generic (영어)       ← 표준 (모든 언어의 base)

향후:   generic-ja (일본어)  ← generic 번역
        generic-zh (중국어)  ← generic 번역
        aquaculture (한국어) ← 수산과학만 유지
```

**기능**:
- 스마트 플로우 Step 0에 도메인/언어 선택 추가
- Context 기반 예시 동적 전환
- fallback 체인: `aquaculture-ko` → `generic-ko` → `generic-en`
- 도메인 지원:
  - 🐟 수산과학 (한국어 기본) - 넙치, 수온, 사료 등
  - 🏥 의료/보건 - 환자, 치료법, 혈압 등
  - 📚 교육 - 학생, 점수, 학습시간 등
  - 🌐 일반 - 추상적 변수명

**예상 시간**: 5일 (fallback 체인 구현 포함)

**예상 효과**:
- 범용성 확보 (타 분야 연구자 + 해외 사용자)
- "수산과학 특화" + "다국어 서비스" 동시 달성

---

**참고 문서**:
- [lib/constants/domain-examples.ts](stats/lib/constants/domain-examples.ts) - 도메인 예시 중앙 관리
- [docs/guides/VARIABLE_SELECTION_GUIDE.md](stats/docs/guides/VARIABLE_SELECTION_GUIDE.md) - 변수 선택 가이드

**Git Commits**:
- `[commit-hash]` - feat(domain): 수산과학 도메인 전환 (Phase 12-1 완료)

**우선순위**: Medium (Phase 2-3은 향후 필요 시 진행)



---

## Phase 13: LLM 분석 추천 + 결과 해석 (2026-02-05 ~ 02-06) ✅

**목표**: 자연어 입력 → AI 분석 추천 + 결과 해석

**성과**:
- ✅ OpenRouter 3단 폴백 (GLM-4.5-Air → DeepSeek-R1T → DeepSeek-R1T2)
- ✅ `AIRecommendation` 확장: variableAssignments, suggestedSettings, warnings, dataPreprocessing, ambiguityNote
- ✅ 시스템 프롬프트 + 데이터 컨텍스트 (skewness, topCategories, PII 필터링)
- ✅ 변수 할당 유효성 검증 (LLM 환각 방지)
- ✅ NaturalLanguageInput UI: 추천 카드 (변수 미리보기, 경고, 전처리, 모호성 대응)
- ✅ 결과 해석: 스트리밍 AI 해석 (한줄 요약 + 상세), SSE 버퍼링 수정
- ✅ 변수 자동 할당: extractDetectedVariables() 3단 우선순위, store 연동
- ✅ 단위 테스트 29개 + 통합 테스트 20개

**핵심 산출물**:
- `lib/services/openrouter-recommender.ts` — 추천 + 스트리밍 API
- `lib/services/result-interpreter.ts` — 결과 해석 프롬프트 빌더
- `components/smart-flow/steps/purpose/NaturalLanguageInput.tsx` — AI 입력 UI
- `study/PLAN-LLM-ENHANCED-RECOMMENDATION.md` — 구현 계획 (Phase 1-3 + 부록)

**문서**: [PLAN-LLM-ENHANCED-RECOMMENDATION.md](study/PLAN-LLM-ENHANCED-RECOMMENDATION.md)

> 이전 Phase 13 (Rule-based Insights)은 LLM 기반 해석으로 대체됨.

---

## 🤖 Phase 14: RAG 시스템 고도화 (예정)

**목표**: 벡터스토어/모델 관리 UI + 검색 품질 향상

**배경** (2026-02-04):
- Phase 8에서 기본 RAG 시스템 구축 완료 (Ollama + sql.js + IndexedDB)
- 현재 벡터스토어는 사전빌드만 지원, 모델 관리는 Ollama CLI에서만 가능
- 사용자가 직접 벡터스토어 생성/삭제/선택 및 모델 관리가 필요

### 아키텍처 결정 및 근거

**핵심 제약**: `output: 'export'` (static HTML) 유지 필수
- 현재 Vercel 배포 + 오프라인 HTML 배포 모두 static export 기반
- API Routes 추가 시 static export 불가 → 배포 방식 전면 변경 필요
- 따라서 모든 기능은 **브라우저 + Ollama REST API**로 구현

**LightRAG 등 외부 프레임워크 미도입 이유**:
- LightRAG, RAGFlow 등은 모두 Python 백엔드 필수 → static export와 양립 불가
- 통계 분석이 본업, RAG는 보조 기능 → 백엔드 추가는 과도한 복잡도
- 사용자 = 수산과학 연구자 → RAG 인프라 운영 능력 제한적
- 폐쇄망 배포 시나리오 존재 → 추가 서버 설치 부담

**모델 관리가 서버 없이 가능한 이유**:
- Ollama가 REST API 제공 (`/api/tags`, `/api/pull`, `/api/delete`)
- 브라우저에서 직접 HTTP 호출 가능
- 백엔드/프록시 불필요

**벡터스토어 CRUD가 서버 없이 가능한 이유**:
- sql.js (WASM SQLite)가 브라우저에서 실행
- IndexedDB로 영구 저장
- Ollama Embedding API로 임베딩 생성
- 이미 DocumentManager에 재빌드 로직 존재 → UI만 확장

**참고 문서** (전역 docs 레포):
- [HYBRID_RAG_RESEARCH.md](https://github.com/dayoumin/docs/blob/main/rag/HYBRID_RAG_RESEARCH.md) - Hybrid RAG 기술 조사
- [RAG_PRODUCTION_GUIDE.md](https://github.com/dayoumin/docs/blob/main/rag/RAG_PRODUCTION_GUIDE.md) - 프로덕션 방법론

---

### Phase 14-1: 모델 관리 UI (우선순위: High)

**목표**: Ollama REST API 기반 모델 관리 기능

**근거**: 현재 모델 추가/삭제는 Ollama CLI에서만 가능하여 사용자 접근성 낮음.
Ollama가 이미 REST API를 제공하므로 브라우저 UI만 추가하면 됨.

**Ollama API 활용**:
| API | 용도 | static export |
|-----|------|:---:|
| `GET /api/tags` | 설치된 모델 목록 | ✅ |
| `POST /api/pull` | 모델 다운로드 (추가) | ✅ |
| `DELETE /api/delete` | 모델 삭제 | ✅ |
| `POST /api/show` | 모델 상세 정보 | ✅ |

**UI 기능**:
- 설치된 모델 목록 조회 (임베딩 + 추론 분리 표시)
- 새 모델 다운로드 (진행률 표시)
- 모델 삭제 (확인 다이얼로그)
- 모델 상세 정보 (크기, 파라미터 수, 양자화 정보)
- 추천 모델 목록 (임베딩/추론별)

**산출물**:
- `components/rag/ModelManager.tsx` - 모델 관리 UI
- `lib/rag/services/ollama-model-service.ts` - Ollama API 래퍼

**예상 시간**: 1-2일

---

### Phase 14-2: 벡터스토어 CRUD (우선순위: High)

**목표**: 브라우저 내 벡터스토어 생성/삭제/선택

**근거**: 현재 벡터스토어는 빌드 시 Python으로 사전 생성만 가능.
사용자가 도메인별 벡터스토어를 만들고 선택 사용하는 기능 필요.
이미 DocumentManager에 문서 CRUD + 재빌드 로직이 존재하므로 UI 확장으로 충분.

**기술 스택**: sql.js (WASM SQLite) + IndexedDB + Ollama Embedding API

**벡터스토어 생성 플로우**:
```
사용자 문서 업로드 (PDF, MD, HWP)
    │
    ▼
청킹 (문서 유형별 전략 - Parent-Child 권장)
    │
    ▼
Ollama /api/embeddings 호출 (임베딩 모델 선택)
    │
    ▼
sql.js로 벡터 DB 생성 (브라우저 내)
    │
    ▼
IndexedDB에 저장 (세션 간 유지)
```

**UI 기능**:
- 벡터스토어 목록 (사전빌드 + 사용자 생성 통합)
- 새 벡터스토어 생성 (문서 업로드 → 임베딩 → DB 생성)
- 벡터스토어 삭제
- 벡터스토어 선택 (기존 VectorStoreSelector 활성화)
- 메타데이터 표시 (문서 수, 크기, 임베딩 모델, 차원)
- 생성 진행률 표시 (% + 현재 문서)

**산출물**:
- `components/rag/VectorStoreManager.tsx` - 벡터스토어 CRUD UI
- `lib/rag/services/vector-store-service.ts` - 벡터스토어 생성/삭제 로직
- `components/rag/VectorStoreSelector.tsx` - 기존 컴포넌트 활성화

**예상 시간**: 2-3일

---

### Phase 14-3: 검색 품질 개선 (우선순위: Medium)

**목표**: Hybrid Search 고도화

**근거**: 현재 FTS5 + Vector Hybrid 검색이 기본 RRF만 적용.
HYBRID_RAG_RESEARCH.md 조사 결과 Parent-Child Retrieval + Query Rewriting으로
15-30% precision 향상 가능. 서버 없이 클라이언트에서 구현 가능.

**개선 사항**:
- FTS5 + Vector 하이브리드 검색 RRF 가중치 최적화
- 청킹 전략 개선 (Parent-Child Retrieval)
  - 작은 청크의 정밀 매칭 + 큰 청크의 풍부한 컨텍스트
- Query Rewriting (LLM 기반 질문 변환)
  - 사용자 질문과 벡터 DB 문서 간 semantic gap 해소
- Top-K 동적 조정

**예상 시간**: 2-3일

---

### Phase 14-4: 서버 모드 + LightRAG (우선순위: Low, 선택적)

**목표**: Knowledge Graph 기반 Hybrid RAG (백엔드 필요 시)

**근거**: Phase 14-1~3으로 충분할 가능성 높음.
Knowledge Graph가 필요한 경우는: 엔티티 5개+ 쿼리, 멀티홉 추론 필요 시.
현재 통계 문서 RAG 용도에서는 벡터 검색으로 충분.

**조건**: Phase 14-1~3 완료 후, KG 필요성이 확인된 경우에만 진행

**변경 사항**:
- `output: 'export'` 제거 → Next.js API Routes 활용
- 또는 별도 FastAPI 서버 + LightRAG
- Feature flag로 "클라이언트 모드 / 서버 모드" 분기

**추가 기능**:
- LightRAG mix mode (Vector + KG 동시 검색)
- Reranker (BAAI/bge-reranker-v2-m3)
- Entity Resolution 파이프라인
- Knowledge Graph 시각화

**예상 시간**: 1-2주

---

### Phase 14 구현 우선순위

| 기능 | 우선순위 | 예상 시간 | static export | 서버 필요 |
|------|---------|---------|:---:|:---:|
| 모델 관리 UI | High | 1-2일 | ✅ 유지 | ❌ |
| 벡터스토어 CRUD | High | 2-3일 | ✅ 유지 | ❌ |
| 검색 품질 개선 | Medium | 2-3일 | ✅ 유지 | ❌ |
| LightRAG 통합 | Low | 1-2주 | ❌ 제거 | ✅ |

**Phase 14-1~3 총 예상 시간**: 5-8일 (서버 불필요, HTML 배포 유지)

**판단 기준**: Phase 14-3 완료 후 검색 품질이 부족하면 14-4 검토.
벤치마크 기준: Gold-Standard QA 100개 질문 대비 정확도 85% 미만이면 KG 도입 고려.

---

## 🧬 Phase 15: BioResearch Platform — 생물학 연구자 통합 도구 (예정)

**목표**: 통계 분석 플랫폼을 생물학 연구자 올인원 도구로 확장
**원칙**: 단순 AI wrapper가 아닌, 실제 계산/검증/가공 엔진
**전략**: 빌드(핵심) + 연결+가공(외부 API) + 안함(기존 도구 충분)
**상세 계획서**: [PLAN-BIORESEARCH-PLATFORM.md](study/PLAN-BIORESEARCH-PLATFORM.md)
**Bio-Tools 검증 보고서**: [PLAN-BIO-STATISTICS-AUDIT.md](study/PLAN-BIO-STATISTICS-AUDIT.md)

### 아키텍처 결정 (2026-02-13)

```
[Smart Flow] (홈 /)     = 43개 통계 메서드의 유일한 진입점
[Bio-Tools] (/bio-tools) = 12개 생물학 분석, 5페이지 (별도 섹션)
[개별 통계] (/statistics) = 레거시 (코드 유지, 신규 개발 안 함)
```

### 플랫폼 포지셔닝

```
현재: "통계 분석 도구" (범용)
  ↓
목표: "생물학 연구자 올인원 플랫폼" (도메인 특화)
  = Smart Flow(통계) + Bio-Tools(생태/수산) + 학명검증 + 문헌도구 + 논문도구
```

### 핵심 차별점

- **데이터 프라이버시**: 모든 계산 브라우저 내 실행 (서버 전송 없음)
- **워크플로우 연결**: 외부 API 조회 → 우리 엔진 가공 → 논문 도구 출력
- **도메인 특화**: 수산/해양/생물학 용어, 기준값 내장
- **단순 조회가 아닌 가공**: GBIF 좌표 → 공간통계, 논문 검색 → 트렌드 분석

### 아키텍처

```
┌─────────────────────────────────────────────────┐
│          BioResearch Platform (브라우저)           │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 계산 엔진  │  │ 외부 연결  │  │ 출력 도구     │  │
│  │ (Pyodide) │  │ (API Hub) │  │ (Export)     │  │
│  │           │  │           │  │              │  │
│  │ 통계 분석  │  │ WoRMS    │  │ APA 표       │  │
│  │ 생태 지수  │  │ FishBase │  │ 논문 초안     │  │
│  │ 성장 곡선  │  │ GBIF     │  │ PDF 보고서   │  │
│  │ 메타분석   │  │ NCBI     │  │ 분석 로그    │  │
│  │ 개체군유전 │  │ OpenAlex │  │ 서지정보     │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                      │                           │
│  ┌───────────────────┴───────────────────────┐   │
│  │         워크플로우 허브 (연결 레이어)         │   │
│  │  "GBIF 좌표 → 공간통계 → 분포 지도 → 논문"   │   │
│  │  "분석 결과 → OpenAlex → 유사 선행연구"      │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  Cloudflare Pages (정적) + Workers (API 프록시)   │
└─────────────────────────────────────────────────┘
```

### 외부 API → 우리가 가공하는 것 (핵심 가치)

| 외부 데이터 | 가져오는 것 | 우리가 가공하는 것 |
|------------|-----------|-----------------|
| **GBIF** 좌표 데이터 | 종별 채집 기록 (위경도) | 분포 지도 (Leaflet) + 공간 통계 (Moran's I, 밀도) + 시기별 출현 패턴 |
| **FishBase** 성장 파라미터 | L∞, K, t₀ 기록값 | 사용자 데이터와 **자동 비교** ("본 연구 L∞=42cm vs FishBase 45cm") |
| **OpenAlex** 논문 메타데이터 | 제목, 저자, 인용 수 | 연도별 트렌드 + 주요 저자 네트워크 + 키워드 공출현 |
| **NCBI** 유전자/서열 | TaxID, FASTA 서열 | 서열 통계 (GC%, 길이) + 유사도 행렬 → 클러스터 분석 |
| **분석 결과** (내부) | 통계량, p-value, 효과크기 | APA Methods/Results 자동 생성 + 관련 논문 자동 검색 |

### 분석 → 논문 파이프라인 (Module D 핵심)

```
[ANOVA 분석 완료 → 버튼 하나]
    │
    ├─ Methods: "일원배치 분산분석을 실시하였다 (F(2,57)=4.23, p=.019)"
    ├─ Results: "사료 A(M=245.3)와 사료 C(M=212.8) 간 유의한 차이 (p=.014)"
    ├─ APA Table: Source | SS | df | MS | F | p | η²
    ├─ Figure + Caption: 자동 생성
    └─ 관련 선행연구: OpenAlex 자동 검색 → "유사 분석을 한 논문 10건"
```

### 구현 로드맵

#### Phase 15-1: Bio-Tools (생물학 분석 도구) — 2.5주

12개 생물학 분석을 `/bio-tools/` 5페이지로 구현. Pyodide 내장 패키지만 사용 (외부 의존 없음).

**상세 계획**: [PLAN-BIO-STATISTICS-AUDIT.md](study/PLAN-BIO-STATISTICS-AUDIT.md)

#### Phase 15-2: 종 정보 허브 — 2주

학명 하나로 모든 생물 정보 한 화면에.

| 기능 | 시간 | API |
|------|------|-----|
| WoRMS 연동 + 학명 검증 통합 | 2일 | WoRMS REST (CORS ✅) |
| FishBase 연동 + 생태정보 | 2일 | FishBase API |
| GBIF 연동 + 분포 지도 | 3일 | GBIF API (CORS ✅) + Leaflet |
| GBIF 데이터 → 공간 통계 가공 | 2일 | Pyodide |
| Cloudflare Workers CORS 프록시 | 1일 | Wrangler |

#### Phase 15-3: 문헌 도구 — 1.5주

논문 검색 + 결과 통계 가공 + 메타분석.

| 기능 | 시간 | API |
|------|------|-----|
| OpenAlex 논문 검색 | 2일 | OpenAlex (CORS ✅) |
| 검색 결과 통계 가공 (트렌드, 저자 네트워크) | 2일 | Pyodide |
| CrossRef DOI → 서지정보 + 인용 형식 변환 | 1일 | CrossRef (CORS ✅) |
| 메타분석 (Forest plot, 이질성 검정) | 2일 | Pyodide + Plotly |

#### Phase 15-4: 논문 작성 도구 — 1.5주

분석 결과 → 논문 구성요소 자동 생성.

| 기능 | 시간 | 기술 |
|------|------|------|
| 분석 → Methods/Results 자동 생성 | 3일 | 템플릿 + LLM 보조 |
| APA 표 자동 포맷팅 | 2일 | 규칙 기반 |
| Figure caption 생성 | 1일 | 템플릿 |
| 분석 히스토리 로그 (자동 저장) | 2일 | IndexedDB |

#### Phase 15-5: NCBI 연결 + 개체군 유전학 — 2주

| 기능 | 시간 | 기술 |
|------|------|------|
| NCBI Entrez 연동 (Workers 프록시) | 2일 | Cloudflare Workers |
| 서열 기본 통계 (GC%, 길이 분포) | 1일 | Pyodide |
| 개체군 유전학 (Fst, AMOVA, Hardy-Weinberg) | 4일 | Pyodide (scipy) |
| Haplotype network 시각화 | 3일 | D3.js 또는 Plotly |

#### Phase 15-6: 데이터 도구 + 통합 — 1주

| 기능 | 시간 |
|------|------|
| 와이드↔롱 변환 | 1일 |
| 이상치/결측치 도구 | 1일 |
| 단위 변환 | 0.5일 |
| 전체 통합 테스트 + UX | 2일 |

### 빌드 vs 연결 vs 안함 정리

| 전략 | 대상 | 이유 |
|------|------|------|
| **빌드** | 통계, 생태지수, 성장곡선, 논문도구, 메타분석, 개체군유전, 분석로그 | 핵심 가치, Pyodide 확장 |
| **연결+가공** | WoRMS, FishBase, GBIF, NCBI, OpenAlex, CrossRef | API 조회 → 통계 가공 |
| **안함** | 풀 ELN(Benchling), 프로젝트관리(Notion), BLAST, AlphaFold, 이미지AI | 기존 도구가 최고 |

### 총 일정

| Phase | 기간 | 의존성 |
|-------|------|--------|
| 15-1 생태 분석 | 2주 | 없음 (즉시) |
| 15-2 종 정보 허브 | 2주 | Cloudflare 배포 후 |
| 15-3 문헌 도구 | 1.5주 | 15-2와 병렬 가능 |
| 15-4 논문 작성 | 1.5주 | 15-1 완료 후 |
| 15-5 NCBI + 유전 | 2주 | 15-2 Workers 후 |
| 15-6 데이터 도구 | 1주 | 아무때나 |
| **합계** | **~10주** | |

---

## ☁️ Phase 16: Cloudflare Workers 백엔드 (KV / R2 / D1) (예정)

**목표**: 분석 히스토리 영구 저장 + 데이터셋 보관 + 세션 캐시
**전략**: 어댑터 패턴으로 클라우드(Cloudflare) + 내부망(Docker) 양쪽 배포
**브랜치**: `feature/cloudflare-backend` (별도 분기)
**의존성**: Phase 10-0 (Cloudflare Pages 배포) + LLM 브랜치 머지 후
**상세 계획서**: [PLAN-CLOUDFLARE-BACKEND.md](study/PLAN-CLOUDFLARE-BACKEND.md)

### 배경

현재 순수 클라이언트 앱 → 브라우저 닫으면 모든 데이터 소멸.
Cloudflare $5/월 플랜 내에서 추가 비용 없이 백엔드 기능 추가 가능.

### 핵심 기능

| 서비스 | 용도 | 내부망 대체 |
|--------|------|-----------|
| **D1** | 분석 히스토리, 사용자 설정, 분석 템플릿 | SQLite (better-sqlite3) |
| **R2** | CSV/데이터 파일 보관 ("이전 데이터셋" 재사용) | MinIO 또는 로컬 파일 |
| **KV** | Smart Flow 세션 상태, LLM 응답 캐시 | Redis 또는 인메모리 |

### 아키텍처

```
[브라우저] → Cloudflare Pages (정적 파일)
          → Cloudflare Workers (/api/*)
             ├── D1: 분석 결과 저장/조회
             ├── R2: 데이터셋 업로드/다운로드
             └── KV: 세션 캐시, LLM 캐시

[내부망] → Nginx (정적 파일)
        → Node.js + Hono (/api/*)
           ├── SQLite: 동일 스키마
           ├── 로컬 파일: 동일 API
           └── Redis: 동일 캐시
```

### 구현 순서

| Phase | 내용 | 예상 시간 |
|-------|------|----------|
| A | 프로젝트 구조 (workers/, Hono, wrangler.toml) | 0.5일 |
| B | D1 분석 히스토리 API + 프론트엔드 연동 | 2일 |
| C | R2 데이터셋 보관 + 파일 선택 UI | 1.5일 |
| D | KV 세션 캐시 + LLM 캐시 | 1일 |
| E | 내부망 어댑터 (LocalAdapter + Docker Compose) | 1일 |
| F | 테스트 + 배포 가이드 | 1일 |
| **합계** | | **~7일** |

### 비용

- Cloudflare $5/월 플랜: **추가 $0** (모든 무료 한도 내)
- 내부망: **$0** (오픈소스 + 기존 서버)

---

## 🔮 장기 비전

### 기술적 목표
- 통계 메서드: 100개 이상 구현
- 생태 분석 도구: 10개 이상
- 외부 API 연동: 6개 이상
- 성능: SPSS 급 반응 속도 (<1초)
- 플랫폼: 웹 + 데스크탑 + 모바일

### 사용자 경험 목표
- 새 사용자 온보딩: <10분
- 일반적인 분석 완료: <5분
- 분석 → 논문 표/그래프: 버튼 하나
- 전문가 만족도: >4.5/5

---

**최종 업데이트**: 2026-02-28
**현재 Phase**: Bio-Tools 계획 수립 완료
**아키텍처 결정**: Smart Flow = 통계 진입점, Bio-Tools = 별도 섹션, /statistics/* = 레거시
**다음 마일스톤**: Phase 15-1 (Bio-Tools 구현)

**최근 완료**:
- Bio-Tools 검증 보고서 작성 (12개 확정, 6개 제외, Pyodide 호환성 검증) (2026-02-13)
- Graph Studio ECharts 전환 + 유틸/스토어 보강 + 102개 테스트 (2026-02-28)

---

## 🔗 Graph Studio 연동 파이프라인 (미래 과제)

**현재**: Smart Flow(통계 분석)와 Graph Studio(시각화)는 완전 독립 모듈.
**목표**: Smart Flow 분석 결과를 Graph Studio로 직접 넘겨 논문용 차트 생성.

### 시나리오
```
Smart Flow → ANOVA 결과 → Graph Studio → 논문용 박스플롯 PNG
```

### 구현 방향 (결정 시점에 검토)
- Smart Flow `ResultsActionStep`에 "Graph Studio에서 시각화" 버튼 추가
- Smart Flow 결과 데이터를 `DataPackage` 포맷으로 변환하는 어댑터 함수 구현
- 현재 코드가 이 확장을 막는 구조는 아님 (설계상 열려 있음)

### 향후 과제: 이미지 삽입 기능
- 논문 차트 내 이미지 오버레이 (예: 조직 사진 + 그래프 결합)
- ECharts `graphic` API 활용 또는 HTML Canvas 합성 방식 검토
- 우선순위: Bio-Tools 완료 이후

**우선순위**: Phase 15 이후 (Bio-Tools + 실사용 피드백 수집 후 결정)
- 용어 정비 (Smart Flow / Bio-Tools / 레거시 구분 명확화) (2026-02-13)
- Cloudflare Workers 백엔드 계획 수립 (KV/R2/D1 + 내부망 어댑터) (2026-02-06)
- LLM 추천/해석 Phase 1-3 완료 (2026-02-06)

---

## 📋 백로그: ANOVA 사후검정 개선 (예정)

**목표**: 이원/삼원 ANOVA 사후검정의 Games-Howell 자동 선택 로직 추가

**배경** (2025-11-28):
- 일원 ANOVA: Levene 검정 기반 Tukey HSD / Games-Howell 자동 선택 ✅ 완료
- 이원/삼원 ANOVA: 현재 Tukey HSD만 사용 (의도적 설계)
- 반복측정 ANOVA: Bonferroni 보정 paired t-test ✅ 이미 구현됨

**미구현 이유**:
- 다요인 ANOVA에서 각 요인별 등분산성 검정이 복잡함
- 요인별로 다른 사후검정 방법 사용 시 결과 해석 혼란 우려
- 현재 설계: "유의한 주효과에 대해 Tukey HSD 다중비교 수행"

**향후 개선 시 고려사항**:
1. 각 요인별 Levene 검정 실행
2. 요인별로 Tukey HSD / Games-Howell 자동 선택
3. UI에 요인별 방법 선택 이유 표시
4. 사용자 수동 선택 옵션 추가

**예상 시간**: 1-2일

**우선순위**: Low (현재 구현으로 충분히 사용 가능)

**관련 파일**:
- [anova/page.tsx](stats/app/(dashboard)/statistics/anova/page.tsx) - Lines 599-662 (이원), 833-899 (삼원)
- [worker3-nonparametric-anova.py](stats/public/workers/python/worker3-nonparametric-anova.py) - games_howell_test()

---

## 📋 백로그: ~~개별 통계 페이지 UI 통일~~ (보류 — 레거시)

**상태**: ⏸️ 보류 (2026-02-13 아키텍처 결정)
- 개별 `/statistics/*` 43개 페이지는 레거시로 전환됨
- Smart Flow가 유일한 통계 진입점이므로 우선순위 없음

---

## 📋 백로그: 프로젝트 구조 단순화 (예정)

**목표**: 모노레포 구조 → 플랫 구조로 변경하여 개발 편의성 향상

**배경** (2025-11-28):
- 현재 `stats/` 하위 폴더에 Next.js 앱 위치
- 매번 `cd stats` 필요
- `vercel.json`에서 경로 지정 필요
- IDE에서 루트 열면 Next.js 자동 인식 안 됨

**현재 구조**:
```
Statics/                        ← Git 루트
├── CLAUDE.md, README.md, ...   ← 문서
├── vercel.json                 ← 경로 지정 필요
├── archive/, docs/ (루트)      ← 임시 파일들
└── stats/       ← Next.js 앱
    ├── app/, components/, ...
    └── package.json
```

**목표 구조**:
```
Statics/                        ← Git 루트 + Next.js 루트
├── app/, components/, lib/     ← Next.js 앱 (루트로 이동)
├── package.json
├── CLAUDE.md, README.md, ...   ← 문서 유지
├── vercel.json                 ← 단순화
└── src-tauri/                  ← (나중에 Tauri 추가 시)
```

**작업 내용**:
1. 루트의 임시 파일들 정리 (archive로 이동 또는 삭제)
2. `stats/*` 내용을 루트로 이동
3. `vercel.json` 단순화
4. `CLAUDE.md` 내 경로 참조 수정
5. `.gitignore` 병합
6. 빌드 테스트

**예상 효과**:
- `npm run dev` 바로 실행 가능
- IDE에서 Next.js 자동 인식
- 경로 관련 설정 오류 감소
- 신규 개발자 진입 장벽 낮춤

**우선순위**: Low (현재 기능에 영향 없음, 편의성 개선)

**주의사항**:
- Git 히스토리는 유지됨 (파일 이동으로 처리)
- Vercel 재배포 필요
