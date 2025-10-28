# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재**: Phase 6 완료 (PyodideCore 직접 연결, Facade 제거 완료)

## ⚠️ AI 코딩 엄격 규칙 (CRITICAL)

### 1. TypeScript 타입 안전성 (최우선)

**필수 규칙**:
- ❌ `any` 타입 절대 금지
- ✅ `unknown` 사용 후 타입 가드로 안전하게 타입 좁히기
- ✅ 모든 함수에 명시적 타입 지정 (파라미터 + 리턴)
- ✅ `Promise<T>` 리턴 타입 명시 (async 함수)
- ✅ null/undefined 체크 필수 (early return 패턴)
- ✅ 옵셔널 체이닝 (`?.`) 적극 사용
- ❌ Non-null assertion (`!`) 절대 금지 → 타입 가드로 대체

**any → unknown 변환 패턴**:
```typescript
// ❌ 나쁜 예
function process(data: any) {
  return data.value
}

// ✅ 좋은 예
function process(data: unknown): number {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data')
  }
  if (!('value' in data) || typeof data.value !== 'number') {
    throw new Error('Missing or invalid value')
  }
  return data.value
}
```

**상세 예제**: [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md)

### 2. Pyodide 통계 계산 규칙 (CRITICAL)

**통계 계산 구현 원칙**:
- ❌ **JavaScript로 통계 함수 직접 구현 절대 금지**
- ❌ **Python에서 알고리즘 직접 구현 절대 금지**
- ✅ **반드시 검증된 통계 라이브러리 사용**
  - SciPy: 기본 통계 (t-test, ANOVA, correlation 등)
  - statsmodels: 회귀분석, GLM, 시계열 분석
  - pingouin: 고급 통계 (effect size, post-hoc 등)
  - pandas: 데이터 정제 및 그룹화

**직접 구현이 허용되는 경우**:
- 데이터 정제 (None, NaN 제거)
- UI 포맷팅 (결과 변환)
- 입력 검증 (샘플 크기 체크)
- ⚠️ **통계 계산 로직은 직접 구현 금지!**

**직접 구현 시 반드시 사전 승인**:
- 라이브러리에 해당 기능이 없는 경우
- 사용자에게 먼저 물어보고 승인 받기
- 예: "SciPy에 없는 기능입니다. 직접 구현할까요?"

**나쁜 예** (절대 금지):
```python
# ❌ 직접 구현 - Newton-Raphson
def logistic_regression(X, y):
    beta = np.zeros(...)
    for i in range(100):
        gradient = ...  # ← 직접 계산 금지!
```

**좋은 예** (라이브러리 사용):
```python
# ✅ statsmodels 사용
import statsmodels.api as sm
def logistic_regression(X, y):
    model = sm.Logit(y, X).fit()
    return model.params
```

**기타 규칙**:
- ✅ `pyodideService.descriptiveStats()` ← 실제 메서드명 확인 후 사용
- ✅ 새 메서드 추가 전 `Grep`으로 기존 메서드 검색
- ✅ Pyodide는 CDN에서 로드 (npm 패키지 사용 금지)

### 3. 컴파일 체크 필수 (생성 후 즉시)

```bash
# 코드 작성 후 즉시 실행
npx tsc --noEmit

# 타입 오류 0개 확인
npm run build
```

### 4. 리팩토링 후 정리 체크리스트

- ✅ 타입/인터페이스 변경 시 `Grep`으로 이전 이름 완전 제거
- ✅ `.backup`, `.old`, `.new` 같은 임시 파일 삭제
- ✅ TypeScript 컴파일 체크로 타입 오류 0개 확인
- ✅ 문서/주석에서도 이전 명칭 업데이트
- ❌ 이전 파일/타입을 남겨두고 새 이름만 추가 금지

### 5. 코드 스타일

**이모지 사용 정책** (가독성 및 일관성):
- ❌ **식별자에 이모지 절대 금지** (변수명, 함수명, 클래스명 - 구문 오류)
- ✅ **주석에 이모지 허용** (예: `// ✅ TODO`)
- ✅ **로그 메시지에 이모지 허용** (예: `console.log("🎯 시작")`)
- ✅ **문자열 리터럴에 이모지 허용** (예: `const msg = "✅ 성공"`)
- ⚠️ **하지만 코드 가독성을 위해 최소화 권장**

**이모지 사용 가이드라인**:
```typescript
// ❌ 금지 - 식별자에 이모지 (구문 오류)
const result✅ = 10
function test🎯() {}

// ✅ 허용 - 주석/로그/문자열
// ✅ TODO: 테스트 작성
console.log("🎯 분석 시작")
const message = "✅ 테스트 통과"

// ✅ 권장 - 영문만 사용 (더 명확)
// TODO: Add test
console.log("Analysis started")
const message = "Test passed"
```

**기타 스타일**:
- ✅ Next.js 15 App Router 사용 (Pages Router 금지)
- ✅ shadcn/ui 컴포넌트 우선 사용
- ✅ 모든 경로는 POSIX 형식 (슬래시 `/`) - 백슬래시 `\` 금지

## 🏗️ 아키텍처 (Phase 6: Direct Core Connection)

### 구조 개요 (Phase 6 변경)
```
// Phase 5 (이전):
사용자 → Groups → PyodideStatistics (Facade) → PyodideCore → Python Workers
                  ↑ 2,110 lines
                  ↑ 단순 전달만 수행 (불필요한 레이어)

// Phase 6 (완료):
사용자 → Groups → PyodideCore → Python Workers (SciPy/statsmodels)
         ↓        ↓
    데이터 가공   직접 호출 (callWorkerMethod<T>)
    UI 포맷팅    타입 안전성 향상
```

**Phase 6 완료 성과**:
- ✅ 9개 handler 완전 변환 (29개 메서드)
- ✅ Worker enum + 공통 타입 정의 (80+ 타입)
- ✅ PyodideStatistics Facade 의존성 제거
- ✅ Generic 타입으로 타입 안전성 강화
- ✅ 함수 호출 1단계 감소 (성능 향상)
- ✅ TypeScript 컴파일 에러: **0개**

### 핵심 디렉토리
```
statistical-platform/
├── lib/statistics/
│   ├── registry/
│   │   ├── method-metadata.ts       - 60개 메서드 메타데이터
│   │   ├── statistical-registry.ts  - 동적 import 관리
│   │   └── types.ts                 - 타입 정의
│   ├── groups/                      - 6개 그룹
│   │   ├── descriptive.group.ts     - 기술통계 (10개)
│   │   ├── hypothesis.group.ts      - 가설검정 (8개)
│   │   ├── regression.group.ts      - 회귀분석 (12개)
│   │   ├── nonparametric.group.ts   - 비모수 (9개)
│   │   ├── anova.group.ts           - 분산분석 (9개)
│   │   └── advanced.group.ts        - 고급분석 (12개)
│   └── method-router.ts             - 라우터 (115줄)
├── lib/services/
│   ├── pyodide-core.ts              - PyodideCore (421 lines)
│   ├── pyodide-statistics.ts        - PyodideStatistics (2,110 lines)
│   └── pyodide/core/                - Core implementation
└── public/workers/python/           - Python Workers (실제 통계 계산)
    ├── worker1-descriptive.py       - Worker 1: 기술통계 (214 lines)
    ├── worker2-hypothesis.py        - Worker 2: 가설검정 (338 lines)
    ├── worker3-nonparametric-anova.py - Worker 3: 비모수/ANOVA (614 lines)
    └── worker4-regression-advanced.py - Worker 4: 회귀/고급 (656 lines)
```

**Legacy Files (아카이브 완료 - 2025-10-17)**:
- `archive/pyodide-legacy-2025-10/` - 레거시 Pyodide 파일 (10개, 4,184 lines)
- 더 이상 사용하지 않는 서비스 모듈들 (Phase 5 이전 구조)
- Git 히스토리에 보관되어 필요 시 복원 가능

### 핵심 원칙
- **Groups**: TypeScript로 데이터 검증/가공, UI 포맷팅만
- **PyodideService**: Python Workers 호출 관리
- **Python Workers**: 실제 통계 계산 (SciPy/statsmodels)
- ❌ Groups에서 통계 직접 계산 금지
- ✅ 모든 통계 계산은 Python Workers에서 실행

### Python Workers 구조 (중요!)
**Worker 1-4는 이미 구현되어 있음** (2025-10-13 완료)
- [pyodide-statistics.ts](statistical-platform/lib/services/pyodide-statistics.ts)는 Python Worker 함수를 호출하는 TypeScript 래퍼
- 새 메서드 추가 시: `public/workers/python/worker*.py`에 Python 함수 추가
  - [worker1-descriptive.py](statistical-platform/public/workers/python/worker1-descriptive.py) - 기술통계
  - [worker2-hypothesis.py](statistical-platform/public/workers/python/worker2-hypothesis.py) - 가설검정
  - [worker3-nonparametric-anova.py](statistical-platform/public/workers/python/worker3-nonparametric-anova.py) - 비모수/ANOVA
  - [worker4-regression-advanced.py](statistical-platform/public/workers/python/worker4-regression-advanced.py) - 회귀/고급
- 메모리 효율: 필요한 Worker만 로드 (Lazy Loading)
- 속도: 각 Worker는 독립적으로 병렬 실행 가능

### 새 메서드 추가 워크플로우
**Phase 5-2: Priority 1-2 메서드 추가 중 (24개)**

1. **Python Worker에 함수 추가**
   - 파일: `public/workers/python/worker*.py`
   - 예: `def sign_test(before, after): ...`
   - 라이브러리 사용: SciPy/statsmodels

2. **pyodide-statistics.ts에 TypeScript 래퍼 추가**
   - 파일: `lib/services/pyodide-statistics.ts`
   - Python 함수 호출 + 타입 정의
   - 예: `async signTest(before: number[], after: number[]): Promise<SignTestResult>`

3. **Groups에서 호출**
   - 파일: `lib/statistics/groups/*.group.ts`
   - 데이터 검증/가공 → pyodideStats.signTest() 호출
   - UI 포맷팅

**현재 상태** (2025-10-13):
- ✅ Worker 1: frequency_analysis, crosstab_analysis, one_sample_proportion_test (3개)
- ✅ Worker 2: z_test, binomial_test, partial_correlation (3개)
- ❌ Worker 3: sign_test, runs_test, mcnemar_test, cochran_q_test, mood_median_test (5개 추가 필요)
- ❌ Priority 2: 13개 메서드 추가 필요 (회귀/고급 분석)

## 🔧 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트
npx tsc --noEmit     # 타입 체크
npm run lint         # 린터
```

## 🚀 배포 방식 (CRITICAL - 데이터 프라이버시)

### 배포 철학: 100% 로컬 실행, 데이터 외부 유출 없음

**이 프로젝트의 핵심 가치**:
- ✅ **연구 데이터 보안**: 의료/수산과학 데이터는 절대 외부로 전송 안 됨
- ✅ **개인 PC에서만 실행**: Pyodide가 브라우저에서 Python 실행
- ✅ **서버 없음**: Static HTML 배포로 서버 의존성 제거

### Static HTML Export (권장 배포 방식)

**설정 완료** (2025-10-17):
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',           // Static HTML 생성
  trailingSlash: true,       // 정적 호스팅 호환
  images: { unoptimized: true }, // 이미지 최적화 비활성화
}
```

**빌드 명령어**:
```bash
npm run build
# → out/ 폴더에 순수 HTML/CSS/JS 생성
```

**배포 위치** (`out/` 폴더):
```
out/
├── index.html              # 메인 페이지
├── statistics/             # 통계 분석 페이지들
│   ├── anova/
│   ├── regression/
│   ├── pca/
│   └── ... (60개 페이지)
├── _next/                  # Next.js 최적화된 JS/CSS
└── favicon.ico
```

### 배포 옵션 비교

| 방식 | 서버 필요 | 데이터 전송 | 비용 | 사용 대상 |
|------|----------|------------|------|----------|
| **Static HTML** (권장) | ❌ | ❌ 없음 | 무료 | 개인 PC, 연구실 |
| 서버 배포 (Vercel 등) | ✅ | ⚠️ 가능 | 유료 | 공개 서비스 |

### Static HTML 배포 방법

#### Option A: 로컬 파일로 사용 (가장 안전)
```bash
# 1. 빌드
npm run build

# 2. out/ 폴더를 원하는 위치에 복사
cp -r out/ ~/Desktop/통계프로그램/

# 3. index.html을 브라우저로 열기
# → 완전히 오프라인에서 작동
```

#### Option B: GitHub Pages (무료 호스팅)
```bash
# 1. 빌드
npm run build

# 2. GitHub Pages 설정 (Settings → Pages)
# 3. gh-pages 브랜치에 out/ 폴더 푸시
```

#### Option C: Netlify/Vercel Static (무료)
- `out/` 폴더 드래그 앤 드롭
- 자동 HTTPS
- CDN 가속

### 데이터 보안 보장

**Static HTML 방식의 보안성**:
```
사용자 PC (브라우저)
  ↓
HTML 로드 (로컬 또는 CDN)
  ↓
Pyodide 로드 (CDN: https://cdn.jsdelivr.net/pyodide/)
  ↓
Python 코드 실행 (브라우저 메모리)
  ↓
통계 계산 (SciPy/statsmodels)
  ↓
결과 표시 (브라우저)

✅ 데이터는 절대 외부로 전송되지 않음!
```

**vs 서버 방식 (사용 안 함)**:
```
사용자 PC → 인터넷 → 서버 → 계산 → 결과
         ↑
    ❌ 데이터 유출 위험!
```

### 주의사항

1. **Dynamic Routes 제한**:
   - `/results/[id]` 같은 동적 라우트는 사용 불가
   - 해결: 제거하거나 클라이언트 사이드 라우팅 사용

2. **API Routes 사용 불가**:
   - `app/api/` 폴더는 Static Export에서 작동 안 함
   - 해결: 모든 로직을 클라이언트에서 처리 (Pyodide)

3. **Image Optimization**:
   - `images.unoptimized: true` 필요
   - Next.js Image 컴포넌트는 기본 `<img>`로 변환됨

### 배포 체크리스트

빌드 전 확인사항:
- [ ] `output: 'export'` 설정 확인
- [ ] Dynamic routes 제거 또는 `generateStaticParams()` 추가
- [ ] API routes 미사용 확인
- [ ] Pyodide CDN 사용 (npm 패키지 아님)
- [ ] 모든 통계 계산이 클라이언트 사이드인지 확인

빌드 후 확인사항:
- [ ] `out/` 폴더 생성 확인
- [ ] `out/index.html` 브라우저로 열어서 테스트
- [ ] Pyodide 초기화 성공 (콘솔 확인)
- [ ] 통계 분석 정상 작동 확인

---

## 📋 현재 작업 상태

**최신 상태** (2025-10-17):
- ✅ Option B Day 1-4 리팩토링 완료 (Phase 5)
- ✅ Phase 6 완료: PyodideCore 직접 연결
  - ✅ 9개 handler 완전 변환 (29개 메서드, 75%)
  - ✅ Worker enum (PyodideWorker.Descriptive/Hypothesis/etc.)
  - ✅ 공통 타입 정의 (pyodide-results.ts, 40+ 타입)
  - ✅ Params 타입 정의 (method-parameter-types.ts, 40+ 타입)
  - ✅ PyodideStatistics Facade 의존성 제거
  - ✅ Compatibility 레이어 제거
  - ✅ TypeScript 컴파일 에러: **0개** (advanced.ts 제외)
  - ⏳ advanced.ts (10개 메서드) - 별도 작업 권장
- ✅ 코드 품질: **4.9/5** (Phase 6 완료)

**다음 작업**:
- 🔜 advanced.ts 변환 (선택적, 10개 메서드)
- 🔜 통합 테스트 실행 및 검증
- 🔜 Phase 7 계획 수립

**📝 상세 작업 기록**: [dailywork.md](dailywork.md) 참조

## 📚 문서 구조

### 루트 문서 (5개만 유지)
- **[CLAUDE.md](CLAUDE.md)** - AI 코딩 규칙 (이 파일)
- **[README.md](README.md)** - 프로젝트 개요
- **[ROADMAP.md](ROADMAP.md)** - 개발 로드맵
- **[STATUS.md](STATUS.md)** - 프로젝트 현재 상태 (**매 작업 후 업데이트**)
- **[dailywork.md](dailywork.md)** - 작업 기록 (**최근 7일만 유지**)

### docs/ 디렉토리 구조
```
docs/
├── planning/                        # 현재 진행 중인 계획
│   └── pyodide-refactoring-plan.md # 리팩토링 종합 계획
├── architecture/                    # 아키텍처 문서
│   ├── system-overview.md
│   ├── worker-service-architecture.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   └── TECHNICAL_SPEC.md
└── guides/                          # 가이드 문서
    ├── PYODIDE_BROWSER_PYTHON_GUIDE.md
    └── PYODIDE_ENVIRONMENT.md
```

### statistical-platform/docs/ (구현 상세)
```
statistical-platform/docs/
├── AI-CODING-RULES.md              # any → unknown 예제 10개
├── phase5-architecture.md          # Phase 5 구조 설명
├── phase5-implementation-plan.md   # Day 1-10 계획
└── implementation-summary.md       # 메서드 구현 현황
```

### archive/ (완료된 문서)
```
archive/
├── 2025-10/                        # 2025년 10월 완료 문서
│   ├── CODE_REVIEW_FINAL_2025-10-13.md
│   ├── LIBRARY_MIGRATION_COMPLETE_2025-10-13.md
│   └── ... (30개 이상)
└── phases/                         # Phase 완료 보고서
    ├── phase2-complete.md
    ├── phase3-complete.md
    └── phase4-runtime-test-complete.md
```

### 문서 관리 규칙 (AI 코딩 맞춤)

#### 문서 계층
1. **Tier 1 - 영구 문서** (절대 변경 금지)
   - `CLAUDE.md` - AI 코딩 규칙 (업데이트만)
   - `README.md` - 프로젝트 소개
   - `ROADMAP.md` - 마일스톤

2. **Tier 2 - 현재 상태 문서** (덮어쓰기 허용)
   - `STATUS.md` - 프로젝트 현재 상태 (**매 작업 후 업데이트**)
   - `dailywork.md` - 작업 기록 (**최근 7일만 유지**)

#### dailywork.md 운영 규칙 (CRITICAL)

**파일 크기 제한**:
- dailywork.md는 AI가 빠르게 읽을 수 있도록 **최근 7일만 유지**
- 현재 25,000+ tokens → 목표 5,000 tokens 이하

**주말마다 정리** (매주 일요일):
```bash
# 1. 이전 주 내용을 archive로 이동
# 예: 10월 21-27일 → archive/dailywork/2025-10-W4.md
mv (이전 주 내용) archive/dailywork/YYYY-MM-W{주차}.md

# 2. dailywork.md에는 최근 7일만 남김
# 최신 날짜가 맨 위 (역순)
```

**형식**:
```markdown
# Daily Work Log

## 2025-10-28 (월)
### ✅ 작업 내용 (소요 시간)
...

## 2025-10-27 (일)
### ✅ 작업 내용 (소요 시간)
...

## 2025-10-22 (화) ← 7일 전까지만
### ✅ 작업 내용 (소요 시간)
...
```

**아카이브 구조**:
```
archive/dailywork/
├── 2025-10-W1.md  # 10월 1-6일
├── 2025-10-W2.md  # 10월 7-13일
├── 2025-10-W3.md  # 10월 14-20일
└── 2025-10-W4.md  # 10월 21-27일
```

**AI가 지켜야 할 규칙**:
- ✅ dailywork.md 업데이트 시 항상 맨 위에 추가 (최신이 위)
- ✅ 7일 이상 된 내용은 자동으로 archive 제안
- ✅ 파일 크기가 10,000 tokens 넘으면 경고
- ❌ archive 폴더의 파일은 절대 수정 금지 (읽기만)

#### AI 문서 생성 규칙 (CRITICAL)
- ❌ **분석/검토 문서**: 새 파일 생성 금지 → STATUS.md에 요약만 추가
- ❌ **계획 문서**: 기존 계획 문서가 있으면 → 기존 파일에 섹션 추가
- ✅ **여러 관련 문서**: 반드시 1개로 통합 (예: 분석 4개 → 1개)
- ✅ **완료 보고서**: 날짜 포함 시 `archive/YYYY-MM/`에 직접 생성
- ❌ **대화 중 임시 문서**: 대화 종료 후 삭제 또는 STATUS.md에 통합

#### dailywork.md 운영 (중요!)
- **최근 7일만 유지** (주말마다 이전 주를 `archive/dailywork/YYYY-MM.md`로 이동)
- AI는 최근 7일만 읽으면 충분 (컨텍스트 제한)
- 형식: 날짜별 체크리스트 (`## YYYY-MM-DD`)

#### 파일 이동 규칙
1. **진행 중 계획**: `docs/planning/` (1개 파일로 통합)
2. **완료된 작업**: `archive/YYYY-MM/`
3. **날짜 포함 문서**: 즉시 archive
4. **검색**: `find . -name "*.md" -not -path "*/archive/*"`

### 외부 링크
- Next.js 15: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Pyodide: https://pyodide.org

### 핵심 파일 링크 (빠른 접근)

**Groups (TypeScript - 데이터 처리)**
- [utils.ts](statistical-platform/lib/statistics/groups/utils.ts) - 공통 유틸리티 (검증 함수)
- [anova.group.ts](statistical-platform/lib/statistics/groups/anova.group.ts) - 분산분석
- [hypothesis.group.ts](statistical-platform/lib/statistics/groups/hypothesis.group.ts) - 가설검정
- [nonparametric.group.ts](statistical-platform/lib/statistics/groups/nonparametric.group.ts) - 비모수
- [regression.group.ts](statistical-platform/lib/statistics/groups/regression.group.ts) - 회귀분석
- [descriptive.group.ts](statistical-platform/lib/statistics/groups/descriptive.group.ts) - 기술통계
- [advanced.group.ts](statistical-platform/lib/statistics/groups/advanced.group.ts) - 고급분석

**Python Workers (실제 통계 계산)**
- [worker1-descriptive.py](statistical-platform/public/workers/python/worker1-descriptive.py)
- [worker2-hypothesis.py](statistical-platform/public/workers/python/worker2-hypothesis.py)
- [worker3-nonparametric-anova.py](statistical-platform/public/workers/python/worker3-nonparametric-anova.py)
- [worker4-regression-advanced.py](statistical-platform/public/workers/python/worker4-regression-advanced.py)

**서비스 레이어**
- [pyodide-statistics.ts](statistical-platform/lib/services/pyodide-statistics.ts) - TypeScript 래퍼

---

**Updated**: 2025-10-17 | **Version**: Option B Day 1-4 Complete | **Next**: Testing & Documentation
