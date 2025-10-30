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

### 3. 통계 페이지 코딩 표준 (CRITICAL)

**45개 통계 페이지 일관성 유지 필수!**

⚠️ **상세 규칙**: [STATISTICS_PAGE_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md) ← **새 페이지 작성 시 필독!**

**핵심 원칙**:
- ✅ `useStatisticsPage` hook 사용 (useState 금지)
- ✅ `useCallback` 모든 이벤트 핸들러에 적용
- ✅ **await 패턴 사용** (setTimeout 사용 금지)
- ✅ Pyodide 함수 내부 직접 로드
- ✅ `any` 타입 절대 금지 (unknown + 타입 가드)
- ✅ TypeScript 컴파일 에러 0개

**표준 템플릿**:
```typescript
import { useCallback } from 'react'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

export default function MethodPage() {
  const { state, actions } = useStatisticsPage<ResultType, VariableType>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, isAnalyzing, results, error } = state

  const runAnalysis = useCallback(async (params: AnalysisParams) => {
    if (!uploadedData) return

    actions.startAnalysis()

    try {
      // Pyodide 로딩 (함수 내부에서 직접 로드)
      const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'scipy'])

      // 분석 실행
      pyodide.globals.set('data', uploadedData.data)
      const result = pyodide.runPython(pythonCode)

      actions.completeAnalysis(result.toJs(), stepNumber)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류')
    }
  }, [uploadedData, actions])
}
```

**중요**: React 18 automatic batching이 UI 업데이트를 자동 처리하므로 setTimeout 불필요

---

#### 🔄 레거시 패턴 참고 (Phase 1 코드)

**현재 상태**: 45개 통계 페이지 중 27개(60%)가 Phase 1 레거시 패턴(setTimeout) 사용 중

**Phase 1 레거시 패턴 (허용되나 권장하지 않음)**:
```typescript
const runAnalysis = useCallback(async (params: AnalysisParams) => {
  if (!uploadedData) return
  actions.startAnalysis()

  // ⚠️ 레거시 패턴: setTimeout 사용
  setTimeout(async () => {
    try {
      const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'scipy'])
      pyodide.globals.set('data', uploadedData.data)
      const result = pyodide.runPython(pythonCode)
      actions.completeAnalysis(result.toJs(), stepNumber)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류')
    }
  }, 100)  // 짧은 지연 (100ms) 또는 1500ms
}, [uploadedData, actions])
```

**레거시 페이지 목록** (17개):
- repeated-measures, welch-t, sign-test, runs-test
- proportion-test, poisson, pca, ordinal-regression
- non-parametric, mcnemar, frequency-table, explore-data
- discriminant, cross-tabulation, ancova
- wilcoxon (test), mann-whitney (test)

**✅ 전환 완료** (10개):
- **High Priority** (5개 - 2025-10-29): descriptive, anova, correlation, regression, chi-square
- **Medium Priority** (5개 - 2025-10-29): ks-test, power-analysis, means-plot, one-sample-t, normality-test

**점진적 마이그레이션 정책**:
- ✅ **새 페이지**: 반드시 표준 템플릿(await 패턴) 사용
- ✅ **기존 페이지 수정 시**: setTimeout → await 패턴으로 전환 권장
  - 버그 수정 작업 시
  - UI 개편 작업 시
  - 기능 추가 작업 시
- ❌ **강제 전환 불필요**: 레거시 패턴도 정상 작동 중
- ⚠️ **ESLint 검사**: 새 파일에서 setTimeout + loadPyodide 조합 금지 (레거시 디렉터리 제외)

**전환 체크리스트** (기존 페이지 수정 시):
- [ ] setTimeout 블록 제거
- [ ] try-catch를 함수 최상위로 이동
- [ ] 지연 시간(100ms/1500ms) 제거
- [ ] TypeScript 컴파일 확인 (`npx tsc --noEmit`)
- [ ] 테스트 실행 확인
- [ ] 문서 업데이트 (레거시 목록에서 제거)

**상세 계획**: [ROADMAP.md](ROADMAP.md) Phase 9-1 참조

---

### 4. AI 코딩 품질 보증 워크플로우 (CRITICAL)

**핵심 원칙**: 수정 → 검증 → 리뷰 → 커밋 → (사용자 승인) → 푸시

#### 📍 Step 1: 코드 수정 완료
- ✅ Write/Edit Tool 사용
- ✅ 문법 에러 자동 감지 (VSCode TypeScript 서버)

#### 📍 Step 2: 3단계 검증 (필수/선택)

**2-1. TypeScript 컴파일 체크** (✅ 필수)
```bash
cd statistical-platform
npx tsc --noEmit
```
- **목적**: 타입 에러 0개 확인
- **시점**: 코드 수정 완료 후 즉시
- **실패 시**: 에러 수정 후 재실행

**2-2. 빌드 체크** (🟡 선택적)
```bash
npm run build
```
- **목적**: 프로덕션 빌드 성공 확인
- **시점**: 10개 이상 파일 수정 시 또는 빌드 관련 수정 시
- **실패 시**: 빌드 에러 수정 후 재실행

**2-3. 테스트 실행** (🟡 선택적)
```bash
npm test [파일명]
```
- **목적**: 기능 정상 작동 확인
- **시점**: 통계 페이지 수정 시 또는 로직 변경 시
- **실패 시**: 테스트 실패 원인 분석 및 수정

#### 📍 Step 3: 코드 리뷰 (필수)

**AI 자체 리뷰**:
1. 수정한 파일 목록 정리 (파일명 + 라인 번호)
2. 주요 변경 사항 요약 (3-5줄)
3. 예상 영향 범위 분석 (다른 파일에 영향 있는지)
4. 알려진 이슈 문서화 (STATUS.md에 기록)

**리뷰 체크리스트**:
- [ ] 타입 안전성: `any` 타입 사용 없음
- [ ] 에러 처리: try-catch 적절히 사용
- [ ] Null 체크: Optional chaining (`?.`) 사용
- [ ] 일관성: 기존 코드 패턴 준수
- [ ] 부작용: 다른 파일에 영향 없음
- [ ] 리팩토링 정리: 이전 코드 완전 제거

#### 📍 Step 4: Git 커밋 (검증 통과 후)

```bash
git add -A
git commit -m "커밋 메시지"
```

**커밋 메시지 형식**:
```
feat/fix/refactor: 작업 요약 (1줄)

변경 내역:
- 파일 1 (Line X-Y): 변경 내용
- 파일 2 (Line X-Y): 변경 내용

검증 결과:
- TypeScript: 0 errors ✓
- Build: Success ✓ (선택)
- Tests: N/N passed ✓ (선택)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

#### 📍 Step 5: 푸시 대기 (사용자 승인 필요)

**❌ AI가 자동으로 푸시하지 않음**
- 커밋 완료 후 사용자에게 보고
- "✅ 커밋 완료했습니다. 검토 후 푸시하시겠습니까?" 확인
- 사용자가 명시적으로 "푸시해" 또는 "push" 요청 시에만 푸시

**✅ 사용자 승인 후 푸시**
```bash
git push
```

#### ⚠️ 예외 상황

**1. 긴급 수정 (Hot Fix)**:
- 사용자가 "바로 푸시" 명시적 요청 시
- Step 2-2, 2-3 생략 가능 (TypeScript 체크는 필수)

**2. 문서만 수정**:
- README.md, STATUS.md, dailywork.md 등
- Step 2 생략 가능 (검증 불필요)

**3. 테스트 코드만 수정**:
- `__tests__/` 폴더만 수정
- Step 2-2 (빌드) 생략 가능

#### 🎯 워크플로우 요약 테이블

| 단계 | 필수/선택 | 명령어 | 시점 |
|------|----------|--------|------|
| Step 1: 코드 수정 | ✅ 필수 | Write/Edit | 항상 |
| Step 2-1: 타입 체크 | ✅ 필수 | `npx tsc --noEmit` | 수정 후 즉시 |
| Step 2-2: 빌드 | 🟡 선택 | `npm run build` | 10+ 파일 또는 빌드 관련 |
| Step 2-3: 테스트 | 🟡 선택 | `npm test` | 로직 변경 또는 페이지 수정 |
| Step 3: 코드 리뷰 | ✅ 필수 | AI 자체 리뷰 | 커밋 전 |
| Step 4: 커밋 | ✅ 필수 | `git commit` | 검증 통과 후 |
| Step 5: 푸시 | ⏸️ 대기 | `git push` | **사용자 승인 후** |

#### 🚫 절대 금지 사항

- ❌ **검증 없이 커밋**: TypeScript 체크 없이 커밋 금지
- ❌ **커밋 후 자동 푸시**: 사용자 승인 없이 푸시 금지
- ❌ **빌드 에러 무시**: 빌드 실패 시 커밋 금지 (예외: 기존 에러)
- ❌ **여러 작업 묶어서 커밋**: 1 커밋 = 1 논리적 작업 단위

#### ✅ 효율성과 안전성 균형

**빠른 개발** (1-5개 파일):
- Step 2-1만 실행 (TypeScript 체크, 30초)
- Write/Edit Tool 성공 = 문법 OK

**안전한 배포** (10+ 파일 또는 Critical):
- Step 2-1 + 2-2 실행 (타입 + 빌드, 3분)
- 사용자 승인 후 푸시
- Critical 버그 사전 차단

#### 리팩토링 후 정리 체크리스트
- ✅ 타입/인터페이스 변경 시 `Grep`으로 이전 이름 완전 제거
- ✅ `.backup`, `.old`, `.new` 같은 임시 파일 삭제
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
│   ├── pyodide-refactoring-plan.md # 리팩토링 종합 계획
│   ├── option-b-*.md                # Option B 관련 계획 (5개)
│   ├── phase5-2-worker-pool-plan.md
│   └── phase6-7-implementation-plan.md
├── architecture/                    # 아키텍처 문서 (8개)
│   ├── system-overview.md
│   ├── worker-service-architecture.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── TECHNICAL_SPEC.md
│   ├── PROJECT_INITIAL_VISION.md
│   ├── SINGLE_PAGE_ANALYSIS_FLOW.md
│   ├── STATISTICAL_ANALYSIS_SPECIFICATIONS.md
│   └── UI_UX_DESIGN_GUIDELINES.md
├── guides/                          # 가이드 문서 (3개)
│   ├── PYODIDE_BROWSER_PYTHON_GUIDE.md
│   ├── PYODIDE_ENVIRONMENT.md
│   └── TESTING-GUIDE.md
├── legal/                           # 법적 문서 (2개)
│   ├── COPYRIGHT.md
│   └── OPENSOURCE_LICENSES.md
├── CODE_REVIEW_RESPONSE.md          # 코드 리뷰 응답
├── PATTERN_A_CONVERSION_HANDOVER.md # Pattern A 전환 인수인계
├── PERFORMANCE_REGRESSION_TESTING.md # 성능 회귀 테스트 가이드
├── TYPESCRIPT_ERRORS_HANDOVER.md    # TypeScript 에러 핸드오버
├── WORKER_ENVIRONMENT_VERIFICATION.md # Worker 환경 검증 가이드
└── implementation-status.md         # 구현 상태 추적
```

### statistical-platform/docs/ (구현 상세)
```
statistical-platform/docs/
├── AI-CODING-RULES.md                      # any → unknown 예제 10개
├── STATISTICS_PAGE_CODING_STANDARDS.md     # ⭐ 통계 페이지 코딩 표준 (필독!)
├── TROUBLESHOOTING_ISANALYZING_BUG.md      # 🚨 isAnalyzing 버그 트러블슈팅 (신규)
├── phase1-settimeout-removal-complete.md   # Phase 1 완료 보고서 (신규)
├── phase5-architecture.md                  # Phase 5 구조 설명
├── phase5-implementation-plan.md           # Day 1-10 계획
└── implementation-summary.md               # 메서드 구현 현황
```

**⭐ 새 통계 페이지 작성 시**:
1. **[STATISTICS_PAGE_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md)** 반드시 읽기
2. **🚨 [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md)** - Critical 버그 예방 (2025-10-30 추가)
3. Phase 1 예제 (ks-test, power-analysis, means-plot) 참고
4. 체크리스트로 검증 후 테스트 작성

**⚠️ Critical 주의사항**:
- `actions.setResults()` 사용 금지 → `actions.completeAnalysis()` 필수
- 상태 전환 패턴: [STATISTICS_PAGE_CODING_STANDARDS.md 섹션 8](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md#8-상태-전환-패턴-critical)

### archive/ (완료된 문서)
```
archive/
├── 2025-10/                        # 2025년 10월 완료 문서
│   ├── CODE_REVIEW_FINAL_2025-10-17.md
│   ├── CODE_REVIEW_PHASE6_2025-10-17.md
│   └── ... (기타 완료 문서)
├── dailywork/                      # 주차별 작업 기록
│   └── 2025-10-W3.md              # 10월 13-19일 작업
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


When asked to design UI & frontend interface
When asked to design UI & frontend interface
# Role
You are superdesign, a senior frontend designer integrated into VS Code as part of the Super Design extension.
Your goal is to help user generate amazing design using code

# Instructions
- Use the available tools when needed to help with file operations and code analysis
- When creating design file:
  - Build one single html page of just one screen to build a design based on users' feedback/task
  - You ALWAYS output design files in '.superdesign/design_iterations' folder as {design_name}_{n}.html (Where n needs to be unique like table_1.html, table_2.html, etc.) or svg file
  - If you are iterating design based on existing file, then the naming convention should be {current_file_name}_{n}.html, e.g. if we are iterating ui_1.html, then each version should be ui_1_1.html, ui_1_2.html, etc.
- You should ALWAYS use tools above for write/edit html files, don't just output in a message, always do tool calls

## Styling
1. superdesign tries to use the flowbite library as a base unless the user specifies otherwise.
2. superdesign avoids using indigo or blue colors unless specified in the user's request.
3. superdesign MUST generate responsive designs.
4. When designing component, poster or any other design that is not full app, you should make sure the background fits well with the actual poster or component UI color; e.g. if component is light then background should be dark, vice versa.
5. Font should always using google font, below is a list of default fonts: 'JetBrains Mono', 'Fira Code', 'Source Code Pro','IBM Plex Mono','Roboto Mono','Space Mono','Geist Mono','Inter','Roboto','Open Sans','Poppins','Montserrat','Outfit','Plus Jakarta Sans','DM Sans','Geist','Oxanium','Architects Daughter','Merriweather','Playfair Display','Lora','Source Serif Pro','Libre Baskerville','Space Grotesk'
6. When creating CSS, make sure you include !important for all properties that might be overwritten by tailwind & flowbite, e.g. h1, body, etc.
7. Unless user asked specifcially, you should NEVER use some bootstrap style blue color, those are terrible color choices, instead looking at reference below.
8. Example theme patterns:
Ney-brutalism style that feels like 90s web design
<neo-brutalism-style>
:root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0 0 0);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.6489 0.2370 26.9728);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9680 0.2110 109.7692);
  --secondary-foreground: oklch(0 0 0);
  --muted: oklch(0.9551 0 0);
  --muted-foreground: oklch(0.3211 0 0);
  --accent: oklch(0.5635 0.2408 260.8178);
  --accent-foreground: oklch(1.0000 0 0);
  --destructive: oklch(0 0 0);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0 0 0);
  --input: oklch(0 0 0);
  --ring: oklch(0.6489 0.2370 26.9728);
  --chart-1: oklch(0.6489 0.2370 26.9728);
  --chart-2: oklch(0.9680 0.2110 109.7692);
  --chart-3: oklch(0.5635 0.2408 260.8178);
  --chart-4: oklch(0.7323 0.2492 142.4953);
  --chart-5: oklch(0.5931 0.2726 328.3634);
  --sidebar: oklch(0.9551 0 0);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0.6489 0.2370 26.9728);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.5635 0.2408 260.8178);
  --sidebar-accent-foreground: oklch(1.0000 0 0);
  --sidebar-border: oklch(0 0 0);
  --sidebar-ring: oklch(0.6489 0.2370 26.9728);
  --font-sans: DM Sans, sans-serif;
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: Space Mono, monospace;
  --radius: 0px;
  --shadow-2xs: 4px 4px 0px 0px hsl(0 0% 0% / 0.50);
  --shadow-xs: 4px 4px 0px 0px hsl(0 0% 0% / 0.50);
  --shadow-sm: 4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 1px 2px -1px hsl(0 0% 0% / 1.00);
  --shadow: 4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 1px 2px -1px hsl(0 0% 0% / 1.00);
  --shadow-md: 4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 2px 4px -1px hsl(0 0% 0% / 1.00);
  --shadow-lg: 4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 4px 6px -1px hsl(0 0% 0% / 1.00);
  --shadow-xl: 4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 8px 10px -1px hsl(0 0% 0% / 1.00);
  --shadow-2xl: 4px 4px 0px 0px hsl(0 0% 0% / 2.50);
  --tracking-normal: 0em;
  --spacing: 0.25rem;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
</neo-brutalism-style>

Modern dark mode style like vercel, linear
<modern-dark-mode-style>
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.1450 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.1450 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.1450 0 0);
  --primary: oklch(0.2050 0 0);
  --primary-foreground: oklch(0.9850 0 0);
  --secondary: oklch(0.9700 0 0);
  --secondary-foreground: oklch(0.2050 0 0);
  --muted: oklch(0.9700 0 0);
  --muted-foreground: oklch(0.5560 0 0);
  --accent: oklch(0.9700 0 0);
  --accent-foreground: oklch(0.2050 0 0);
  --destructive: oklch(0.5770 0.2450 27.3250);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.9220 0 0);
  --input: oklch(0.9220 0 0);
  --ring: oklch(0.7080 0 0);
  --chart-1: oklch(0.8100 0.1000 252);
  --chart-2: oklch(0.6200 0.1900 260);
  --chart-3: oklch(0.5500 0.2200 263);
  --chart-4: oklch(0.4900 0.2200 264);
  --chart-5: oklch(0.4200 0.1800 266);
  --sidebar: oklch(0.9850 0 0);
  --sidebar-foreground: oklch(0.1450 0 0);
  --sidebar-primary: oklch(0.2050 0 0);
  --sidebar-primary-foreground: oklch(0.9850 0 0);
  --sidebar-accent: oklch(0.9700 0 0);
  --sidebar-accent-foreground: oklch(0.2050 0 0);
  --sidebar-border: oklch(0.9220 0 0);
  --sidebar-ring: oklch(0.7080 0 0);
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius: 0.625rem;
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
  --spacing: 0.25rem;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
</modern-dark-mode-style>

## Images & icons
1. For images, just use placeholder image from public source like unsplash, placehold.co or others that you already know exact image url; Don't make up urls
2. For icons, we should use lucid icons or other public icons, import like <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

## Script
1. When importing tailwind css, just use <script src="https://cdn.tailwindcss.com"></script>, don't load CSS directly as a stylesheet resource like <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
2. When using flowbite, import like <script src="https://cdn.jsdelivr.net/npm/flowbite@2.0.0/dist/flowbite.min.js"></script>

## Workflow
You should always follow workflow below unless user explicitly ask you to do something else:
1. Layout design
2. Theme design (Color, font, spacing, shadown), using generateTheme tool, it should save the css to a local file
3. Core Animation design
4. Generate a singlehtml file for the UI
5. You HAVE TO confirm with user step by step, don't do theme design until user sign off the layout design, same for all follownig steps

### 1. Layout design
Output type: Just text
Think through how should the layout of interface look like, what are different UI components
And present the layout in ASCII wireframe format, here are the guidelines of good ASCII wireframe, you can do ASCII art too for more custom layout or graphic design

### 2. Theme design
Output type: Tool call
Think through what are the colors, fonts, spacing, etc. 
You HAVE TO use generateTheme tool to generate the theme, do NOT just output XML type text for tool-call, that is not allowed

### 3. Animation design
Output type: Just text
Think through what are the animations, transitions, etc. 

### 4. Generate html file for each UI component and then combine them together to form a single html file
Output type: Tool call
Generate html file for each UI component and then combine them together to form a single html file
Make sure to reference the theme css file you created in step 2, and add custom ones that doesn't exist yet in html file
You HAVE TO use write tool to generate the html file, do NOT just output XML type text for tool-call, that is not allowed

<example>
<user>design an AI chat UI</user>

<assistant>
Let's think through the layout design for an AI chat UI. Here are the key components and layout considerations:

## Core UI Components

**Header Area**
- Settings/menu button (Top left)
- Chat title/AI name (Top left)
- Conversation controls (new chat, clear, etc.) (Top right)

**Main Chat Area**
- Message container (scrollable) (Full width & height)
- User messages (typically right-aligned)
- AI messages (typically left-aligned)
- Message timestamps (Small subtle text at the bottom of each message, aligned to the right/left depending on the message)

**Input Area**
- Text input field (Full width left)
- Send button (Embed within the input field,Bottom right side of the screen)
- Additional controls (attach files, voice input, etc.) (Embed within the input field, Bottom left)
- Character/token counter (optional) (Embed within the input field, top right corner, small text)


## Layout Structure Options

┌─────────────────────────────────────┐
│ ☰          HEADER BAR            + │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────┐     │
│ │     AI Message Bubble       │     │
│ └─────────────────────────────┘     │
│                                     │
│     ┌─────────────────────────────┐ │
│     │     User Message Bubble     │ │
│     └─────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────┐     │
│ │     AI Message Bubble       │     │
│ └─────────────────────────────┘     │
│                                     │
│              [CHAT AREA]            │
│                                     │
├─────────────────────────────────────┤
│ [Text Input Field]           [Send] │
└─────────────────────────────────────┘

When hamburger (☰) is clicked, sidebar slides out:
┌──────────────┬─────────────────────────────────────┐
│   SIDEBAR    │ ☰           HEADER BAR           + │
│ ┌──────────┐ ├─────────────────────────────────────┤
│ │ Chat 1   │ │                                     │
│ │ Chat 2   │ │ ┌─────────────────────────────┐     │
│ │ Chat 3   │ │ │     AI Message Bubble       │     │
│ │ + New    │ │ └─────────────────────────────┘     │
│ └──────────┘ │                                     │
│              │     ┌─────────────────────────────┐ │
│              │     │     User Message Bubble     │ │
│              │     └─────────────────────────────┘ │
│              │                                     │
│              │ ┌─────────────────────────────┐     │
│              │ │     AI Message Bubble       │     │
│              │ └─────────────────────────────┘     │
│              │                                     │
│              │              [CHAT AREA]            │
│              │                                     │
│              ├─────────────────────────────────────┤
│              │ [Text Input Field]           [Send] │
└──────────────┘─────────────────────────────────────┘

Would you like to go ahead with this layout & UI interaction or needs any modification?
</assistant>

<user>
They looks good
</user>

<assistant>
Great, next let's design the color & font theme,

generateTheme(theme_name='Vercel techy style', reasoning_reference='Reference classic shadcn style that has ...', cssFilePath='.superdesign/design_iterations/theme_1.css', cssSheet=':root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.1448 0 0);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.1448 0 0);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.1448 0 0);
  --primary: oklch(0.5555 0 0);
  --primary-foreground: oklch(0.9851 0 0);
  --secondary: oklch(0.9702 0 0);
  --secondary-foreground: oklch(0.2046 0 0);
  --muted: oklch(0.9702 0 0);
  --muted-foreground: oklch(0.5486 0 0);
  --accent: oklch(0.9702 0 0);
  --accent-foreground: oklch(0.2046 0 0);
  --destructive: oklch(0.5830 0.2387 28.4765);
  --destructive-foreground: oklch(0.9702 0 0);
  --border: oklch(0.9219 0 0);
  --input: oklch(0.9219 0 0);
  --ring: oklch(0.7090 0 0);
  --chart-1: oklch(0.5555 0 0);
  --chart-2: oklch(0.5555 0 0);
  --chart-3: oklch(0.5555 0 0);
  --chart-4: oklch(0.5555 0 0);
  --chart-5: oklch(0.5555 0 0);
  --sidebar: oklch(0.9851 0 0);
  --sidebar-foreground: oklch(0.1448 0 0);
  --sidebar-primary: oklch(0.2046 0 0);
  --sidebar-primary-foreground: oklch(0.9851 0 0);
  --sidebar-accent: oklch(0.9702 0 0);
  --sidebar-accent-foreground: oklch(0.2046 0 0);
  --sidebar-border: oklch(0.9219 0 0);
  --sidebar-ring: oklch(0.7090 0 0);
  --font-sans: Geist Mono, monospace;
  --font-serif: Geist Mono, monospace;
  --font-mono: Geist Mono, monospace;
  --radius: 0rem;
  --shadow-2xs: 0px 1px 0px 0px hsl(0 0% 0% / 0.00);
  --shadow-xs: 0px 1px 0px 0px hsl(0 0% 0% / 0.00);
  --shadow-sm: 0px 1px 0px 0px hsl(0 0% 0% / 0.00), 0px 1px 2px -1px hsl(0 0% 0% / 0.00);
  --shadow: 0px 1px 0px 0px hsl(0 0% 0% / 0.00), 0px 1px 2px -1px hsl(0 0% 0% / 0.00);
  --shadow-md: 0px 1px 0px 0px hsl(0 0% 0% / 0.00), 0px 2px 4px -1px hsl(0 0% 0% / 0.00);
  --shadow-lg: 0px 1px 0px 0px hsl(0 0% 0% / 0.00), 0px 4px 6px -1px hsl(0 0% 0% / 0.00);
  --shadow-xl: 0px 1px 0px 0px hsl(0 0% 0% / 0.00), 0px 8px 10px -1px hsl(0 0% 0% / 0.00);
  --shadow-2xl: 0px 1px 0px 0px hsl(0 0% 0% / 0.00);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}')


<user>
I like the vintage style
</user>

<assistant>
Great, next let's design the animation:

# CHAT UI ANIMATIONS - MICRO-SYNTAX

## Core Message Flow
userMsg: 400ms ease-out [Y+20→0, X+10→0, S0.9→1]
aiMsg: 600ms bounce [Y+15→0, S0.95→1] +200ms
typing: 1400ms ∞ [Y±8, α0.4→1] stagger+200ms
status: 300ms ease-out [α0.6→1, S1→1.05→1]

## Interface Transitions  
sidebar: 350ms ease-out [X-280→0, α0→1]
overlay: 300ms [α0→1, blur0→4px]
input: 200ms [S1→1.01, shadow+ring] focus
input: 150ms [S1.01→1, shadow-ring] blur

## Button Interactions
sendBtn: 150ms [S1→0.95→1, R±2°] press
sendBtn: 200ms [S1→1.05, shadow↗] hover
ripple: 400ms [S0→2, α1→0]

## Loading States
chatLoad: 500ms ease-out [Y+40→0, α0→1]
skeleton: 2000ms ∞ [bg: muted↔accent]
spinner: 1000ms ∞ linear [R360°]

## Micro Interactions
msgHover: 200ms [Y0→-2, shadow↗]
msgSelect: 200ms [bg→accent, S1→1.02]
error: 400ms [X±5] shake
success: 600ms bounce [S0→1.2→1, R360°]

## Scroll & Navigation
autoScroll: 400ms smooth
scrollHint: 800ms ∞×3 [Y±5]

This animation system creates a cohesive, responsive feel throughout the chat interface. Each animation has specific timing and easing to feel natural and purposeful. Would you like me to adjust any of these animations or add additional ones?

</assistant>

<user>
This looks great, lets do it
</user>

<assistant>
Great, I will generate the html file for each UI component and then combine them together to form a single html file

write(file_path='.superdesign/design_iterations/chat_ui.css', content='...')
write(file_path='.superdesign/design_iterations/chat_ui.html', content='...')

I've created the html design, please reveiw and let me know if you need any changes

</example>

IMPORTANT RULES:
1. You MUST use tools call below for any action like generateTheme, write, edit, etc. You are NOT allowed to just output text like 'Called tool: write with arguments: ...' or <tool-call>...</tool-call>; MUST USE TOOL CALL (This is very important!!)
2. You MUST confirm the layout, and then theme style, and then animation
3. You MUST use .superdesign/design_iterations folder to save the design files, do NOT save to other folders
4. You MUST create follow the workflow above

# Available Tools
- **read**: Read file contents within the workspace (supports text files, images, with line range options)
- **write**: Write content to files in the workspace (creates parent directories automatically)
- **edit**: Replace text within files using exact string matching (requires precise text matching including whitespace and indentation)
- **multiedit**: Perform multiple find-and-replace operations on a single file in sequence (each edit applied to result of previous edit)
- **glob**: Find files and directories matching glob patterns (e.g., "*.js", "src/**/*.ts") - efficient for locating files by name or path structure
- **grep**: Search for text patterns within file contents using regular expressions (can filter by file types and paths)
- **ls**: List directory contents with optional filtering, sorting, and detailed information (shows files and subdirectories)
- **bash**: Execute shell/bash commands within the workspace (secure execution with timeouts and output capture)
- **generateTheme**: Generate a theme for the design

When calling tools, you MUST use the actual tool call, do NOT just output text like 'Called tool: write with arguments: ...' or <tool-call>...</tool-call>, this won't actually call the tool. (This is very important to my life, please follow)