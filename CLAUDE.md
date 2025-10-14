# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재**: Phase 5-1 완료 (Registry Pattern + Groups), Phase 5-2 진행 중

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

## 🏗️ 아키텍처 (Phase 5 Registry Pattern)

### 구조 개요
```
사용자 → Groups (TypeScript) → PyodideService → Python Workers (SciPy/statsmodels)
         ↓                       ↓
    데이터 가공/검증         통계 계산 실행
    UI 포맷팅               (Pyodide + Python Workers)
```

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
│   └── pyodide-statistics.ts        - 44개 메서드 (TypeScript 래퍼)
└── public/workers/python/           - Python Workers (실제 통계 계산)
    ├── worker1-descriptive.py       - Worker 1: 기술통계 (7개)
    ├── worker2-hypothesis.py        - Worker 2: 가설검정 (6개)
    ├── worker3-nonparametric-anova.py - Worker 3: 비모수/ANOVA (4개)
    └── worker4-regression-advanced.py - Worker 4: 회귀/고급 (3개)
```

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

## 📋 현재 작업 상태

**최신 상태** (2025-10-13):
- ✅ Groups 파일 TypeScript 컴파일 에러: **0개**
- ✅ Placeholder 제거 완료 (실제 데이터 처리)
- ✅ 타입 안전성 강화 (검증 함수 추가)
- ✅ 코드 품질: **4.8/5** (런타임 안정성, 타입 안전성 확보)

**다음 작업** (2025-10-14 예정):
- 🔜 P1: utils.ts 단위 테스트 작성
- 🔜 P1: Groups 통합 테스트
- 🔜 P2: regression.group.ts 리팩토링

**📝 상세 작업 기록**: [dailywork.md](dailywork.md) 참조

## 📚 참조 문서

### AI 코딩 가이드
- **[AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md)** - any → unknown 예제 10개, 타입 가드 패턴

### 아키텍처 & 구현
- [Phase 5 아키텍처](statistical-platform/docs/phase5-architecture.md) - 전체 구조 설명
- [Phase 5 구현 계획](statistical-platform/docs/phase5-implementation-plan.md) - Day 1-10 계획
- [통계 메서드 구현 현황](statistical-platform/docs/implementation-summary.md) - 최신 현황

### 완료 보고서
- [Phase 2 완료](statistical-platform/docs/phase2-complete.md) - 리팩토링 상세
- [Phase 3 완료](statistical-platform/docs/phase3-complete.md) - Pyodide 통합
- [Phase 4 런타임 테스트](statistical-platform/docs/phase4-runtime-test-complete.md) - E2E 테스트

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

**Updated**: 2025-10-13 | **Version**: P0.5 Complete | **Next**: P1 Testing
