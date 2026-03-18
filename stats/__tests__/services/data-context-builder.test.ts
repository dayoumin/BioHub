/**
 * data-context-builder 단위 테스트
 *
 * LLM 프롬프트 품질에 직접 영향을 주는 순수 함수 검증.
 * - null 입력 처리
 * - 컬럼 타입별 포맷
 * - PII 필터 (ID 컬럼 topCategories 제외)
 * - 20개 컬럼 초과 시 생략
 * - 정규성 검정 결과 포함 여부
 * - buildContextForIntent track별 라우팅
 */

import { describe, it, expect } from 'vitest'
import {
  buildDataContextMarkdown,
  buildAssumptionContextMarkdown,
  buildVisualizationContext,
  buildConsultationContext,
  buildContextForIntent,
} from '@/lib/services/ai/data-context-builder'
import type { ValidationResults, ColumnStatistics, StatisticalAssumptions } from '@/types/analysis'

// ===== Helpers =====

function makeValidation(overrides: Partial<ValidationResults> = {}): ValidationResults {
  return {
    isValid: true,
    totalRows: 100,
    columnCount: 2,
    missingValues: 0,
    dataType: 'tabular',
    variables: [],
    errors: [],
    warnings: [],
    columns: [],
    ...overrides,
  }
}

function makeNumericCol(name: string, overrides: Partial<ColumnStatistics> = {}): ColumnStatistics {
  return {
    name,
    type: 'numeric',
    numericCount: 100,
    textCount: 0,
    missingCount: 0,
    uniqueValues: 50,
    ...overrides,
  }
}

function makeCategoricalCol(name: string, overrides: Partial<ColumnStatistics> = {}): ColumnStatistics {
  return {
    name,
    type: 'categorical',
    numericCount: 0,
    textCount: 100,
    missingCount: 0,
    uniqueValues: 3,
    ...overrides,
  }
}

// ===== buildDataContextMarkdown =====

describe('buildDataContextMarkdown', () => {
  it('null 입력 시 업로드 안 됨 메시지 반환', () => {
    const result = buildDataContextMarkdown(null)
    expect(result).toContain('데이터가 업로드되지 않았습니다')
    expect(result).not.toContain('데이터 요약')
  })

  it('행/열 수를 정확히 포함한다', () => {
    const result = buildDataContextMarkdown(
      makeValidation({ totalRows: 200, columns: [makeNumericCol('score')] })
    )
    expect(result).toContain('200행')
    expect(result).toContain('1열')
  })

  it('수치형/범주형 컬럼 수와 이름을 포함한다', () => {
    const result = buildDataContextMarkdown(makeValidation({
      columns: [makeNumericCol('weight'), makeNumericCol('height'), makeCategoricalCol('group')],
    }))
    expect(result).toContain('수치형 변수 (2개)')
    expect(result).toContain('weight')
    expect(result).toContain('height')
    expect(result).toContain('범주형 변수 (1개)')
    expect(result).toContain('group')
  })

  it('수치형 컬럼 통계 (mean, std, 범위) 포함', () => {
    const result = buildDataContextMarkdown(makeValidation({
      columns: [makeNumericCol('score', { mean: 75.5, std: 12.3, min: 40, max: 100 })],
    }))
    expect(result).toContain('평균: 75.50')
    expect(result).toContain('표준편차: 12.30')
    expect(result).toContain('범위: 40.00 ~ 100.00')
  })

  it('정규성 검정 결과 포함 — 정규분포', () => {
    const result = buildDataContextMarkdown(makeValidation({
      columns: [makeNumericCol('score', {
        normality: { statistic: 0.97, pValue: 0.23, isNormal: true, testName: 'shapiro-wilk' },
      })],
    }))
    expect(result).toContain('정규성(shapiro-wilk)')
    expect(result).toContain('p=0.2300')
    expect(result).toContain('정규분포')
    expect(result).not.toContain('비정규분포')
  })

  it('정규성 검정 결과 포함 — 비정규분포', () => {
    const result = buildDataContextMarkdown(makeValidation({
      columns: [makeNumericCol('score', {
        normality: { statistic: 0.85, pValue: 0.01, isNormal: false, testName: 'shapiro-wilk' },
      })],
    }))
    expect(result).toContain('비정규분포')
    expect(result).not.toContain('→ 정규분포')
  })

  it('범주형 컬럼 topCategories 포함', () => {
    const result = buildDataContextMarkdown(makeValidation({
      columns: [makeCategoricalCol('group', {
        topCategories: [{ value: 'A', count: 50 }, { value: 'B', count: 30 }],
      })],
    }))
    expect(result).toContain('A(50)')
    expect(result).toContain('B(30)')
  })

  it('PII 필터 — ID 컬럼의 topCategories는 제외', () => {
    const result = buildDataContextMarkdown(makeValidation({
      columns: [makeCategoricalCol('user_id', {
        topCategories: [{ value: 'user_001', count: 1 }, { value: 'user_002', count: 1 }],
        idDetection: { isId: true, confidence: 0.99, reason: 'unique ratio high', source: 'value' as const },
      })],
    }))
    expect(result).not.toContain('user_001')
    expect(result).not.toContain('user_002')
    // 컬럼 자체는 포함
    expect(result).toContain('user_id')
  })

  it('20개 초과 컬럼은 생략 메시지 추가', () => {
    const cols = Array.from({ length: 25 }, (_, i) => makeNumericCol(`col_${i}`))
    const result = buildDataContextMarkdown(makeValidation({ columns: cols }))
    expect(result).toContain('외 5개 변수 생략')
    // 20번째는 포함, 21번째는 미포함
    expect(result).toContain('col_19')
    expect(result).not.toContain('col_20')
  })

  it('수치형 11개 이상 시 "외 N개" 표시', () => {
    const cols = Array.from({ length: 12 }, (_, i) => makeNumericCol(`num_${i}`))
    const result = buildDataContextMarkdown(makeValidation({ columns: cols }))
    expect(result).toContain('외 2개')
  })
})

// ===== buildAssumptionContextMarkdown =====

describe('buildAssumptionContextMarkdown', () => {
  it('null 입력 시 미실시 메시지 반환', () => {
    const result = buildAssumptionContextMarkdown(null)
    expect(result).toContain('가정 검정 미실시')
  })

  it('정규성 + 등분산성 결과 포함', () => {
    const assumptions: StatisticalAssumptions = {
      normality: { shapiroWilk: { statistic: 0.97, pValue: 0.23, isNormal: true } },
      homogeneity: { levene: { statistic: 1.2, pValue: 0.15, equalVariance: true } },
    }
    const result = buildAssumptionContextMarkdown(assumptions)
    expect(result).toContain('정규성: 충족')
    expect(result).toContain('p=0.230')
    expect(result).toContain('등분산성: 충족')
    expect(result).toContain('p=0.150')
  })

  it('정규성 미충족', () => {
    const assumptions: StatisticalAssumptions = {
      normality: { shapiroWilk: { statistic: 0.85, pValue: 0.01, isNormal: false } },
    }
    const result = buildAssumptionContextMarkdown(assumptions)
    expect(result).toContain('정규성: 미충족')
    expect(result).not.toContain('정규성: 충족')
  })

  it('가정 검정 결과가 없으면 "결과 없음" 반환', () => {
    const result = buildAssumptionContextMarkdown({})
    expect(result).toContain('가정 검정 결과 없음')
  })
})

// ===== buildVisualizationContext =====

describe('buildVisualizationContext', () => {
  it('null 입력 시 업로드 안 됨 메시지 반환', () => {
    expect(buildVisualizationContext(null)).toContain('데이터가 업로드되지 않았습니다')
  })

  it('시각화 헤더와 변수별 정보 포함', () => {
    const result = buildVisualizationContext(makeValidation({
      columns: [
        makeNumericCol('score', { min: 0, max: 100 }),
        makeCategoricalCol('group'),
      ],
    }))
    expect(result).toContain('시각화 데이터 요약')
    expect(result).toContain('score: 수치형')
    expect(result).toContain('범위 0.0~100.0')
    expect(result).toContain('group: 범주형')
  })
})

// ===== buildConsultationContext =====

describe('buildConsultationContext', () => {
  it('null 입력 시 업로드 안 됨 메시지 반환', () => {
    expect(buildConsultationContext(null)).toContain('데이터가 업로드되지 않았습니다')
  })

  it('행수 + 컬럼명(타입) 포함, 상세 통계 없음', () => {
    const result = buildConsultationContext(makeValidation({
      totalRows: 50,
      columns: [makeNumericCol('age'), makeCategoricalCol('sex')],
    }))
    expect(result).toContain('50행')
    expect(result).toContain('age(numeric)')
    expect(result).toContain('sex(categorical)')
    // 상세 통계는 없어야 함 (경량 컨텍스트)
    expect(result).not.toContain('평균')
    expect(result).not.toContain('표준편차')
  })
})

// ===== buildContextForIntent =====

describe('buildContextForIntent', () => {
  const validation = makeValidation({
    columns: [makeNumericCol('score'), makeCategoricalCol('group')],
  })

  it('direct-analysis → buildDataContextMarkdown (상세 통계)', () => {
    const result = buildContextForIntent('direct-analysis', validation)
    expect(result).toContain('데이터 요약')
    expect(result).toContain('변수 상세 통계')
  })

  it('data-consultation → buildDataContextMarkdown (상세 통계)', () => {
    const result = buildContextForIntent('data-consultation', validation)
    expect(result).toContain('데이터 요약')
  })

  it('visualization → buildVisualizationContext (시각화 포맷)', () => {
    const result = buildContextForIntent('visualization', validation)
    expect(result).toContain('시각화 데이터 요약')
    expect(result).not.toContain('변수 상세 통계')
  })

  it('experiment-design → buildConsultationContext (경량)', () => {
    const result = buildContextForIntent('experiment-design', validation)
    expect(result).toContain('데이터 개요')
    expect(result).not.toContain('변수 상세 통계')
  })

  it('null 데이터는 모든 track에서 안내 메시지 반환', () => {
    const tracks = ['direct-analysis', 'data-consultation', 'visualization', 'experiment-design'] as const
    for (const track of tracks) {
      expect(buildContextForIntent(track, null)).toContain('데이터가 업로드되지 않았습니다')
    }
  })
})
