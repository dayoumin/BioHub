/**
 * ResultsActionStep - Layer 로직 시뮬레이션 테스트
 *
 * Part 1: Layer 조건 검증 (순수 로직, hand-crafted StatisticalResult)
 * Part 2: 컴포넌트 렌더링 검증 (mock convertToStatisticalResult)
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { vi } from 'vitest'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { AnalysisResult } from '@/types/smart-flow'

// =====================================================
// Part 1에서 사용하는 순수 로직 함수 (ResultsActionStep에서 추출)
// =====================================================
function computeLayerVisibility(
  sr: StatisticalResult,
  uploadedFileName?: string,
  uploadedData?: unknown[]
) {
  const hasDetailedResults = !!(
    sr.confidenceInterval ||
    sr.effectSize ||
    (sr.additionalResults && sr.additionalResults.length > 0) ||
    uploadedFileName ||
    uploadedData
  )

  const hasDiagnostics = !!(
    (sr.assumptions && sr.assumptions.length > 0) ||
    (sr.recommendations && sr.recommendations.length > 0) ||
    (sr.warnings && sr.warnings.length > 0) ||
    (sr.alternatives && sr.alternatives.length > 0)
  )

  const assumptionsPassed = sr.assumptions
    ? sr.assumptions.every(a => a.passed !== false)
    : true

  const isSignificant = sr.pValue < (sr.alpha || 0.05)

  const hasApaFormat = sr.df !== undefined

  return { hasDetailedResults, hasDiagnostics, assumptionsPassed, isSignificant, hasApaFormat }
}

function mapAssumptionTests(sr: StatisticalResult) {
  if (!sr.assumptions) return []
  return sr.assumptions.map((a) => ({
    name: a.name,
    description: a.description,
    statistic: a.testStatistic,
    testStatistic: a.testStatistic,
    pValue: a.pValue,
    passed: a.passed,
    recommendation: a.recommendation,
    severity: a.severity ?? (a.passed === false ? 'medium' as const : 'low' as const),
    alpha: 0.05,
  }))
}

// =====================================================
// Part 1: 순수 로직 시뮬레이션 (vi.mock 영향 없음)
// =====================================================
describe('Part 1: Layer 조건 시뮬레이션 (순수 로직)', () => {

  describe('Scenario 1: 독립표본 t-검정 (풀 데이터)', () => {
    const sr: StatisticalResult = {
      testName: '독립표본 t-검정',
      testType: 'Independent Samples t-test',
      description: '두 독립 집단의 평균 비교',
      statistic: 2.456,
      statisticName: 't',
      pValue: 0.018,
      df: 28,
      alpha: 0.05,
      confidenceInterval: { lower: 0.35, upper: 2.18, estimate: 1.265, level: 0.95 },
      effectSize: { value: 0.72, type: 'cohensD' },
      additionalResults: [{
        title: '그룹별 기술통계',
        columns: [{ key: 'name', label: '그룹' }, { key: 'n', label: '표본수' }],
        data: [{ name: 'A', n: 15 }, { name: 'B', n: 15 }]
      }],
      assumptions: [
        { name: '정규성 (그룹 1)', description: 'Shapiro-Wilk', pValue: 0.32, passed: true },
        { name: '정규성 (그룹 2)', description: 'Shapiro-Wilk', pValue: 0.15, passed: true },
        { name: '등분산성', description: "Levene's", testStatistic: 0.87, pValue: 0.36, passed: true }
      ],
      interpretation: '두 그룹 간 유의한 차이가 있습니다.',
      recommendations: ['효과크기를 함께 보고하세요'],
      sampleSize: 30,
      groups: 2,
      variables: ['score', 'group'],
      timestamp: new Date()
    }

    it('Layer 1/2/3 모두 표시, 가정 충족, 유의함', () => {
      const vis = computeLayerVisibility(sr, 'data.csv', [{ id: 1 }])

      expect(vis.hasDetailedResults).toBe(true)
      expect(vis.hasDiagnostics).toBe(true)
      expect(vis.assumptionsPassed).toBe(true)
      expect(vis.isSignificant).toBe(true)
      expect(vis.hasApaFormat).toBe(true)
    })

    it('CI, effectSize, additionalResults 조건 검증', () => {
      expect(sr.confidenceInterval).toBeDefined()
      expect(sr.confidenceInterval?.lower).toBe(0.35)
      expect(sr.effectSize).toBeDefined()
      expect(sr.effectSize?.type).toBe('cohensD')
      expect(sr.additionalResults!.length).toBeGreaterThan(0)
    })

    it('assumptions 3개 모두 passed=true', () => {
      expect(sr.assumptions!.length).toBe(3)
      expect(sr.assumptions!.every(a => a.passed === true)).toBe(true)
    })
  })

  describe('Scenario 2: 카이제곱 검정 (가정검정 없음)', () => {
    const sr: StatisticalResult = {
      testName: '카이제곱 독립성 검정',
      statistic: 8.42,
      statisticName: 'χ²',
      pValue: 0.004,
      df: 1,
      alpha: 0.05,
      effectSize: { value: 0.31, type: 'phi' },
      interpretation: '범주 간 유의한 관계가 있습니다.',
      timestamp: new Date()
    }

    it('Layer 2 표시 (effectSize 있음), Layer 3 숨김 (assumptions 없음)', () => {
      const vis = computeLayerVisibility(sr, 'chi_data.csv', [{ id: 1 }])

      expect(vis.hasDetailedResults).toBe(true)
      expect(vis.hasDiagnostics).toBe(false)
      expect(vis.assumptionsPassed).toBe(true) // assumptions 없으면 true
    })

    it('effectSize 타입이 phi', () => {
      expect(sr.effectSize?.type).toBe('phi')
    })
  })

  describe('Scenario 3: ANOVA 가정 미충족', () => {
    const sr: StatisticalResult = {
      testName: '일원배치 분산분석',
      statistic: 4.52,
      statisticName: 'F',
      pValue: 0.013,
      df: [2, 57],
      alpha: 0.05,
      effectSize: { value: 0.13, type: 'etaSquared' },
      interpretation: '그룹 간 유의한 차이가 있습니다.',
      additionalResults: [
        {
          title: '그룹별 기술통계',
          columns: [{ key: 'name', label: '그룹' }],
          data: [{ name: 'Control' }, { name: 'Treatment A' }, { name: 'Treatment B' }]
        },
        {
          title: '사후검정 결과',
          columns: [{ key: 'comparison', label: '비교' }],
          data: [{ comparison: 'Control vs Treatment A' }]
        }
      ],
      assumptions: [
        { name: '정규성', pValue: 0.03, passed: false, recommendation: '비모수 검정 사용을 고려하세요' },
        { name: '등분산성', pValue: 0.014, passed: false, recommendation: "Welch's ANOVA 사용을 고려하세요" }
      ],
      timestamp: new Date()
    }

    it('Layer 3 표시 + assumptionsPassed=false → diagnosticsOpen 자동 true', () => {
      const vis = computeLayerVisibility(sr)

      expect(vis.hasDiagnostics).toBe(true)
      expect(vis.assumptionsPassed).toBe(false)
      // ResultsActionStep의 useEffect: !assumptionsPassed → setDiagnosticsOpen(true)
    })

    it('additionalResults에 2개 테이블', () => {
      expect(sr.additionalResults!.length).toBe(2)
      expect(sr.additionalResults![0].title).toBe('그룹별 기술통계')
      expect(sr.additionalResults![1].title).toBe('사후검정 결과')
    })

    it('assumptions 정규성(미충족) + 등분산성(미충족)', () => {
      expect(sr.assumptions!.length).toBe(2)

      const normality = sr.assumptions!.find(a => a.name === '정규성')
      expect(normality!.passed).toBe(false)
      expect(normality!.recommendation).toContain('비모수')

      const homogeneity = sr.assumptions!.find(a => a.name === '등분산성')
      expect(homogeneity!.passed).toBe(false)
    })

    it('mapAssumptionTests severity: passed=false → medium (fallback)', () => {
      const mapped = mapAssumptionTests(sr)

      expect(mapped.every(t => t.severity === 'medium')).toBe(true)
    })
  })

  describe('Scenario 4: 최소 결과 (메타데이터 영향 검증)', () => {
    const sr: StatisticalResult = {
      testName: 'Test',
      statistic: 1.0,
      statisticName: 'Statistic',
      pValue: 0.5,
      alpha: 0.05,
      timestamp: new Date()
    }

    it('메타데이터 없으면 Layer 2/3 모두 숨김', () => {
      const vis = computeLayerVisibility(sr)

      expect(vis.hasDetailedResults).toBe(false)
      expect(vis.hasDiagnostics).toBe(false)
      expect(vis.hasApaFormat).toBe(false) // df 없음
    })

    it('uploadedFileName만 있어도 Layer 2 표시', () => {
      const vis = computeLayerVisibility(sr, 'data.csv')

      expect(vis.hasDetailedResults).toBe(true)
    })

    it('uploadedData만 있어도 Layer 2 표시', () => {
      const vis = computeLayerVisibility(sr, undefined, [{ id: 1 }])

      expect(vis.hasDetailedResults).toBe(true)
    })
  })

  describe('Scenario 5: 비유의한 결과 + 가정 충족', () => {
    const sr: StatisticalResult = {
      testName: '독립표본 t-검정',
      statistic: 0.85,
      statisticName: 't',
      pValue: 0.402,
      df: 38,
      alpha: 0.05,
      effectSize: { value: 0.15, type: 'cohensD' },
      interpretation: '두 그룹 간 유의한 차이가 없습니다.',
      assumptions: [
        { name: '정규성 (그룹 1)', pValue: 0.65, passed: true },
        { name: '정규성 (그룹 2)', pValue: 0.48, passed: true },
        { name: '등분산성', pValue: 0.57, passed: true }
      ],
      timestamp: new Date()
    }

    it('비유의 + 가정 충족 + Layer 3 표시', () => {
      const vis = computeLayerVisibility(sr, 'data.csv', [{ id: 1 }])

      expect(vis.isSignificant).toBe(false)
      expect(vis.assumptionsPassed).toBe(true)
      expect(vis.hasDiagnostics).toBe(true) // assumptions 존재
    })
  })

  describe('Scenario 6: 회귀분석 (독립성 가정)', () => {
    const sr: StatisticalResult = {
      testName: '단순회귀분석',
      statistic: 12.45,
      statisticName: 'β',
      pValue: 0.001,
      df: [1, 48],
      alpha: 0.05,
      effectSize: { value: 0.21, type: 'r' },
      confidenceInterval: { lower: 0.5, upper: 1.8, estimate: 1.15, level: 0.95 },
      additionalResults: [{
        title: '회귀계수',
        columns: [{ key: 'name', label: '변수' }, { key: 'value', label: '계수' }],
        data: [
          { name: '절편', value: '3.4500' },
          { name: 'x1', value: '1.1500' }
        ]
      }],
      assumptions: [
        { name: '독립성', description: 'Durbin-Watson', testStatistic: 2.01, pValue: 0.45, passed: true }
      ],
      timestamp: new Date()
    }

    it('additionalResults에 회귀계수 테이블 포함', () => {
      const coeffTable = sr.additionalResults?.find(t => t.title === '회귀계수')
      expect(coeffTable).toBeDefined()
      expect(coeffTable!.data.length).toBe(2)
    })

    it('독립성 가정 → severity=low (passed=true, severity 미지정 fallback)', () => {
      const mapped = mapAssumptionTests(sr)

      const independence = mapped.find(t => t.name === '독립성')
      expect(independence).toBeDefined()
      expect(independence!.severity).toBe('low')
      expect(independence!.passed).toBe(true)
    })

    it('severity 명시된 assumption → 원본 severity 사용', () => {
      const srWithSeverity: StatisticalResult = {
        ...sr,
        assumptions: [
          { name: '독립성', testStatistic: 2.01, pValue: 0.45, passed: false, severity: 'high' }
        ],
      }
      const mapped = mapAssumptionTests(srWithSeverity)
      expect(mapped[0].severity).toBe('high')
    })

    it('CI level 변환: 0.95 → 95 (백분율)', () => {
      expect(sr.confidenceInterval?.level).toBe(0.95)
      // ResultsActionStep에서 Math.round((level ?? 0.95) * 100) 사용
      const displayLevel = Math.round((sr.confidenceInterval!.level ?? 0.95) * 100)
      expect(displayLevel).toBe(95)
    })
  })
  describe('Scenario 8: recommendations/warnings/alternatives → Layer 3 트리거', () => {
    it('assumptions 없어도 recommendations만 있으면 hasDiagnostics=true', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.05,
        alpha: 0.05,
        recommendations: ['효과크기를 보고하세요'],
        timestamp: new Date()
      }
      const vis = computeLayerVisibility(sr)
      expect(vis.hasDiagnostics).toBe(true)
    })

    it('빈 배열은 hasDiagnostics=false', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.05,
        alpha: 0.05,
        recommendations: [],
        timestamp: new Date()
      }
      const vis = computeLayerVisibility(sr)
      expect(vis.hasDiagnostics).toBe(false)
    })

    it('warnings만 있으면 hasDiagnostics=true', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.05,
        alpha: 0.05,
        warnings: ['표본 크기가 작습니다'],
        timestamp: new Date()
      }
      const vis = computeLayerVisibility(sr)
      expect(vis.hasDiagnostics).toBe(true)
    })

    it('alternatives만 있으면 hasDiagnostics=true', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.05,
        alpha: 0.05,
        alternatives: [{ name: 'Mann-Whitney U', reason: '비모수 대안' }],
        timestamp: new Date()
      }
      const vis = computeLayerVisibility(sr)
      expect(vis.hasDiagnostics).toBe(true)
    })

    it('모든 필드 빈 배열이면 hasDiagnostics=false', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.05,
        alpha: 0.05,
        recommendations: [],
        warnings: [],
        alternatives: [],
        timestamp: new Date()
      }
      const vis = computeLayerVisibility(sr)
      expect(vis.hasDiagnostics).toBe(false)
    })
  })

  describe('Scenario 9: warnings/alternatives dedup 로직', () => {
    it('warnings는 assumptionTests가 있으면 숨김 (중복 방지)', () => {
      // AssumptionTestCard가 이미 가정 관련 경고를 표시하므로
      // warnings는 assumptionTests가 없을 때만 렌더링
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.01,
        alpha: 0.05,
        warnings: ['정규성 가정을 확인하세요'],
        assumptions: [{ name: '정규성', pValue: 0.02, passed: false }],
        timestamp: new Date()
      }
      // assumptions 존재 → assumptionTests.length > 0 → warnings 숨김
      const hasAssumptions = (sr.assumptions?.length ?? 0) > 0
      const showWarnings = (sr.warnings?.length ?? 0) > 0 && !hasAssumptions
      expect(showWarnings).toBe(false)
    })

    it('warnings는 assumptionTests가 없으면 표시', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.01,
        alpha: 0.05,
        warnings: ['표본 크기가 너무 작습니다'],
        timestamp: new Date()
      }
      const hasAssumptions = (sr.assumptions?.length ?? 0) > 0
      const showWarnings = (sr.warnings?.length ?? 0) > 0 && !hasAssumptions
      expect(showWarnings).toBe(true)
    })

    it('alternatives는 testType이 있으면 숨김 (AssumptionTestCard에서 표시)', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.01,
        alpha: 0.05,
        testType: 't-test',
        alternatives: [{ name: 'Mann-Whitney U', reason: '비모수 대안' }],
        timestamp: new Date()
      }
      // testType 존재 → AssumptionTestCard가 getAlternatives(testType)으로 표시 → 숨김
      const showAlternatives = (sr.alternatives?.length ?? 0) > 0 && !sr.testType
      expect(showAlternatives).toBe(false)
    })

    it('alternatives는 testType이 없으면 표시', () => {
      const sr: StatisticalResult = {
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.01,
        alpha: 0.05,
        alternatives: [{ name: 'Mann-Whitney U', reason: '비모수 대안' }],
        timestamp: new Date()
      }
      const showAlternatives = (sr.alternatives?.length ?? 0) > 0 && !sr.testType
      expect(showAlternatives).toBe(true)
    })
  })

  describe('Scenario 7: passed=null (검정 미완료) 엣지 케이스', () => {
    const sr: StatisticalResult = {
      testName: 't-검정',
      statistic: 1.5,
      statisticName: 't',
      pValue: 0.15,
      alpha: 0.05,
      assumptions: [
        { name: '정규성', pValue: 0.32, passed: true },
        { name: '등분산성', pValue: 0.0, passed: null },  // 검정 미완료
      ],
      timestamp: new Date()
    }

    it('passed=null은 assumptionsPassed에서 true로 처리 (passed !== false)', () => {
      const vis = computeLayerVisibility(sr)

      // passed !== false → true (null은 false가 아님)
      expect(vis.assumptionsPassed).toBe(true)
    })

    it('passed=null → severity=low (fallback)', () => {
      const mapped = mapAssumptionTests(sr)
      const incomplete = mapped.find(t => t.name === '등분산성')

      expect(incomplete!.passed).toBe(null)
      expect(incomplete!.severity).toBe('low')
    })
  })
})

// =====================================================
// Part 2: 컴포넌트 렌더링 검증
// =====================================================

// --- Mocks ---
vi.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: vi.fn(),
    generateSummaryText: vi.fn().mockReturnValue('Summary text')
  }
}))

vi.mock('@/lib/services/data-management', () => ({
  startNewAnalysis: vi.fn()
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })
}))

vi.mock('@/contexts/ui-context', () => ({
  useUI: () => ({ openChatPanel: vi.fn() })
}))

vi.mock('@/lib/rag/utils/ollama-check', () => ({
  checkOllamaStatus: vi.fn().mockResolvedValue({
    isAvailable: false,
    hasEmbeddingModel: false,
    hasInferenceModel: false,
  })
}))

vi.mock('@/components/smart-flow/TemplateSaveModal', () => ({
  TemplateSaveModal: () => null
}))

// 공통 통계 컴포넌트 mock
vi.mock('@/components/statistics/common/ConfidenceIntervalDisplay', () => ({
  ConfidenceIntervalDisplay: ({ label }: { label?: string }) => (
    <div data-testid="ci-display">{label || 'CI'}</div>
  )
}))

vi.mock('@/components/statistics/common/EffectSizeCard', () => ({
  EffectSizeCard: ({ title }: { title: string }) => (
    <div data-testid="effect-size-card">{title}</div>
  )
}))

vi.mock('@/components/statistics/common/AssumptionTestCard', () => ({
  AssumptionTestCard: ({ tests }: { tests: unknown[] }) => (
    <div data-testid="assumption-test-card">{tests.length} tests</div>
  )
}))

vi.mock('@/components/statistics/common/StatisticsTable', () => ({
  StatisticsTable: ({ title }: { title?: string }) => (
    <div data-testid="statistics-table">{title}</div>
  )
}))

// Store mock
const defaultStoreState = {
  saveToHistory: vi.fn(),
  reset: vi.fn(),
  setCurrentStep: vi.fn(),
  setUploadedData: vi.fn(),
  setUploadedFile: vi.fn(),
  setValidationResults: vi.fn(),
  setResults: vi.fn(),
  setIsReanalysisMode: vi.fn(),
  uploadedData: [{ score: 10, group: 'A' }, { score: 12, group: 'B' }],
  variableMapping: { dependentVar: 'score', groupVar: 'group' },
  uploadedFileName: 'test-data.csv',
  selectedMethod: null,
  validationResults: null,
  assumptionResults: null,
}

let mockStoreState = { ...defaultStoreState }

vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => mockStoreState
}))

// Converter mock (vi.hoisted: vi.mock보다 먼저 초기화)
const mockConvert = vi.hoisted(() => vi.fn())

vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: mockConvert
}))

vi.mock('@/lib/statistics/formatters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/statistics/formatters')>()
  return {
    ...actual,
    formatStatisticalResult: vi.fn().mockReturnValue('t(28) = 2.456, p = .018')
  }
})

import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'

describe('Part 2: 컴포넌트 렌더링 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState = { ...defaultStoreState }
  })

  const baseResults: AnalysisResult = {
    method: '독립표본 t-검정',
    statistic: 2.456,
    pValue: 0.018,
    df: 28,
    interpretation: '두 그룹 간 유의한 차이가 있습니다.'
  }

  function renderWithAct(ui: React.ReactElement) {
    let result: ReturnType<typeof render>
    act(() => {
      result = render(ui)
    })
    return result!
  }

  describe('빈 상태', () => {
    it('results=null → 안내 메시지', () => {
      mockConvert.mockReturnValue(null)
      renderWithAct(<ResultsActionStep results={null} />)

      expect(screen.getByText('분석을 먼저 실행해주세요.')).toBeInTheDocument()
    })
  })

  describe('Layer 1: 기본 요소 (항상 표시)', () => {
    it('분석명, 통계량, p-value 표시', () => {
      mockConvert.mockReturnValue({
        testName: '독립표본 t-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        interpretation: '두 그룹 간 유의한 차이가 있습니다.',
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // 분석명 (CardTitle)
      expect(screen.getByText('독립표본 t-검정')).toBeInTheDocument()
      // 유의함 배너
      expect(screen.getByText(/통계적으로 유의한 차이가 있습니다/)).toBeInTheDocument()
      // 유의성 뱃지
      expect(screen.getByText('유의함')).toBeInTheDocument()
    })

    it('비유의한 결과 → 다른 결론 배너', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 0.5,
        statisticName: 't',
        pValue: 0.6,
        df: 20,
        alpha: 0.05,
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText(/통계적으로 유의한 차이가 없습니다/)).toBeInTheDocument()
      expect(screen.getByText('유의하지 않음')).toBeInTheDocument()
    })
  })

  describe('Layer 2: 상세 결과', () => {
    it('CI + effectSize 있으면 Layer 2 표시', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        confidenceInterval: { lower: 0.35, upper: 2.18, estimate: 1.265, level: 0.95 },
        effectSize: { value: 0.72, type: 'cohensD' },
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // Layer 2 토글 버튼 존재
      expect(screen.getByText('상세 결과')).toBeInTheDocument()
    })

    it('additionalResults 있으면 Layer 2 표시', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        additionalResults: [
          { title: '그룹별 기술통계', columns: [{ key: 'name', label: '그룹' }], data: [{ name: 'A' }] }
        ],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText('상세 결과')).toBeInTheDocument()
    })

    it('아무것도 없고 메타데이터만 있으면 Layer 2 표시', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 1.0,
        statisticName: 't',
        pValue: 0.5,
        alpha: 0.05,
      } as StatisticalResult)

      // uploadedFileName이 store에 있으므로 hasDetailedResults=true
      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText('상세 결과')).toBeInTheDocument()
    })

    it('메타데이터도 없으면 Layer 2 숨김', () => {
      mockStoreState = {
        ...defaultStoreState,
        uploadedFileName: '',
        uploadedData: null as never,
      }

      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 1.0,
        statisticName: 't',
        pValue: 0.5,
        alpha: 0.05,
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.queryByText('상세 결과')).not.toBeInTheDocument()
    })
  })

  describe('Layer 3: 진단 & 권장', () => {
    it('assumptions 있으면 Layer 3 표시', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        assumptions: [
          { name: '정규성', pValue: 0.32, passed: true },
          { name: '등분산성', pValue: 0.45, passed: true }
        ],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText('진단 & 권장')).toBeInTheDocument()
    })

    it('assumptions 없으면 Layer 3 숨김', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.queryByText('진단 & 권장')).not.toBeInTheDocument()
    })

    it('가정 미충족 → 결론 배너에 경고 + "주의" 뱃지', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        assumptions: [
          { name: '정규성', pValue: 0.01, passed: false, recommendation: '비모수' }
        ],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // 결론 배너가 경고로 변경
      expect(screen.getByText(/가정 미충족/)).toBeInTheDocument()
      // Layer 3의 "주의" 뱃지
      expect(screen.getByText('주의')).toBeInTheDocument()
    })

    it('가정 미충족 → useEffect로 diagnosticsOpen 자동 true → AssumptionTestCard 렌더링', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        assumptions: [
          { name: '정규성', pValue: 0.01, passed: false, recommendation: '비모수' },
          { name: '등분산성', pValue: 0.02, passed: false, recommendation: 'Welch' }
        ],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // useEffect에 의해 diagnosticsOpen=true → AssumptionTestCard 렌더링됨
      expect(screen.getByTestId('assumption-test-card')).toBeInTheDocument()
      expect(screen.getByText('2 tests')).toBeInTheDocument()
    })

    it('가정 충족 → diagnosticsOpen=false → AssumptionTestCard 숨김', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        assumptions: [
          { name: '정규성', pValue: 0.32, passed: true }
        ],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // diagnosticsOpen=false (기본값) → CollapsibleContent 닫혀있음
      expect(screen.queryByTestId('assumption-test-card')).not.toBeInTheDocument()
    })

    it('recommendations만 있어도 Layer 3 표시', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.0,
        statisticName: 't',
        pValue: 0.05,
        alpha: 0.05,
        recommendations: ['효과크기를 보고하세요'],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // hasDiagnostics=true → Layer 3 토글 표시
      expect(screen.getByText('진단 & 권장')).toBeInTheDocument()
    })

    it('가정 미충족 + recommendations → recommendations-section 렌더링', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
        assumptions: [
          { name: '정규성', pValue: 0.01, passed: false }
        ],
        recommendations: ['효과크기를 보고하세요', '표본 크기를 확인하세요'],
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      // useEffect → diagnosticsOpen=true → 권장사항 렌더링
      expect(screen.getByTestId('recommendations-section')).toBeInTheDocument()
      expect(screen.getByText('효과크기를 보고하세요')).toBeInTheDocument()
      expect(screen.getByText('표본 크기를 확인하세요')).toBeInTheDocument()
    })

  })

  describe('액션 버튼', () => {
    it('저장, PDF, 복사, AI 해석 버튼 표시', () => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
      } as StatisticalResult)

      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText('저장')).toBeInTheDocument()
      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByText('복사')).toBeInTheDocument()
      expect(screen.getByText('AI 해석')).toBeInTheDocument()
    })
  })
})
