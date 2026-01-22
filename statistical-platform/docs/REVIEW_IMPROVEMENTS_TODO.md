# 앱 리뷰 개선 목록 (2026-01-22)

## 개요
- 분석 대상: statistical-platform
- 총 페이지: 69개 (통계 43개)
- 총 컴포넌트: 204개
- 총 라이브러리: 162개

---

## 1. TypeScript 타입 안전성 🔴

### 1.1 `any` 타입 사용 현황
- **총 발생**: 375회 (102개 파일)
- **상태**: ❌ 미해결

| 파일 | 발생 횟수 | 주요 패턴 |
|------|----------|----------|
| `lib/services/statistical-executor.ts` | 17회 | `data: any` |
| `lib/services/pyodide-statistics.ts` | 28회 | `results: any`, 콜백 파라미터 |
| `lib/services/statistical-analysis-service.ts` | 16회 | `getPyodideInstance() as any` |
| `lib/statistics/*.ts` (6개 파일) | 25+회 | `(pyodide as any).runPythonAsync` |
| `lib/services/executors/*.ts` | 10+회 | `options?: any`, `data: any` |

### 1.2 권장 조치
- [ ] `types/pyodide-extended.d.ts` 생성 - Pyodide 전용 타입 정의
- [ ] `data: any` → `data: Record<string, unknown>[]` 또는 제네릭 적용
- [ ] `options?: any` → 구체적인 옵션 인터페이스 정의
- [ ] 콜백 파라미터 타입 지정 `.map((item: any) => ...)` 제거

---

## 2. 컴포넌트 패턴 일관성 🟠

### 2.1 useState 과다 사용 (useStatisticsPage 미통합)
- **상태**: ❌ 미해결

| 페이지 | 추가 useState 수 | 통합 대상 상태 |
|--------|-----------------|---------------|
| `anova/page.tsx:142-143` | 2 | `anovaType`, `analysisTimestamp` |
| `t-test/page.tsx:78-86` | 8+ | `testType`, `inputMode`, `testValue`, 요약통계 |
| `arima/page.tsx:60-66` | 6 | ARIMA 파라미터 (`orderP`, `orderD`, `orderQ`, `nForecast`) |
| `ancova/page.tsx:140-142` | 3 | `pyodideReady`, `activeResultTab` |
| `mann-whitney/page.tsx:104-107` | 4 | `pyodideCore`, `isInitialized` |

### 2.2 handleAnalysis 콜백 비대화
- **상태**: ❌ 미해결

| 파일 | 함수 | 라인 수 | 권장 |
|------|------|--------|------|
| `anova/page.tsx:213-978` | `handleAnalysis` | **765줄** | 200줄 이하로 분리 |
| `t-test/page.tsx:206-541` | `handleAnalysis` | **335줄** | 로직 추출 |

### 2.3 권장 조치
- [ ] 각 페이지의 분석별 상태를 `useStatisticsPage`로 통합 검토
- [ ] `handleAnalysis` 내 일원/이원/삼원 ANOVA 로직을 별도 함수로 추출
- [ ] t-test 요약통계/원시데이터 모드 분기 로직 추출

---

## 3. 숫자 포맷팅 & 유의성 불일치 🔴

### 3.1 P-값 toFixed 자릿수 불일치
- **총 발생**: 43개 페이지
- **상태**: ❌ 미해결

| 자릿수 | 사용 페이지 |
|--------|------------|
| `.toFixed(3)` | anova, correlation, cochran-q, mcnemar, sign-test, runs-test, ks-test, mood-median, one-sample-t, proportion-test, welch-t, explore-data |
| `.toFixed(4)` | binomial-test, factor-analysis, dose-response, kruskal-wallis, friedman, non-parametric, partial-correlation, repeated-measures, stepwise, stationarity-test, cox-regression |
| `.toFixed(6)` | chi-square |

### 3.2 유의성 판정 하드코딩
- **총 발생**: 390회 (43개 파일)
- **패턴**: `if (pValue < 0.05)`, `results.pValue < 0.05 ? ...`
- **상태**: ❌ 미해결

### 3.3 "< 0.001" 조건부 표시 중복
- **총 발생**: 30+회
- **패턴**: `pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)`
- **상태**: ❌ 미해결

### 3.4 권장 조치
- [ ] `lib/utils/statistics-formatters.ts` 신규 생성
  - `formatPValue(pValue: number): string`
  - `isSignificant(pValue: number, alpha?: number): boolean`
  - `getSignificanceLevel(pValue: number): string`
  - `formatStatistic(value: number, decimals?: number): string`
- [ ] 43개 페이지에 점진적 적용

---

## 4. 상수 분산 🟠

### 4.1 타임아웃 상수 분산
- **총 발생**: ~50개 파일
- **상태**: ❌ 미해결

| 위치 | 값 | 용도 |
|------|-----|------|
| `lib/constants.ts` | 30000, 60000 | LOAD_SCRIPT, LOAD_PACKAGES (✅ 존재) |
| `e2e/*.spec.ts` | 10000~90000 | E2E 테스트 타임아웃 (하드코딩) |
| `components/rag/*` | 2000 | API 호출 타임아웃 (하드코딩) |

### 4.2 권장 조치
- [ ] `lib/constants.ts`의 TIMEOUT 객체 확대
- [ ] E2E 테스트에서 import하여 사용

---

## 5. 타입 정의 중복 🟡

### 5.1 페이지별 Result 타입 중복
- **총 발생**: 43개 페이지 × 3-5개 = ~150개
- **상태**: ⚠️ 부분 중앙화 (types/statistics.ts 존재)

| 페이지 | 로컬 정의 타입 |
|--------|---------------|
| `t-test/page.tsx:38-58` | `TTestResult` |
| `correlation/page.tsx:39-95` | `CorrelationResult`, `CorrelationResults` |
| `anova/page.tsx:77-112` | `ANOVAResults` |
| `mann-whitney/page.tsx:50-88` | `MannWhitneyResult` |
| `binomial-test/page.tsx:59` | `BinomialTestResult` |
| (... 43개 페이지 모두) | |

### 5.2 권장 조치
- [ ] `types/pyodide-results.ts` 생성 또는 확대
- [ ] 각 페이지 타입을 중앙 파일로 이동 (점진적)
- [ ] 우선순위: 자주 사용되는 타입부터

---

## 6. 성능 최적화 🟡

### 6.1 Plotly.js 중복 패키지
- **상태**: ❌ 미해결

```json
// package.json에 3개 동시 설치
"plotly.js": "^3.3.0",
"plotly.js-basic-dist": "^3.1.0",
"plotly.js-dist-min": "^3.1.0"
```

### 6.2 빌드 설정
- **상태**: ✅ 해결됨 (2026-01-22)
- `ignoreBuildErrors: false` 적용
- `ignoreDuringBuilds: false` 적용

### 6.3 권장 조치
- [ ] `plotly.js`, `plotly.js-basic-dist` 제거
- [ ] `plotly.js-dist-min`만 유지
- [ ] import 경로 수정

---

## 7. 이미 잘 중앙화된 항목 ✅

| 항목 | 파일 | 상태 |
|------|------|------|
| 에러 메시지 | `lib/constants/error-messages.ts` | ✅ 완료 |
| 통계 메서드 메타데이터 | `lib/constants/statistical-methods.ts` | ✅ 완료 |
| UI 상수/스타일 | `lib/constants/ui-constants.ts` | ✅ 완료 |
| 데이터 추출 함수 | `lib/utils/data-extraction.ts` | ✅ 완료 |
| 결과 컴포넌트 | `components/statistics/common/*` | ✅ 완료 |
| 변수 선택 타입 | `types/statistics.ts` | ✅ 완료 |
| XSS 방지 | `lib/help/help-search.ts` (escapeHtml) | ✅ 완료 |

---

## 8. 우선순위 정리

### 🔴 Critical (즉시)
1. [x] P-값/유의성 포맷팅 유틸 생성 (`lib/utils/statistics-formatters.ts`) ✅
2. [x] Plotly.js 중복 제거 ✅

### 🟠 High (1-2주)
3. [x] Pyodide 타입 정의 개선 (`lib/pyodide-runtime-loader.ts`) ✅
4. [x] 타임아웃 상수 중앙화 (`lib/constants.ts`) ✅

### 🟡 Medium (1개월)
5. [x] any 타입 제거 (statistical-executor.ts - 부분 완료) ✅
   - PreparedData, PreparedArrays 인터페이스 추가
   - prepareData() 반환 타입 명시화
   - 메서드 파라미터 타입 PreparedData로 변경
6. [ ] handleAnalysis 리팩토링 (anova, t-test)
7. [ ] Result 타입 통합 (점진적)

### 🟢 Low (선택)
8. [ ] useState → useStatisticsPage 통합 검토
9. [ ] 변수 선택 컴포넌트 확대 적용

---

## 진행 기록

| 날짜 | 작업 | 상태 |
|------|------|------|
| 2026-01-22 | next.config.ts 빌드 설정 수정 | ✅ 완료 |
| 2026-01-22 | 전체 리뷰 분석 | ✅ 완료 |
| 2026-01-22 | P-값/유의성 포맷팅 유틸 생성 (`lib/utils/statistics-formatters.ts`) | ✅ 완료 |
| 2026-01-22 | Plotly.js 중복 제거 (`plotly.js-dist-min` 제거) | ✅ 완료 |
| 2026-01-22 | Pyodide 타입 정의 개선 (`lib/pyodide-runtime-loader.ts`) | ✅ 완료 |
| 2026-01-22 | 타임아웃 상수 중앙화 (`lib/constants.ts` TIMEOUT 추가) | ✅ 완료 |
| 2026-01-22 | statistical-executor.ts any 타입 개선 (PreparedData 인터페이스) | ✅ 완료 |
| 2026-01-22 | statistics-formatters.ts 테스트 작성 (38개 테스트) | ✅ 완료 |

---

*Generated: 2026-01-22*
*Last Updated: 2026-01-22*
