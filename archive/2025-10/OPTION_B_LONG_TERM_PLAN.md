# Option B: Worker별 서비스 분리 장기 계획 (Phase 9)

**작성일**: 2025-10-14
**목표**: 확장 가능한 아키텍처로 리팩토링 (Phase 9: 배포 전 최적화)
**전제조건**: Option A (callWorkerMethod 헬퍼) 완료 후 진행

---

## 📋 1. 개요

### 목표
- Worker별 독립 서비스 파일로 분리
- Facade 패턴으로 기존 API 완전 호환
- 팀 협업 효율 증대 (코드 충돌 최소화)

### 핵심 전략
1. **PyodideManager**: Pyodide 인스턴스 싱글톤 관리
2. **WorkerNService**: 각 Worker 전용 서비스 (의존성 주입)
3. **PyodideStatisticsService (Facade)**: 기존 API 유지

---

## 🏗️ 2. 아키텍처 설계

### 2.1. 파일 구조

```
statistical-platform/lib/services/
├── pyodide/
│   ├── pyodide-manager.ts                    (250줄)
│   ├── workers/
│   │   ├── worker1-descriptive.service.ts    (400줄)
│   │   ├── worker2-hypothesis.service.ts     (500줄)
│   │   ├── worker3-nonparametric.service.ts  (700줄)
│   │   └── worker4-regression.service.ts     (300줄)
│   └── types.ts                              (100줄)
└── pyodide-statistics.ts                     (350줄 - Facade)
```

**총 줄 수**: 2,600줄 (현재와 비슷, 하지만 구조화됨)

---

### 2.2. PyodideManager (중앙 관리자)

```typescript
// lib/services/pyodide/pyodide-manager.ts

import type { PyodideInterface } from '@/types/pyodide'
import { getPyodideCDNUrls } from '@/lib/constants'

/**
 * Pyodide 인스턴스 중앙 관리자 (Singleton)
 *
 * 역할:
 * - Pyodide 초기화 및 패키지 로딩
 * - Worker 파일 로딩 및 캐싱
 * - 공통 헬퍼 함수 제공
 */
export class PyodideManager {
  private static instance: PyodideManager | null = null
  private pyodide: PyodideInterface | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private packagesLoaded = false
  private loadedWorkers = new Set<number>()

  private constructor() {}

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): PyodideManager {
    if (!PyodideManager.instance) {
      PyodideManager.instance = new PyodideManager()
    }
    return PyodideManager.instance
  }

  /**
   * Pyodide 초기화
   */
  async initialize(): Promise<PyodideInterface> {
    if (this.pyodide) return this.pyodide

    if (this.isLoading && this.loadPromise) {
      await this.loadPromise
      return this.pyodide!
    }

    this.isLoading = true
    this.loadPromise = this._loadPyodide()

    try {
      await this.loadPromise
      return this.pyodide!
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Pyodide 로딩 (내부 메서드)
   */
  private async _loadPyodide(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Pyodide는 브라우저 환경에서만 사용 가능합니다')
    }

    const cdnUrls = getPyodideCDNUrls()

    // Pyodide 스크립트 로드
    if (!window.loadPyodide) {
      const script = document.createElement('script')
      script.src = cdnUrls.scriptURL
      script.async = true

      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    // Pyodide 인스턴스 생성
    this.pyodide = await window.loadPyodide({ indexURL: cdnUrls.indexURL })

    // 패키지 로드
    if (!this.packagesLoaded) {
      await this.pyodide.loadPackage(['numpy', 'scipy', 'pandas'])
      this.packagesLoaded = true
    }

    // 기본 imports
    await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats
      import json
      import pandas as pd
      import warnings
      warnings.filterwarnings('ignore')
    `)
  }

  /**
   * Worker 파일 로딩
   */
  async ensureWorkerLoaded(workerNum: 1 | 2 | 3 | 4): Promise<void> {
    if (this.loadedWorkers.has(workerNum)) return

    const pyodide = await this.initialize()

    const fileNames = {
      1: 'descriptive',
      2: 'hypothesis',
      3: 'nonparametric-anova',
      4: 'regression-advanced'
    }

    const fileName = fileNames[workerNum]
    const moduleName = `worker${workerNum}_module`

    const response = await fetch(`/workers/python/worker${workerNum}-${fileName}.py`)
    const workerCode = await response.text()

    await pyodide.runPythonAsync(`
import sys
from types import ModuleType

${moduleName} = ModuleType('${moduleName}')
exec("""${workerCode.replace(/`/g, '\\`')}""", ${moduleName}.__dict__)
sys.modules['${moduleName}'] = ${moduleName}
    `)

    this.loadedWorkers.add(workerNum)
  }

  /**
   * 공통 헬퍼: Worker 메서드 호출
   * (Option A의 callWorkerMethod를 이동)
   */
  async callWorkerMethod<T>(
    workerNum: 1 | 2 | 3 | 4,
    methodName: string,
    params: Record<string, any>,
    options: { errorMessage?: string } = {}
  ): Promise<T> {
    const pyodide = await this.initialize()
    await this.ensureWorkerLoaded(workerNum)

    const paramsLines = Object.entries(params)
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
      .join('\n')

    const paramNames = Object.keys(params).join(', ')

    const resultStr = await pyodide.runPythonAsync(`
      import json
      from worker${workerNum}_module import ${methodName}

      ${paramsLines}

      try:
        result = ${methodName}(${paramNames})
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = JSON.parse(resultStr) as T | { error: string }

    if ('error' in parsed && typeof parsed.error === 'string') {
      const errorMsg = options.errorMessage || `${methodName} 실행 실패`
      throw new Error(`${errorMsg}: ${parsed.error}`)
    }

    return parsed as T
  }

  /**
   * 초기화 상태 확인
   */
  isInitialized(): boolean {
    return this.pyodide !== null
  }

  /**
   * 정리
   */
  dispose(): void {
    this.pyodide = null
    this.loadedWorkers.clear()
    PyodideManager.instance = null
  }
}
```

---

### 2.3. Worker Service 예시 (Worker1)

```typescript
// lib/services/pyodide/workers/worker1-descriptive.service.ts

import type { PyodideManager } from '../pyodide-manager'
import type { DescriptiveStatsResult, NormalityTestResult, OutlierResult } from '@/types/pyodide'

/**
 * Worker 1: 기술통계 전용 서비스
 *
 * 담당 메서드:
 * - descriptive_stats
 * - normality_test
 * - outlier_detection
 * - frequency_analysis
 * - crosstab_analysis
 * - one_sample_proportion_test
 * - cronbach_alpha
 * - kolmogorov_smirnov_test
 */
export class Worker1DescriptiveService {
  private manager: PyodideManager

  constructor(manager: PyodideManager) {
    this.manager = manager
  }

  /**
   * 기술통계 계산
   */
  async descriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
    return this.manager.callWorkerMethod<DescriptiveStatsResult>(
      1,
      'descriptive_stats',
      { data },
      { errorMessage: 'Descriptive stats 실행 실패' }
    )
  }

  /**
   * 정규성 검정 (Shapiro-Wilk)
   */
  async normalityTest(data: number[], alpha: number = 0.05): Promise<NormalityTestResult> {
    return this.manager.callWorkerMethod<NormalityTestResult>(
      1,
      'normality_test',
      { data, alpha },
      { errorMessage: 'Normality test 실행 실패' }
    )
  }

  /**
   * 이상치 탐지
   */
  async outlierDetection(data: number[], method: 'iqr' | 'zscore' = 'iqr'): Promise<OutlierResult> {
    return this.manager.callWorkerMethod<OutlierResult>(
      1,
      'outlier_detection',
      { data, method },
      { errorMessage: 'Outlier detection 실행 실패' }
    )
  }

  // ... 나머지 메서드 (총 10개)
}
```

---

### 2.4. Facade (기존 API 유지)

```typescript
// lib/services/pyodide-statistics.ts

import { PyodideManager } from './pyodide/pyodide-manager'
import { Worker1DescriptiveService } from './pyodide/workers/worker1-descriptive.service'
import { Worker2HypothesisService } from './pyodide/workers/worker2-hypothesis.service'
import { Worker3NonparametricService } from './pyodide/workers/worker3-nonparametric.service'
import { Worker4RegressionService } from './pyodide/workers/worker4-regression.service'

/**
 * Pyodide 통계 서비스 (Facade Pattern)
 *
 * 역할:
 * - 기존 API 완전 호환 유지
 * - Worker 서비스로 요청 위임
 * - 레거시 코드 지원
 */
export class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private manager: PyodideManager
  private worker1: Worker1DescriptiveService
  private worker2: Worker2HypothesisService
  private worker3: Worker3NonparametricService
  private worker4: Worker4RegressionService

  private constructor() {
    this.manager = PyodideManager.getInstance()
    this.worker1 = new Worker1DescriptiveService(this.manager)
    this.worker2 = new Worker2HypothesisService(this.manager)
    this.worker3 = new Worker3NonparametricService(this.manager)
    this.worker4 = new Worker4RegressionService(this.manager)
  }

  static getInstance(): PyodideStatisticsService {
    if (!PyodideStatisticsService.instance) {
      PyodideStatisticsService.instance = new PyodideStatisticsService()
    }
    return PyodideStatisticsService.instance
  }

  // ========== Worker 1: 기술통계 ==========

  async descriptiveStats(data: number[]) {
    return this.worker1.descriptiveStats(data)
  }

  async normalityTest(data: number[], alpha?: number) {
    return this.worker1.normalityTest(data, alpha)
  }

  async outlierDetection(data: number[], method?: 'iqr' | 'zscore') {
    return this.worker1.outlierDetection(data, method)
  }

  // ========== Worker 2: 가설검정 ==========

  async tTestOneSample(data: number[], popmean?: number) {
    return this.worker2.tTestOneSample(data, popmean)
  }

  async tTestTwoSample(group1: number[], group2: number[], equalVar?: boolean) {
    return this.worker2.tTestTwoSample(group1, group2, equalVar)
  }

  // ========== Worker 3: 비모수/ANOVA ==========

  async mannWhitneyU(group1: number[], group2: number[]) {
    return this.worker3.mannWhitneyTest(group1, group2)
  }

  async oneWayANOVA(groups: number[][]) {
    return this.worker3.oneWayAnova(groups)
  }

  // ========== Worker 4: 회귀/고급 ==========

  async regression(x: number[], y: number[]) {
    return this.worker4.linearRegression(x, y)
  }

  async multipleRegression(X: number[][], y: number[]) {
    return this.worker4.multipleRegression(X, y)
  }

  // ========== 복잡한 메서드 (Facade에서 직접 구현) ==========

  async checkAllAssumptions(data: { values?: number[]; groups?: number[][]; residuals?: number[] }) {
    // Worker 1, 2, 4 메서드를 조합하여 구현
    const results: any = {
      normality: {},
      homogeneity: {},
      independence: {},
      summary: { canUseParametric: true, reasons: [], recommendations: [] }
    }

    if (data.values && data.values.length >= 3) {
      results.normality.shapiroWilk = await this.worker1.normalityTest(data.values)
      if (!results.normality.shapiroWilk.isNormal) {
        results.summary.canUseParametric = false
        results.summary.reasons.push('정규성 가정 위반')
      }
    }

    if (data.groups && data.groups.length >= 2) {
      results.homogeneity.levene = await this.worker2.leveneTest(data.groups)
      if (!results.homogeneity.levene.equalVariance) {
        results.summary.canUseParametric = false
        results.summary.reasons.push('등분산성 가정 위반')
      }
    }

    return results
  }

  // ========== 레거시 API 별칭 ==========

  async calculateDescriptiveStats(data: number[]) {
    return this.descriptiveStats(data)
  }

  async testNormality(data: number[], alpha?: number) {
    return this.normalityTest(data, alpha)
  }

  // ========== 초기화/정리 ==========

  async initialize() {
    await this.manager.initialize()
  }

  isInitialized(): boolean {
    return this.manager.isInitialized()
  }

  dispose(): void {
    this.manager.dispose()
    PyodideStatisticsService.instance = null
  }
}

export const pyodideStats = PyodideStatisticsService.getInstance()
```

---

## 📊 3. 장점 분석

### 3.1. 개발 효율

| 시나리오 | Before (단일 파일) | After (Worker별 분리) |
|---------|-------------------|---------------------|
| Worker 1 메서드 수정 | 2,641줄 파일 열기 | 400줄 파일 열기 |
| 병렬 개발 (2명) | 코드 충돌 발생 | 충돌 없음 (다른 파일) |
| 새 Worker 추가 | 기존 파일 수정 | 새 파일 생성 |

### 3.2. 유지보수성

- ✅ **관심사 분리**: 각 Worker는 독립적인 도메인
- ✅ **테스트 용이**: Worker별 독립 테스트 가능
- ✅ **확장 가능**: Worker 5 추가 시 기존 코드 영향 없음

### 3.3. 팀 협업

- ✅ **코드 충돌 최소화**: 각 개발자가 다른 Worker 담당
- ✅ **리뷰 효율**: 작은 파일 단위로 PR
- ✅ **지식 분산**: Worker별 전문가 양성

---

## 📅 4. 구현 일정 (Phase 9)

### 전제조건
- ✅ Option A (callWorkerMethod 헬퍼) 완료
- ✅ Phase 6-8 완료 (새 메서드 추가 완료)
- ✅ 모든 테스트 통과

### Day 1: 아키텍처 구현 (4시간)

1. **PyodideManager 구현** (2시간)
   - 기존 초기화 로직 이동
   - `callWorkerMethod<T>()` 이동
   - Worker 로딩 로직 이동

2. **Worker1Service 구현** (1시간)
   - 10개 메서드 이동
   - 타입 정의 추가

3. **Facade 구현** (1시간)
   - Worker1 메서드 위임
   - 테스트 실행

---

### Day 2: Worker 2-4 분리 (6시간)

1. **Worker2Service 구현** (2시간)
   - 20개 메서드 이동
   - 테스트 실행

2. **Worker3Service 구현** (2.5시간)
   - 30개 메서드 이동
   - 테스트 실행

3. **Worker4Service 구현** (1.5시간)
   - 10개 메서드 이동
   - 테스트 실행

---

### Day 3: 복잡한 메서드 구현 (4시간)

1. **Facade에서 구현** (3시간)
   - `checkAllAssumptions()` - 다중 Worker 호출
   - `correlation()` - 3가지 상관계수 병합
   - `calculateCorrelation()` - 상관행렬 계산
   - `performBonferroni()` - Bonferroni 보정

2. **테스트 실행** (1시간)
   - 전체 테스트 통과 확인

---

### Day 4: 문서화 및 정리 (2시간)

1. **문서 업데이트** (1시간)
   - [CLAUDE.md](CLAUDE.md) 아키텍처 섹션 업데이트
   - 각 Worker 파일에 JSDoc 추가

2. **최종 검증** (1시간)
   - TypeScript 컴파일 체크
   - 모든 테스트 통과 확인
   - Git 커밋

---

## ⚠️ 5. 주의사항

### 위험 요소

1. **Import 경로 변경**
   - ⚠️ Groups에서 import 경로가 변경될 수 있음
   - ✅ **대응**: Facade 유지로 기존 경로 동일

2. **순환 의존성**
   - ⚠️ Worker 간 의존성 발생 가능
   - ✅ **대응**: Worker는 Manager만 의존

3. **테스트 수정**
   - ⚠️ Mock 구조 변경 필요
   - ✅ **대응**: Facade 테스트는 그대로 유지

### 회귀 방지

- ✅ **Facade 패턴**: 기존 API 완전 호환
- ✅ **점진적 적용**: Worker별 순차 분리
- ✅ **테스트 실행**: 각 단계마다 테스트

---

## 📊 6. 예상 결과

### 파일 크기

| 파일 | 줄 수 | 메서드 수 |
|------|-------|----------|
| **pyodide-manager.ts** | 250줄 | 5개 |
| **worker1-descriptive.service.ts** | 400줄 | 10개 |
| **worker2-hypothesis.service.ts** | 500줄 | 20개 |
| **worker3-nonparametric.service.ts** | 700줄 | 30개 |
| **worker4-regression.service.ts** | 300줄 | 10개 |
| **pyodide-statistics.ts (Facade)** | 350줄 | 80개 (위임) |
| **합계** | **2,500줄** | **165개** |

### 품질 지표

| 항목 | Before (단일 파일) | After (분리) |
|------|-------------------|-------------|
| **최대 파일 크기** | 2,641줄 | 700줄 |
| **응집도** | 중간 | 높음 |
| **결합도** | 높음 | 낮음 |
| **테스트 용이성** | 중간 | 높음 |
| **병렬 개발** | 불가 | 가능 |

---

## ✅ 7. 체크리스트

### 구현 전 확인
- [ ] Option A (헬퍼) 완료
- [ ] Phase 6-8 완료
- [ ] 모든 테스트 통과
- [ ] Git 브랜치 생성 (`refactor/option-b-services`)

### 구현 중 확인
- [ ] PyodideManager 구현 + 테스트
- [ ] Worker1Service 구현 + 테스트
- [ ] Worker2Service 구현 + 테스트
- [ ] Worker3Service 구현 + 테스트
- [ ] Worker4Service 구현 + 테스트
- [ ] Facade 구현 + 테스트

### 구현 후 확인
- [ ] 전체 테스트 통과
- [ ] TypeScript 컴파일 체크
- [ ] 문서 업데이트
- [ ] Git 커밋 및 PR

---

## 🎯 8. 결론

### Option B의 가치

Option B (Worker별 분리)는 **Option A (헬퍼)가 있어야만** 효과적입니다:

1. **Option A 없이 분리**: 각 Worker 파일에 중복 코드 발생
2. **Option A + 분리**: 헬퍼 재사용으로 깔끔한 구조

### 권장 순서

```
현재 (2,641줄, 중복 많음)
  ↓
Option A 적용 (1,500줄, 중복 제거) ← Phase 6
  ↓
Option B 적용 (2,500줄, 구조화) ← Phase 9
```

### 최종 권장사항

- ✅ **지금**: Option A 구현 (3-4일)
- ✅ **Phase 9**: Option B 구현 (3-4일)
- ✅ **총 작업**: 6-8일

---

**작성자**: Claude Code
**승인 대기**: 사용자 확인 후 Option A 먼저 진행
**예상 완료일**: Option A (2025-10-18), Option B (Phase 9)
