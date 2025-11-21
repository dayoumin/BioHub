# Phase 4: AI 통계 방법 추천 시스템 구현 계획

**작성일**: 2025-11-21
**최종 수정**: 2025-11-21 (AI 리뷰 반영)
**상태**: 계획 단계
**목표**: 정확도 85% 이상의 하이브리드 추천 시스템 구축 (안전 마진 포함)

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [AI 리뷰 반영 사항](#-ai-리뷰-반영-사항)
3. [현재 상태 분석](#-현재-상태-분석)
4. [Phase 4-A: Decision Tree 추천](#-phase-4-a-decision-tree-추천)
5. [Phase 4-B: Ollama LLM 통합](#-phase-4-b-ollama-llm-통합)
6. [Phase 4-C: 하이브리드 시스템](#-phase-4-c-하이브리드-시스템)
7. [정확도 검증 계획](#-정확도-검증-계획)
8. [구현 일정](#-구현-일정)
9. [위험 요소 및 대응](#-위험-요소-및-대응)

---

## 🎯 프로젝트 개요

### 배경
현재 Smart Flow의 PurposeInputStep은 **Mock 데이터 기반 추천**을 사용하고 있으며, 실제 데이터 특성이나 통계적 가정 검정 결과를 반영하지 않습니다.

### 문제점
```typescript
// 현재: PurposeInputStep.tsx Line 137-146
const mockMethod: StatisticalMethod = {
  id: 'independent-t-test',
  name: '독립표본 t-검정',
  // ❌ 하드코딩된 결과 (실제 분석 없음)
}
```

- **정확도**: ~50% (모든 목적에 동일한 방법 추천)
- **신뢰도**: 낮음 (Zustand 데이터 미활용)
- **확장성**: 없음 (새 메서드 추가 불가)

### 목표
1. **정확도 85% 이상** 달성 (안전 마진 4% 포함, 실제 예상: 88-89%)
2. **Zustand Store 데이터 활용** (assumptionResults + validationResults)
3. **하이브리드 시스템** (Rule-based + AI-based)
4. **오프라인 동작** 보장
5. **Null 안전성** 보장 (assumptionResults null 체크)

---

## 🔍 AI 리뷰 반영 사항

**AI 리뷰 날짜**: 2025-11-21
**리뷰어**: External AI System

### 주요 개선 사항 5가지

#### 1. 정확도 목표 조정 (90% → 85%)

**기존 문제**:
- 목표: 90% vs 실제 계산: 88% (내부 불일치)
- 안전 마진 없음

**개선**:
```
목표 정확도: 85% 이상
실제 예상: 88-89%
안전 마진: 3-4%
```

**근거**:
| 목적 | 규칙 개수 | 예상 정확도 | 가중치 | 기여도 |
|------|---------|------------|--------|--------|
| compare | 9개 분기 | 92% | 35% | 32.2% |
| relationship | 4개 분기 | 90% | 25% | 22.5% |
| distribution | 1개 | 100% | 15% | 15.0% |
| prediction | 3개 분기 | 85% | 15% | 12.8% |
| timeseries | 2개 분기 | 75% | 10% | 7.5% |
| **가중 평균** | **19개** | **88-89%** | 100% | **89.0%** |

안전 마진 4%를 고려하여 **85% 목표 설정**

#### 2. 복잡한 케이스 추가 (Paired Design, Multi-factor ANOVA)

**기존 문제**:
- Decision Tree가 단순 이분법만 처리 (2-group compare, basic correlation)
- Paired t-test, Repeated Measures ANOVA 미지원

**개선**:

**2-1. Paired Design 감지**:
```typescript
private static detectPairedDesign(
  data: DataRow[],
  validationResults: ValidationResults
): boolean {
  // ID/Subject 컬럼 찾기
  const idColumn = validationResults.columns.find(c =>
    c.name.toLowerCase().includes('id') ||
    c.name.toLowerCase().includes('subject') ||
    c.name.toLowerCase().includes('participant')
  )

  if (!idColumn) return false

  // 각 ID가 2회 이상 등장하는지 체크
  const idCounts = new Map<string, number>()
  for (const row of data) {
    const id = row[idColumn.name]
    idCounts.set(id, (idCounts.get(id) || 0) + 1)
  }

  // 50% 이상의 ID가 2회 이상 등장 → Paired Design
  const pairedCount = Array.from(idCounts.values()).filter(count => count > 1).length
  return (pairedCount / idCounts.size) > 0.5
}
```

**2-2. Multi-factor 감지**:
```typescript
private static detectFactors(
  data: DataRow[],
  validationResults: ValidationResults
): string[] {
  return validationResults.columns
    .filter(c => c.type === 'categorical')
    .filter(c => {
      const uniqueValues = new Set(data.map(row => row[c.name]))
      return uniqueValues.size >= 2 && uniqueValues.size <= 10
    })
    .map(c => c.name)
}
```

**2-3. 개선된 compare 로직**:
```typescript
private static recommendForCompare(
  assumptionResults: StatisticalAssumptions,
  validationResults: ValidationResults,
  data: DataRow[]
): AIRecommendation {
  // ✅ Paired Design 체크 추가
  const isPaired = this.detectPairedDesign(data, validationResults)
  const factors = this.detectFactors(data, validationResults)

  if (isPaired) {
    // Paired t-test or Wilcoxon
    if (normality.shapiroWilk.isNormal) {
      return { method: { id: 'paired-t-test', ... }, confidence: 0.91 }
    } else {
      return { method: { id: 'wilcoxon-signed-rank', ... }, confidence: 0.93 }
    }
  }

  // ✅ Multi-factor 체크 추가
  if (factors.length >= 2) {
    // Two-way ANOVA or Friedman
    if (normality.shapiroWilk.isNormal && homogeneity.levene.equalVariance) {
      return { method: { id: 'two-way-anova', ... }, confidence: 0.87 }
    } else {
      return { method: { id: 'friedman', ... }, confidence: 0.89 }
    }
  }

  // 기존 로직 (2-group, 3+ group)
  // ...
}
```

#### 3. 검증 전략 현실화 (100 Kaggle → 20 큐레이션 + 50 합성)

**기존 문제**:
- 100개 Kaggle 데이터셋 + 전문가 라벨링 (비현실적)
- Ground Truth 출처 없음
- 시간/비용 과소평가

**개선**:

**3-1. 큐레이션 데이터셋 (20개)**:
```typescript
const curatedDatasets: CuratedTestCase[] = [
  {
    name: 'Fisher Iris (1936)',
    source: 'sklearn.datasets',
    purpose: 'compare',
    expectedMethod: 'one-way-anova',
    groundTruth: '교과서 예제 (확정)',
    reference: 'Fisher, R.A. (1936). The use of multiple measurements in taxonomic problems'
  },
  {
    name: 'Student Sleep Data',
    source: 'R datasets',
    purpose: 'compare',
    expectedMethod: 'paired-t-test',
    groundTruth: 'Student (1908) 원본 데이터',
    reference: 'Student (1908). The probable error of a mean'
  },
  {
    name: 'mtcars (Motor Trend)',
    source: 'R datasets',
    purpose: 'relationship',
    expectedMethod: 'pearson-correlation',
    groundTruth: 'Henderson and Velleman (1981)',
    reference: 'Building multiple regression models interactively'
  },
  // ... 17개 추가 (교과서 수록 데이터셋)
]
```

**3-2. 합성 데이터셋 (50개)**:
```typescript
function generateSyntheticDataset(config: {
  purpose: AnalysisPurpose
  groups: number
  sampleSize: number
  distribution: 'normal' | 'skewed' | 'uniform'
  variance: 'equal' | 'unequal'
  effectSize: 'small' | 'medium' | 'large'
}): SyntheticTestCase {
  const { purpose, groups, distribution, variance } = config

  // Ground Truth를 생성 시점에 확정
  let expectedMethod: string
  let data: DataRow[]

  if (purpose === 'compare' && groups === 2) {
    if (distribution === 'normal' && variance === 'equal') {
      expectedMethod = 'independent-t-test'
      data = generateNormalData({ groups: 2, variance: 'equal', ... })
    } else if (distribution === 'skewed') {
      expectedMethod = 'mann-whitney'
      data = generateSkewedData({ groups: 2, ... })
    }
  }

  return {
    name: `Synthetic ${purpose} (${distribution}, ${variance})`,
    data,
    expectedMethod, // ✅ 생성 시점에 확정
    assumptionResults: calculateAssumptions(data) // ✅ 실제 계산
  }
}
```

**검증 시나리오**:
```bash
# 1단계: 큐레이션 데이터셋 (20개)
npm run validate:curated
# → 정확도 95% 이상 예상 (Ground Truth 명확)

# 2단계: 합성 데이터셋 (50개)
npm run validate:synthetic
# → 정확도 85-90% 예상 (모든 조합 테스트)

# 3단계: 통합 검증 (70개)
npm run validate:all
# → 정확도 88-90% 예상
```

#### 4. Null 안전성 보장

**기존 문제**:
- `assumptionResults!` Non-null assertion 남용
- Step 2를 건너뛰면 null 발생 가능

**개선**:

**4-1. Null 체크 추가**:
```typescript
// PurposeInputStep.tsx
const analyzeAndRecommend = useCallback(async (
  purpose: AnalysisPurpose
): Promise<AIRecommendation | null> => {
  try {
    setIsAnalyzing(true)
    setAiProgress(0)

    // ✅ Null 체크 (AI Review Fix #4)
    const storeState = useSmartFlowStore.getState()
    const assumptionResults = storeState.assumptionResults

    if (!assumptionResults) {
      logger.warn('assumptionResults is null, using basic recommendation')

      // ✅ 기본 추천 (가정 검정 없이)
      return DecisionTreeRecommender.recommendWithoutAssumptions(
        purpose,
        validationResults,
        data
      )
    }

    // ✅ assumptionResults 사용 가능
    const ollamaAvailable = await ollamaRecommender.checkHealth()

    if (ollamaAvailable) {
      return await ollamaRecommender.recommend(...)
    } else {
      return DecisionTreeRecommender.recommend(
        purpose,
        assumptionResults, // ✅ null이 아님
        validationResults,
        data
      )
    }
  } catch (error) {
    logger.error('AI 추천 실패', { error })
    return null
  }
}, [validationResults, data])
```

**4-2. 기본 추천 함수 추가**:
```typescript
// decision-tree-recommender.ts
export class DecisionTreeRecommender {
  // ✅ 가정 검정 없이도 동작
  static recommendWithoutAssumptions(
    purpose: AnalysisPurpose,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    // 보수적 추천 (비모수 검정 우선)
    switch (purpose) {
      case 'compare':
        const groups = this.detectGroupCount(data, validationResults)
        if (groups === 2) {
          return {
            method: { id: 'mann-whitney', name: 'Mann-Whitney U', ... },
            confidence: 0.70, // ✅ 신뢰도 낮음 (가정 검정 없음)
            reasoning: [
              '⚠ 통계적 가정 검정을 수행하지 않았습니다.',
              '비모수 검정을 권장합니다 (보수적 접근).'
            ]
          }
        } else if (groups >= 3) {
          return { method: { id: 'kruskal-wallis', ... }, confidence: 0.70 }
        }
        break

      case 'relationship':
        return { method: { id: 'spearman-correlation', ... }, confidence: 0.70 }

      // ... 다른 목적들
    }
  }
}
```

#### 5. Ollama Health Check 강화 (캐싱 + 재시도)

**기존 문제**:
- 단순 fetch만 사용 (타임아웃 없음)
- 재시도 로직 없음
- 캐싱 없음 (매번 네트워크 요청)

**개선**:

```typescript
// lib/services/ollama-recommender.ts
export class OllamaRecommender {
  private healthCache: {
    isAvailable: boolean
    timestamp: number
    ttl: number // 5분
  } | null = null

  /**
   * Ollama 서버 상태 확인 (캐싱 + 재시도)
   */
  async checkHealth(): Promise<boolean> {
    // ✅ 1단계: 캐시 체크 (5분 TTL)
    if (this.healthCache &&
        Date.now() - this.healthCache.timestamp < this.healthCache.ttl) {
      logger.info('Using cached health status', {
        isAvailable: this.healthCache.isAvailable
      })
      return this.healthCache.isAvailable
    }

    // ✅ 2단계: 재시도 로직 (최대 2회)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // ✅ 2초 타임아웃

        const response = await fetch(`${this.config.host}/api/tags`, {
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          // ✅ 성공 → 5분 캐싱
          this.healthCache = {
            isAvailable: true,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000 // 5분
          }
          logger.info('Ollama health check SUCCESS', { attempt: attempt + 1 })
          return true
        }
      } catch (error) {
        logger.warn('Ollama health check FAILED', {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        if (attempt === 1) {
          // ✅ 실패 → 1분 캐싱 (재시도 방지)
          this.healthCache = {
            isAvailable: false,
            timestamp: Date.now(),
            ttl: 1 * 60 * 1000 // 1분
          }
        }

        // 마지막 시도가 아니면 100ms 대기 후 재시도
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    return false
  }

  /**
   * 캐시 무효화 (테스트용)
   */
  clearHealthCache(): void {
    this.healthCache = null
  }
}
```

**개선 효과**:
- **캐싱**: 5분간 네트워크 요청 없음 (성능 향상)
- **재시도**: 일시적 네트워크 오류 복구 (안정성 향상)
- **타임아웃**: 무한 대기 방지 (UX 개선)
- **로깅**: 디버깅 용이

### 변경 요약

| 항목 | 기존 | 개선 | 효과 |
|------|------|------|------|
| **정확도 목표** | 90% (불일치) | 85% (안전 마진 4%) | 달성 가능성 ↑ |
| **Decision Tree** | 17개 규칙 | 19개 규칙 (Paired, Multi-factor 추가) | 커버리지 ↑ |
| **검증 데이터셋** | 100 Kaggle (비현실적) | 20 큐레이션 + 50 합성 (현실적) | 실행 가능성 ↑ |
| **Null 안전성** | Non-null assertion | Null 체크 + 기본 추천 | 안정성 ↑ |
| **Ollama Health** | 단순 fetch | 캐싱 + 재시도 + 타임아웃 | 성능 + 안정성 ↑ |

---

## 📊 현재 상태 분석

### 사용 가능한 데이터 (Zustand Store)

```typescript
// smart-flow-store.ts
interface SmartFlowState {
  // ✅ Step 2에서 이미 계산됨
  assumptionResults: {
    normality: {
      shapiroWilk: { isNormal: boolean, pValue: number }
    },
    homogeneity: {
      levene: { equalVariance: boolean, pValue: number }
    }
  }

  // ✅ Step 2 검증 결과
  validationResults: {
    totalRows: number
    columnCount: number
    columns: { name: string, type: 'numeric' | 'categorical' }[]
    // ...
  }

  // ✅ Step 1 원본 데이터
  uploadedData: DataRow[]
}
```

### 기존 시스템

#### 1. SmartRecommender (lib/services/smart-recommender.ts)
- **타입**: 키워드 기반 (Text-based)
- **입력**: 사용자 텍스트 (현재는 사용 안 함)
- **정확도**: ~70%
- **문제**: Phase 2에서 텍스트 입력을 제거함 → 사용 불가

#### 2. OllamaRecommender (lib/services/ollama-recommender.ts)
- **타입**: LLM 기반
- **상태**: 이미 70% 구현됨
- **정확도**: ~95% (예상)
- **문제**: Ollama 설치 필요 (로컬 환경만)

---

## 🌳 Phase 4-A: Decision Tree 추천

### 개요
- **방식**: Rule-based (조건 분기)
- **입력**: Purpose + Zustand Data
- **정확도**: **85%** (목표), 실제 예상 88-89%
- **장점**: 빠름 (즉시), 오프라인 동작, Null 안전성

### 파일 구조

```
statistical-platform/lib/services/
├── decision-tree-recommender.ts    ← 새로 작성 (300줄)
│   ├── DecisionTreeRecommender (Class)
│   │   ├── recommend() - 메인 함수
│   │   ├── recommendForCompare() - 그룹 비교
│   │   ├── recommendForRelationship() - 상관분석
│   │   ├── recommendForDistribution() - 기술통계
│   │   ├── recommendForPrediction() - 회귀분석
│   │   ├── recommendForTimeseries() - 시계열
│   │   ├── findGroupVariable() - 헬퍼
│   │   └── findMeasureVariable() - 헬퍼
```

### 구현 상세

#### 핵심 함수 시그니처

```typescript
export class DecisionTreeRecommender {
  static recommend(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {
    // 목적별 분기
    switch (purpose) {
      case 'compare':
        return this.recommendForCompare(assumptionResults, validationResults, data)
      case 'relationship':
        return this.recommendForRelationship(assumptionResults, validationResults, data)
      case 'distribution':
        return this.recommendForDistribution(validationResults, data)
      case 'prediction':
        return this.recommendForPrediction(validationResults, data)
      case 'timeseries':
        return this.recommendForTimeseries(validationResults, data)
    }
  }
}
```

#### 목적 1: 그룹 간 차이 비교 (compare)

**Decision Tree**:

```
그룹 개수?
├─ 1개 → 일표본 t-검정
├─ 2개
│  ├─ 정규성 ✓ + 등분산 ✓ → 독립표본 t-검정 (92% 신뢰도)
│  ├─ 정규성 ✗ → Mann-Whitney U (95% 신뢰도)
│  └─ 등분산 ✗ → Welch's t-검정 (90% 신뢰도)
└─ 3개 이상
   ├─ 정규성 ✓ + 등분산 ✓ → ANOVA (88% 신뢰도)
   └─ 정규성 ✗ or 등분산 ✗ → Kruskal-Wallis (92% 신뢰도)
```

**코드 예시**:

```typescript
private static recommendForCompare(
  assumptionResults: StatisticalAssumptions,
  validationResults: ValidationResults,
  data: DataRow[]
): AIRecommendation {
  const groupVariable = this.findGroupVariable(data, validationResults)
  const uniqueGroups = [...new Set(data.map(row => row[groupVariable]))]
  const n = data.length

  if (uniqueGroups.length === 2) {
    // 2개 그룹
    const { normality, homogeneity } = assumptionResults

    if (normality.shapiroWilk.isNormal && homogeneity.levene.equalVariance) {
      // 정규성 ✓, 등분산 ✓
      return {
        method: {
          id: 'independent-t-test',
          name: '독립표본 t-검정',
          description: '두 독립 그룹 간 평균 차이를 검정합니다.',
          category: 't-test',
          requirements: {
            minSampleSize: 30,
            assumptions: ['정규성', '등분산성', '독립성']
          }
        },
        confidence: 0.92,
        reasoning: [
          '두 독립 그룹 간 평균 비교가 필요합니다.',
          `표본 크기: ${n} (충분)`,
          `✓ 정규성 충족 (p=${normality.shapiroWilk.pValue.toFixed(3)})`,
          `✓ 등분산성 충족 (p=${homogeneity.levene.pValue.toFixed(3)})`
        ],
        assumptions: [
          { name: '정규성', passed: true, pValue: normality.shapiroWilk.pValue },
          { name: '등분산성', passed: true, pValue: homogeneity.levene.pValue }
        ],
        alternatives: [
          {
            id: 'mann-whitney',
            name: 'Mann-Whitney U 검정',
            description: '비모수 대안 (정규성 가정 불필요)',
            category: 'nonparametric'
          }
        ]
      }
    } else if (!normality.shapiroWilk.isNormal) {
      // 정규성 ✗
      return {
        method: {
          id: 'mann-whitney',
          name: 'Mann-Whitney U 검정',
          description: '두 독립 그룹 간 순위 기반 비교',
          category: 'nonparametric'
        },
        confidence: 0.95,
        reasoning: [
          '정규성 가정이 위배되어 비모수 검정을 권장합니다.',
          `⚠ 정규성 위배 (p=${normality.shapiroWilk.pValue.toFixed(3)} < 0.05)`,
          '등분산성 가정 불필요 (비모수 검정)',
          '순위 기반 검정으로 이상치에 강건합니다.'
        ],
        assumptions: [
          { name: '정규성', passed: false, pValue: normality.shapiroWilk.pValue }
        ],
        alternatives: [
          {
            id: 'independent-t-test',
            name: '독립표본 t-검정',
            description: '정규성 충족 시 사용 (더 강력)',
            category: 't-test'
          }
        ]
      }
    } else if (!homogeneity.levene.equalVariance) {
      // 등분산 ✗
      return {
        method: {
          id: 'welch-t',
          name: "Welch's t-검정",
          description: '등분산 가정을 완화한 t-검정',
          category: 't-test'
        },
        confidence: 0.90,
        reasoning: [
          '등분산성 가정이 위배되어 Welch 보정을 적용합니다.',
          `✓ 정규성 충족 (p=${normality.shapiroWilk.pValue.toFixed(3)})`,
          `⚠ 등분산성 위배 (p=${homogeneity.levene.pValue.toFixed(3)} < 0.05)`,
          '자유도 보정으로 등분산성 가정 완화'
        ],
        assumptions: [
          { name: '정규성', passed: true, pValue: normality.shapiroWilk.pValue },
          { name: '등분산성', passed: false, pValue: homogeneity.levene.pValue }
        ],
        alternatives: [
          {
            id: 'mann-whitney',
            name: 'Mann-Whitney U 검정',
            description: '비모수 대안',
            category: 'nonparametric'
          }
        ]
      }
    }
  }

  // ... (1개 그룹, 3개 이상 그룹 로직)
}
```

#### 목적 2: 변수 간 관계 분석 (relationship)

**Decision Tree**:

```
수치형 변수 개수?
├─ 0~1개 → ⚠ 에러 (최소 2개 필요)
└─ 2개 이상
   ├─ 정규성 ✓ → Pearson 상관분석 (90% 신뢰도)
   └─ 정규성 ✗ → Spearman 상관분석 (93% 신뢰도)
```

#### 목적 3: 분포 탐색 (distribution)

**Decision Tree**:

```
항상 → 기술통계 (100% 신뢰도)
```

#### 목적 4: 예측 분석 (prediction)

**Decision Tree**:

```
종속변수 타입?
├─ 연속형 (numeric) → 선형 회귀분석 (85% 신뢰도)
└─ 범주형 (categorical) → 로지스틱 회귀분석 (87% 신뢰도)
```

#### 목적 5: 시계열 분석 (timeseries)

**Decision Tree**:

```
날짜 변수 존재?
├─ ✓ → 시계열 분석 (80% 신뢰도)
└─ ✗ → 대응표본 t-검정 (75% 신뢰도, 전후 비교로 대체)
```

### 정확도 예상

| 목적 | 규칙 개수 | 예상 정확도 | 비고 |
|------|---------|------------|------|
| compare | **9개 분기** | **92%** | Paired + Multi-factor 추가 |
| relationship | 4개 분기 | **90%** | 정규성만 체크 |
| distribution | 1개 (단순) | **100%** | 항상 기술통계 |
| prediction | 3개 분기 | **85%** | 종속변수 타입 |
| timeseries | 2개 분기 | **75%** | 날짜 변수 탐지 |
| **평균** | **19개 규칙** | **88-89%** | 목표: 85% (안전 마진 4%) |

---

## 🤖 Phase 4-B: Ollama LLM 통합

### 개요
- **방식**: LLM 기반 (자연어 이해)
- **모델**: qwen3:4b (2.6GB, 한국어 지원)
- **정확도**: **95%** (예상)
- **장점**: 복잡한 케이스 대응, 확장성

### 기존 코드 현황

```typescript
// lib/services/ollama-recommender.ts (이미 70% 구현됨)
export class OllamaRecommender {
  private config: OllamaConfig = {
    host: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434',
    model: 'qwen3:4b',
    temperature: 0.3, // ✅ 0.2로 낮춤 (더 일관성)
    maxTokens: 500    // ✅ 800으로 증가 (더 상세)
  }

  async recommend(purposeText: string, dataContext: { ... }): Promise<AIRecommendation> {
    // ✅ 이미 구현됨
  }
}
```

### 개선 사항

#### 1. 프롬프트 강화

**기존**:

```typescript
const prompt = `
User's research question: "${purposeText}"
Data information: ${dataContext.shape[0]} rows × ${dataContext.shape[1]} columns
Please recommend the most appropriate statistical methods.
`
```

**개선**:

```typescript
private buildPrompt(purposeText: string, dataContext: any): string {
  const { assumptionResults } = dataContext

  return `
User's analysis goal: "${purposeText}"

Data information:
- Sample size: ${dataContext.shape[0]} rows × ${dataContext.shape[1]} columns
- Column types: ${dataContext.types.join(', ')}
- Sample size category: ${dataContext.shape[0] < 30 ? 'Small (use non-parametric)' : 'Adequate'}

Statistical assumptions (already tested in Step 2):
- Normality (Shapiro-Wilk): ${assumptionResults?.normality?.shapiroWilk?.isNormal ? 'PASS ✓' : 'FAIL ✗'} (p=${assumptionResults?.normality?.shapiroWilk?.pValue?.toFixed(3)})
- Homogeneity (Levene): ${assumptionResults?.homogeneity?.levene?.equalVariance ? 'PASS ✓' : 'FAIL ✗'} (p=${assumptionResults?.homogeneity?.levene?.pValue?.toFixed(3)})

IMPORTANT: Use the assumption test results above to recommend the SINGLE MOST appropriate method.

Please recommend in Korean with JSON format:
{
  "method": {
    "id": "method_id",
    "name": "Method Name in Korean",
    "description": "Brief description",
    "category": "category_name"
  },
  "confidence": 0.95,
  "reasoning": [
    "Reason 1 (3-5 bullet points)",
    "Reason 2",
    ...
  ],
  "assumptions": [
    { "name": "정규성", "passed": true, "pValue": 0.08 }
  ],
  "alternatives": [
    { "id": "alt_id", "name": "Alternative Name", "description": "Why alternative" }
  ]
}
`
}
```

#### 2. 온도 조정

```typescript
temperature: 0.2  // ✅ 0.3 → 0.2 (더 일관성 있는 추천)
maxTokens: 800    // ✅ 500 → 800 (더 상세한 설명)
```

---

## 🔀 Phase 4-C: 하이브리드 시스템

### 동작 흐름

```
사용자가 목적 카드 선택
         ↓
    Ollama 사용 가능?
         ↓
    ┌────┴────┐
   YES       NO
    │         │
    │         ↓
    │    Decision Tree
    │    (Rule-based)
    │    정확도: 90%
    │    속도: 즉시
    │         │
    ↓         │
 Ollama LLM   │
 (AI-based)   │
 정확도: 95%  │
 속도: 2~5초  │
    │         │
    └────┬────┘
         ↓
    AIRecommendation
    (통합 결과)
```

### 구현 코드

```typescript
// components/smart-flow/steps/PurposeInputStep.tsx 수정
const analyzeAndRecommend = useCallback(async (
  purpose: AnalysisPurpose
): Promise<AIRecommendation | null> => {
  try {
    setIsAnalyzing(true)
    setAiProgress(0)

    // Step 1: Ollama 사용 가능 여부 확인
    const ollamaAvailable = await ollamaRecommender.checkHealth()

    if (ollamaAvailable) {
      // 🚀 Ollama LLM 사용 (높은 정확도 95%)
      logger.info('Using Ollama LLM for recommendation', { purpose })
      setAiProgress(30)

      const purposeDescription = ANALYSIS_PURPOSES.find(p => p.id === purpose)?.description || ''

      const llmResult = await ollamaRecommender.recommend(
        purposeDescription,
        {
          shape: [data.length, validationResults.columns.length],
          types: validationResults.columns.map(c => c.type),
          assumptionResults: useSmartFlowStore.getState().assumptionResults
        }
      )

      setAiProgress(100)
      return llmResult
    } else {
      // ⚡ Decision Tree 폴백 (빠른 응답 90%)
      logger.info('Ollama unavailable, using Decision Tree', { purpose })
      setAiProgress(50)

      const ruleBasedResult = DecisionTreeRecommender.recommend(
        purpose,
        useSmartFlowStore.getState().assumptionResults!,
        validationResults,
        data
      )

      setAiProgress(100)
      return ruleBasedResult
    }
  } catch (error) {
    logger.error('AI 추천 실패', { error })

    // ✅ 최종 폴백: Decision Tree (에러 발생 시)
    try {
      return DecisionTreeRecommender.recommend(
        purpose,
        useSmartFlowStore.getState().assumptionResults!,
        validationResults,
        data
      )
    } catch (fallbackError) {
      logger.error('Fallback 추천 실패', { fallbackError })
      return null
    }
  } finally {
    setIsAnalyzing(false)
    setAiProgress(0)
  }
}, [validationResults, data])
```

### 시나리오별 동작

| 시나리오 | 사용 방식 | 정확도 | 속도 | 오프라인 |
|---------|----------|--------|------|---------|
| **로컬 개발** (Ollama 설치됨) | Ollama LLM | **95%** | 2~5초 | ✅ |
| **Vercel 배포** (Ollama 없음) | Decision Tree | **90%** | 즉시 | ✅ |
| **폐쇄망 환경** (오프라인) | Decision Tree | **90%** | 즉시 | ✅ |
| **Ollama 에러** (네트워크) | Decision Tree (폴백) | **90%** | 즉시 | ✅ |

---

## 🧪 정확도 검증 계획

### 테스트 케이스 (20개)

```typescript
// __tests__/lib/services/decision-tree-recommender.test.ts
describe('Decision Tree Recommender 정확도 검증', () => {
  describe('그룹 간 차이 비교 (compare)', () => {
    it('Case 1: 2그룹 + 정규성✓ + 등분산✓ → Independent t-test', () => {
      const result = DecisionTreeRecommender.recommend('compare', {
        normality: { shapiroWilk: { isNormal: true, pValue: 0.08 } },
        homogeneity: { levene: { equalVariance: true, pValue: 0.15 } }
      }, validationResults, twoGroupData)

      expect(result.method.id).toBe('independent-t-test')
      expect(result.confidence).toBeGreaterThanOrEqual(0.90)
      expect(result.reasoning.length).toBeGreaterThanOrEqual(3)
    })

    it('Case 2: 2그룹 + 정규성✗ → Mann-Whitney U', () => {
      const result = DecisionTreeRecommender.recommend('compare', {
        normality: { shapiroWilk: { isNormal: false, pValue: 0.02 } },
        homogeneity: { levene: { equalVariance: true, pValue: 0.15 } }
      }, validationResults, twoGroupData)

      expect(result.method.id).toBe('mann-whitney')
      expect(result.confidence).toBeGreaterThanOrEqual(0.93)
    })

    it('Case 3: 2그룹 + 등분산✗ → Welch t-test', () => {
      const result = DecisionTreeRecommender.recommend('compare', {
        normality: { shapiroWilk: { isNormal: true, pValue: 0.08 } },
        homogeneity: { levene: { equalVariance: false, pValue: 0.01 } }
      }, validationResults, twoGroupData)

      expect(result.method.id).toBe('welch-t')
      expect(result.confidence).toBeGreaterThanOrEqual(0.88)
    })

    // ... 17개 추가 테스트
  })
})
```

### 실제 데이터셋 검증 (20개 큐레이션 + 50개 합성)

**변경 사항**: AI 리뷰 반영 (100 Kaggle → 70 현실적 데이터셋)

#### 큐레이션 데이터셋 (20개)

```typescript
// scripts/validate-accuracy-curated.ts
interface CuratedTestCase {
  name: string
  source: string
  purpose: AnalysisPurpose
  dataFile: string
  expectedMethod: string
  groundTruth: string
  reference: string
}

const curatedDatasets: CuratedTestCase[] = [
  {
    name: 'Fisher Iris (1936)',
    source: 'sklearn.datasets',
    purpose: 'compare',
    dataFile: 'datasets/curated/iris.csv',
    expectedMethod: 'one-way-anova',
    groundTruth: '교과서 예제 (확정)',
    reference: 'Fisher, R.A. (1936). The use of multiple measurements'
  },
  {
    name: 'Student Sleep Data',
    source: 'R datasets',
    purpose: 'compare',
    dataFile: 'datasets/curated/sleep.csv',
    expectedMethod: 'paired-t-test',
    groundTruth: 'Student (1908) 원본',
    reference: 'Student (1908). The probable error of a mean'
  },
  {
    name: 'mtcars (Motor Trend)',
    source: 'R datasets',
    purpose: 'relationship',
    dataFile: 'datasets/curated/mtcars.csv',
    expectedMethod: 'pearson-correlation',
    groundTruth: 'Henderson and Velleman (1981)',
    reference: 'Building multiple regression models'
  },
  // ... 17개 추가 교과서 데이터셋
]
```

#### 합성 데이터셋 (50개)

```typescript
// scripts/generate-synthetic-datasets.ts
interface SyntheticConfig {
  purpose: AnalysisPurpose
  groups: number
  sampleSize: number
  distribution: 'normal' | 'skewed' | 'uniform'
  variance: 'equal' | 'unequal'
  effectSize: 'small' | 'medium' | 'large'
}

function generateSyntheticDataset(config: SyntheticConfig): SyntheticTestCase {
  const { purpose, groups, distribution, variance } = config

  // Ground Truth를 생성 시점에 확정
  let expectedMethod: string
  let data: DataRow[]

  if (purpose === 'compare' && groups === 2) {
    if (distribution === 'normal' && variance === 'equal') {
      expectedMethod = 'independent-t-test'
      data = generateNormalData({ groups: 2, variance: 'equal', ...config })
    } else if (distribution === 'skewed') {
      expectedMethod = 'mann-whitney'
      data = generateSkewedData({ groups: 2, ...config })
    } else if (distribution === 'normal' && variance === 'unequal') {
      expectedMethod = 'welch-t'
      data = generateNormalData({ groups: 2, variance: 'unequal', ...config })
    }
  } else if (purpose === 'compare' && groups >= 3) {
    if (distribution === 'normal' && variance === 'equal') {
      expectedMethod = 'one-way-anova'
      data = generateNormalData({ groups, variance: 'equal', ...config })
    } else {
      expectedMethod = 'kruskal-wallis'
      data = generateSkewedData({ groups, ...config })
    }
  }

  return {
    name: `Synthetic ${purpose} (${distribution}, ${variance}, ${groups}g)`,
    data,
    expectedMethod,
    assumptionResults: calculateAssumptions(data), // ✅ 실제 계산
    config
  }
}

// 50개 조합 생성
const syntheticDatasets = [
  // compare: 2-group (10개)
  ...['normal', 'skewed'].flatMap(dist =>
    ['equal', 'unequal'].flatMap(variance =>
      [30, 100].map(n => generateSyntheticDataset({
        purpose: 'compare',
        groups: 2,
        sampleSize: n,
        distribution: dist as any,
        variance: variance as any,
        effectSize: 'medium'
      }))
    )
  ),
  // compare: 3+ groups (10개)
  // relationship (10개)
  // prediction (10개)
  // timeseries (10개)
]
```

#### 통합 검증 스크립트

```typescript
// scripts/validate-accuracy.ts
async function validateAccuracy() {
  let correctCount = 0
  const results: ValidationResult[] = []

  // 1단계: 큐레이션 데이터셋 (20개)
  console.log('\n📚 큐레이션 데이터셋 검증...')
  for (const testCase of curatedDatasets) {
    const data = await loadCSV(testCase.dataFile)
    const validationResults = await validateData(data)
    const assumptionResults = await calculateAssumptions(data)

    const recommendation = DecisionTreeRecommender.recommend(
      testCase.purpose,
      assumptionResults,
      validationResults,
      data
    )

    const isCorrect = recommendation.method.id === testCase.expectedMethod
    if (isCorrect) correctCount++

    results.push({
      category: 'curated',
      testCase: testCase.name,
      expected: testCase.expectedMethod,
      actual: recommendation.method.id,
      confidence: recommendation.confidence,
      isCorrect
    })
  }

  // 2단계: 합성 데이터셋 (50개)
  console.log('\n🔬 합성 데이터셋 검증...')
  for (const testCase of syntheticDatasets) {
    const recommendation = DecisionTreeRecommender.recommend(
      testCase.purpose,
      testCase.assumptionResults,
      testCase.validationResults,
      testCase.data
    )

    const isCorrect = recommendation.method.id === testCase.expectedMethod
    if (isCorrect) correctCount++

    results.push({
      category: 'synthetic',
      testCase: testCase.name,
      expected: testCase.expectedMethod,
      actual: recommendation.method.id,
      confidence: recommendation.confidence,
      isCorrect
    })
  }

  const totalCases = curatedDatasets.length + syntheticDatasets.length
  const accuracy = (correctCount / totalCases) * 100

  console.log(`\n✅ Accuracy: ${accuracy.toFixed(1)}%`)
  console.log(`Correct: ${correctCount}/${totalCases}`)
  console.log(`- Curated: ${results.filter(r => r.category === 'curated' && r.isCorrect).length}/${curatedDatasets.length}`)
  console.log(`- Synthetic: ${results.filter(r => r.category === 'synthetic' && r.isCorrect).length}/${syntheticDatasets.length}`)

  // ✅ 목표 정확도 검증 (85% 이상)
  if (accuracy < 85) {
    console.error('⚠ 정확도 목표 미달 (85% 이상 필요)')
    process.exit(1)
  }

  return { accuracy, results }
}
```

---

## 📅 구현 일정

### Day 1: Phase 4-A (Decision Tree)

**작업 시간**: 5시간 (AI 리뷰 반영으로 1시간 증가)

1. **DecisionTreeRecommender 클래스 작성** (2시간, ✅ 복잡도 증가)
   - [ ] `recommend()` 메인 함수
   - [ ] `recommendForCompare()` (9개 분기, ✅ Paired + Multi-factor 추가)
   - [ ] `recommendForRelationship()` (4개 분기)
   - [ ] `recommendForDistribution()` (1개)
   - [ ] `recommendForPrediction()` (3개 분기)
   - [ ] `recommendForTimeseries()` (2개 분기)
   - [ ] `recommendWithoutAssumptions()` (✅ Null 안전성)

2. **헬퍼 함수 작성** (1.5시간, ✅ 복잡한 케이스 추가)
   - [ ] `findGroupVariable()` - 그룹 변수 탐지
   - [ ] `findMeasureVariable()` - 측정 변수 탐지
   - [ ] `detectVariableRole()` - 변수 역할 자동 탐지
   - [ ] `detectPairedDesign()` - ✅ Paired design 감지
   - [ ] `detectFactors()` - ✅ Multi-factor 감지
   - [ ] `detectGroupCount()` - 그룹 개수 계산

3. **테스트 코드 작성** (1시간)
   - [ ] 20개 단위 테스트 (목적별 4개)
   - [ ] ✅ Paired design 테스트 (2개)
   - [ ] ✅ Multi-factor 테스트 (2개)
   - [ ] Edge case 테스트 (에러 처리)

4. **PurposeInputStep 연결** (0.5시간)
   - [ ] Mock 제거
   - [ ] DecisionTreeRecommender 연결
   - [ ] ✅ Null 체크 추가 (assumptionResults)
   - [ ] 기존 테스트 통과 확인

---

### Day 2: Phase 4-B (Ollama 통합)

**작업 시간**: 4시간 (AI 리뷰 반영으로 1시간 증가)

1. **OllamaRecommender 개선** (2시간, ✅ 캐싱 + 재시도)
   - [ ] 프롬프트 강화 (assumptionResults 포함)
   - [ ] 온도 조정 (0.3 → 0.2)
   - [ ] maxTokens 증가 (500 → 800)
   - [ ] ✅ Health check 캐싱 (5분 TTL)
   - [ ] ✅ 재시도 로직 (2회, 2초 타임아웃)
   - [ ] ✅ AbortController 사용
   - [ ] ✅ 로깅 강화 (성공/실패/캐시)

2. **하이브리드 로직 구현** (1시간)
   - [ ] `analyzeAndRecommend()` 수정
   - [ ] Ollama checkHealth() 통합
   - [ ] 폴백 처리 (Decision Tree)
   - [ ] ✅ Null 체크 통합 (assumptionResults)

3. **Ollama 테스트** (0.5시간)
   - [ ] qwen3:4b 모델 다운로드
   - [ ] 5개 목적별 테스트
   - [ ] 응답 시간 측정
   - [ ] ✅ 캐싱 동작 확인

4. **에러 처리 강화** (0.5시간)
   - [ ] 네트워크 에러 → Decision Tree 폴백
   - [ ] JSON 파싱 에러 → Decision Tree 폴백
   - [ ] ✅ 타임아웃 에러 처리
   - [ ] 로깅 추가

---

### Day 3: Phase 4-C (정확도 검증)

**작업 시간**: 3시간 (AI 리뷰 반영으로 1시간 증가)

1. **큐레이션 데이터셋 수집** (1시간, ✅ 교과서 예제)
   - [ ] ✅ sklearn.datasets에서 20개 수집 (Fisher Iris, Boston Housing 등)
   - [ ] ✅ R datasets에서 추가 (sleep, mtcars 등)
   - [ ] Ground Truth 문서화 (출처, 논문 레퍼런스)
   - [ ] CSV 파일 정제

2. **합성 데이터 생성 스크립트** (1시간, ✅ 새로 추가)
   - [ ] ✅ `scripts/generate-synthetic-datasets.ts` 작성
   - [ ] 50개 조합 생성 (normal/skewed × equal/unequal × 5 purposes)
   - [ ] Ground Truth 자동 확정
   - [ ] assumptionResults 실제 계산

3. **정확도 측정 스크립트** (0.5시간)
   - [ ] `scripts/validate-accuracy.ts` 작성
   - [ ] ✅ 20개 큐레이션 + 50개 합성 = 70개 테스트
   - [ ] 결과 리포트 생성 (category별 분리)

4. **규칙 보정** (0.5시간)
   - [ ] ✅ 85% 미달 시 Decision Tree 규칙 수정
   - [ ] 재측정 (목표: 85% 이상)

5. **문서화** (0.5시간)
   - [ ] SMART_FLOW_UX_REDESIGN.md 업데이트
   - [ ] Phase 4 완료 상태 기록

---

## ⚠️ 위험 요소 및 대응

### 위험 1: 정확도 목표 미달 (85% 미만)

**원인**:
- Decision Tree 규칙이 불충분
- Edge case 미처리
- Paired design, Multi-factor 케이스 처리 실패

**대응**:
1. ✅ **단계별 검증**: 각 목적별로 정확도 측정
2. ✅ **규칙 추가**: 정확도 낮은 목적에 분기 추가
3. ✅ **복잡한 케이스**: Paired design, Multi-factor 감지 로직 추가
4. ✅ **Ollama 우선**: Ollama 사용 가능 시 LLM 사용 (95% 정확도)
5. ✅ **안전 마진**: 85% 목표 (실제 88-89% 예상)

---

### 위험 2: Ollama 설치 실패

**원인**:
- 사용자가 Ollama를 설치하지 않음
- 네트워크 에러

**대응**:
1. ✅ **Decision Tree 폴백**: 항상 동작 (90% 정확도)
2. ✅ **명확한 안내**: Ollama 설치 가이드 제공
3. ✅ **선택 사항**: Ollama는 선택 사항 (필수 아님)

---

### 위험 3: Zustand Store 데이터 부족 (✅ AI 리뷰 반영)

**원인**:
- assumptionResults가 null인 경우 (Step 2 건너뜀)
- validationResults가 불완전

**대응** (AI 리뷰 반영):
1. ✅ **Null 체크**: 모든 함수에서 null 체크 추가 (Non-null assertion 제거)
2. ✅ **기본 추천 함수**: `recommendWithoutAssumptions()` 추가 (비모수 검정 우선)
3. ✅ **신뢰도 낮춤**: assumptionResults 없으면 confidence 0.70 (낮은 신뢰도)
4. ✅ **에러 메시지**: 사용자에게 명확한 경고 메시지 ("통계적 가정 검정 미수행")

---

### 위험 4: 테스트 시간 초과 (✅ AI 리뷰 반영)

**원인**:
- ~~100개 데이터셋 검증 시간 (예상 30분)~~ → 70개로 축소
- 큐레이션 데이터셋 수집 시간

**대응** (AI 리뷰 반영):
1. ✅ **데이터셋 축소**: 100개 → 70개 (20 큐레이션 + 50 합성)
2. ✅ **합성 데이터**: 50개는 코드로 자동 생성 (수집 불필요)
3. ✅ **병렬 실행**: Jest 병렬 테스트 활용
4. ✅ **단계별 실행**: 큐레이션 먼저 → 합성 나중에
5. ✅ **예상 시간**: 큐레이션 5분 + 합성 2분 = 총 7분

---

## 📊 예상 결과

### 최종 정확도 (AI 리뷰 반영)

| 방식 | 정확도 | 속도 | 오프라인 | 비용 | Null 안전성 |
|------|--------|------|---------|------|------------|
| **Decision Tree** | **85-89%** | 즉시 | ✅ | 무료 | ✅ |
| **Ollama LLM** | 95% | 2~5초 | ✅ | 무료 | ✅ |
| **하이브리드** | **95%** | 즉시~5초 | ✅ | 무료 | ✅ |

**개선 사항**:
- ✅ Paired design, Multi-factor ANOVA 지원 (커버리지 ↑)
- ✅ Null 체크 추가 (assumptionResults 없어도 동작)
- ✅ Ollama health check 캐싱 (5분 TTL, 성능 ↑)
- ✅ 재시도 로직 (2회, 안정성 ↑)
- ✅ 검증 데이터셋 현실화 (20 큐레이션 + 50 합성)

### 사용자 경험

1. **로컬 개발자** (Ollama 설치)
   - Ollama LLM 사용
   - 정확도 95%, 응답 2~5초
   - 복잡한 케이스도 정확히 추천

2. **Vercel 배포 사용자**
   - Decision Tree 사용
   - 정확도 85-89%, 즉시 응답
   - 빠른 분석 가능
   - ✅ assumptionResults 없어도 동작

3. **폐쇄망 사용자**
   - Decision Tree 사용
   - 정확도 85-89%, 완전 오프라인
   - 인터넷 없이 동작
   - ✅ Paired design, Multi-factor 자동 감지

---

## ✅ 점검 체크리스트

### Phase 4-A (Decision Tree) (AI 리뷰 반영)
- [ ] DecisionTreeRecommender 클래스 구현
- [ ] 5개 목적별 추천 로직 (**19개 규칙**, ✅ Paired + Multi-factor 추가)
- [ ] 헬퍼 함수 (findGroupVariable, findMeasureVariable, ✅ detectPairedDesign, ✅ detectFactors)
- [ ] ✅ `recommendWithoutAssumptions()` 함수 (Null 안전성)
- [ ] 24개 단위 테스트 작성 (기존 20 + Paired 2 + Multi-factor 2)
- [ ] PurposeInputStep 연결 (✅ Null 체크 추가)
- [ ] TypeScript 컴파일 0 에러
- [ ] 기존 테스트 통과 (61/61)

### Phase 4-B (Ollama 통합) (AI 리뷰 반영)
- [ ] OllamaRecommender 프롬프트 개선
- [ ] ✅ Health check 캐싱 (5분 TTL)
- [ ] ✅ 재시도 로직 (2회, 2초 타임아웃)
- [ ] ✅ AbortController 사용
- [ ] 하이브리드 로직 구현 (✅ Null 체크 통합)
- [ ] Ollama checkHealth() 통합
- [ ] 폴백 처리 (Decision Tree)
- [ ] qwen3:4b 모델 테스트
- [ ] 에러 처리 강화 (타임아웃, 네트워크)

### Phase 4-C (정확도 검증) (AI 리뷰 반영)
- [ ] ✅ 20개 큐레이션 데이터셋 수집 (sklearn, R datasets)
- [ ] ✅ 50개 합성 데이터셋 생성 (코드 자동 생성)
- [ ] validate-accuracy.ts 스크립트 (큐레이션 + 합성)
- [ ] 정확도 측정 (목표: **85% 이상**, 예상: 88-89%)
- [ ] 규칙 보정 (필요 시)
- [ ] 문서화 (SMART_FLOW_UX_REDESIGN.md)

---

## 📝 문서 업데이트

완료 시 다음 문서 업데이트:
1. **SMART_FLOW_UX_REDESIGN.md** - Phase 4 완료 상태
2. **STATUS.md** - Phase 4 완료 기록
3. **dailywork.md** - 작업 일지
4. **CLAUDE.md** - Phase 4 완료 (현재 작업 상태 업데이트)

---

## 📌 변경 이력

### v1.1 (2025-11-21) - AI 리뷰 반영

**주요 변경 사항**:
1. **정확도 목표**: 90% → 85% (안전 마진 4%, 실제 예상 88-89%)
2. **Decision Tree 규칙**: 17개 → 19개 (Paired design + Multi-factor 추가)
3. **검증 데이터셋**: 100 Kaggle → 20 큐레이션 + 50 합성
4. **Null 안전성**: assumptionResults null 체크 + recommendWithoutAssumptions() 추가
5. **Ollama 개선**: Health check 캐싱 (5분 TTL) + 재시도 로직 (2회, 2초 타임아웃)

**예상 작업 시간 변경**:
- Day 1: 4시간 → 5시간 (복잡한 케이스 추가)
- Day 2: 3시간 → 4시간 (캐싱 + 재시도 로직)
- Day 3: 2시간 → 3시간 (합성 데이터 생성)
- **총 합계**: 9시간 → 12시간

**리뷰어**: External AI System
**반영 날짜**: 2025-11-21

### v1.0 (2025-11-21) - 초기 계획

**최초 작성**: 2025-11-21

---

**최종 검토일**: 2025-11-21 (v1.1 AI 리뷰 반영)
**승인 상태**: ✅ AI 리뷰 통과, 사용자 확인 완료
