# 프로젝트 상태

**최종 업데이트**: 2026-02-06

---

## 🎯 현재 상태

**프로젝트**: 전문가급 통계 분석 플랫폼 (SPSS/R Studio 급)
**기술**: Next.js 15 + TypeScript + Pyodide + Ollama (RAG)

| 항목 | 현황 |
|------|------|
| **통계 페이지** | 43/43 (100%) ✅ |
| **TypeScript 에러** | 0개 ✅ |
| **테스트 커버리지** | 88% (38/43) |
| **통계 신뢰성** | 98% (SciPy/statsmodels) |
| **DecisionTree 커버리지** | 49/49 (100%) ✅ |
| **Golden Values 테스트** | 44/44 (100%) ✅ - 5개 라이브러리 |
| **Methods Registry** | 64개 메서드 (4 Workers) ✅ NEW |
| **E2E 테스트** | 12개 (핵심 플로우 커버) ✅ |
| **Analysis Guide** | 45/49 페이지 적용 ✅ |
| **LLM 추천/해석** | Phase 1-3 완료 ✅ NEW |

---

## 📅 최근 작업 (7일)

### 2026-02-06 (목)
- ✅ **LLM Enhanced Recommendation Phase 3: 변수 자동 할당** 구현
  - `extractDetectedVariables()` 3단 우선순위: variableAssignments → detectedVariables → 데이터추론
  - `DetectedVariables` 확장: independentVars, covariates 추가
  - `SuggestedSettings` 타입 + store 저장 + sessionStorage 지속
  - VariableSelectionStep 매핑 + Badge 기반 AI 추천 변수 표시
  - SmartFlow 테스트 23파일 383개 전체 통과
- ✅ **LLM Integration Test** (20개 시나리오)
  - Part A: 추천 품질 (10), Part B: 해석 품질 (6), Part C: 통합 검증 (4)
  - 결과: `study/llm-integration-results.json` (16/20 pass)
  - quality tracking: method ID 검증, 확신도, 기능 사용률
- ✅ **Merge 준비 + 기술부채 해결**
  - data-testid 11개 추가 (NaturalLanguageInput 7 + ResultsActionStep 4)
  - CollapsibleSection data-testid prop 지원
  - Mock 반환값 수정 2파일 (requestInterpretation)
  - E2E LLM 경로 헬퍼 + 테스트 추가 (mockOpenRouterAPI, selectMethodViaLLM)
  - suggestedSettings → Step 4 파이프라인 (executor 전달 + custom alpha 적용)
  - SuggestedSettings 타입 단일 정의 (3곳 중복 → types/smart-flow.ts 단일 export)
  - LLM 환각 전체 실패 시 2순위 폴백 (extractDetectedVariables)
  - E2E AI 탭 전환 로직 추가
  - SmartFlow 24파일 405 테스트 통과

### 2026-02-05 (수)
- ✅ **LLM Enhanced Recommendation Phase 1+2 + 부록** 구현
  - Phase 1: AIRecommendation 5개 필드 추가 (variableAssignments, suggestedSettings, warnings, dataPreprocessing, ambiguityNote)
  - Phase 1: 시스템 프롬프트 확장 + 데이터 컨텍스트 보강 (skewness, topCategories, PII 필터링)
  - Phase 1: 파서 확장 + 변수 할당 유효성 검증 (환각 방지)
  - Phase 2: NaturalLanguageInput.tsx UI 개편 (변수 할당 미리보기, 경고, 전처리 제안, 모호성 대응)
  - 부록: SSE 버퍼링 수정 (TCP 패킷 경계 불완전 라인 버퍼링)
  - Unit tests 29개 (openrouter-recommender 22 + splitInterpretation 7)
- ✅ **UI 테스트 복원력 전략** 수립
  - 28개 깨진 테스트 → 3층 아키텍처 (L1 Store, L2 data-testid, L3 E2E)
  - CLAUDE.md Section 5-1에 가이드라인 추가
- ✅ **LLM 결과 해석 기능** 구현
  - `result-interpreter.ts`: 프롬프트 빌더 + 스트리밍 해석
  - `openrouter-recommender.ts`: streamChatCompletion() + streamWithModel()
  - `ResultsActionStep.tsx`: AI 해석 섹션 + splitInterpretation (한줄 요약/상세)

### 2026-01-27 (월)
- ✅ **Analysis Guide 구현 완료** - 사용자 가이드 시스템
  - 56개 메서드 메타데이터 확장 (dataFormat, settings, sampleData)
  - 5개 가이드 컴포넌트 구현 (AnalysisGuidePanel, DataFormatGuide, SettingTooltip, AssumptionChecklist, useAnalysisGuide)
  - 45개 통계 페이지에 가이드 적용 완료
  - 138개 테스트 통과
- ✅ **문서 업데이트**
  - ANALYSIS_GUIDE_IMPLEMENTATION_PLAN.md 완료 처리
  - SCHEMA_EXTENSION_CHECKLIST.md 56/56 완료

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
| **LLM 분석 추천** | OpenRouter 3단 폴백 + 자연어 입력 + 변수 자동 할당 | ✅ Phase 1-3 완료 |
| **LLM 결과 해석** | 스트리밍 AI 해석 (한줄 요약 + 상세) | ✅ 구현 완료 |
| **suggestedSettings → Step 4** | AI 추천 설정(alpha) executor 전달 + custom alpha 적용 | ✅ 완료 |
| **Merge 준비** | data-testid 11개 + Mock 수정 + E2E 2경로 + 기술부채 3건 | ✅ 완료 |

### 진행 예정
| 작업 | 설명 |
|------|------|
| **결과 클립보드 복사** | 기본 결과 + LLM 해석 → HTML 서식 복사 |

### LLM 독립 (언제든 가능)
| 작업 | 설명 |
|------|------|
| **Phase 5-2: TS 래퍼 12개** | Worker 4 타입 안전성 완성 (78%→100%) |
| **Phase 12-2: 도메인 UI 통일** | 43개 페이지 placeholder 수산과학화 |

---

## 📚 문서 체계

| 문서 | 역할 |
|------|------|
| **[README.md](README.md)** | 프로젝트 개요 |
| **[ROADMAP.md](ROADMAP.md)** | 전체 Phase 계획 |
| **[STATUS.md](STATUS.md)** | 현황 + 최근 작업 (이 파일) |
| **[CLAUDE.md](CLAUDE.md)** | AI 코딩 규칙 |

**상세 문서**: `statistical-platform/docs/`
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
