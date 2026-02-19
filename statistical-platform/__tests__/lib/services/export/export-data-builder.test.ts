/**
 * export-data-builder 테스트
 *
 * buildExportData: ExportContext → NormalizedExportData 변환 검증
 * buildFileName: 파일명 생성 검증
 */

import { buildExportData, buildFileName, splitInterpretation } from '@/lib/services/export/export-data-builder'
import type { ExportContext } from '@/lib/services/export/export-types'
import type { AnalysisResult } from '@/types/smart-flow'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

// ─── 테스트 픽스처 ───

function makeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 'independent-t-test',
    statistic: 2.456,
    pValue: 0.018,
    df: 58,
    interpretation: '두 집단 간 유의한 차이가 있습니다.',
    effectSize: { value: 0.65, type: 'cohensD' },
    confidence: { lower: 0.12, upper: 1.88, level: 0.95 },
    ...overrides,
  }
}

function makeStatisticalResult(overrides: Partial<StatisticalResult> = {}): StatisticalResult {
  return {
    testName: 'Independent t-test',
    statisticName: 't',
    statistic: 2.456,
    pValue: 0.018,
    ...overrides,
  }
}

function makeContext(overrides: Partial<ExportContext> = {}): ExportContext {
  return {
    analysisResult: makeAnalysisResult(),
    statisticalResult: makeStatisticalResult(),
    aiInterpretation: null,
    apaFormat: null,
    dataInfo: null,
    ...overrides,
  }
}

// ─── buildExportData 기본 동작 ───

describe('buildExportData', () => {
  it('기본 결과를 정규화한다', () => {
    const data = buildExportData(makeContext())

    expect(data.title).toBe('independent-t-test Analysis Report')
    expect(data.method).toBe('independent-t-test')
    expect(data.date).toBeTruthy()

    // mainResults: statistic, df, p-value, effectSize, CI
    expect(data.mainResults.length).toBeGreaterThanOrEqual(3)
    expect(data.mainResults[0]).toEqual({ label: 't', value: '2.4560' })
    expect(data.mainResults[1]).toEqual({ label: 'df', value: '58' })
    expect(data.mainResults[2]).toEqual({ label: 'p-value', value: '0.0180' })
  })

  it('효과크기를 추출한다 (EffectSizeInfo 객체)', () => {
    const data = buildExportData(makeContext())

    expect(data.effectSize).not.toBeNull()
    expect(data.effectSize!.value).toBe('0.6500')
    expect(data.effectSize!.type).toBe('cohensD')
    expect(data.effectSize!.interpretation).toBe('Large')
  })

  it('효과크기를 추출한다 (단순 숫자)', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({ effectSize: 0.85 }),
    })
    const data = buildExportData(ctx)

    expect(data.effectSize).not.toBeNull()
    expect(data.effectSize!.value).toBe('0.8500')
    expect(data.effectSize!.interpretation).toBe('Very Large')
  })

  it('효과크기 없으면 null', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({ effectSize: undefined }),
    })
    const data = buildExportData(ctx)
    expect(data.effectSize).toBeNull()
  })

  it('신뢰구간을 추출한다', () => {
    const data = buildExportData(makeContext())

    expect(data.confidenceInterval).not.toBeNull()
    expect(data.confidenceInterval!.lower).toBe('0.1200')
    expect(data.confidenceInterval!.upper).toBe('1.8800')
    expect(data.confidenceInterval!.level).toBe('95%')

    // mainResults에도 CI 포함
    const ciRow = data.mainResults.find(r => r.label.includes('CI'))
    expect(ciRow).toBeTruthy()
    expect(ciRow!.value).toBe('[0.1200, 1.8800]')
  })

  it('신뢰구간 level 미제공 시 95% 기본값', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        confidence: { lower: 1, upper: 5, level: undefined },
      }),
    })
    const data = buildExportData(ctx)
    expect(data.confidenceInterval!.level).toBe('95%')
  })

  it('df가 배열이면 join', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({ df: [2, 57] as unknown as number }),
    })
    const data = buildExportData(ctx)
    const dfRow = data.mainResults.find(r => r.label === 'df')
    expect(dfRow!.value).toBe('2, 57')
  })

  it('df 없으면 mainResults에 df행 없음', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({ df: undefined }),
    })
    const data = buildExportData(ctx)
    expect(data.mainResults.find(r => r.label === 'df')).toBeUndefined()
  })

  it('p-value < 0.001 포맷', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({ pValue: 0.00001 }),
    })
    const data = buildExportData(ctx)
    const pRow = data.mainResults.find(r => r.label === 'p-value')
    expect(pRow!.value).toBe('< .001')
  })

  it('interpretation undefined → 빈 문자열 fallback', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({ interpretation: undefined as unknown as string }),
    })
    const data = buildExportData(ctx)
    expect(data.interpretation).toBe('')
  })
})

// ─── APA / AI 해석 ───

describe('buildExportData - APA & AI', () => {
  it('APA 형식 전달', () => {
    const ctx = makeContext({ apaFormat: 't(58) = 2.46, p = .018' })
    const data = buildExportData(ctx)
    expect(data.apaString).toBe('t(58) = 2.46, p = .018')
  })

  it('AI 해석 분리 (요약 + 상세)', () => {
    const aiText = '### 한줄 요약\n분석 요약입니다.\n\n### 상세 해석\n상세 내용입니다.'
    const ctx = makeContext({ aiInterpretation: aiText })
    const data = buildExportData(ctx)

    expect(data.aiInterpretation).not.toBeNull()
    expect(data.aiInterpretation!.summary).toBe('분석 요약입니다.')
    expect(data.aiInterpretation!.detail).toContain('상세 내용입니다.')
  })

  it('AI 해석 null이면 null', () => {
    const data = buildExportData(makeContext())
    expect(data.aiInterpretation).toBeNull()
  })
})

// ─── 가정 검정 / 사후검정 / 집단통계 / 회귀계수 ───

describe('buildExportData - 상세 테이블', () => {
  it('가정 검정 배열 처리', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        assumptions: [
          { name: 'Shapiro-Wilk', passed: true, testStatistic: 0.98, pValue: 0.45 },
          { name: 'Levene', passed: false, testStatistic: 5.12, pValue: 0.028 },
        ] as unknown as AnalysisResult['assumptions'],
      }),
    })
    const data = buildExportData(ctx)

    expect(data.assumptions).toHaveLength(2)
    expect(data.assumptions[0].name).toBe('Shapiro-Wilk')
    expect(data.assumptions[0].passed).toBe(true)
    expect(data.assumptions[0].statistic).toBe('0.980')
    expect(data.assumptions[1].passed).toBe(false)
  })

  it('사후검정 처리', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        postHoc: [
          { group1: 'A', group2: 'B', meanDiff: 1.5, pvalue: 0.003, significant: true },
          { group1: 'A', group2: 'C', meanDiff: 0.3, pvalue: 0.65, significant: false },
        ],
      }),
    })
    const data = buildExportData(ctx)

    expect(data.postHocResults).toHaveLength(2)
    expect(data.postHocResults![0].comparison).toBe('A vs B')
    expect(data.postHocResults![0].significant).toBe(true)
    expect(data.postHocResults![1].significant).toBe(false)
  })

  it('사후검정 없으면 null', () => {
    const data = buildExportData(makeContext())
    expect(data.postHocResults).toBeNull()
  })

  it('집단통계 처리', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        groupStats: [
          { name: '실험군', n: 30, mean: 75.2, std: 12.4 },
          { name: '대조군', n: 30, mean: 68.1, std: 11.8 },
        ],
      }),
    })
    const data = buildExportData(ctx)

    expect(data.groupStats).toHaveLength(2)
    expect(data.groupStats![0].name).toBe('실험군')
    expect(data.groupStats![0].n).toBe(30)
    expect(data.groupStats![0].mean).toBe('75.200')
  })

  it('회귀계수 처리', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        coefficients: [
          { name: '(Intercept)', value: 3.21, stdError: 0.45, tValue: 7.13, pvalue: 0.0001 },
          { name: 'x1', value: 1.05, stdError: 0.22, tValue: 4.77, pvalue: 0.001 },
        ],
      }),
    })
    const data = buildExportData(ctx)

    expect(data.coefficients).toHaveLength(2)
    expect(data.coefficients![0].name).toBe('(Intercept)')
    expect(data.coefficients![0].pValue).toBe('< .001')
  })

  it('추가 지표 (rSquared, rmse 등)', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        additional: {
          rSquared: 0.782,
          adjustedRSquared: 0.765,
          rmse: 4.32,
        },
      }),
    })
    const data = buildExportData(ctx)

    expect(data.additionalMetrics.length).toBe(3)
    expect(data.additionalMetrics[0]).toEqual({ label: 'R²', value: '0.7820' })
    expect(data.additionalMetrics[1]).toEqual({ label: 'Adj R²', value: '0.7650' })
    expect(data.additionalMetrics[2]).toEqual({ label: 'RMSE', value: '4.3200' })
  })

  it('추가 지표 없으면 빈 배열', () => {
    const data = buildExportData(makeContext())
    expect(data.additionalMetrics).toEqual([])
  })
})

// ─── dataInfo ───

describe('buildExportData - dataInfo', () => {
  it('데이터 정보 정규화', () => {
    const ctx = makeContext({
      dataInfo: {
        fileName: 'sample.csv',
        totalRows: 100,
        columnCount: 5,
        variables: ['a', 'b', 'c', 'd', 'e'],
      },
    })
    const data = buildExportData(ctx)

    expect(data.dataInfo).toEqual({
      fileName: 'sample.csv',
      rows: 100,
      columns: 5,
    })
  })

  it('fileName null → "unknown"', () => {
    const ctx = makeContext({
      dataInfo: { fileName: null, totalRows: 50, columnCount: 3, variables: ['x', 'y', 'z'] },
    })
    const data = buildExportData(ctx)
    expect(data.dataInfo!.fileName).toBe('unknown')
  })

  it('dataInfo null → null', () => {
    const data = buildExportData(makeContext())
    expect(data.dataInfo).toBeNull()
  })
})

describe('buildExportData - exportOptions', () => {
  it('includeInterpretation=false 이면 해석/AI 해석을 제외한다', () => {
    const ctx = makeContext({
      aiInterpretation: '### 한줄 요약\n요약 텍스트',
      exportOptions: {
        includeInterpretation: false,
      },
    })
    const data = buildExportData(ctx)
    expect(data.interpretation).toBe('')
    expect(data.aiInterpretation).toBeNull()
  })

  it('includeMethodology/includeReferences=true 이면 섹션을 생성한다', () => {
    const ctx = makeContext({
      exportOptions: {
        includeMethodology: true,
        includeReferences: true,
      },
    })
    const data = buildExportData(ctx)
    expect(data.methodology).toBeTruthy()
    expect(data.references && data.references.length > 0).toBe(true)
  })

  it('includeRawData=true 이고 rawDataRows가 있으면 미리보기를 생성한다', () => {
    const ctx = makeContext({
      exportOptions: {
        includeRawData: true,
      },
      rawDataRows: [
        { group: 'A', score: 10 },
        { group: 'B', score: 15 },
      ],
    })
    const data = buildExportData(ctx)
    expect(data.rawData).not.toBeNull()
    expect(data.rawData!.columns).toEqual(['group', 'score'])
    expect(data.rawData!.rows).toHaveLength(2)
  })
})

// ─── omega squared (ANOVA) ───

describe('buildExportData - ANOVA 특수 필드', () => {
  it('omegaSquared mainResults에 포함', () => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        omegaSquared: { value: 0.15, type: 'omegaSquared' },
      }),
    })
    const data = buildExportData(ctx)
    const omegaRow = data.mainResults.find(r => r.label === 'ω²')
    expect(omegaRow).toBeTruthy()
    expect(omegaRow!.value).toBe('0.1500')
  })
})

// ─── buildFileName ───

describe('buildFileName', () => {
  it('기본 파일명 형식', () => {
    const name = buildFileName('t-test', 'docx')
    // t-test_분석결과_YYYYMMDD.docx
    expect(name).toMatch(/^t-test_분석결과_\d{8}\.docx$/)
  })

  it('특수문자 치환', () => {
    const name = buildFileName('a/b\\c?d*e', 'xlsx')
    expect(name).not.toMatch(/[/\\?*]/)
    expect(name).toContain('a_b_c_d_e')
  })

  it('xlsx 확장자', () => {
    const name = buildFileName('chi-square', 'xlsx')
    expect(name).toMatch(/\.xlsx$/)
  })
})

// ─── 효과크기 해석 경계값 ───

describe('buildExportData - 효과크기 해석 경계값', () => {
  const testEffectSize = (value: number, type: string, expected: string) => {
    const ctx = makeContext({
      analysisResult: makeAnalysisResult({
        effectSize: { value, type },
      }),
    })
    return buildExportData(ctx).effectSize!.interpretation
  }

  it('Cohen d: Small (< 0.2)', () => {
    expect(testEffectSize(0.15, 'cohensD', 'Small')).toBe('Small')
  })

  it('Cohen d: Medium (0.2-0.5)', () => {
    expect(testEffectSize(0.35, 'cohensD', 'Medium')).toBe('Medium')
  })

  it('Cohen d: Large (0.5-0.8)', () => {
    expect(testEffectSize(0.65, 'cohensD', 'Large')).toBe('Large')
  })

  it('Cohen d: Very Large (>= 0.8)', () => {
    expect(testEffectSize(0.95, 'cohensD', 'Very Large')).toBe('Very Large')
  })

  it('Eta squared: Small (< 0.01)', () => {
    expect(testEffectSize(0.005, 'etaSquared', 'Small')).toBe('Small')
  })

  it('Eta squared: Medium (0.01-0.06)', () => {
    expect(testEffectSize(0.04, 'etaSquared', 'Medium')).toBe('Medium')
  })

  it('Eta squared: Large (0.06-0.14)', () => {
    expect(testEffectSize(0.10, 'etaSquared', 'Large')).toBe('Large')
  })

  it('Eta squared: Very Large (>= 0.14)', () => {
    expect(testEffectSize(0.20, 'etaSquared', 'Very Large')).toBe('Very Large')
  })
})
