# 프로젝트 현황 + 할일

**최종 업데이트**: 2026-02-28 (Graph Studio 첫 화면 리디자인 — Template-first + Dual CTA + 어류 샘플)

---

## 🎯 현재 상태

**프로젝트**: 전문가급 통계 분석 플랫폼 (SPSS/R Studio 급)
**기술**: Next.js 15 + TypeScript + Pyodide + Ollama (RAG)

**아키텍처 결정 (2026-02-13)**:
- **Smart Flow** = 통계 분석의 유일한 진입점 (홈 `/`)
- **개별 `/statistics/*` 43개 페이지** = 레거시 (코드 유지, 신규 개발 안 함)
- **Bio-Tools** = `/bio-tools/` 별도 섹션 (12개 분석, 5페이지, 예정)

| 항목 | 현황 |
|------|------|
| **Smart Flow** | 43개 메서드 통합 ✅ |
| **TypeScript 에러** | 0개 ✅ |
| **테스트 커버리지** | 88% (38/43) |
| **통계 신뢰성** | 98% (SciPy/statsmodels) |
| **DecisionTree 커버리지** | 49/49 (100%) ✅ |
| **Golden Values 테스트** | 44/44 (100%) ✅ - 5개 라이브러리 |
| **Methods Registry** | 64개 메서드 (4 Workers) ✅ |
| **E2E 테스트** | 12개 (핵심 플로우 커버) ✅ |
| **LLM 추천/해석** | Phase 1-3 완료 ✅ |
| **Bio-Tools** | 계획 수립 완료, 구현 예정 🔜 |

---

## 📅 최근 작업 (7일)

### 2026-02-24 (월) 기술부채 정리 + Smart Flow UI 색상 토큰 완료

- ✅ **기술부채**: 레거시 43개 statistics 페이지 삭제, `ignoreDuringBuilds: false`, `missingRemoved` 실제 계산, eslint flat config 정비
- ✅ **Smart Flow UI 색상 토큰 일관성** (Phase 1–4): 가정 배지/AI 감지 배지/셀렉터 6개/경고 색상 → semantic token 전환
- ✅ **TwoWayANOVA Factor1 스키마 수정**: info(파랑) → success(초록) (집단 역할 일관성)
- ✅ **Step 4 ResultsActionStep 구조 개선**: 카드 6개 분리, 액션 바 1행, L2/L3 기본 닫힘
- ✅ **색상 토큰 회귀 테스트**: 6개 셀렉터 × 15 테스트 (color-tokens.test.tsx)
- ✅ **AI 채팅 히스토리 (multi-turn Q&A)**: stream-follow-up.test.ts 27개 테스트 통과

### 2026-02-26 (목) UX 개선 4종

- ✅ **setTimeout(1200ms) 제거**: `page.tsx` 업로드 완료 후 인위적 딜레이 → `toast.success` + 즉시 `navigateToStep(3)` (CLAUDE.md setTimeout 금지 규칙 적용)
- ✅ **experiment-design disabled**: `TrackSuggestions` — `disabled` prop + HTML `disabled` + "준비 중" badge + `cursor-not-allowed` (이전 항상-toast fallback 대체)
- ✅ **히스토리 항상 표시**: `SmartFlowLayout` — `historyCount > 0 || showHistory` 조건 제거 → 초기부터 발견 가능. 0개일 때 "히스토리 (0개)" → `historyTitle`로 수정
- ✅ **이중 헤더 해소**: `VariableSelectionStep` — 외부 `<StepHeader>` 제거 → method name compact `<Badge>` + `Settings2` 아이콘으로 대체 (정보 손실 없음)
- ✅ **허브 버튼 제거**: `SmartFlowLayout` — 로고와 동일한 `resetSession()` 중복 버튼 삭제
- ✅ **테스트 업데이트**: `smart-flow-layout.test.tsx` — "히스토리 버튼 숨김" → "항상 표시" 반영
- 📌 커밋: `520f67d6`

### 2026-02-26 (목) Step 3 VariableSelectionStep AI 리뷰 버그 수정 (High×2 + Medium×2 + A)

- ✅ **[HIGH] normality-test → one-sample 매핑 수정**: SELECTOR_MAP `'correlation'` → `'one-sample'` (단일 변수 요구사항 충족, min 2 강제 차단 해소)
- ✅ **[HIGH] mcnemar 교차표 자동 구성**: `executeNonparametric` case에서 `independentVar/dependentVar` → 2×2 교차표 자동 구성 (기존 `[[0,0],[0,0]]` 폴백 방지). 변수가 이진이 아니면 명확한 에러 throw
- ✅ **[HIGH] proportion-test successCount 자동 계산**: `dependentVar`에서 positive-keyword 우선 (`yes/1/true/성공/...`) + 사전순 후순위로 success 기준값 결정 → successCount/successLabel 자동 산출 (기존 `successCount=0` 폴백 방지)
- ✅ **[MEDIUM] 숨겨진 covariate 제출 차단**: `GroupComparisonSelector.handleSubmit`에서 `showCovariate && covariates.length > 0` 가드 추가 (t-test/mann-whitney 등에서 AI 감지 covariate가 몰래 제출되던 문제)
- ✅ **[MEDIUM] mcnemar/proportion-test 이진 변수 필터**: `BINARY_ONLY_IDS` 집합 + `requireBinary` 플래그로 `uniqueCount === 2` 변수만 표시 (3-레벨 이상 선택 시 워커 예외 선제 차단)
- ✅ **[B] proportion-test nullProportion UI**: ChiSquareSelector goodness 모드에 귀무가설 비율(p₀) 입력 카드 추가 (0.01~0.99, 기본 0.5, 유효성 검증 포함). executor string→float 파싱으로 수정
- 📌 커밋: `cac75bfc`

### 2026-02-26 (목) ResultsActionStep 비판적 검토 후속 — L2 게이트 버그 + 테스트 불일치 수정

- ✅ **🔴 Bug: L2 게이트 too narrow** — `hasDetailedResults`가 `statisticalResult`만 검사 → `results.additional`(rSquared/accuracy/power 등) 단독 케이스에서 `MethodSpecificResults` 숨겨짐. `results?.additional` 조건 추가로 수정
- ✅ **🟠 테스트 불일치 해소** — `computeLayerVisibility` helper가 제거된 `uploadedFileName/uploadedData` 조건을 여전히 포함. 시그니처를 `(sr, additional?)` 로 변경, Scenario 4 케이스 2개 교체 (rSquared·power 단독 케이스로)
- ✅ **🟠 export `interpretEffectSize` 정규화** — `normalized = type.toLowerCase().replace(/\s+/g,'')` 도입. `pearson r`, `cramer's v`, `η²` 등 AI 변형 입력 시 오분류 방지
- ✅ **🟡 useCallback deps `t` 6개 추가** — `handleSaveAsFile`, `handleReanalyze`, `handleNewAnalysisConfirm`, `handleInterpretation`, `handleFollowUp`, `handleCopyResults` — 언어 전환 stale text 방지
- ✅ **🟡 `handleFollowUp` 오류 처리 개선** — `\`오류: ${msg}\`` 하드코딩 제거: `instanceof Error` → `t.smartFlow.executionLogs.errorPrefix()`, 그 외 → `t.results.followUp.errorMessage` 직접 사용 (이중 감쌈 방지)
- ✅ **🟢 `scrollIntoView?.` optional chaining** — JSDOM 호환 (테스트 환경에서 scrollIntoView 미구현 시 예외 방지)
- ✅ **🟢 테스트 2개 추가** — `handleFollowUp 에러 처리`: Error 인스턴스/비-Error 예외 분기, 이중 감쌈 방지 검증
- ✅ **검증**: tsc 0 errors, tests 107 passed (69 + 38)
- 📌 커밋: `3544e447`

### 2026-02-26 (목) proportion-test successCount=0 버그 + 테스트 보강

- ✅ **🔴 successCount=0 edge case 버그 수정**: `successCount === 0` → `Number.isFinite(Number(value))` 파싱으로 변경. 명시적 0이 undefined처럼 처리되어 auto-detect로 폴백되던 문제 수정 (`Number("5")` → 5 변환 동작 검증)
- ✅ **successLabel 타입 가드**: `unknown` → `typeof === 'string'` 체크 추가
- ✅ **테스트 추가 (executor-routing)**: successCount=0 보존, Yes/No auto-detect + successLabel 반환, McNemar 2×2 자동 빌드 — 3개
- ✅ **테스트 추가 (ChiSquareSelector)**: proportion-test 이진 변수 필터 + nullProportion UI, 제출 페이로드 검증 — 2개
- ✅ **검증**: tsc 0 errors, tests 128 passed (118 + 10)
- 📌 커밋: `ff48a374`

### 2026-02-28 (금) Graph Studio 첫 화면 리디자인 (DataUploadPanel)

- ✅ **UX 전면 재설계**: 빈 업로드 박스 → Template-first 온보딩 랜딩 페이지 — `1d7cf054`
- ✅ **차트 썸네일 6개 (Bento)**: bar / scatter / line / boxplot / histogram / heatmap — 클릭 시 샘플 데이터로 즉시 에디터 진입
- ✅ **Dual CTA**: "샘플로 시작하기" (Primary) + "파일 업로드" (Secondary)
- ✅ **어류 성장 샘플 데이터**: Bass · Bream · Carp × 10행 (species, length_cm, weight_g, age)
- ✅ **Bug fix**: 파일 업로드 버튼 DOM 탐색 → `useRef` 교체; `as const` + ChartType 충돌 → 명시적 인터페이스
- ✅ **차트 유형별 올바른 필드 매핑**: `selectXYFields(CHART_TYPE_HINTS[chartType])` 사용 (단순 chartType 덮어쓰기 금지)
- ✅ **AI 리뷰 문서**: `stats/docs/REVIEW-GRAPH-STUDIO-ONBOARDING.md`
- ✅ **검증**: tsc 0 errors, TypeScript types clean

### 2026-02-28 (금) Graph Studio 테스트 시뮬레이션 + Stage 1/2/3 일관성 정리

- ✅ **export-utils.ts 테스트 16개**: DOM API + ECharts 인스턴스 모킹 — PNG/SVG 흐름, DPI→pixelRatio, 파일명 정규화, Firefox body.append 순서, null/undefined 가드
- ✅ **스토어 dead 필드 제거**: `isExporting`, `exportProgress`, `isAiEditing` — Stage 3가 동기식으로 확정되어 완전히 불필요한 상태 (GraphStudioState + initialState + 3개 actions)
- ✅ **AiEditTab 정리**: `setAiEditing` 2회 호출 제거 (로컬 `isLoading`과 중복), `as ChartSpecPatch[]` 불필요 캐스트 제거 (Zod 검증 후 타입 이미 보장)
- ✅ **검증**: tsc 0 errors, 167/167 테스트 통과 (Graph Studio 7개 파일)

### 2026-02-26 (목) proportion-test interpretation 개선

- ✅ **proportion-test 전용 해석 문구**: `successLabel` 포함 — "표본 비율이 귀무가설 비율과 유의하게 다릅니다 (성공 기준: Yes)" 형식
- ✅ **테스트 보강**: interpretation에 successLabel 포함 검증 + significant 케이스 추가 (25 tests)
- 📌 커밋: `6be13272`

### 2026-02-26 (목) Step 4 AnalysisExecutionStep + ResultsActionStep 비판적 검토

- ✅ **Bug: `setTimeout(onNext)` cleanup 누락** — `autoNextTimerRef`로 관리 + 언마운트 시 정리 (언마운트 후 콜백 방지)
- ✅ **Bug: `hasValidMapping` 불완전** — 3개 필드 하드코딩 → `Object.values().some()` 로 전체 VariableMapping 키 대응 (AutoConfirmSelector 10개 메서드 호환)
- ✅ **타입 캐스팅 제거**: `variableMapping as Record<string, unknown>` → `variableMapping ?? {}` (VariableMapping 타입 직접 사용)
- ✅ **Fix 주석 정리**: `// Fix 4-A/B/C` 내부 수정 마커 제거
- ✅ **`console.error` × 2 → `logger.error`**: ResultsActionStep 로거 정책 준수

### 2026-02-25 (수) Step 3 VariableSelectionStep 전면 개선

- ✅ **SELECTOR_MAP 전면 정비**: dead alias 전부 제거, 실제 51개 method ID 100% 매핑 (기존 71%가 legacy VariableSelectorToggle fallback) — `82ff278e`
- ✅ **ChiSquareSelector 신규**: independence(chi-square/mcnemar) + goodness(chi-square-goodness/proportion-test) 모드 분기 — `82ff278e`
- ✅ **AutoConfirmSelector 신규**: 복잡한 메서드(arima, kaplan-meier, power-analysis 등 10개) AI 감지 변수 요약 후 자동 진행 — `82ff278e`
- ✅ **GroupComparisonSelector covariate 패널**: ANCOVA용 공변량 다중선택 UI (showCovariate prop) — `82ff278e`
- ✅ **OneSampleSelector 버튼 위치 통일**: 하단 → 상단 헤더 (다른 셀렉터와 일치) — `82ff278e`
- ✅ **validation 에러 Alert 표시**: 기존 logger.warn만 → UI Alert 표시 후 진행 허용 — `82ff278e`
- ✅ **TwoWayAnovaSelector 재활성화**: anova + AI factors 2개 이상 감지 시 자동 업그레이드 — `82ff278e`
- ✅ **pyodide-statistics 버그 수정**: simpleLinearRegression fStatistic=t², performTukeyHSD groupNames 매핑, testNormality alpha 전달 — `82ff278e`
- ✅ **테스트**: ChiSquareSelector 8개 + VariableSelectionStep 17개 신규 (4708/4708 통과) — `82ff278e`

### 2026-02-25 (수) Step 2 PurposeInputStep 비판적 검토

- ✅ **Critical Bug 수정**: 자동 AI 추천 트리거 조건 — `assumptionResults !== null` → `data && validationResults !== null` (가정 검정 Step 4 이전 후 조건이 항상 false가 되던 문제) — `f9b85fd7`
- ✅ **데드코드 제거**: `analysisError`, `activeTab` state + `handleUseRecommendation` + `cn` import — `f9b85fd7`
- ✅ **await 불필요 제거**: `onPurposeSubmit`은 void 반환 — 3개 handler에서 `async/await` 제거 — `f9b85fd7`
- ✅ **getSelectorType 타입 안전화**: if/else 체인 → `ReadonlyMap<string, SelectorType>` 기반 룩업 (VariableSelectionStep) — `f9b85fd7`
- ✅ **console.warn → logger.warn**: VariableSelectionStep 로거 정책 준수 — `f9b85fd7`
- ✅ **analyzeAndRecommend dead code 제거**: Ollama/methodCompatibility 경로 삭제 (Step 4 이전 후 영구 도달 불가), 동기함수로 단순화 — `f09831d2`
- ✅ **테스트 보강**: llmRecommender mock 추가 + 자동 트리거 동작 4개 테스트 (4683/4683 통과) — `f09831d2`

### 2026-02-24 (월) 데이터 업로드 UI 비판적 검토 → 3항목 개선

- ✅ **최근 파일 false affordance 수정** — 행 클릭 시 파일 선택기 열기 + recentFilesNote 문구 수정
- ✅ **quickAnalysisMode 자동 진행** — 업로드 성공 직후 Step 3으로 자동 이동 (재분석 모드 제외)
- ✅ **ChatInput 파일 업로드 버튼** — ArrowUpFromLine 아이콘 + Step 1 직접 이동 (onUploadClick prop 체인)

### 2026-02-24 (월) ResultsActionStep UX/코드 품질 개선

- ✅ **결과 해석 페이지 비판적 검토 → 전면 개선** (f03ab4e5, 25913ad5)
  - Phase 1: 용어 시스템 확장 (followUp, confirm, ai.label, metadata.analysisTime)
  - Phase 2: 미구현 차트 export 옵션 완전 제거 (includeCharts, chartsNotReady)
  - Phase 3-11: resetAndReinterpret 추출, 새 분析 확인 다이얼로그, AI 스크롤,
    AI 모델 표시, 재해석 버튼 outline, 칩 사용 추적, StepHeader 저장 버튼,
    캐시 키 개선(variableMapping 포함), 타임스탬프 툴팁, 하드코딩 한국어 → t.*

### 2026-02-24 (월) AI UX 자동 트리거 + 방법 재선택
- ✅ **P1: Smart Flow 탐색→추천 자동 연결** — 탐색 완료 후 Step 2 진입 시 LLM 자동 호출 (사용자 입력 불필요)
- ✅ **P2: 후속 Q&A 후 '다른 방법으로 분석하기' 버튼** — ResultsActionStep에 방법 재선택 진입점 추가
- ✅ **P3: 가정 배지 Pyodide 직접값 표시** — NaturalLanguageInput에 assumptionResults prop 연결
- ✅ **테스트 수정** — chat-input.test.tsx framer-motion mock 완성 (11개 복구)
- ✅ **Cloudflare 배포** — `https://biohub.ecomarin.workers.dev/`

### 2026-02-13 (목) Phase 5-2 완료
- ✅ **Phase 5-2: Pyodide 리팩토링 완료** (세부내역: [archive/dailywork/2026-02-13_phase5-2_complete.md](archive/dailywork/2026-02-13_phase5-2_complete.md))
- ✅ **결과 내보내기 기능** (DOCX/Excel + 클립보드 개선)
- ✅ **Terminology System Phase 1-3** 완료

### 2026--02-06 ~ 2026-02-05
- ✅ LLM Enhanced Recommendation Phase 1-3 완료 (변수 자동 할당, 자연어 입력)
- ✅ UI 테스트 복원력 전략 (L1-L3 아키텍처) 수립

### 2026-01-27 (월)
- ✅ Analysis Guide 구현 완료

### 2025-12-17 (화)
- ✅ **Methods Registry SSOT Phase 1.5 + Phase 2 완료** (8b0e614)
  - `methods-registry.json`: 64개 메서드 정의 (4 Workers)
  - `generate-method-types.mjs`: 자동 타입 생성기
  - `method-types.generated.ts`: 30KB 타입-안전 래퍼 함수
  - camelCase 네이밍 규칙 적용
- ✅ **외부 리뷰 피드백 반영** (a73853d)
  - 타입 추론 개선 및 파서 강화
- ✅ **네이밍 통일** (736c8e7)
  - `ci_lower/ci_upper` → `ciLower/ciUpper`
- ✅ **Design System 업데이트**
  - TestAutomationDashboardSection: Methods Registry 섹션 추가
  - E2E 테스트 진행 상태 반영
- ✅ **E2E 테스트 기반 구축**
  - `e2e/comprehensive/run-all.spec.ts`: ANOVA, T-Test 풀플로우
  - `e2e/comprehensive/anova.spec.ts`: ANOVA 전용 테스트
  - `/test-calculation` 페이지: Pyodide 직접 테스트용

### 2025-12-02 (월)
- ✅ **Golden Values 테스트 확장** - 5개 Python 라이브러리 지원
  - scipy, statsmodels, pingouin, sklearn, lifelines
  - 21개 → 60+ 테스트 케이스 (44개 Jest 테스트 통과)
- ✅ **Interpretation Engine 테스트** - 6개 고급 분석 메서드 추가
  - Kaplan-Meier, Cox Regression, RM-ANOVA, ANCOVA, MANOVA, ARIMA
  - engine-survival-advanced.test.ts (13개 테스트 통과)
- ✅ **Design System 메타데이터** 업데이트
  - TestAutomationDashboardSection: 다중 라이브러리 정보 표시
  - constants-dev.ts: GOLDEN_VALUES_TEST_INFO 갱신

### 2025-12-01 (일)
- ✅ **DecisionTree 확장** - 8개 Purpose 완성, 49개 메서드 지원
  - 새 Purpose: multivariate, utility
  - 확장: compare, distribution, prediction, timeseries
- ✅ **개요 페이지 분리** - non-parametric, chi-square → hasOwnPage: false (SPSS/JASP 패턴)
- ✅ **테스트 추가** - decision-tree-expansion.test.ts (31개 케이스, 총 47개 통과)

### 2025-11-27 (수)
- ✅ **Parameter Naming Convention** - CLAUDE.md에 명명 규칙 추가 (d92fc09)
- ✅ **DataUploadStep compact mode** - 파일 변경 버튼 (a9e02d2)
- ✅ **formatters.ts 표준화** - any 타입 제거 (ea68a4c)
- ✅ **p-value 해석 수정** + 상관계수 threshold 표준화 (728ddda)
- ✅ **ResultContextHeader** - 43개 통계 페이지 적용 완료

---

## 🏗️ Methods Registry SSOT

**Single Source of Truth** for TypeScript-Python Worker Contract

| 파일 | 역할 |
|------|------|
| `lib/constants/methods-registry.json` | 메서드 정의 (params, returns) |
| `lib/constants/methods-registry.schema.json` | JSON Schema 검증 |
| `lib/constants/methods-registry.types.ts` | 타입 및 헬퍼 함수 |
| `lib/generated/method-types.generated.ts` | 자동 생성 타입 래퍼 |
| `scripts/generate-method-types.mjs` | 타입 생성 스크립트 |

**Workers:**
| Worker | 이름 | 메서드 | 패키지 |
|--------|------|--------|--------|
| 1 | descriptive | 13 | numpy, scipy |
| 2 | hypothesis | 14 | numpy, scipy, statsmodels, pandas |
| 3 | nonparametric-anova | 18 | numpy, scipy, statsmodels, pandas, sklearn |
| 4 | regression-advanced | 19 | numpy, scipy, statsmodels, sklearn |

---

## 📝 다음 작업

### 완료
| 작업 | 설명 | 상태 |
|------|------|------|
| **AI UX 자동 트리거** | 탐색→추천 자동 연결 + 방법 재선택 버튼 + Pyodide 배지 | ✅ P1/P2/P3 완료 |
| **LLM 분석 추천** | OpenRouter 3단 폴백 + 자연어 입력 + 변수 자동 할당 | ✅ Phase 1-3 완료 |
| **LLM 결과 해석** | 스트리밍 AI 해석 (한줄 요약 + 상세) | ✅ 구현 완료 |
| **suggestedSettings → Step 4** | AI 추천 설정(alpha) executor 전달 + custom alpha 적용 | ✅ 완료 |
| **Merge 준비** | data-testid 11개 + Mock 수정 + E2E 2경로 + 기술부채 3건 | ✅ 완료 |
| **결과 클립보드 복사** | 기본 결과 + LLM 해석 → HTML 서식 복사 | ✅ 완료 |
| **Terminology 텍스트 연결 (~150개)** | 하드코딩 텍스트 전체 연결 완료 | ✅ 완료 |

### 완료: Smart Flow 일관성 개선
| 작업 | 설명 | 상태 |
|------|------|------|
| **Phase 1: 타입 안전성** | any 7곳 제거 + @deprecated + 미사용 props + 중복 추출 | ✅ `d840d827` |
| **Phase 2: 스페이싱 표준화** | px-5→px-4, p-5→p-4, py-2→py-2.5 | ✅ `226aef65` |
| **Phase 3: 빈 상태 + 뒤로가기** | 이미 구현 확인 (EmptyState, StepHeader action) | ✅ |
| **Phase 4: 애니메이션 + 문서화** | 이미 구현 확인 (tailwind keyframes, style-constants.ts) | ✅ |
| **2차 리뷰** | VariableSelectionStep 하드코딩 한글 6건 → terminology 이관 | ✅ |

### 완료: Design Polish — 시맨틱 색상 토큰 전환
| 작업 | 설명 | 상태 |
|------|------|------|
| **P0: 시맨틱 토큰 전환** | 15파일 하드코딩 Tailwind → warning/info/success/error 토큰 | ✅ `4d4c5606` |
| **P1: 상태 색상 + 차트 HEX** | 5파일 green/red→success/error, getCSSColor oklch 호환 수정 | ✅ `1bba45d0` |
| **P2: UI 일관성** | 다크모드 수정, 테이블 패딩 STEP_STYLES 통일, FitScore/ConfidenceGauge 토큰화 | ✅ `4d4c5606` |
| **테스트** | 시맨틱 토큰 검증 18개 + ResultsActionStep mock 보완 32건 해결 | ✅ `eeec768c` `3498146c` |

### 🎨 완료: Smart Flow 4단계 UI/UX 일관성 개선 (`2026-02-24`)

**색상 스키마**: 종속=info(파랑) / 집단·Factor1=success(초록) / 독립·Factor2·대응쌍2nd=highlight(보라) / 공변량=muted

| Phase | 항목 | 커밋 |
|-------|------|------|
| 1 | 가정 배지 dark 모드 (GuidedQuestions) | `602a77ec` |
| 2 | AI 감지 변수 역할 배지 (VariableSelectionStep) | `602a77ec` |
| 3 | 셀렉터 6개 색상 통일 (GroupComparison/TwoWayANOVA/MultipleRegression/Paired/OneSample/Correlation) | `602a77ec` + `8281757d` |
| 4 | 경고/첨도 색상 + Step 4 카드 구조 6개 분리 + 액션 바 1행 + AnalysisExecutionStep | `b637e4f0` |
| 테스트 | color-tokens.test.tsx — 6 셀렉터 × 15 케이스 | `7de3b01e` |

---

### 진행 예정
| 작업 | 설명 |
|------|------|
| **~~Graph Studio Stage 2~~** | ✅ 완료 (2026-02-28) — AI 편집 서비스, AiEditTab 활성화, 29개 테스트 |
| **Graph Studio G1: 핵심 UI** | 출력 크기(mm) + 에러바 UI + 축 범위/로그 + 색상 인코딩 UI (상세: 아래) |
| **Phase 15-1: Bio-Tools** | 12개 생물학 분석, `/bio-tools/` 5페이지 구현 ([상세](study/PLAN-BIO-STATISTICS-AUDIT.md)) |

---

## Graph Studio 발전 전략 (2026-02-28 수립)

> 분석 전문: [GRAPH_STUDIO_COMPETITIVE_ANALYSIS.md](docs/GRAPH_STUDIO_COMPETITIVE_ANALYSIS.md)

**포지셔닝**: GraphPad Prism 대안 — "무료 + 한국어 + AI"

- Prism $142+/년 → 무료
- 영어 전용 → 한국어 UI + 한국 저널 프리셋
- AI 없음 → 자연어 편집 + 저널 자동 포맷
- 타겟: 국내 바이오/의학 대학원생

### Phase G1: 핵심 부재 UI (즉시)

스키마는 이미 지원 — UI만 없음:

| 기능 | 구현 포인트 | 우선순위 |
|------|------------|---------|
| **출력 크기 (mm/cm)** + 저널 프리셋 | `ExportTab` + `exportConfig` 스키마 확장 | 🔴 Critical |
| **에러바 UI** — 컬럼 선택 + 배율 | `PropertiesPanel` → `SidePanel` | 🔴 Critical |
| **축 범위 + 로그 스케일 UI** | `PropertiesPanel` 축 설정 섹션 | 🟠 High |
| **색상 인코딩 UI** — 그룹 컬럼 선택 | `PropertiesPanel` | 🟠 High |
| **스타일 프리셋 버튼** (Science/IEEE) | `StyleTab` 또는 `PropertiesPanel` | 🟡 Medium |

### Phase G2: 논문 품질 향상 (1-2개월)

| 기능 | 설명 |
|------|------|
| 유의성 마커 (* ** ***) | ECharts markArea + markLine |
| 저널 사이즈 프리셋 | Nature 89mm, Cell 85mm, PNAS 85mm, KCI 80mm |
| TIFF 출력 300/600 DPI | html2canvas → Blob 변환 |
| 폰트 선택 | Arial/Helvetica/Times |

### Phase G3: AI-Forward 차별화 (3-6개월)

| 기능 | 설명 |
|------|------|
| **저널 자동 포맷** | "Nature format으로" → AI가 규격 자동 적용 |
| **Smart Flow → Graph 자동 연결** | 통계 결과 → 그래프 + 에러바 자동 생성 |
| **유의성 마커 자동 배치** | p-value → *, **, *** 자동 추가 |

---

## Graph Studio Stage 2 + UX 개선 — 리뷰 패키지 (2026-02-28)

> 외부 AI 리뷰를 위한 요약. Stage 2 구현 + Option C UX 개선 완료 상태.

### 구현 범위

| 파일 | 역할 |
|------|------|
| `stats/lib/graph-studio/ai-service.ts` (신규) | `editChart()` — OpenRouter → JSON Patch 생성 + 검증. `AiServiceError` 타입 분류. |
| `stats/components/graph-studio/panels/AiEditTab.tsx` (수정) | 채팅 UI 활성화. stale spec 방어, zero-patch 감지, MAX_MESSAGES=30, localStorage 지속. |
| `stats/components/graph-studio/panels/ExportTab.tsx` (수정) | `setExportConfig` 전용 액션 사용, 미사용 import 제거. |
| `stats/lib/stores/graph-studio-store.ts` (수정) | `setExportConfig` 전용 액션 추가. |
| `stats/lib/graph-studio/index.ts` (수정) | `editChart`, `buildAiEditRequest` export 추가. |
| `stats/__tests__/lib/graph-studio/ai-service.test.ts` (신규) | 단위 테스트 17개 |
| `stats/__tests__/lib/graph-studio/ai-edit-simulation.test.ts` (신규) | 시뮬레이션 13개 (S1–S11) |

### 핵심 설계 결정

1. **Zero-Data Retention**: 실제 데이터 행 미전송. ChartSpec(열 메타데이터)만 AI에 전달.
2. **OpenRouter 재사용**: `openRouterRecommender.generateRawText()` — fallback 체인·타임아웃·인증캐시 공짜 상속.
3. **Non-streaming**: JSON Patch는 완전한 응답 후 파싱. 스트리밍 불필요.
4. **이중 JSON 추출**: 코드 블록 우선 → 중괄호 밸런싱 fallback. AI 규칙 위반에도 복원.
5. **Readonly 경로 강제**: `/data`, `/version` 프롬프트 명시 + 코드 레벨 whitelist 검사.
6. **Zod 검증**: `aiEditResponseSchema` — patches(min 1) + explanation + confidence(0–1).
7. **`AiServiceError` 타입 분류**: `NO_RESPONSE | PARSE_FAILED | VALIDATION_FAILED | READONLY_PATH` — catch 블록에서 코드로 분기.
8. **stale chartSpec 방어**: `chartSpecRef = useRef(chartSpec)` — `await` 후 최신 spec 참조. PropertiesTab 동시 편집 경쟁 조건 방어.
9. **zero-patch 감지**: 패치 적용 후 `JSON.stringify` 비교 — 경로 미발견으로 실제 변경 없으면 에러 메시지 표시.
10. **대화 지속성**: MAX_MESSAGES=30 자동 정리 + `localStorage('graph_studio_ai_chat')` — 브라우저 재시작 후도 기록 유지.

### 알려진 제한사항 (향후 개선)

| 항목 | 현황 | 개선 방향 |
|------|------|------|
| Non-streaming | AI 응답까지 "수정 중…" 대기 | Stage 4에서 `streamChatCompletion` 전환 |
| 컨텍스트 무관 | 매 요청 독립 (이전 편집 히스토리 미전송) | 마지막 2턴 explanation을 user prompt에 포함 |
| AiEditTab 컴포넌트 테스트 없음 | UI 로직 비커버 | Playwright E2E로 보완 예정 |
| ChartSpec 크기 제한 | `MAX_SPEC_JSON_LENGTH = 3000` 하드코딩 | 컬럼 수 기반 동적 계산 고려 |
| zero-patch 에러 메시지 | 고정 문구로 정리 완료 | `AiEditTab`에서 "경로를 찾지 못해 수정이 적용되지 않았습니다..." 메시지 적용 |

### 테스트 시나리오 (시뮬레이션)

S1 X축 라벨 45도 회전 | S2 IEEE 스타일 전환 | S3 에러바 추가 | S4 Y축 제목 변경 | S5 차트 유형 bar→line | S6 색상 인코딩 추가 | S7 연속 2회 편집 누적 | S8 readonly 침범 → spec 불변 | S9 낮은 신뢰도(0.2) | S10 무효 enum("pie") → Zod 실패 | S11 부모 경로 없는 patch → zero-patch 감지

### 기술 부채 (Tech Debt)

**🔴 Critical** — ✅ 모두 해결 (`2026-02-24`)
| 항목 | 파일 | 상태 |
|------|------|------|
| ~~`ignoreDuringBuilds: true`~~ | `next.config.ts` | ✅ `false`로 변경 + eslint 정비 완료 |
| ~~결측값 하드코딩 0~~ | `statistical-executor.ts` | ✅ primaryCol NaN 행 카운트로 실제 계산 |
| ~~레거시 43개 statistics 페이지~~ | `app/(dashboard)/statistics/` | ✅ 삭제 완료 |
| ~~`!` non-null assertion~~ | ~~`prompts.ts:40`, `openrouter-recommender.ts:445`~~ | ✅ 완료 |

**🟠 High — AI 서비스** ✅ 모두 해결 (`2026-02-25`)
| 항목 | 파일 | 상태 |
|------|------|------|
| ~~레거시 프롬프트 중복~~ | ~~`openrouter-recommender.ts`~~ | ✅ `getSystemPrompt()` 제거됨, `prompts.ts` SSOT로 단일화 완료 |
| ~~`LlmProvider` 타입 이중 정의~~ | ~~`llm-recommender.ts` / `storage-types.ts`~~ | ✅ `storage-types.ts`에서 re-export 패턴으로 단일화 완료 |

### 운영 후 결정 (Post-Launch)

**Ollama (로컬 LLM) 처리 방향**
- 현재: `useOllamaForRecommendation` 기본값 `false` + 원격 환경 자동 skip → 실질적으로 비활성화 상태
- 현재 전략: **현상 유지** (OpenRouter API 키 전용 운영, 로컬 옵션 보존)
- 향후 선택지:
  - A. 현상 유지 — 설정에서 켜면 로컬 사용 가능
  - B. Fallback 체인에서 Ollama 제거 → keyword fallback으로 바로 이동
  - C. `ollama-recommender.ts` 완전 삭제
- 참고: Ollama `any` 타입 3곳, greedy regex JSON 파싱 버그 존재 (삭제 시 같이 해결됨)

**🟠 High — 타입 안전성**
| 항목 | 범위 | 설명 |
|------|------|------|
| Pyodide `as any` | 레거시 `lib/statistics/*.ts` ~30곳 | `(pyodide as any).runPythonAsync()` — Worker 전환 완료된 파일은 삭제 가능 |
| Plotly 타입 누락 | `plotly-chart-renderer.tsx` | `@ts-expect-error` + `as any` — plotly.js-basic-dist 타입 정의 필요 |
| StatisticalAnalysisService | `statistical-analysis-service.ts` 7곳 | `getPyodideInstance() as any` |

**🟡 Medium — 테스트 커버리지**
| 항목 | 설명 |
|------|------|
| Smart Flow 미테스트 컴포넌트 | AnalysisExecutionStep, ChatCentricHub, ExportDropdown, MethodManagerSheet, ReanalysisPanel, ResultsVisualization, VariableSelectionStep |
| ~~실패 테스트~~ | ~~`statistical-executor-coverage.test.ts`, `llm-recommender-simulation.test.ts`~~ — ✅ 전부 통과 |
| 하드코딩 한글 | 11개 컴포넌트에 terminology 미적용 문자열 잔존 |

**🟡 Medium — 분석 고급 설정**
| 항목 | 파일 | 설명 |
|------|------|------|
| ~~proportion-test `nullProportion` UI~~ | ~~`ChiSquareSelector`~~ | ✅ 귀무가설 비율(p₀) 입력 카드 추가 완료 |

**🟢 Low**
| 항목 | 설명 |
|------|------|
| ~~Deprecated 함수~~ | ~~`pyodide-statistics.ts`~~ — ✅ `testHomogeneity` / `testIndependence` 삭제 완료 (`2026-02-25`). 나머지 6개(`mannWhitneyU` 등)는 executor에서 활발 사용 중 → 삭제 불가 |
| SW 업데이트 알림 | `register-sw.ts:76` — 새로고침 권장 UI 미구현 |
| console.log 잔존 | `use-pyodide-service.ts`, `plotly-chart-renderer.tsx` |
| ResultsActionStep 스트리밍 테스트 | `handleInterpretation` 재해석 + `handleFollowUp` 저장 동기화 경계 커버 미흡 — 로직 수정 시 추가 |

### 완료 (Phase 5-2)
| 작업 | 설명 | 상태 |
|------|------|------|
| **Phase 5-2: Pyodide 리팩토링** | callWorkerMethod → Generated Wrapper 전환 + any 타입 35개 제거 | ✅ 완료 |

---

## 📚 문서 체계

| 문서 | 역할 |
|------|------|
| **[README.md](README.md)** | 프로젝트 개요 |
| **[ROADMAP.md](ROADMAP.md)** | 전체 Phase 계획 |
| **[TODO.md](TODO.md)** | 현황 + 할일 + 최근 작업 (이 파일) |
| **[CLAUDE.md](CLAUDE.md)** | AI 코딩 규칙 |

**상세 문서**: `stats/docs/`
**작업 아카이브**: `archive/dailywork/`

---

## 🔗 빠른 링크

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트
npx tsc --noEmit     # 타입 체크

# Methods Registry
node scripts/generate-method-types.mjs  # 타입 생성
npm test -- methods-registry            # 레지스트리 테스트

# E2E 테스트
npx playwright test                     # 전체 E2E
npx playwright test e2e/comprehensive   # 핵심 테스트
```

- Design System: http://localhost:3000/design-system
- Test Calculation: http://localhost:3000/test-calculation
