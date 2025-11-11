# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 현재 중요 규칙 (2025-11-11 업데이트)

**상태**: ✅ Phase A-3-R1 완료 (변수 role 매핑 표준화 + Critical 버그 수정)

**해결된 문제**:
- ✅ **변수 role 일치**: variable-requirements.ts === types/statistics.ts (6개 인터페이스 수정)
- ✅ **타입 중앙화**: Section 18 준수 (mood-median 중복 정의 제거)
- ✅ **Critical 버그 수정**: chi-square-independence, binomial-test, runs-test (3개)
- 🟡 **공통 컴포넌트 미활용**: 향후 개선 예정 (우선순위 낮음)

**반드시 지킬 것** (CRITICAL):
1. ✅ **변수 role 일치**: variable-requirements.ts의 `role`을 types/statistics.ts에 정확히 반영
   ```typescript
   // variable-requirements.ts: role: 'factor'
   // types/statistics.ts: factor: string[]  ✅
   // types/statistics.ts: groups: string[]  ❌ 금지!
   ```

2. ✅ **타입 단일 정의**: types/statistics.ts에만 정의 (페이지별 재정의 절대 금지)
   ```typescript
   // ❌ 금지: mann-whitney/page.tsx에서 interface PostHocComparison {...}
   // ✅ 권장: import { PostHocComparison } from '@/types/statistics'
   ```

3. ✅ **공통 컴포넌트 우선**: StatisticsTable, EffectSizeCard 등 사용 (`<table>` 직접 사용 금지)

**표준 Role 매핑** (SPSS/R/SAS 표준):
| variable-requirements.ts | types/statistics.ts | ❌ 금지 |
|-------------------------|---------------------|---------|
| `role: 'factor'` | `factor: string[]` | `groups`, `independent` |
| `role: 'within'` | `within: string[]` | `conditions` |
| `role: 'covariate'` | `covariate: string[]` | `covariates` |
| `role: 'blocking'` | `blocking?: string[]` | `randomEffects` |

**예외 케이스** (2개 role을 별도 필드로 사용):
- **chi-square-independence**: `role: 'independent'` + `role: 'dependent'` → `row: string` + `column: string`
  - 컨버터: `independent||row`, `dependent||column` fallback 적용

**필드명 규칙**: camelCase (pValue, ciLower, ciUpper) ✅ | snake_case (p_value, ci_lower) ❌

**상세**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - Section 17-19

---

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재**: Phase 6 완료 (PyodideCore 직접 연결, Facade 제거 완료)

## ⚠️ AI 코딩 엄격 규칙 (CRITICAL)

### 1. TypeScript 타입 안전성 (최우선)

**필수 규칙**:
- ❌ `any` 타입 절대 금지 → `unknown` 사용 후 타입 가드
- ✅ 모든 함수에 명시적 타입 지정 (파라미터 + 리턴)
- ✅ null/undefined 체크 필수 (early return 패턴)
- ✅ 옵셔널 체이닝 (`?.`) 적극 사용
- ❌ Non-null assertion (`!`) 절대 금지

**상세 예제**: [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md)

### 2. Pyodide 통계 계산 규칙 (CRITICAL)

**통계 계산 구현 원칙**:
- ❌ **JavaScript/Python으로 통계 알고리즘 직접 구현 절대 금지**
- ✅ **반드시 검증된 통계 라이브러리 사용** (SciPy, statsmodels, pingouin)
- ✅ 직접 구현 시 사용자 사전 승인 필수

### 3. 통계 페이지 코딩 표준 (CRITICAL)

**45개 통계 페이지 일관성 유지 필수!**

⚠️ **상세 규칙**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md)

**핵심 원칙**:
- ✅ `useStatisticsPage` hook 사용 (useState 금지)
- ✅ `useCallback` 모든 이벤트 핸들러에 적용
- ✅ **await 패턴 사용** (setTimeout 사용 금지)
- ✅ `any` 타입 절대 금지 (unknown + 타입 가드)
- ✅ TypeScript 컴파일 에러 0개
- ✅ **변수 role 매핑**: variable-requirements.ts와 types/statistics.ts 일치 (위 "현재 중요 규칙" 참조)
- ✅ **타입 중앙 정의**: types/statistics.ts 단일 정의 (페이지별 재정의 금지)
- ✅ **공통 컴포넌트 사용**: StatisticsTable, EffectSizeCard 등 활용

**참고 문서**:
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방

---

### 4. AI 코딩 품질 보증 워크플로우 (CRITICAL)

**핵심 원칙**: 수정 → 검증 → 리뷰 + 테스트 → 커밋 → (사용자 승인) → 푸시

#### 📍 Step 1: 코드 수정
- Write/Edit Tool 사용
- 문법 에러 자동 감지 (VSCode TypeScript 서버)

#### 📍 Step 2: 검증 (필수/선택)

**2-1. TypeScript 체크** (✅ 필수)
```bash
cd statistical-platform
npx tsc --noEmit
```

**2-2. 빌드 체크** (🟡 선택 - 10+ 파일 수정 시)
```bash
npm run build
```

**2-3. 테스트 실행** (🟡 선택 - 로직 변경 시)
```bash
npm test [파일명]
```

#### 📍 Step 3: 코드 리뷰 + 테스트 (필수)

**🔍 AI 자체 코드 리뷰**:
1. 수정 파일 목록 정리 (파일명 + 라인 번호)
2. 주요 변경 사항 요약 (무엇을, 왜, 어떻게)
3. 예상 영향 범위 분석
4. 알려진 이슈 문서화

**📋 리뷰 체크리스트**:
- [ ] 타입 안전성: `any` 타입 사용 없음
- [ ] 에러 처리: try-catch 적절히 사용
- [ ] Null 체크: Optional chaining (`?.`) 사용
- [ ] 일관성: 기존 코드 패턴 준수
- [ ] 부작용: 다른 파일에 영향 없음
- [ ] 변수 role 매핑: variable-requirements.ts와 일치
- [ ] 타입 정의: types/statistics.ts에만 정의 (페이지 재정의 없음)

**✅ 테스트 검증**:

**통합 테스트** (✅ 필수 - 모든 작업 완료 시)
```bash
npm run dev
# → 브라우저에서 실제 동작 확인
```

**통합 테스트 체크리스트**:
1. **UI 렌더링**
   - [ ] 새 컴포넌트가 화면에 표시되는가?
   - [ ] 레이아웃이 깨지지 않는가?

2. **기능 동작**
   - [ ] 버튼/드롭다운 클릭 시 정상 작동하는가?
   - [ ] 상태 변경이 UI에 반영되는가?

3. **에러 처리**
   - [ ] 잘못된 입력 시 에러 메시지가 표시되는가?
   - [ ] 콘솔에 에러가 없는가?

---

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

검증 결과:
- TypeScript: 0 errors ✓

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

#### 📍 Step 5: 푸시 (사용자 승인 필요)

**❌ AI가 자동으로 푸시하지 않음**
- 커밋 완료 후 사용자에게 보고
- 사용자가 명시적으로 "푸시해" 요청 시에만 푸시


### 5. 테스트 프레임워크 규칙 (CRITICAL)

**이 프로젝트는 Jest를 사용합니다 (Vitest 아님!)**

**필수 규칙**:
- ✅ **테스트 파일은 항상 Jest 문법 사용**
- ❌ Vitest import 절대 금지 (`import { describe, it } from 'vitest'` ❌)
- ✅ Jest import 사용 (`import { describe, it } from '@jest/globals'` 또는 전역 사용)

**테스트 파일 작성 예시**:
```typescript
// ✅ 올바른 방법 (Jest)
import { render, screen } from '@testing-library/react'

describe('Component', () => {
  it('should render', () => {
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

// ❌ 잘못된 방법 (Vitest)
import { describe, it, expect, vi } from 'vitest'  // ❌ 금지!
```

**테스트 실행**:
```bash
npm test              # 모든 테스트
npm test [파일명]     # 특정 파일
npm test:watch        # watch 모드
npm test:coverage     # 커버리지
```

---

### 6. 코드 스타일

- ❌ 식별자에 이모지 절대 금지 (변수명, 함수명, 클래스명)
- ✅ Next.js 15 App Router 사용 (Pages Router 금지)
- ✅ shadcn/ui 컴포넌트 우선 사용

---

## 🏗️ 아키텍처 (Phase 6)

### 구조 개요
```
사용자 → Groups → PyodideCore → Python Workers (SciPy/statsmodels)
         ↓        ↓
    데이터 가공   직접 호출 (callWorkerMethod<T>)
    UI 포맷팅    타입 안전성 향상
```

### 핵심 원칙
- **Groups**: TypeScript로 데이터 검증/가공, UI 포맷팅만
- **PyodideCore**: Python Workers 호출 관리
- **Python Workers**: 실제 통계 계산 (SciPy/statsmodels)
- ❌ Groups에서 통계 직접 계산 금지

### 핵심 디렉토리
```
statistical-platform/
├── lib/statistics/
│   ├── groups/                      - 6개 그룹 (TypeScript)
│   └── registry/                    - 60개 메서드 메타데이터
├── lib/services/
│   └── pyodide-core.ts              - PyodideCore (421 lines)
└── public/workers/python/           - Python Workers (4개)
```

---

## 📦 배포 시나리오

이 프로젝트는 **2가지 배포 방식**을 지원합니다:

### Vercel 클라우드 배포 (일반 사용자)
- ✅ **CDN 자동 다운로드**: Pyodide를 CDN에서 자동으로 로드
- ✅ **빌드 크기**: ~50MB (Pyodide 미포함)
- ✅ **환경변수**: `NEXT_PUBLIC_OLLAMA_ENDPOINT` (선택)
- 🎯 **대상**: 인터넷 연결 가능한 일반 사용자

### 로컬 오프라인 배포 (폐쇄망 환경)
- ✅ **완전 오프라인**: 인터넷 없이 모든 기능 동작
- ✅ **빌드 크기**: ~250MB (Pyodide 200MB 포함)
- ✅ **환경변수**: `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true` (필수)
- 🎯 **대상**: 군대/병원/연구소 등 폐쇄망 환경

**상세**: [DEPLOYMENT_SCENARIOS.md](statistical-platform/docs/DEPLOYMENT_SCENARIOS.md)

---

## 🔧 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드 (Vercel 클라우드용)
npm run build:offline # 빌드 (로컬 오프라인용)
npm test             # 테스트
npx tsc --noEmit     # 타입 체크

# 오프라인 배포 사전 준비
npm run setup:pyodide    # Pyodide 다운로드 (200MB)
ollama pull mxbai-embed-large  # Ollama 모델 (선택)
```

---

## 📋 현재 작업 상태

**최신 상태** (2025-11-11):
- ✅ Phase 6 완료: PyodideCore 직접 연결
  - ✅ 10개 handler 완전 변환 (39개 메서드, 100%)
  - ✅ TypeScript 컴파일 에러: **0개** (core groups/handlers)
  - ✅ 코드 품질: **5.0/5** ⭐⭐⭐⭐⭐
- ✅ Phase 1 완료: setTimeout 패턴 제거
  - ✅ 27/27 페이지 (100%) 표준 패턴으로 전환
  - ✅ isAnalyzing Critical 버그 10개 수정
- ✅ Phase 2-2 완료: 코드 품질 개선 (2025-11-04)
  - ✅ **41/41 페이지 (100%)** 완료
  - ✅ TypeScript 에러: 717 → 0 (-100%, 완전 제거)
  - ✅ 코드 품질: 3.5/5 → 4.97/5 (+42% 향상)
- ✅ **Phase A-3-R1 완료** (2025-11-11): 변수 role 매핑 표준화 + Critical 버그 수정
  - ✅ **Phase A-3**: 6개 인터페이스 수정 (Section 17-18 준수)
    - FrequencyTableVariables, PartialCorrelationVariables, RunsTestVariables
    - MoodMedianVariables, BinomialTestVariables, FactorAnalysisVariables
  - ✅ **Phase A-3-R1**: Critical 버그 수정 (외부 코드 리뷰 피드백)
    - chi-square-independence: 2-role 특수 케이스 복구 (row/column)
    - binomial-test, runs-test: handleVariableChange fallback 추가
  - ✅ TypeScript 에러: 0개, 개발 서버: 정상 실행
- ✅ **Smart Flow Phase 4-6 완료** (2025-11-11):
  - ✅ DataValidationStep 리팩토링 (컴포넌트 분리)
  - ✅ AssumptionResultsPanel, NumericStatsTable 컴포넌트화
  - ✅ 125개 컴포넌트 테스트 작성 및 통과

**다음 작업**:
- 🔜 Phase 7 계획 수립 (Tauri 데스크탑 앱 or 추가 통계 메서드)
- 🔜 검증 자동화 스크립트 (선택, 재발 방지)
- 🔜 Phase 8 RAG 시스템 (선택)

**📝 상세 작업 기록**: [dailywork.md](dailywork.md) | [STATUS.md](STATUS.md)

---

## 📚 문서 구조

### 루트 문서 (5개만 유지)
- **[CLAUDE.md](CLAUDE.md)** - AI 코딩 규칙 (이 파일)
- **[README.md](README.md)** - 프로젝트 개요
- **[ROADMAP.md](ROADMAP.md)** - 개발 로드맵
- **[STATUS.md](STATUS.md)** - 프로젝트 현재 상태
- **[dailywork.md](dailywork.md)** - 작업 기록 (최근 7일만)

### statistical-platform/docs/ (구현 상세)
- [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md) - any → unknown 예제
- [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - 통계 모듈 코딩 표준 ⭐
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방 🚨

### 문서 관리 규칙
- **dailywork.md**: 최근 7일만 유지 (주말마다 `archive/dailywork/`로 이동)
- **STATUS.md**: Phase 완료 시 또는 주요 마일스톤만 업데이트
- ❌ 분석/검토 문서: 새 파일 생성 금지 → STATUS.md에 요약만 추가

---

**Updated**: 2025-11-11 | **Version**: Phase 6 + Phase 2-2 + Phase A-3-R1 + Smart Flow Phase 4-6 Complete | **Next**: Phase 7 or 검증 자동화
