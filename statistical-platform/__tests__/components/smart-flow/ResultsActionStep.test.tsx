/**
 * ResultsActionStep - Layer 로직 시뮬레이션 테스트
 *
 * Part 1: Layer 조건 검증 (순수 로직, hand-crafted StatisticalResult)
 * Part 2: 컴포넌트 렌더링 검증 (mock convertToStatisticalResult)
 */

import React from 'react'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
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

// Mock Terminology hooks (TerminologyProvider 없이 테스트)
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'generic',
    displayName: '범용 통계',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    smartFlow: {
      stepTitles: {},
      stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' },
      statusMessages: {},
      buttons: {},
      resultSections: { effectSizeDetail: 'Effect Size Details' },
      executionStages: {
        prepare: { label: '', message: '' }, preprocess: { label: '', message: '' },
        assumptions: { label: '', message: '' }, analysis: { label: '', message: '' },
        additional: { label: '', message: '' }, finalize: { label: '', message: '' },
      },
      layout: {
        appTitle: '', historyTitle: '', historyClose: '',
        historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '',
        nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '',
        memoryRecommendation: '', detectedMemory: () => '',
        limitFileSize: '', limitDataSize: '', limitRecommended: '',
        memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '',
      },
      execution: {
        runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '',
        pauseDisabledTooltip: '', cancelConfirm: '',
        logSectionLabel: () => '', noLogs: '', dataRequired: '',
        unknownError: '', estimatedTimeRemaining: () => '',
      },
    },
    purposeInput: {
      purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' },
      buttons: { back: '', allMethods: '', useThisMethod: '' },
      labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' },
      messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' },
      aiLabels: { recommendTitle: '' },
    },
    results: {
      effectSizeLabels: { small: '작음', medium: '중간', large: '큼', veryLarge: '매우 큼' },
      noResults: '분석을 먼저 실행해주세요.',
      conclusion: {
        assumptionWarning: '⚠️ 일부 가정 미충족 - 결과 해석에 주의 필요',
        significant: '✓ 통계적으로 유의한 차이가 있습니다',
        notSignificant: '통계적으로 유의한 차이가 없습니다',
      },
      statistics: {
        statistic: '통계량', statisticTooltip: '',
        pValue: '유의확률', pValueTooltip: '',
        effectSize: '효과크기', effectSizeTooltip: '',
        significant: '유의함', notSignificant: '유의하지 않음',
      },
      ai: { loading: 'AI가 결과를 해석하고 있어요...', detailedLabel: '상세 해석', reinterpret: '다시 해석', retry: '다시 시도', defaultError: 'AI 해석 중 오류가 발생했습니다.' },
      sections: {
        detailedResults: '상세 결과', confidenceInterval: '신뢰구간',
        apaFormat: 'APA 형식', diagnostics: '진단 & 권장', caution: '주의',
        recommendations: '권장사항', warnings: '주의사항', alternatives: '대안 분석 방법',
      },
      metadata: {
        file: '파일: ', data: '데이터: ', variables: '변수: ',
        rowsCols: (r: number, c: number) => `${r}행 × ${c}열`,
      },
      buttons: {
        saved: '저장됨', save: '저장', generating: '생성중...', pdf: 'PDF',
        copied: '복사됨', copy: '복사', saveTemplate: '템플릿으로 저장',
        reanalyze: '다른 데이터로 재분석', newAnalysis: '새 분석 시작',
        export: '내보내기', exporting: '내보내는 중...', exportDocx: 'Word (.docx)', exportExcel: 'Excel (.xlsx)',
      },
      save: {
        defaultName: (d: string) => `분석 ${d}`, promptMessage: '분석 이름을 입력하세요:',
        success: '저장되었습니다', errorTitle: '저장 실패', unknownError: '알 수 없는 오류',
      },
      toast: {
        reanalyzeReady: '새 데이터를 업로드하세요', reanalyzeMethod: (n: string) => `${n} 분석이 준비되어 있습니다`,
        newAnalysis: '새 분석을 시작합니다', pdfSuccess: 'PDF 보고서가 생성되었습니다', pdfError: 'PDF 생성에 실패했습니다',
        copyWithAi: '결과 + AI 해석이 복사되었습니다', copySuccess: '결과가 복사되었습니다', copyError: '복사 실패',
        templateSaved: '템플릿이 저장되었습니다',
      },
      clipboard: {
        itemHeader: '항목', valueHeader: '값',
        statistic: (n: string) => `통계량 (${n})`, df: '자유도 (df)', effectSize: '효과크기',
        confidenceInterval: '95% 신뢰구간', interpretation: '해석:',
        aiInterpretation: 'AI 해석', aiSeparator: '--- AI 해석 ---',
      },
    },
  }),
  useTerminologyContext: () => ({
    dictionary: { domain: 'generic', displayName: '범용 통계' },
    setDomain: vi.fn(),
    currentDomain: 'generic',
  }),
}))

vi.mock('@/lib/services/export/export-data-builder', () => ({
  splitInterpretation: vi.fn((text: string) => ({ summary: text, detail: '' })),
  generateSummaryText: vi.fn().mockReturnValue('Summary text'),
}))

// ExportService mock
const mockExportService = vi.hoisted(() => ({
  export: vi.fn().mockResolvedValue({ success: true, fileName: 't-test_분석결과_20260213.docx' })
}))

vi.mock('@/lib/services/export/export-service', () => ({
  ExportService: mockExportService,
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

vi.mock('@/components/smart-flow/ResultsVisualization', () => ({
  ResultsVisualization: () => <div data-testid="results-visualization" />
}))

vi.mock('@/components/smart-flow/steps/results/MethodSpecificResults', () => ({
  MethodSpecificResults: () => <div data-testid="method-specific-results" />
}))

vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: vi.fn().mockResolvedValue(
    '## 한줄 요약\n테스트 해석입니다.\n\n## 상세 해석\n상세 내용입니다.'
  ),
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

  describe('액션 버튼 레이아웃', () => {
    beforeEach(() => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
      } as StatisticalResult)
    })

    it('저장, 복사 버튼 + AI 해석 섹션이 표시된다', () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText('저장')).toBeInTheDocument()
      expect(screen.getByText('복사')).toBeInTheDocument()
      expect(screen.getByTestId('ai-interpretation-section')).toBeInTheDocument()
    })

    it('action-buttons 영역이 존재한다', () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByTestId('action-buttons')).toBeInTheDocument()
    })

    it('재분석, 새 분석, 템플릿 버튼이 모두 직접 노출된다 (⋯ 메뉴 없음)', () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      expect(screen.getByText('다른 데이터로 재분석')).toBeInTheDocument()
      expect(screen.getByText('새 분석 시작')).toBeInTheDocument()
      expect(screen.getByText('템플릿으로 저장')).toBeInTheDocument()
    })
  })

  describe('파일 저장 시뮬레이션 (handleSaveAsFile)', () => {
    const fullStatResult = {
      testName: '독립표본 t-검정',
      statistic: 2.456,
      statisticName: 't',
      pValue: 0.018,
      df: 28,
      alpha: 0.05,
      interpretation: '두 그룹 간 유의한 차이가 있습니다.',
    } as StatisticalResult

    beforeEach(() => {
      vi.clearAllMocks()
      mockStoreState = { ...defaultStoreState }
      mockConvert.mockReturnValue(fullStatResult)
      mockExportService.export.mockResolvedValue({
        success: true,
        fileName: 't-test_분석결과_20260213.docx',
      })
    })

    it('저장 버튼 클릭 → ExportService.export("docx") 호출', async () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      expect(mockExportService.export).toHaveBeenCalledTimes(1)
      const callArgs = mockExportService.export.mock.calls[0]
      expect(callArgs[1]).toBe('docx')
    })

    it('저장 성공 → 배너에 fileName 표시', async () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      // 배너가 나타나고 fileName 표시
      await waitFor(() => {
        expect(screen.getByText(/t-test_분석결과_20260213\.docx/)).toBeInTheDocument()
      })
    })

    it('저장 성공 → 버튼 텍스트 "저장됨"으로 변경', async () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        expect(screen.getByText('저장됨')).toBeInTheDocument()
      })
    })

    it('저장 성공 → IndexedDB 히스토리에도 자동 저장', async () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        expect(mockStoreState.saveToHistory).toHaveBeenCalledTimes(1)
      })
    })

    it('저장 실패 → 에러 토스트', async () => {
      const { toast } = await import('sonner')
      mockExportService.export.mockResolvedValue({
        success: false,
        error: '파일 생성에 실패했습니다.',
      })

      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })

    it('ExportService 예외 → 에러 토스트', async () => {
      const { toast } = await import('sonner')
      mockExportService.export.mockRejectedValue(new Error('네트워크 오류'))

      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })

    it('ExportResult에 fileName 없으면 폴백 이름 사용', async () => {
      mockExportService.export.mockResolvedValue({
        success: true,
        // fileName 없음 → 폴백
      })

      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        // 폴백: testName || selectedMethod.name || 'Analysis' + .docx
        expect(screen.getByText(/독립표본 t-검정\.docx/)).toBeInTheDocument()
      })
    })

    it('저장 성공 후 재저장 실패 → 이전 성공 배너가 사라진다', async () => {
      const { toast } = await import('sonner')

      // 1차: 성공
      mockExportService.export.mockResolvedValue({
        success: true,
        fileName: 'first_save.docx',
      })

      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        expect(screen.getByText(/first_save\.docx/)).toBeInTheDocument()
      })

      // 2차: 실패
      mockExportService.export.mockResolvedValue({
        success: false,
        error: '디스크 공간 부족',
      })

      const savedBtn = screen.getByText('저장됨')
      await act(async () => {
        fireEvent.click(savedBtn)
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })

      // 이전 성공 배너가 사라져야 함
      expect(screen.queryByText(/first_save\.docx/)).not.toBeInTheDocument()
    })

    it('results=null 일 때 저장 버튼 동작 안 함 (early return)', async () => {
      mockConvert.mockReturnValue(null)
      renderWithAct(<ResultsActionStep results={null} />)

      // results=null → 안내 메시지만 표시
      expect(screen.queryByText('저장')).not.toBeInTheDocument()
      expect(mockExportService.export).not.toHaveBeenCalled()
    })

    it('ExportContext 구조가 올바르게 전달된다', async () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      await waitFor(() => {
        expect(mockExportService.export).toHaveBeenCalledTimes(1)
      })

      const [context, format] = mockExportService.export.mock.calls[0]
      // format 기본값 = 'docx'
      expect(format).toBe('docx')
      // ExportContext 필수 필드 존재 확인
      expect(context).toHaveProperty('analysisResult')
      expect(context).toHaveProperty('statisticalResult')
      expect(context).toHaveProperty('aiInterpretation')
      expect(context).toHaveProperty('apaFormat')
      expect(context).toHaveProperty('dataInfo')
      // analysisResult = baseResults 전달 확인
      expect(context.analysisResult).toBe(baseResults)
    })

    it('isExporting 중 저장 버튼에 "내보내는 중..." 텍스트 표시', async () => {
      // 느린 export mock (resolve 제어)
      let resolveExport: (v: { success: boolean; fileName: string }) => void
      mockExportService.export.mockImplementation(
        () => new Promise(resolve => { resolveExport = resolve })
      )

      renderWithAct(<ResultsActionStep results={baseResults} />)

      const saveBtn = screen.getByText('저장')
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      // 비동기 진행 중 → "내보내는 중..." 텍스트
      expect(screen.getByText('내보내는 중...')).toBeInTheDocument()

      // resolve 후 → 복원
      await act(async () => {
        resolveExport!({ success: true, fileName: 'test.docx' })
      })

      await waitFor(() => {
        expect(screen.getByText('저장됨')).toBeInTheDocument()
      })
    })
  })

  describe('재분석/새분석 시뮬레이션', () => {
    beforeEach(() => {
      mockConvert.mockReturnValue({
        testName: 't-검정',
        statistic: 2.456,
        statisticName: 't',
        pValue: 0.018,
        df: 28,
        alpha: 0.05,
      } as StatisticalResult)
    })

    it('재분석 클릭 → store 초기화 + step 1로 이동', async () => {
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const reanalyzeBtn = screen.getByText('다른 데이터로 재분석')
      await act(async () => {
        fireEvent.click(reanalyzeBtn)
      })

      expect(mockStoreState.setUploadedData).toHaveBeenCalledWith(null)
      expect(mockStoreState.setUploadedFile).toHaveBeenCalledWith(null)
      expect(mockStoreState.setResults).toHaveBeenCalledWith(null)
      expect(mockStoreState.setIsReanalysisMode).toHaveBeenCalledWith(true)
      expect(mockStoreState.setCurrentStep).toHaveBeenCalledWith(1)
    })

    it('새 분석 클릭 → startNewAnalysis 호출', async () => {
      const { startNewAnalysis } = await import('@/lib/services/data-management')
      renderWithAct(<ResultsActionStep results={baseResults} />)

      const newAnalysisBtn = screen.getByText('새 분석 시작')
      await act(async () => {
        fireEvent.click(newAnalysisBtn)
      })

      expect(startNewAnalysis).toHaveBeenCalledTimes(1)
    })
  })
})
