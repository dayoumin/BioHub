/**
 * Diagnostic Pipeline 순수 함수 단위 테스트
 *
 * LLM/Pyodide 호출 없이 파이프라인의 핵심 로직만 검증.
 */

import { describe, it, expect } from 'vitest'
import type { ValidationResults, DiagnosticAssumptions } from '@/types/analysis'
import {
  extractBasicStats,
  parseVariableDetectionResponse,
  buildPendingClarification,
  mergeVariableAssignments,
  resolveVariableFromAnswer,
  toStatisticalAssumptions,
} from '@/lib/services/diagnostic-pipeline'

// ===== Test Fixtures =====

const mockValidationResults = {
  isValid: true,
  totalRows: 120,
  columnCount: 4,
  columns: [
    {
      name: '생산량', type: 'numeric', mean: 45.2, std: 12.3, min: 10, max: 80,
      median: 44, uniqueValues: 100, missingCount: 0, skewness: 0.3, kurtosis: -0.1,
      normality: { testName: 'shapiro-wilk' as const, statistic: 0.98, pValue: 0.23, isNormal: true },
    },
    {
      name: '사료종류', type: 'categorical', uniqueValues: 3, missingCount: 0,
      topCategories: [
        { value: 'A', count: 40 },
        { value: 'B', count: 40 },
        { value: 'C', count: 40 },
      ],
    },
    {
      name: '체중', type: 'numeric', mean: 25.1, std: 5.4, min: 12, max: 40,
      median: 25, uniqueValues: 80, missingCount: 2,
    },
    {
      name: 'ID', type: 'numeric', uniqueValues: 120, missingCount: 0,
      idDetection: { isId: true, reason: 'sequential' },
    },
  ] as unknown as ValidationResults['columns'],
} as unknown as ValidationResults

// ===== extractBasicStats =====

describe('extractBasicStats', () => {
  it('수치형 변수 요약을 추출한다', () => {
    const result = extractBasicStats(mockValidationResults)

    expect(result.totalRows).toBe(120)
    expect(result.numericSummaries).toHaveLength(3) // 생산량, 체중, ID (모두 numeric — ID 필터링은 extractBasicStats의 범위 아님)
    expect(result.numericSummaries[0].column).toBe('생산량')
    expect(result.numericSummaries[0].mean).toBe(45.2)
  })

  it('범주형 변수에서 그룹 정보를 추출한다', () => {
    const result = extractBasicStats(mockValidationResults)

    expect(result.groups).toBeDefined()
    expect(result.groups).toHaveLength(3)
    expect(result.groups![0].name).toBe('A')
    expect(result.groups![0].count).toBe(40)
  })

  it('정규성 enrichment 결과를 포함한다', () => {
    const result = extractBasicStats(mockValidationResults)

    expect(result.columnNormality).toBeDefined()
    expect(result.columnNormality).toHaveLength(1) // 생산량만 normality 있음
    expect(result.columnNormality![0].column).toBe('생산량')
    expect(result.columnNormality![0].passed).toBe(true)
  })
})

// ===== parseVariableDetectionResponse =====

describe('parseVariableDetectionResponse', () => {
  it('완전한 변수 배정을 파싱한다', () => {
    const raw = '```json\n{"variableAssignments":{"dependent":["생산량"],"factor":["사료종류"]},"clarificationNeeded":null}\n```'
    const result = parseVariableDetectionResponse(raw, mockValidationResults)

    expect(result.variableAssignments).toEqual({ dependent: ['생산량'], factor: ['사료종류'] })
    expect(result.clarificationNeeded).toBeNull()
  })

  it('dependent 없이 factor만 있으면 부분 탐지 + clarification 반환', () => {
    const raw = '```json\n{"variableAssignments":{"factor":["사료종류"]},"clarificationNeeded":null}\n```'
    const result = parseVariableDetectionResponse(raw, mockValidationResults)

    expect(result.variableAssignments).toEqual({ factor: ['사료종류'] })
    expect(result.clarificationNeeded).toContain('비교할 값을 선택해 주세요')
  })

  it('dependent만 있고 factor 없으면 부분 탐지 + clarification 반환', () => {
    const raw = '```json\n{"variableAssignments":{"dependent":["생산량"]},"clarificationNeeded":null}\n```'
    const result = parseVariableDetectionResponse(raw, mockValidationResults)

    expect(result.variableAssignments).toEqual({ dependent: ['생산량'] })
    expect(result.clarificationNeeded).toContain('어떤 기준으로 비교할까요')
  })

  it('존재하지 않는 컬럼명은 필터링한다 (hallucination 방지)', () => {
    const raw = '```json\n{"variableAssignments":{"dependent":["없는컬럼","생산량"],"factor":["사료종류"]}}\n```'
    const result = parseVariableDetectionResponse(raw, mockValidationResults)

    expect(result.variableAssignments?.dependent).toEqual(['생산량'])
    expect(result.clarificationNeeded).toBeNull()
  })

  it('모든 컬럼이 존재하지 않으면 null 반환', () => {
    const raw = '```json\n{"variableAssignments":{"dependent":["X"],"factor":["Y"]}}\n```'
    const result = parseVariableDetectionResponse(raw, mockValidationResults)

    expect(result.variableAssignments).toBeNull()
    expect(result.clarificationNeeded).toBe('데이터에서 해당 변수를 찾지 못했습니다.')
  })

  it('LLM이 clarificationNeeded를 반환하면 그대로 전달', () => {
    const raw = '```json\n{"variableAssignments":null,"clarificationNeeded":"어떤 변수를 비교하고 싶으세요?"}\n```'
    const result = parseVariableDetectionResponse(raw, mockValidationResults)

    expect(result.variableAssignments).toBeNull()
    expect(result.clarificationNeeded).toBe('어떤 변수를 비교하고 싶으세요?')
  })

  it('잘못된 JSON은 clarificationNeeded와 함께 반환 (성공 경로로 빠지지 않음)', () => {
    const result = parseVariableDetectionResponse('not json at all', mockValidationResults)
    expect(result.variableAssignments).toBeNull()
    expect(result.clarificationNeeded).toBeTruthy() // null이 아님 — 반드시 질문 생성
  })
})

// ===== buildPendingClarification =====

describe('buildPendingClarification', () => {
  it('이미 감지된 역할을 missingRoles에서 제외한다', () => {
    const result = buildPendingClarification(
      '종속변수를 알려주세요.',
      { factor: ['사료종류'] }, // factor는 감지됨
      mockValidationResults,
    )

    expect(result!.missingRoles).toContain('dependent')
    expect(result!.missingRoles).not.toContain('factor')
  })

  it('아무것도 감지되지 않으면 기본 역할 반환', () => {
    const result = buildPendingClarification(
      '변수를 선택해주세요.',
      null,
      mockValidationResults,
    )

    expect(result!.missingRoles).toEqual(['dependent', 'factor'])
  })

  it('ID 컬럼을 후보에서 제외한다', () => {
    const result = buildPendingClarification('선택', null, mockValidationResults)

    const columnNames = result!.candidateColumns.map(c => c.column)
    expect(columnNames).not.toContain('ID')
    expect(columnNames).toContain('생산량')
    expect(columnNames).toContain('사료종류')
  })

  it('범주형 컬럼에 sampleGroups를 포함한다', () => {
    const result = buildPendingClarification('선택', null, mockValidationResults)

    const categorical = result!.candidateColumns.find(c => c.column === '사료종류')
    expect(categorical?.sampleGroups).toEqual(['A', 'B', 'C'])
  })
  it('집단 비교 요청인데 그룹 열이 없고 수치형 열이 여러 개면 반복측정 대안을 제안한다', () => {
    const repeatedMeasuresValidation = {
      ...mockValidationResults,
      columns: [
        { name: 'time1', type: 'numeric', uniqueValues: 15, missingCount: 0 },
        { name: 'time2', type: 'numeric', uniqueValues: 15, missingCount: 0 },
        { name: 'time3', type: 'numeric', uniqueValues: 15, missingCount: 0 },
      ] as unknown as ValidationResults['columns'],
    } as unknown as ValidationResults

    const result = buildPendingClarification(
      '어떤 그룹으로 비교할까요?',
      { dependent: ['time1'] },
      repeatedMeasuresValidation,
      '집단간 비교를 하고 싶어',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'repeated-measures-anova',
      'friedman',
    ])
  })

  it('범주형 비율 비교 요청이면 카이제곱 대안을 제안한다', () => {
    const categoricalValidation = {
      ...mockValidationResults,
      columns: [
        {
          name: 'sex', type: 'categorical', uniqueValues: 2, missingCount: 0,
          topCategories: [{ value: 'M', count: 60 }, { value: 'F', count: 60 }],
        },
        {
          name: 'pass', type: 'categorical', uniqueValues: 2, missingCount: 0,
          topCategories: [{ value: 'yes', count: 70 }, { value: 'no', count: 50 }],
        },
      ] as unknown as ValidationResults['columns'],
    } as unknown as ValidationResults

    const result = buildPendingClarification(
      '무엇을 비교할까요?',
      null,
      categoricalValidation,
      '집단간 비율 차이를 보고 싶어',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'chi-square-independence',
    ])
  })

  it('그룹 열은 보이지만 측정값 선택이 안 된 경우 그룹 수에 맞는 평균 비교 대안을 제안한다', () => {
    const result = buildPendingClarification(
      '비교할 값을 선택해 주세요.',
      { factor: ['?щ즺醫낅쪟'] },
      mockValidationResults,
      '그룹 평균 비교를 하고 싶어',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'one-way-anova',
      'kruskal-wallis',
    ])
  })
})

describe('buildPendingClarification regression cases', () => {
  it('keeps the detected 3-level factor when suggesting alternatives', () => {
    const validationResults = {
      ...mockValidationResults,
      columns: [
        {
          name: 'sex',
          type: 'categorical',
          uniqueValues: 2,
          missingCount: 0,
          topCategories: [{ value: 'M', count: 60 }, { value: 'F', count: 60 }],
        },
        {
          name: 'treatment',
          type: 'categorical',
          uniqueValues: 3,
          missingCount: 0,
          topCategories: [
            { value: 'A', count: 40 },
            { value: 'B', count: 40 },
            { value: 'C', count: 40 },
          ],
        },
        { name: 'outcome', type: 'numeric', uniqueValues: 100, missingCount: 0 },
      ] as unknown as ValidationResults['columns'],
    } as unknown as ValidationResults

    const result = buildPendingClarification(
      'Compare the groups.',
      { dependent: ['outcome'], factor: ['treatment'] },
      validationResults,
      'Compare the groups.',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'one-way-anova',
      'kruskal-wallis',
    ])
  })

  it('keeps chi-square available for mixed datasets when the user explicitly asks for categorical comparison', () => {
    const validationResults = {
      ...mockValidationResults,
      columns: [
        {
          name: 'sex',
          type: 'categorical',
          uniqueValues: 2,
          missingCount: 0,
          topCategories: [{ value: 'M', count: 60 }, { value: 'F', count: 60 }],
        },
        {
          name: 'pass',
          type: 'categorical',
          uniqueValues: 2,
          missingCount: 0,
          topCategories: [{ value: 'yes', count: 70 }, { value: 'no', count: 50 }],
        },
        { name: 'age', type: 'numeric', uniqueValues: 60, missingCount: 0 },
      ] as unknown as ValidationResults['columns'],
    } as unknown as ValidationResults

    const result = buildPendingClarification(
      'I want to compare proportions.',
      null,
      validationResults,
      'I want to compare proportions.',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'chi-square-independence',
    ])
  })

  it('still suggests repeated-measures alternatives when group comparison is requested without a grouping column', () => {
    const validationResults = {
      ...mockValidationResults,
      columns: [
        { name: 'time1', type: 'numeric', uniqueValues: 15, missingCount: 0 },
        { name: 'time2', type: 'numeric', uniqueValues: 15, missingCount: 0 },
        { name: 'time3', type: 'numeric', uniqueValues: 15, missingCount: 0 },
      ] as unknown as ValidationResults['columns'],
    } as unknown as ValidationResults

    const result = buildPendingClarification(
      'I want to compare groups over time.',
      { dependent: ['time1'] },
      validationResults,
      'I want to compare groups over time.',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'repeated-measures-anova',
      'friedman',
    ])
  })

  it('prefers repeated-measures alternatives over incidental categorical columns when the user asks for time-based comparison', () => {
    const validationResults = {
      ...mockValidationResults,
      columns: [
        {
          name: 'sex',
          type: 'categorical',
          uniqueValues: 2,
          missingCount: 0,
          topCategories: [{ value: 'M', count: 8 }, { value: 'F', count: 7 }],
        },
        { name: 'time1', type: 'numeric', uniqueValues: 15, missingCount: 0 },
        { name: 'time2', type: 'numeric', uniqueValues: 15, missingCount: 0 },
        { name: 'time3', type: 'numeric', uniqueValues: 15, missingCount: 0 },
      ] as unknown as ValidationResults['columns'],
    } as unknown as ValidationResults

    const result = buildPendingClarification(
      '시점별로 비교할까요?',
      { dependent: ['time1'] },
      validationResults,
      '전후 시점 비교를 하고 싶어',
    )

    expect(result?.suggestedAnalyses?.map((item) => item.methodId)).toEqual([
      'repeated-measures-anova',
      'friedman',
    ])
  })

  it('does not claim factor is missing when independent is already detected', () => {
    const result = buildPendingClarification(
      '어떤 값을 분석할까요?',
      { independent: ['age'] },
      mockValidationResults,
      '연속형 설명 변수로 결과를 예측하고 싶어',
    )

    expect(result?.missingRoles).toEqual(['dependent'])
  })

  it('routes a free-form numeric answer to independent when only independent is missing', () => {
    const result = resolveVariableFromAnswer(
      'age',
      {
        question: '설명 변수를 선택해 주세요.',
        missingRoles: ['independent'],
        candidateColumns: [
          { column: 'age', type: 'numeric', sampleGroups: [] },
          { column: 'outcome', type: 'numeric', sampleGroups: [] },
        ],
        suggestedAnalyses: [],
      },
      {
        ...mockValidationResults,
        columns: [
          { name: 'age', type: 'numeric', uniqueValues: 20, missingCount: 0 },
          { name: 'outcome', type: 'numeric', uniqueValues: 20, missingCount: 0 },
        ] as unknown as ValidationResults['columns'],
      } as ValidationResults,
    )

    expect(result).toEqual({
      independent: ['age'],
    })
  })
})

// ===== mergeVariableAssignments =====

describe('mergeVariableAssignments', () => {
  it('기존 + 새 역할을 병합한다', () => {
    const existing = { factor: ['사료종류'] }
    const incoming = { dependent: ['생산량'] }
    const result = mergeVariableAssignments(existing, incoming)

    expect(result).toEqual({ factor: ['사료종류'], dependent: ['생산량'] })
  })

  it('기존 역할을 새 역할이 덮어쓰지 않는다', () => {
    const existing = { factor: ['사료종류'], dependent: ['생산량'] }
    const incoming = { factor: ['산지'], dependent: ['체중'] } // 둘 다 이미 있음
    const result = mergeVariableAssignments(existing, incoming)

    expect(result.factor).toEqual(['사료종류']) // 기존 유지
    expect(result.dependent).toEqual(['생산량']) // 기존 유지
  })

  it('기존이 null이면 새 역할만 사용', () => {
    const result = mergeVariableAssignments(null, { dependent: ['생산량'] })
    expect(result).toEqual({ dependent: ['생산량'] })
  })
})

// ===== resolveVariableFromAnswer =====

describe('resolveVariableFromAnswer', () => {
  const pending = buildPendingClarification('선택', null, mockValidationResults)!

  it('정확한 컬럼명을 매칭한다', () => {
    const result = resolveVariableFromAnswer('생산량으로 비교해줘', pending)
    expect(result?.dependent).toEqual(['생산량'])
  })

  it('범주형 컬럼은 factor로 매핑한다', () => {
    const result = resolveVariableFromAnswer('사료종류로 비교해줘', pending)
    expect(result?.factor).toEqual(['사료종류'])
  })

  it('여러 컬럼을 동시에 매칭한다', () => {
    const result = resolveVariableFromAnswer('사료종류별 생산량 비교', pending)
    expect(result?.factor).toEqual(['사료종류'])
    expect(result?.dependent).toEqual(['생산량'])
  })

  it('substring 오매칭을 방지한다 (단어 경계)', () => {
    // "체중"이 "체중감소"의 substring이 아닌 독립 매칭
    const result = resolveVariableFromAnswer('체중감소를 분석해줘', pending)
    // "체중감소"는 "체중"과 정확히 일치하지 않으므로 매칭 안 됨
    expect(result).toBeNull()
  })

  it('매칭 실패 시 null 반환', () => {
    const result = resolveVariableFromAnswer('아무거나 해줘', pending)
    expect(result).toBeNull()
  })

  it('15개 제한 넘어서도 validationResults 전체에서 매칭한다', () => {
    // 20개 컬럼 ValidationResults 생성 (15개 slice 후에도 매칭 가능)
    const manyColumns = Array.from({ length: 20 }, (_, i) => ({
      name: `col_${i}`, type: 'numeric' as const, uniqueValues: 50, missingCount: 0,
    }))
    const wideVR = { ...mockValidationResults, columns: manyColumns } as unknown as ValidationResults

    const widePending = buildPendingClarification('선택', null, wideVR)!
    expect(widePending.candidateColumns).toHaveLength(15) // 15개로 잘림

    // 16번째 컬럼 매칭 시도
    const result = resolveVariableFromAnswer('col_17 분석해줘', widePending, wideVR)
    expect(result?.dependent).toEqual(['col_17'])
  })

  it('returns null when a dependent-only clarification is answered with a categorical column', () => {
    const result = resolveVariableFromAnswer(
      '사료종류로 비교할게요',
      {
        question: '종속변수를 선택해 주세요.',
        missingRoles: ['dependent'],
        candidateColumns: [
          { column: '생존율', type: 'numeric', sampleGroups: [] },
          { column: '사료종류', type: 'categorical', sampleGroups: ['A', 'B', 'C'] },
        ],
        suggestedAnalyses: [],
      },
      mockValidationResults,
    )

    expect(result).toBeNull()
  })
})

// ===== toStatisticalAssumptions =====

describe('toStatisticalAssumptions', () => {
  const diagnosticAssumptions: DiagnosticAssumptions = {
    normality: {
      groups: [
        { groupName: 'A', statistic: 0.98, pValue: 0.45, passed: true },
        { groupName: 'B', statistic: 0.95, pValue: 0.12, passed: true },
        { groupName: 'C', statistic: 0.89, pValue: 0.02, passed: false },
      ],
      overallPassed: false,
      testMethod: 'shapiro-wilk',
    },
    homogeneity: {
      levene: { statistic: 1.23, pValue: 0.34, equalVariance: true },
    },
  }

  it('3개 그룹 중 min(p)를 shapiroWilk.pValue로 사용', () => {
    const result = toStatisticalAssumptions(diagnosticAssumptions)
    expect(result.normality?.shapiroWilk?.pValue).toBe(0.02)
    expect(result.normality?.shapiroWilk?.isNormal).toBe(false) // overallPassed
  })

  it('첫 2개 그룹을 group1/group2로 매핑', () => {
    const result = toStatisticalAssumptions(diagnosticAssumptions)
    expect(result.normality?.group1?.interpretation).toBe('A')
    expect(result.normality?.group1?.pValue).toBe(0.45)
    expect(result.normality?.group2?.interpretation).toBe('B')
    expect(result.normality?.group2?.pValue).toBe(0.12)
  })

  it('homogeneity를 levene로 변환', () => {
    const result = toStatisticalAssumptions(diagnosticAssumptions)
    expect(result.homogeneity?.levene?.pValue).toBe(0.34)
    expect(result.homogeneity?.levene?.equalVariance).toBe(true)
  })

  it('homogeneity가 null이면 undefined', () => {
    const noHomogeneity: DiagnosticAssumptions = {
      ...diagnosticAssumptions,
      homogeneity: null,
    }
    const result = toStatisticalAssumptions(noHomogeneity)
    expect(result.homogeneity).toBeUndefined()
  })

  it('groups가 빈 배열이면 normality/homogeneity 모두 undefined', () => {
    const emptyGroups: DiagnosticAssumptions = {
      normality: { groups: [], overallPassed: false, testMethod: 'shapiro-wilk' },
      homogeneity: null,
    }
    const result = toStatisticalAssumptions(emptyGroups)
    expect(result.normality).toBeUndefined()
    expect(result.homogeneity).toBeUndefined()
  })
})
