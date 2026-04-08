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
  buildDiagnosticReportMarkdown,
  buildVisualizationContext,
  buildConsultationContext,
  buildContextForIntent,
} from '@/lib/services/ai/data-context-builder'
import type { ValidationResults, ColumnStatistics, StatisticalAssumptions, DiagnosticReport } from '@/types/analysis'

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

// ===== 넓은 스키마 토큰 제한 테스트 =====

describe('넓은 스키마 (25열) 토큰 제한', () => {
  const wideCols = Array.from({ length: 25 }, (_, i) =>
    i % 2 === 0
      ? makeNumericCol(`num_${i}`, { min: 0, max: 100 })
      : makeCategoricalCol(`cat_${i}`)
  )
  const wideValidation = makeValidation({ totalRows: 500, columns: wideCols })

  it('buildVisualizationContext: 상세 정보 10개 제한, 나머지 생략', () => {
    const result = buildVisualizationContext(wideValidation)
    // 처음 10개 컬럼만 상세 정보 포함
    expect(result).toContain('num_0: 수치형')
    expect(result).toContain('cat_9: 범주형')
    // 11번째부터는 상세 없음
    expect(result).not.toContain('num_10: 수치형')
    expect(result).not.toContain('cat_11:')
  })

  it('buildVisualizationContext: 컬럼명 나열 10개 제한 + "외" 표시', () => {
    const result = buildVisualizationContext(wideValidation)
    // 13개 수치형 중 10개만 이름 나열
    expect(result).toContain('외')
  })

  it('buildConsultationContext: 15개 컬럼까지만 표시 + "외" 표시', () => {
    const result = buildConsultationContext(wideValidation)
    // 25개 중 15개만 표시
    expect(result).toContain('외 10개')
    // 16번째 컬럼은 미포함
    expect(result).not.toContain('num_16')
  })

  it('buildDataContextMarkdown: 기존 20개 제한 유지', () => {
    const result = buildDataContextMarkdown(wideValidation)
    expect(result).toContain('num_0 (수치형)')
    expect(result).toContain('외 5개 변수 생략')
  })
})

// ===== buildDiagnosticReportMarkdown =====

describe('buildDiagnosticReportMarkdown', () => {
  const fullReport: DiagnosticReport = {
    uploadNonce: 1,
    basicStats: {
      totalRows: 120,
      groups: [{ name: 'A', count: 40 }, { name: 'B', count: 40 }, { name: 'C', count: 40 }],
      numericSummaries: [
        { column: '생산량', mean: 45.2, std: 12.3, min: 10, max: 80 },
      ],
    },
    assumptions: {
      normality: {
        groups: [
          { groupName: 'A', statistic: 0.98, pValue: 0.45, passed: true },
          { groupName: 'B', statistic: 0.95, pValue: 0.12, passed: true },
        ],
        overallPassed: true,
        testMethod: 'shapiro-wilk',
      },
      homogeneity: { levene: { statistic: 1.23, pValue: 0.34, equalVariance: true } },
    },
    variableAssignments: { dependent: ['생산량'], factor: ['사료종류'] },
    pendingClarification: null,
  }

  it('기초통계를 포함한다', () => {
    const md = buildDiagnosticReportMarkdown(fullReport)
    expect(md).toContain('120행')
    expect(md).toContain('A(n=40)')
    expect(md).toContain('M=45.20')
  })

  it('모든 그룹의 정규성 결과를 표시한다', () => {
    const md = buildDiagnosticReportMarkdown(fullReport)
    expect(md).toContain('shapiro-wilk')
    expect(md).toContain('A: p=0.4500')
    expect(md).toContain('B: p=0.1200')
    expect(md).toContain('충족')
  })

  it('등분산 결과를 표시한다', () => {
    const md = buildDiagnosticReportMarkdown(fullReport)
    expect(md).toContain('Levene')
    expect(md).toContain('0.3400')
    expect(md).toContain('충족')
  })

  it('변수 역할을 표시한다', () => {
    const md = buildDiagnosticReportMarkdown(fullReport)
    expect(md).toContain('종속변수: 생산량')
    expect(md).toContain('그룹변수: 사료종류')
  })

  it('assumptions가 null이면 가정 검정 섹션 없음', () => {
    const noAssumptions: DiagnosticReport = { ...fullReport, assumptions: null }
    const md = buildDiagnosticReportMarkdown(noAssumptions)
    expect(md).not.toContain('가정 검정 결과')
    expect(md).toContain('120행') // 기초통계는 있음
  })

  it('variableAssignments가 null이면 변수 역할 섹션 없음', () => {
    const noVars: DiagnosticReport = { ...fullReport, variableAssignments: null }
    const md = buildDiagnosticReportMarkdown(noVars)
    expect(md).not.toContain('탐지된 변수 역할')
  })

  it('homogeneity가 null이면 등분산 섹션 없음', () => {
    const noHomogeneity: DiagnosticReport = {
      ...fullReport,
      assumptions: { ...fullReport.assumptions!, homogeneity: null },
    }
    const md = buildDiagnosticReportMarkdown(noHomogeneity)
    expect(md).toContain('shapiro-wilk') // 정규성은 있음
    expect(md).not.toContain('Levene')
  })
})
