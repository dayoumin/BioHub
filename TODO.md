# 프로젝트 현황 + 할일

**최종 업데이트**: 2026-02-26 (기술 부채 추가 정리 + ResultsActionStep UX 전면 개선)

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

### 2026-02-26 (목) 기술 부채 2차 정리 + ResultsActionStep UX 전면 개선

- ✅ **레거시 Pyodide 직접 계산 파일 삭제**: `lib/statistics/` — `advanced.ts`, `anova.ts`, `descriptive.ts`, `nonparametric.ts`, `regression.ts`, `t-tests.ts`, `types.ts`, `utils.ts`, `index.ts` (9개). `as any` 패턴 28곳 + barrel import 전부 제거
- ✅ **`statistical-analysis-service.ts` 삭제**: `getPyodideInstance() as any` 7곳 + 미사용 서비스 완전 삭제
- ✅ **`rehypePlugins as any` 제거**: `markdown-config.ts`에 `MarkdownPluginConfig` 타입 도입 (`NonNullable<Options['rehypePlugins']>`). 5개 컴포넌트 `as any/never` 전부 제거
- ✅ **`plotly-chart-renderer.tsx` `console.error` → `logger.error`**: 로거 정책 준수
- ✅ **ResultsActionStep UX 전면 개선** (phase-based reveal):
  - framer-motion 단계적 등장: Phase 0(Hero)→1(150ms 수치카드)→2(400ms L2)→3(AI 완료 후 시각화)→4(+300ms Q&A)
  - `use-count-up` 훅: requestAnimationFrame + easeOut cubic 카운트업 애니메이션
  - 저장/복사 버튼 `StepHeader` 헤더 배치 (중복 제거)
  - 히스토리 뱃지 카운터 (`SmartFlowLayout` Clock 아이콘)
  - 아웃라이어 감지 시 '통계' 탭 자동 전환 (`DataExplorationStep`)
  - `additionalResults` 있으면 L2 자동 열기
  - 복사 버튼 `bg-blue-600` → `bg-primary` 시맨틱 토큰
  - esbuild JSX ternary spread 에러 수정 (`{...(condition ? {} : {...})}` → 개별 조건 props)
  - `StatisticCard` `className` prop 추가
- ✅ **테스트**: ux-improvements-phase1-2.test.tsx 신규 + ResultsActionStep.test.tsx 업데이트 (4808개 통과)
- 📌 커밋: `1d90b819` `15c2a100` `5e2a60bc`

### 2026-02-26 (목) 기술 부채 정리 + executor 리팩토링

- ✅ **`as unknown as` 캐스팅 제거**: `statistical-executor.ts` — ancovaWorker/rmAnovaWorker 캐스팅 → 직접 접근 (`rmResult.df.numerator`)
- ✅ **openrouter AggregateError 처리 개선**: 모든 모델 실패 시 errors[] 누적 후 `AggregateError` throw. 파싱 실패 soft failure는 null 반환 유지
- ✅ **createAsyncQueue 모듈화**: `llm-recommender.ts` — 인라인 함수 → 모듈 레벨 분리 (재사용 가능)
- ✅ **methods-registry.json + 타입 생성 스크립트 개선**: `generate-method-types.mjs` + `method-types.generated.ts` 업데이트
- ✅ **테스트 추가**: AggregateError + createAsyncQueue 시뮬레이션 12개 (llm-recommender-simulation.test.ts)
- 📌 커밋: `a1aa94d7`

### 2026-02-26 (목) method-mapping 버그 수정 + 회귀 테스트

- ✅ **[BUG] binomial-test/cochran-q/mcnemar/proportion-test `chi-square` 오분류 수정**: `method-mapping.ts` 카테고리 오류 → `nonparametric` 정정. 기존에 binomial-test/cochran-q는 executor throw, mcnemar/proportion-test는 잘못된 알고리즘 실행
- ✅ **proportion-test 설명 + minSampleSize 수정**: "두 비율 간 차이 검정" → "표본 비율이 귀무가설 비율(p₀)과 다른지 검정", minSampleSize 20 → 10 (np≥5 기준)
- ✅ **`!` non-null assertion 제거**: `recommendMethods`의 `.find()!` → `pushById()` 헬퍼 (id 오타 시 조용히 무시), `groupLevels || 0` → `?? 0`
- ✅ **`checkMethodRequirements` 타입 안전화**: `any` → `DataProfile` 인터페이스, date 타입 검증 추가
- ✅ **회귀 방지 테스트**: 4개 메서드 라우팅 검증 — `method-mapping-coverage.test.ts` + `statistical-executor-routing.test.ts` (총 55개 통과)
- 📌 커밋: `dd1493bb` `60fc1cae` `55e25a4a` `9fe9dae4`

### 2026-02-26 (목) chi-square-goodness executor 분리 + proportion-test 시각화 수정

- ✅ **executeChiSquare 분리**: `executeChiSquareGoodness` + `executeChiSquareIndependence` 별도 함수. goodness: 범주 빈도 집계 + `expectedProportions` 옵션 + frequency-bar 시각화
- ✅ **executeChiSquareIndependence 정리**: `!` non-null assertion 제거, `|| 0` → `?? 0`, colLabels 단순화
- ✅ **proportion-test visualizationData 수정**: boxplot → bar, `freqCounts` 빈도 테이블 반환 (자동감지 시 실제 값별 빈도, 명시적 successCount 시 이진 테이블)
- ✅ **proportion-test additionalInfo 보완**: `sampleProportion`, `nullProportion`, `successCount`, `totalN` 노출
- ✅ **테스트 추가**: FIX-1/FIX-2/ISSUE-3/EDGE 시뮬레이션 4개 (statistical-executor-routing, 29개 통과)
- 📌 커밋: `e48e761b` `94ddd714`

### 2026-02-26 (목) ChatInput externalValue 버그 수정

- ✅ **externalValue 제출 후 입력창 미초기화 버그 수정**: 외부 주입 경로에 `setValue('')` 누락 → 처리 완료 후 텍스트 잔류 문제 수정
- ✅ **flushSync 정리**: useEffect 내 flushSync 제거 (React 경고 유발, 실질 UX 가치 없음)
- ✅ **테스트 추가**: externalValue 제출 후 입력창 초기화 검증 16개 (chat-input.test.tsx)
- 📌 커밋: `397cd30a` `7945fc39`

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
| **Phase 15-1: Bio-Tools** | 12개 생물학 분석, `/bio-tools/` 5페이지 구현 ([상세](study/PLAN-BIO-STATISTICS-AUDIT.md)) |

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
| ~~Pyodide `as any`~~ | ~~`lib/statistics/*.ts` ~30곳~~ | ✅ 파일 전체 삭제 완료 (`2026-02-26`) |
| ~~StatisticalAnalysisService~~ | ~~`statistical-analysis-service.ts` 7곳~~ | ✅ 파일 삭제 완료 (`2026-02-26`) |
| Plotly 타입 누락 | `plotly-chart-renderer.tsx` | `@ts-expect-error` + `as any` 2곳 잔존 — plotly.js-basic-dist 타입 정의 필요 |

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
