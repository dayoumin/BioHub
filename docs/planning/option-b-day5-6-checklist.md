# Option B Day 5-6: Worker Services Separation Checklist

**작성일**: 2025-10-17
**작업 목표**: Worker 1-4 서비스 생성 및 Facade 업데이트
**예상 소요 시간**: 4-6시간

---

## 📋 작업 개요

### 목표
Day 3-4에서 추출한 PyodideCore를 기반으로 4개의 Worker 서비스를 생성하고, pyodide-statistics.ts를 Facade 패턴으로 변경

### 입력
- ✅ PyodideCoreService (517 lines) - Day 3-4 완료
- ✅ pyodide-statistics.ts (2,351 lines) - 58개 메서드가 core delegation 완료

### 출력
- 🎯 PyodideWorker1Service (~400 lines, 11 methods)
- 🎯 PyodideWorker2Service (~500 lines, 16 methods)
- 🎯 PyodideWorker3Service (~700 lines, 17 methods)
- 🎯 PyodideWorker4Service (~300 lines, 20 methods)
- 🎯 pyodide-statistics.ts Facade (~250 lines, 64 delegation methods)

### 핵심 원칙
1. **Composition over Inheritance**: Worker 서비스는 `core: PyodideCoreService` 인스턴스를 소유
2. **No Singleton**: Worker 서비스는 싱글톤이 아님 (Facade가 인스턴스 소유)
3. **100% Backward Compatibility**: 모든 공개 API 시그니처 유지
4. **Type Safety**: Generic 타입 파라미터 전파

---

## Phase 1: Worker 1 Service 생성 (1시간)

### Step 1.1: 파일 생성 및 기본 구조 작성
- [ ] `lib/services/pyodide/workers/worker1-descriptive.service.ts` 생성
- [ ] PyodideCoreService import
- [ ] 클래스 정의 (non-singleton)
- [ ] Constructor: `core = PyodideCoreService.getInstance()`
- [ ] 예상 라인 수: 50줄

**코드 템플릿**:
```typescript
import { PyodideCoreService } from '../core/pyodide-core.service'
import type { DescriptiveStatsResult, NormalityTestResult, OutlierResult } from '@/types/pyodide'

export class PyodideWorker1Service {
  private core: PyodideCoreService

  constructor() {
    this.core = PyodideCoreService.getInstance()
  }

  // 11 public methods here
}
```

### Step 1.2: pyodide-statistics.ts에서 Worker 1 메서드 복사
- [ ] `descriptiveStats()` (lines ~215-220)
- [ ] `normalityTest()` (lines ~245-250)
- [ ] `outlierDetection()` (lines ~270-275)
- [ ] `frequencyAnalysis()` (lines ~610-615)
- [ ] `crosstabAnalysis()` (lines ~650-655)
- [ ] `oneSampleProportionTest()` (lines ~690-695)
- [ ] `cronbachAlphaWorker()` (lines ~1100-1105)
- [ ] `shapiroWilkTest()` (lines ~1150-1155)
- [ ] `kolmogorovSmirnovTest()` (lines ~1180-1185)
- [ ] `detectOutliersIQR()` (lines ~1210-1215)
- [ ] `checkAllAssumptions()` (lines ~1240-1270)
- [ ] 예상 라인 수: 300줄

### Step 1.3: 모든 `this.core.callWorkerMethod` 확인
- [ ] 11개 메서드 모두 `this.core.callWorkerMethod<T>(1, ...)` 호출 확인
- [ ] Worker 번호가 1인지 검증
- [ ] 반환 타입이 명시되어 있는지 확인

### Step 1.4: JSDoc 주석 간소화
- [ ] 각 메서드에 간단한 JSDoc (1-2줄)
- [ ] 파라미터 타입은 TypeScript 타입으로 충분
- [ ] `@throws` 주석 추가

---

## Phase 2: Worker 2 Service 생성 (1.5시간)

### Step 2.1: 파일 생성 및 기본 구조
- [ ] `lib/services/pyodide/workers/worker2-hypothesis.service.ts` 생성
- [ ] PyodideCoreService import
- [ ] 클래스 정의
- [ ] Constructor

### Step 2.2: Worker 2 메서드 복사 (16개)
**Primary Methods** (9개):
- [ ] `correlationTest()` (lines ~295-300)
- [ ] `tTestOneSample()` (lines ~320-325)
- [ ] `tTestTwoSample()` (lines ~345-350)
- [ ] `tTestPaired()` (lines ~370-375)
- [ ] `zTestWorker()` (lines ~730-735)
- [ ] `chiSquareTestWorker()` (lines ~1010-1015)
- [ ] `binomialTestWorker()` (lines ~760-765)
- [ ] `partialCorrelationWorker()` (lines ~790-795)
- [ ] `leveneTest()` (lines ~400-405)

**Additional Methods** (7개):
- [ ] `bartlettTest()` (lines ~430-435)
- [ ] `chiSquareGoodnessTest()` (lines ~1040-1045)
- [ ] `chiSquareIndependenceTest()` (lines ~1070-1075)
- [ ] `testHomogeneity()` (wrapper method)
- [ ] `performBonferroni()` (lines ~1300-1330)
- [ ] `calculateCorrelation()` (lines ~1360-1390)
- [ ] `correlation()` (multi-method wrapper)

### Step 2.3: Worker 번호 확인
- [ ] 16개 메서드 모두 `this.core.callWorkerMethod<T>(2, ...)` 호출

---

## Phase 3: Worker 3 Service 생성 (1.5시간)

### Step 3.1: 파일 생성 및 기본 구조
- [ ] `lib/services/pyodide/workers/worker3-nonparametric-anova.service.ts` 생성
- [ ] PyodideCoreService import
- [ ] 클래스 정의
- [ ] Constructor

### Step 3.2: Worker 3 메서드 복사 (17개)

**Nonparametric Primary** (5개):
- [ ] `mannWhitneyTestWorker()` (lines ~455-460)
- [ ] `wilcoxonTestWorker()` (lines ~485-490)
- [ ] `kruskalWallisTestWorker()` (lines ~515-520)
- [ ] `friedmanTestWorker()` (lines ~545-550)
- [ ] `signTestWorker()` (lines ~820-825)

**Nonparametric Additional** (4개):
- [ ] `runsTestWorker()` (lines ~850-855)
- [ ] `mcnemarTestWorker()` (lines ~880-885)
- [ ] `cochranQTestWorker()` (lines ~910-915)
- [ ] `moodMedianTestWorker()` (lines ~940-945)

**ANOVA Primary** (4개):
- [ ] `oneWayAnovaWorker()` (lines ~970-975)
- [ ] `twoWayAnovaWorker()` (lines ~1420-1425)
- [ ] `repeatedMeasuresAnovaWorker()` (lines ~1450-1455)
- [ ] `ancovaWorker()` (lines ~1480-1485)

**ANOVA Advanced** (2개):
- [ ] `manovaWorker()` (lines ~1510-1515)
- [ ] `tukeyHSDWorker()` (lines ~575-580)

**Post-hoc** (2개):
- [ ] `scheffeTestWorker()` (lines ~1540-1545)
- [ ] `dunnTest()` (lines ~1570-1575)

### Step 3.3: Worker 번호 확인
- [ ] 17개 메서드 모두 `this.core.callWorkerMethod<T>(3, ...)` 호출

---

## Phase 4: Worker 4 Service 생성 (1시간)

### Step 4.1: 파일 생성 및 기본 구조
- [ ] `lib/services/pyodide/workers/worker4-regression-advanced.service.ts` 생성
- [ ] PyodideCoreService import
- [ ] 클래스 정의
- [ ] Constructor

### Step 4.2: Worker 4 메서드 복사 (20개)

**Priority 1 Primary** (3개):
- [ ] `linearRegression()` (lines ~1600-1605)
- [ ] `pcaAnalysis()` (lines ~1630-1635)
- [ ] `durbinWatsonTest()` (lines ~1660-1665)

**Priority 2 Primary** (12개):
- [ ] `curveEstimation()` (lines ~1690-1710)
- [ ] `nonlinearRegression()` (lines ~1735-1755)
- [ ] `stepwiseRegression()` (lines ~1780-1800)
- [ ] `binaryLogistic()` (lines ~1825-1835)
- [ ] `multinomialLogistic()` (lines ~1860-1870)
- [ ] `ordinalLogistic()` (lines ~1895-1905)
- [ ] `probitRegression()` (lines ~1930-1940)
- [ ] `poissonRegression()` (lines ~1965-1975)
- [ ] `negativeBinomialRegression()` (lines ~2000-2010)
- [ ] `multipleRegression()` (lines ~2035-2045)
- [ ] `logisticRegression()` (lines ~2070-2080)
- [ ] `factorAnalysis()` (lines ~2105-2115)

**Wrapper Methods** (5개):
- [ ] `regression()` (Adapter: pValue→pvalue, nPairs→df)
- [ ] `pca()` (Adapter: totalExplainedVariance)
- [ ] `testIndependence()` (Simple redirect)
- [ ] `simpleLinearRegression()` (Simple redirect)
- [ ] `performPCA()` (Simple redirect)

### Step 4.3: Worker 번호 확인
- [ ] 20개 메서드 모두 `this.core.callWorkerMethod<T>(4, ...)` 호출

---

## Phase 5: Facade 업데이트 (1-1.5시간)

### Step 5.1: pyodide-statistics.ts 임포트 추가
- [ ] Worker 1-4 서비스 import
```typescript
import { PyodideWorker1Service } from './pyodide/workers/worker1-descriptive.service'
import { PyodideWorker2Service } from './pyodide/workers/worker2-hypothesis.service'
import { PyodideWorker3Service } from './pyodide/workers/worker3-nonparametric-anova.service'
import { PyodideWorker4Service } from './pyodide/workers/worker4-regression-advanced.service'
```

### Step 5.2: 인스턴스 변수 추가
- [ ] Constructor에 Worker 인스턴스 생성
```typescript
private worker1: PyodideWorker1Service
private worker2: PyodideWorker2Service
private worker3: PyodideWorker3Service
private worker4: PyodideWorker4Service

private constructor() {
  this.core = PyodideCoreService.getInstance()
  this.worker1 = new PyodideWorker1Service()
  this.worker2 = new PyodideWorker2Service()
  this.worker3 = new PyodideWorker3Service()
  this.worker4 = new PyodideWorker4Service()
}
```

### Step 5.3: 모든 메서드를 Worker delegation으로 변경

**Worker 1 메서드** (11개):
- [ ] `descriptiveStats()` → `return this.worker1.descriptiveStats(...)`
- [ ] `normalityTest()` → `return this.worker1.normalityTest(...)`
- [ ] `outlierDetection()` → `return this.worker1.outlierDetection(...)`
- [ ] `frequencyAnalysis()` → `return this.worker1.frequencyAnalysis(...)`
- [ ] `crosstabAnalysis()` → `return this.worker1.crosstabAnalysis(...)`
- [ ] `oneSampleProportionTest()` → `return this.worker1.oneSampleProportionTest(...)`
- [ ] `cronbachAlphaWorker()` → `return this.worker1.cronbachAlphaWorker(...)`
- [ ] `shapiroWilkTest()` → `return this.worker1.shapiroWilkTest(...)`
- [ ] `kolmogorovSmirnovTest()` → `return this.worker1.kolmogorovSmirnovTest(...)`
- [ ] `detectOutliersIQR()` → `return this.worker1.detectOutliersIQR(...)`
- [ ] `checkAllAssumptions()` → `return this.worker1.checkAllAssumptions(...)`

**Worker 2 메서드** (16개):
- [ ] `correlationTest()` → `return this.worker2.correlationTest(...)`
- [ ] `tTestOneSample()` → `return this.worker2.tTestOneSample(...)`
- [ ] `tTestTwoSample()` → `return this.worker2.tTestTwoSample(...)`
- [ ] `tTestPaired()` → `return this.worker2.tTestPaired(...)`
- [ ] `zTestWorker()` → `return this.worker2.zTestWorker(...)`
- [ ] `chiSquareTestWorker()` → `return this.worker2.chiSquareTestWorker(...)`
- [ ] `binomialTestWorker()` → `return this.worker2.binomialTestWorker(...)`
- [ ] `partialCorrelationWorker()` → `return this.worker2.partialCorrelationWorker(...)`
- [ ] `leveneTest()` → `return this.worker2.leveneTest(...)`
- [ ] `bartlettTest()` → `return this.worker2.bartlettTest(...)`
- [ ] `chiSquareGoodnessTest()` → `return this.worker2.chiSquareGoodnessTest(...)`
- [ ] `chiSquareIndependenceTest()` → `return this.worker2.chiSquareIndependenceTest(...)`
- [ ] `testHomogeneity()` → `return this.worker2.testHomogeneity(...)`
- [ ] `performBonferroni()` → `return this.worker2.performBonferroni(...)`
- [ ] `calculateCorrelation()` → `return this.worker2.calculateCorrelation(...)`
- [ ] `correlation()` → `return this.worker2.correlation(...)`

**Worker 3 메서드** (17개):
- [ ] `mannWhitneyTestWorker()` → `return this.worker3.mannWhitneyTestWorker(...)`
- [ ] `wilcoxonTestWorker()` → `return this.worker3.wilcoxonTestWorker(...)`
- [ ] `kruskalWallisTestWorker()` → `return this.worker3.kruskalWallisTestWorker(...)`
- [ ] `friedmanTestWorker()` → `return this.worker3.friedmanTestWorker(...)`
- [ ] `signTestWorker()` → `return this.worker3.signTestWorker(...)`
- [ ] `runsTestWorker()` → `return this.worker3.runsTestWorker(...)`
- [ ] `mcnemarTestWorker()` → `return this.worker3.mcnemarTestWorker(...)`
- [ ] `cochranQTestWorker()` → `return this.worker3.cochranQTestWorker(...)`
- [ ] `moodMedianTestWorker()` → `return this.worker3.moodMedianTestWorker(...)`
- [ ] `oneWayAnovaWorker()` → `return this.worker3.oneWayAnovaWorker(...)`
- [ ] `twoWayAnovaWorker()` → `return this.worker3.twoWayAnovaWorker(...)`
- [ ] `repeatedMeasuresAnovaWorker()` → `return this.worker3.repeatedMeasuresAnovaWorker(...)`
- [ ] `ancovaWorker()` → `return this.worker3.ancovaWorker(...)`
- [ ] `manovaWorker()` → `return this.worker3.manovaWorker(...)`
- [ ] `tukeyHSDWorker()` → `return this.worker3.tukeyHSDWorker(...)`
- [ ] `scheffeTestWorker()` → `return this.worker3.scheffeTestWorker(...)`
- [ ] `dunnTest()` → `return this.worker3.dunnTest(...)`

**Worker 4 메서드** (20개):
- [ ] `linearRegression()` → `return this.worker4.linearRegression(...)`
- [ ] `pcaAnalysis()` → `return this.worker4.pcaAnalysis(...)`
- [ ] `durbinWatsonTest()` → `return this.worker4.durbinWatsonTest(...)`
- [ ] `curveEstimation()` → `return this.worker4.curveEstimation(...)`
- [ ] `nonlinearRegression()` → `return this.worker4.nonlinearRegression(...)`
- [ ] `stepwiseRegression()` → `return this.worker4.stepwiseRegression(...)`
- [ ] `binaryLogistic()` → `return this.worker4.binaryLogistic(...)`
- [ ] `multinomialLogistic()` → `return this.worker4.multinomialLogistic(...)`
- [ ] `ordinalLogistic()` → `return this.worker4.ordinalLogistic(...)`
- [ ] `probitRegression()` → `return this.worker4.probitRegression(...)`
- [ ] `poissonRegression()` → `return this.worker4.poissonRegression(...)`
- [ ] `negativeBinomialRegression()` → `return this.worker4.negativeBinomialRegression(...)`
- [ ] `multipleRegression()` → `return this.worker4.multipleRegression(...)`
- [ ] `logisticRegression()` → `return this.worker4.logisticRegression(...)`
- [ ] `factorAnalysis()` → `return this.worker4.factorAnalysis(...)`
- [ ] `regression()` → `return this.worker4.regression(...)`
- [ ] `pca()` → `return this.worker4.pca(...)`
- [ ] `testIndependence()` → `return this.worker4.testIndependence(...)`
- [ ] `simpleLinearRegression()` → `return this.worker4.simpleLinearRegression(...)`
- [ ] `performPCA()` → `return this.worker4.performPCA(...)`

### Step 5.4: Wrapper 메서드 추가 (Worker 1-3의 레거시 메서드)
- [ ] `calculateDescriptiveStats()` → `return this.worker1.descriptiveStats(...)`
- [ ] `testNormality()` → `return this.worker1.normalityTest(...)`
- [ ] `cronbachAlpha()` → `return this.worker1.cronbachAlphaWorker(...)`
- [ ] `oneSampleTTest()` → `return this.worker2.tTestOneSample(...)`
- [ ] `twoSampleTTest()` → `return this.worker2.tTestTwoSample(...)`
- [ ] `pairedTTest()` → `return this.worker2.tTestPaired(...)`
- [ ] `chiSquareTest()` → `return this.worker2.chiSquareTestWorker(...)`
- [ ] `chiSquare()` → `return this.worker2.chiSquareTestWorker(...)`
- [ ] `tTest()` → Generic t-test wrapper
- [ ] `mannWhitneyU()` → `return this.worker3.mannWhitneyTestWorker(...)`
- [ ] `wilcoxon()` → `return this.worker3.wilcoxonTestWorker(...)`
- [ ] `kruskalWallis()` → `return this.worker3.kruskalWallisTestWorker(...)`
- [ ] `friedman()` → `return this.worker3.friedmanTestWorker(...)`
- [ ] `tukeyHSD()` → `return this.worker3.tukeyHSDWorker(...)`
- [ ] `oneWayANOVA()` → `return this.worker3.oneWayAnovaWorker(...)`
- [ ] `twoWayANOVA()` → `return this.worker3.twoWayAnovaWorker(...)`
- [ ] `repeatedMeasuresAnova()` → `return this.worker3.repeatedMeasuresAnovaWorker(...)`
- [ ] `anova()` → Generic ANOVA wrapper
- [ ] `performTukeyHSD()` → `return this.worker3.tukeyHSD(...)`

### Step 5.5: pyodide-statistics.ts 정리
- [ ] Worker 메서드 구현 모두 삭제 (64개)
- [ ] 간단한 delegation 메서드만 남김
- [ ] 예상 파일 크기: ~250 lines

---

## Phase 6: 검증 (1시간)

### Step 6.1: TypeScript 컴파일 확인
- [ ] `npx tsc --noEmit` 실행
- [ ] Worker 서비스 파일 에러 0개 확인
- [ ] pyodide-statistics.ts 에러 0개 확인

### Step 6.2: 통합 테스트 실행
- [ ] Worker 4 Priority 1 테스트 (16개)
- [ ] Worker 4 Priority 2 테스트 (17개)
- [ ] Worker 3 Compatibility 테스트 (11개)
- [ ] 기타 통합 테스트 (137개)
- [ ] 예상: 181/194 통과 (실패 13개는 기존 문제)

### Step 6.3: 파일 크기 검증
- [ ] Worker1Service: ~400 lines
- [ ] Worker2Service: ~500 lines
- [ ] Worker3Service: ~700 lines
- [ ] Worker4Service: ~300 lines
- [ ] pyodide-statistics.ts: ~250 lines
- [ ] **총합**: ~2,150 lines (기존 2,351 lines 대비 201 lines 감소)

---

## 🎯 완료 기준

### 필수 조건
- ✅ TypeScript 컴파일 에러 0개
- ✅ 통합 테스트 181개 이상 통과
- ✅ Worker 1-4 서비스 파일 생성 완료
- ✅ pyodide-statistics.ts Facade 패턴 적용
- ✅ 모든 공개 API 시그니처 유지

### 품질 지표
- ✅ 코드 감소: 200+ lines
- ✅ 파일당 평균 라인 수: ~430 lines (기존 2,351 lines 대비)
- ✅ 타입 안전성: 100%
- ✅ Breaking Change: 0개

---

## 📝 작업 순서 요약

1. **Worker 1** → 2. **Worker 2** → 3. **Worker 3** → 4. **Worker 4**
5. **Facade 업데이트** → 6. **검증** → 7. **커밋**

**예상 총 소요 시간**: 4-6시간

---

**Updated**: 2025-10-17 19:45
**Status**: Ready to Start
