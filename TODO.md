# 프로젝트 현황 + 할일

**최종 업데이트**: 2026-02-24 (tech-debt + UI 색상 토큰 완료)

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
| `!` non-null assertion | `prompts.ts:40`, `openrouter-recommender.ts:445` | 🔴 미해결 |

**🟠 High — AI 서비스**
| 항목 | 파일 | 설명 |
|------|------|------|
| 레거시 프롬프트 중복 | `openrouter-recommender.ts:452-511` | `getSystemPrompt()` private 메서드 — `prompts.ts` SSOT와 중복, 직접 호출 경로만 사용 |
| `LlmProvider` 타입 이중 정의 | `llm-recommender.ts:29` / `storage-types.ts:22` | 동일 유니온 타입 독립 정의 → `storage-types.ts`로 단일화 필요 |

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
| 실패 테스트 | `statistical-executor-coverage.test.ts` (2개 카테고리 불일치), `llm-recommender-simulation.test.ts` (4개) — chat-input 11개는 수정 완료 |
| 하드코딩 한글 | 11개 컴포넌트에 terminology 미적용 문자열 잔존 |

**🟢 Low**
| 항목 | 설명 |
|------|------|
| Deprecated 함수 | `pyodide-statistics.ts` 10+ 함수 — Worker 전환 완료 후 삭제 가능 |
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
