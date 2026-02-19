# Phase 5-2: Pyodide 리팩토링 계획

## 현재 상태 (Working Tree에 이미 진행된 작업)

| 항목 | Before | After | 변화 |
|------|--------|-------|------|
| pyodide-statistics.ts | 3287줄 | 1955줄 | -41% |
| Generated 래퍼 사용 | 0개 | ~50개 | 대부분 전환 |
| methods-registry.json | 790줄 | 1050줄 | 68 메서드 정의 |
| variable-requirements.ts | 4277줄 | 4925줄 | +13 메서드 추가 |
| 로컬 타입 정의 | 240+줄 | 제거됨 | Generated 타입으로 통합 |

## 남은 작업

### Task 1: callWorkerMethod → Generated 래퍼 전환 (7개) [Completed]

직접 `callWorkerMethod` 호출이 14곳 남아있음. 그 중 7개는 1:1 전환 가능:

| 메서드 | Line | Worker | Generated 함수 |
|--------|------|--------|---------------|
| `leveneTest` | 118 | W2 | `Generated.leveneTest` |
| `bartlettTest` | 157 | W2 | `Generated.bartlettTest` |
| `kolmogorovSmirnovTest` | 178 | W1 | `Generated.kolmogorovSmirnovTest` |
| `factorAnalysis` | 874 | W4 | `Generated.factorAnalysis` |
| `clusterAnalysis` | 900 | W4 | `Generated.clusterAnalysis` + alias 후처리 |
| `timeSeriesAnalysis` | 945 | W4 | `Generated.timeSeriesAnalysis` |
| `twoWayAnova` | 1115 | W3 | 이미 Generated 사용 중 (데이터 변환만 유지) |

나머지 7곳은 복잡한 후처리 로직이 있어 유지:
- `wilcoxonSignedRank`: 복잡한 descriptives 구조
- `multipleRegression` / `logisticRegression`: 기존 타입 유지 필요
- `dunnTest` / `gamesHowellTest`: groupNames 매핑
- `performTukeyHSD`: alpha 추가 래핑

### Task 2: `any` 타입 제거 (~25개) [Completed]

**A) Legacy 호환 래퍼 (line 975-1100)**: `Promise<any>` → 구체적 리턴 타입
- `calculateDescriptiveStatistics`, `testNormality`, `testHomogeneity`
- `oneSampleTTest`, `twoSampleTTest`, `pairedTTest`
- `oneWayANOVA`, `simpleLinearRegression`, `chiSquareTest`
- `performPCA`, `calculateCorrelation`, `calculateDescriptiveStats`

**B) 사후검정 (line 1150-1320)**: `callWorkerMethod<any>` → Generated 타입
- `performTukeyHSD`, `dunnTest`, `gamesHowellTest`, `performBonferroni`

**C) 기타**: `results: any` (line 249) → 구체적 타입

### Task 3: TypeScript 체크 + 테스트

- `pnpm tsc --noEmit` 0 에러 확인
- `pnpm test --run` 전체 통과 확인

### Task 4: TODO.md / ROADMAP.md 업데이트

- Phase 10.5 완료 반영 (DOCX + Excel 내보내기)
- Phase 5-2 완료 반영
