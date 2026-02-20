# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎨 Design System 메타데이터 동기화 (CRITICAL)

**⚠️ 다음 파일 수정 시 Design System 메타데이터 동기화 필수!**

| 트리거 파일 | 메타데이터 | 업데이트 조건 |
|------------|----------|-------------|
| `lib/utils/type-guards.ts` | `coding-patterns/type-guards.json` | 함수 추가/변경 시 |
| `components/rag/*.tsx`<br>`lib/rag/*.ts` | `coding-patterns/rag-components.json` | 컴포넌트/서비스 추가/변경 시 |
| `docs/STATISTICS_CODING_STANDARDS.md`<br>`hooks/use-statistics-page.ts` | `coding-patterns/statistics-page-pattern.json` | 규칙/버그 추가 시 |
| `__tests__/**/*.test.tsx` | `coding-patterns/test-snippets.json` | 새 패턴 발견 시 |
| `lib/constants/statistical-methods.ts`<br>`components/smart-flow/steps/purpose/DecisionTree.ts` | `coding-patterns/statistical-methods.json` | 메서드 추가/변경 시 |

**상세 규칙**: [DESIGN_SYSTEM_SYNC_RULES.md](statistical-platform/docs/DESIGN_SYSTEM_SYNC_RULES.md)

**워크플로우**:
1. 트리거 파일 수정
2. 대응 메타데이터 JSON 업데이트 (`lastUpdated` 필드 필수)
3. 사용자에게 보고: "메타데이터 업데이트 완료"

---

## 🚨 현재 중요 규칙

**상태**: ✅ Phase 13 + Export + Phase 5-2 Complete (2026-02-20)
- Phase 13: LLM 추천/해석 + Terminology System
- Export: DOCX/Excel/HTML 내보내기 + 히스토리 AI 해석 저장
- Phase 5-2: pyodide-statistics 리팩터 (Generated 래퍼 전환 + any 제거)
- **진행 중**: Phase 5-3 (pyodide-statistics 안정화)

**⚠️ 아키텍처 결정 (2026-02-13)**:
- **Smart Flow = 통계 분석의 유일한 진입점** (홈 `/` = ChatCentricHub)
- **개별 `/statistics/*` 페이지 43개 = 레거시** (코드 유지, 신규 개발 안 함)
- **Bio-Tools = `/bio-tools/` 별도 섹션** (12개 생물학 분석, 5페이지로 구성)

**반드시 지킬 것** (CRITICAL):
1. ✅ **변수 role 일치**: variable-requirements.ts의 `role`을 types/statistics.ts에 정확히 반영
   - `role: 'factor'` → `factor: string[]` ✅
   - `role: 'factor'` → `groups: string[]` ❌ 금지!

2. ✅ **타입 단일 정의**: types/statistics.ts에만 정의 (페이지별 재정의 절대 금지)
   - ❌ 금지: `mann-whitney/page.tsx`에서 `interface PostHocComparison {...}`
   - ✅ 권장: `import { PostHocComparison } from '@/types/statistics'`

3. ✅ **공통 컴포넌트 우선**: StatisticsTable, EffectSizeCard, VariableSelectorModern 등 사용

4. ✅ **통계 방법 ID 일관성**: `lib/constants/statistical-methods.ts`에서만 정의
   - ID = 페이지 경로 (예: `t-test` → `/statistics/t-test`)
   - 임의로 새 ID 생성 금지 → 기존 `aliases` 활용
   - **상세**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - Section 20

5. ✅ **pyodideStats 래퍼 하이브리드 전략**:
   - **래퍼 사용** (단순 페이지): binomial-test, sign-test, runs-test, mcnemar, 테스트 코드
   - **직접 callWorkerMethod 사용** (복잡 페이지): anova, ancova, arima, 나머지 41개
   - ❌ 무리한 래퍼 통합 금지 → 타입 불일치 시 이중 유지보수 발생
   - **상세**: `lib/services/pyodide-statistics.ts` 파일 상단 주석

**상세**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - Section 17-19

---

## 🎨 공통 컴포넌트 전략

**목표**: 컴포넌트 재사용성 극대화 + 일관된 UX + 유지보수 효율화

### 📦 현재 공통 컴포넌트 목록

**1. 분석 관련 컴포넌트** (`components/common/analysis/`)
- ✅ **PurposeCard** - 선택 가능한 카드 (분석 목적, 방법 선택)
- ✅ **AIAnalysisProgress** - AI 분석 진행 표시 (프로그레스 바 + 단계)
- ✅ **DataProfileSummary** - 데이터 요약 표시 (표본 크기, 변수 타입)

**2. 변수 선택 컴포넌트** (`components/variable-selection/`)
- ✅ **VariableSelectorModern** - 드래그앤드롭 + 모달 기반 (복잡한 다중 변수 선택)
- ✅ **VariableSelectorPanel** - 클릭 기반 팝오버 선택 (간단한 변수 선택)

**3. 통계 결과 컴포넌트** (`components/common/statistics/`)
- ✅ **StatisticsTable** - 통계 결과 테이블 (내보내기, 정렬 기능)
- ✅ **EffectSizeCard** - 효과 크기 표시
- ✅ **AssumptionTestCard** - 가정 검정 결과 표시

### 🔧 공통 컴포넌트 개발 워크플로우

**⚠️ CRITICAL: 모든 컴포넌트 작업은 Design System 쇼케이스를 참조하세요!**

**Design System 쇼케이스 접속**:
```bash
pnpm dev
# → http://localhost:3000/design-system
```

**파일 위치**: `statistical-platform/app/(dashboard)/design-system/page.tsx`

**현재 쇼케이스 구성** (11개 섹션):
- 🎨 **Colors**: shadcn/ui 색상 팔레트
- 🔘 **Buttons**: 라이브 플레이그라운드
- 📝 **Typography**: Headings, Body Text
- 🧩 **Components**: 공통 컴포넌트 실시간 테스트
- 📊 **Visualizations**: 차트 컴포넌트
- 📋 **Data Utilities**: 데이터 처리 유틸리티
- 💻 **Statistics Pattern** (DEV) - 통계 페이지 코딩 표준
- 🛡️ **Type Guards** (DEV) - 타입 가드 라이브러리
- 💬 **RAG Components** (DEV) - RAG 시스템 컴포넌트
- 🧪 **Test Snippets** (DEV) - Vitest 테스트 패턴

---

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재**: Phase 13 + Export + Phase 5-2 완료 → Phase 5-3 진행 중
- **통계 분석**: Smart Flow (43개 메서드 통합) — 유일한 진입점
- **Bio-Tools**: 12개 생물학 분석 (5페이지) — 별도 섹션 예정
- **데이터 도구**: 2개

---

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

### 3. 통계 코딩 표준 (CRITICAL)

**Smart Flow + 개별 통계 페이지(레거시) 일관성 유지 필수!**
- 사용자 동선: Smart Flow (홈 `/`)가 유일한 통계 진입점
- 개별 `/statistics/*` 43개 페이지: 레거시 (코드 유지, 신규 개발 안 함)
- Bio-Tools `/bio-tools/*`: 별도 섹션으로 신규 구현 예정

⚠️ **상세 규칙**: [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md)

**핵심 원칙**:
- ✅ `useStatisticsPage` hook 사용 (핵심 상태: currentStep, isAnalyzing, results, error)
- ✅ UI 상태는 `useState` 허용 (analysisTimestamp, activeTab, testType 등 페이지별 UI 옵션)
- ✅ `useCallback` 모든 이벤트 핸들러에 적용
- ✅ **await 패턴 사용** (setTimeout 사용 금지)
- ✅ `any` 타입 절대 금지 (unknown + 타입 가드)
- ✅ TypeScript 컴파일 에러 0개
- ✅ **PyodideCore 사용**: 모든 통계 계산은 검증된 라이브러리

**참고 문서**:
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방

### 3-1. Bio-Tools Worker 패턴 (Worker 5+6/Phase 15)

**Bio-Tools는 반드시 다음 규칙을 따릅니다:**
1. ✅ **Methods Registry 필수**: 모든 새 메서드는 `methods-registry.json`에 정의
2. ✅ **Generated Types 필수**: `callWorkerMethod` 직접 호출 금지 → 자동 생성된 래퍼 사용
3. ✅ **Pure Python**: 가능하면 NumPy/SciPy/Scikit-learn만 사용 (외부 라이브러리 최소화)
4. ✅ **서비스 분리**: `BioStatisticsService` (`worker5`, `worker6` 전담)

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
pnpm tsc --noEmit
```

**2-2. 테스트 실행** (🟡 선택 - 로직 변경 시)
```bash
pnpm test [파일명]
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

**✅ 테스트 검증**:

**통합 테스트** (✅ 필수 - 모든 작업 완료 시)
```bash
pnpm dev
# → 브라우저에서 실제 동작 확인
```

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

**이 프로젝트는 Vitest를 사용합니다**

**필수 규칙**:
- ✅ **Mock 함수**: `vi.fn()`, `vi.mock()`, `vi.spyOn()`
- ✅ **globals: true** 설정으로 `describe`, `it`, `expect` 전역 사용
- ✅ Mock 타입 사용 시: `import { vi, Mock } from 'vitest'`

**테스트 실행**:
```bash
pnpm test             # 모든 테스트 (Vitest)
pnpm test [파일명]    # 특정 파일
pnpm test:watch       # watch 모드
pnpm test:coverage    # 커버리지
pnpm test:jest        # Jest (성능 테스트 전용)
```

### 5-1. UI 테스트 3층 아키텍처 (CRITICAL - UI 변경 시 테스트 깨짐 방지)

**원칙**: UI 구조 변경에도 테스트가 깨지지 않는 레이어 분리

| 레이어 | 테스트 대상 | 방법 | UI 변경 시 |
|--------|-----------|------|-----------|
| **L1: Store/Logic** | 상태 전이, 비즈니스 로직 | Zustand store 직접 조작 | **안 깨짐** |
| **L2: data-testid** | 핵심 요소 존재 확인 | `data-testid` 속성 | **거의 안 깨짐** |
| **L3: E2E** | 실제 유저 플로우 | Playwright 브라우저 | 깨질 수 있음 |

**L1 패턴 (Store-level) - 우선 사용**:
```typescript
// ✅ 좋은 예: Store 상태 직접 검증 (UI 변경 무관)
it('재분석 시 데이터가 초기화된다', () => {
  const store = useSmartFlowStore.getState()
  store.setResults(null)
  store.setUploadedData(null)
  store.setIsReanalysisMode(true)
  store.setCurrentStep(1)
  expect(useSmartFlowStore.getState().isReanalysisMode).toBe(true)
  expect(useSmartFlowStore.getState().uploadedData).toBeNull()
})

// ❌ 나쁜 예: DOM 텍스트에 결합 (UI 텍스트 바뀌면 깨짐)
it('재분석 버튼이 있다', () => {
  fireEvent.click(screen.getByText('다른 데이터로 재분석'))
})
```

**L2 패턴 (data-testid) - 렌더링 확인용**:
```typescript
// ✅ 좋은 예: data-testid로 존재 확인 (텍스트 무관)
expect(screen.getByTestId('results-action-step')).toBeInTheDocument()

// ❌ 나쁜 예: 특정 텍스트에 결합
expect(screen.getByText('📊 분석 히스토리')).toBeInTheDocument()
```

**금지 패턴**:
- ❌ `screen.getByText('특정 버튼 텍스트')` - 텍스트 변경 시 깨짐
- ❌ `screen.getByRole('button', { name: /특정 패턴/ })` - 라벨 변경 시 깨짐
- ❌ Radix UI Portal 내부 요소 클릭 (JSDOM 한계) - Store-level로 대체

**UI 수정 시 반드시**:
1. 기존 `data-testid` 속성 유지 (삭제/변경 금지)
2. 새 핵심 요소 추가 시 `data-testid` 부여
3. 비즈니스 로직 변경 시 L1 테스트 추가/수정
4. `pnpm test --run` 실행하여 깨짐 확인

**E2E Selector Registry** (`e2e/selectors.ts`):
- 모든 E2E용 `data-testid`를 중앙 관리하는 계약 파일
- UI 컴포넌트와 E2E 테스트가 이 값을 공유
- ⚠️ **기존 testid 삭제/변경 절대 금지** (E2E 깨짐)
- 새 인터랙티브 요소 추가 시 여기에 등록
- E2E 실행: `pnpm build && npx playwright test --config=e2e/playwright-e2e.config.ts`

---

### 6. 코드 스타일

- ❌ 식별자에 이모지 절대 금지 (변수명, 함수명, 클래스명)
- ✅ Next.js 15 App Router 사용 (Pages Router 금지)
- ✅ shadcn/ui 컴포넌트 우선 사용

### 7. 명명 규칙 (Naming Convention) ⭐ NEW

**TypeScript/JavaScript 일반**:
| 항목 | 패턴 | 예시 |
|------|------|------|
| 변수/함수 | camelCase | `selectedMethod`, `handleClick`, `isLoading` |
| 상수 | UPPER_SNAKE_CASE | `STATISTICAL_METHODS`, `PURPOSE_CATEGORY_MAP` |
| 타입/인터페이스 | PascalCase | `StatisticalMethod`, `AnalysisPurpose` |
| 컴포넌트 | PascalCase | `MethodBrowser`, `PurposeInputStep` |
| 파일명 (일반) | kebab-case | `method-mapping.ts`, `smart-flow.ts` |
| 파일명 (컴포넌트) | PascalCase | `MethodBrowser.tsx`, `PurposeInputStep.tsx` |

**Python Worker I/O 규칙 (CRITICAL)**:
- ✅ **함수 파라미터**: `camelCase` (외부 인터페이스)
- ✅ **반환값 딕셔너리 키**: `camelCase` (외부 인터페이스)
- ✅ **TypeScript 타입 정의**: `camelCase`
- ⚠️ **Python 함수명**: `snake_case` 유지 (Python PEP8 컨벤션)
- ⚠️ **Python 내부 로컬 변수**: `snake_case` (PEP8 준수)
- ⚠️ **TypeScript에서 Python 함수 호출**: 함수명 문자열은 `snake_case` 유지
  - 예: `callWorkerMethod(2, 'chi_square_test', {...})`
- 🧪 **자동 검증**: `__tests__/naming-convention.test.ts`가 위반 감지

```python
# ✅ Python Worker 올바른 예시
def binomialTest(successCount, totalCount, probability=0.5):  # 파라미터: camelCase
    # 내부 변수: snake_case (PEP8)
    p_value = binom_result.pvalue
    success_rate = successCount / totalCount

    # 반환 키: camelCase
    return {
        'pValue': float(p_value),
        'successCount': int(successCount),
        'proportion': float(success_rate)
    }

# ❌ 금지 (외부 인터페이스에 snake_case)
def binomial_test(success_count, total_count):  # 파라미터 snake_case 금지
    return { 'p_value': p_value }  # 반환 키 snake_case 금지
```

```typescript
// ✅ TypeScript 호출 예시
callWorkerMethod(2, 'binomialTest', {
  successCount: 10,  // camelCase
  totalCount: 100,
  probability: 0.5
})
// 응답: { pValue: 0.05, successCount: 10, proportion: 0.1 }
```

**⚠️ 자주 틀리는 표기**:
| 올바른 표기 | 잘못된 표기 | 비고 |
|------------|------------|------|
| `cohensD` | `cohens_d`, `cohen_d` | 효과크기 |
| `etaSquared` | `eta_squared` | ANOVA 효과크기 |
| `pValue` | `pvalue`, `p_value` | 유의확률 |
| `rSquared` | `r_squared`, `rsquared` | 결정계수 |
| `fStatistic` | `f_statistic` | F 통계량 |
| `stdError` | `std_error` | 표준오차 |
| `adjRSquared` | `adj_r_squared` | 수정 결정계수 |
| `durbinWatson` | `durbin_watson` | 자기상관 검정 |
| `timeseries` | `time-series` | 카테고리명 |

**📋 상세 수정 이력**: [PARAMETER_NAMING_FIX_CHECKLIST.md](statistical-platform/docs/PARAMETER_NAMING_FIX_CHECKLIST.md)

---

## 🏗️ 아키텍처

### 구조 개요
```
사용자 → PyodideCore → Python Workers (SciPy/statsmodels)
         ↓
    직접 호출 (callWorkerMethod<T>)
    타입 안전성 향상
```

### 핵심 디렉토리
```
statistical-platform/
├── app/
│   ├── page.tsx                      - Smart Flow 홈 (ChatCentricHub) = 통계 진입점
│   ├── (dashboard)/statistics/       - 43개 개별 페이지 (레거시, 신규 개발 안 함)
│   ├── (dashboard)/bio-tools/        - Bio-Tools (예정, 5페이지)
│   └── (dashboard)/data-tools/       - 데이터 도구 2개
├── components/smart-flow/            - Smart Flow UI 컴포넌트
├── lib/services/
│   └── pyodide-core.ts              - PyodideCore (421 lines)
└── public/workers/python/           - Python Workers (4개 + Bio 2개 예정)
```

---

## 📦 배포 시나리오

**2가지 배포 방식** 지원:

### Vercel 클라우드 배포 (일반 사용자)
- ✅ **CDN 자동 다운로드**: Pyodide를 CDN에서 자동으로 로드
- ✅ **빌드 크기**: ~50MB (Pyodide 미포함)

### 로컬 오프라인 배포 (폐쇄망 환경)
- ✅ **완전 오프라인**: 인터넷 없이 모든 기능 동작
- ✅ **빌드 크기**: ~250MB (Pyodide 200MB 포함)
- ✅ **환경변수**: `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true` (필수)

**상세**: [DEPLOYMENT_SCENARIOS.md](statistical-platform/docs/DEPLOYMENT_SCENARIOS.md)

---

## 🔧 개발 명령어

```bash
pnpm dev             # 개발 서버
pnpm build           # 빌드 (Vercel 클라우드용)
pnpm build:offline   # 빌드 (로컬 오프라인용)
pnpm test            # 테스트
pnpm tsc --noEmit    # 타입 체크

# 오프라인 배포 사전 준비
pnpm setup:pyodide   # Pyodide 다운로드 (200MB)
```

---

## 📚 문서 구조

### 루트 문서 (4개만 유지)
- **[CLAUDE.md](CLAUDE.md)** - AI 코딩 규칙 (이 파일)
- **[README.md](README.md)** - 프로젝트 개요
- **[ROADMAP.md](ROADMAP.md)** - 개발 로드맵
- **[TODO.md](TODO.md)** - 프로젝트 현황 + 할일 + 최근 작업 (7일)

### statistical-platform/docs/ (구현 상세)
- [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md) - any → unknown 예제
- [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md) - 통계 모듈 코딩 표준 ⭐
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방 🚨
- [DESIGN_SYSTEM_SYNC_RULES.md](statistical-platform/docs/DESIGN_SYSTEM_SYNC_RULES.md) - Design System 메타데이터 동기화 ⭐
- [SMART_FLOW_UX_IMPROVEMENTS.md](statistical-platform/docs/SMART_FLOW_UX_IMPROVEMENTS.md) - Smart Flow UX 개선 계획
- [PHASE5-3-PLAN.md](statistical-platform/docs/PHASE5-3-PLAN.md) - pyodide-statistics 안정화 계획
- [EXPORT_IMPLEMENTATION_SUMMARY.md](statistical-platform/docs/EXPORT_IMPLEMENTATION_SUMMARY.md) - Export 구현 요약

### 문서 관리 규칙
- **TODO.md**: 현황 + 할일 + 최근 7일 작업 기록 (통합 관리)
- **archive/dailywork/**: 7일 이상 된 작업 기록 보관
- ❌ 분석/검토 문서: 새 파일 생성 금지 → TODO.md에 요약만 추가

---

**Updated**: 2026-02-20 | **Version**: Phase 13 + Export + Phase 5-2 Complete | **Next**: Phase 5-3 (pyodide-statistics 안정화)
