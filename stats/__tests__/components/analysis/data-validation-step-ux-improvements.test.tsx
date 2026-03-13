/**
 * DataValidationStep UX 개선 테스트
 *
 * 테스트 범위:
 * - 표본 크기 메시지
 * - 분석 추천 기능
 *
 * Note: UI 구조 변경으로 일부 테스트 삭제됨 (2026-01-26)
 * - Sticky 파일명, GuidanceCard 관련 테스트는 E2E 테스트로 대체
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DataValidationStep } from '@/components/analysis/steps/DataValidationStep'
import type { ValidationResults, DataRow } from '@/types/analysis'

// ===== Mock: Terminology =====
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'aquaculture', displayName: '수산과학',
    variables: {}, validation: {}, success: {}, selectorUI: {},
    analysis: { stepTitles: {}, stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' }, statusMessages: {}, buttons: {}, resultSections: { effectSizeDetail: '' }, executionStages: { prepare: { label: '', message: '' }, preprocess: { label: '', message: '' }, assumptions: { label: '', message: '' }, analysis: { label: '', message: '' }, additional: { label: '', message: '' }, finalize: { label: '', message: '' } }, layout: { appTitle: '', historyTitle: '', historyClose: '', historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '', nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '', memoryRecommendation: '', detectedMemory: () => '', limitFileSize: '', limitDataSize: '', limitRecommended: '', memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '' }, execution: { runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '', pauseDisabledTooltip: '', cancelConfirm: '', logSectionLabel: () => '', noLogs: '', dataRequired: '', unknownError: '', estimatedTimeRemaining: () => '' } },
    purposeInput: { purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' }, buttons: { back: '', allMethods: '', useThisMethod: '' }, labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' }, messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' }, aiLabels: { recommendTitle: '' } },
    dataExploration: { empty: { title: '', description: '' }, features: { descriptiveTitle: '', descriptiveDesc: '', distributionTitle: '', distributionDesc: '', correlationTitle: '', correlationDesc: '' }, tabs: { dataSummary: '', fullDataView: () => '', statistics: '', preview: '' }, headers: { variableName: '', count: '', mean: '', stdDev: '', median: '', min: '', max: '', skewness: '', kurtosis: '', outliers: '' }, interpretGuide: { title: '', skewness: '', kurtosis: '', outlierDef: '', nDef: '' }, outlier: { detected: () => '', variableDetail: () => '', moreVars: () => '', count: () => '', info: () => '' }, chartTypes: { histogram: '', boxplot: '', ariaLabel: '' }, distribution: { title: '', description: '' }, histogram: { title: () => '', yAxisLabel: '' }, boxplot: { selectInstruction: '', singleTitle: () => '', multipleTitle: () => '' }, scatterTabs: { scatter: '', heatmap: '' }, scatter: { variableRelation: '', xAxis: '', yAxis: '' }, correlation: { coefficient: '', determination: '', strong: '', medium: '', weak: '' }, heatmap: { title: '', description: '', calculating: '', variableCount: () => '' }, heatmapGuide: { title: '', strongPositive: '', strongNegative: '', noCorrelation: '', veryStrong: '' }, strongCorrelations: { title: '' }, strength: { weak: '', medium: '', strong: '', veryStrong: '' }, assumptions: { loading: '', loadingDescription: '', badge: '', title: '', description: '' }, normality: { title: '', normal: '', nonNormal: '', statLabel: '', normalInterpretation: '', nonNormalInterpretation: '' }, homogeneity: { title: '', equal: '', unequal: '', statLabel: '', equalInterpretation: '', unequalInterpretation: '' }, highlight: { description: () => '', clearButton: '', notFound: '' }, preview: { title: '', topN: () => '', viewAll: () => '', fullDataInstruction: () => '' }, warnings: { fewNumericVars: '', correlationRequires: '', currentStatus: () => '', nextStepHint: '' }, fallbackFileName: '' },
    dataValidation: {
      status: { dataRequired: '데이터가 필요합니다', failed: '검증 실패', warningComplete: '경고 있음', readyComplete: '검증 완료' },
      badges: { largeSample: '대표본', smallSample: '소표본', numeric: '수치형', categorical: '범주형', idSequential: 'ID/순번' },
      labels: { sampleSize: '표본 크기', analyzableVariables: '분석 가능 변수', numeric: '수치형', categorical: '범주형', dataQuality: '데이터 품질', missing: '결측', uploadedFile: '업로드 파일', columnsCount: (n: number) => `${n}개 컬럼`, otherVariables: (n: number) => `외 ${n}개` },
      units: { count: '개' },
      quality: { perfect: '완벽', good: '양호', caution: '주의 필요' },
      fallback: { noFileName: '파일명 없음' },
      sections: { needsAttention: '확인 필요 사항', variableSummary: '변수 요약' },
      warnings: { canContinue: '경고가 있지만 분석을 계속할 수 있습니다' },
      recommendations: { title: '💡 이 데이터로 할 수 있는 분석', hint: '데이터 특성에 맞는 분석 방법을 추천합니다', twoGroupComparison: '2집단 비교 (t-검정, Mann-Whitney)', multiGroupComparison: '다집단 비교 (ANOVA, Kruskal-Wallis)', correlation: '상관분석', regression: '회귀분석', chiSquare: '카이제곱 검정' },
      table: { variableName: '변수명', type: '유형', uniqueValues: '고유값', missing: '결측', excluded: '제외' },
      idDetection: { label: 'ID/순번', heading: 'ID/순번 감지', explanation: '이 변수는 분석에서 자동 제외됩니다' },
    },
  }),
  useTerminologyContext: () => ({ dictionary: { domain: 'aquaculture', displayName: '수산과학' }, setDomain: vi.fn(), currentDomain: 'aquaculture' }),
}))

// Mock useAnalysisStore
vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: () => ({
    uploadedFile: { name: 'test-data.csv' },
    uploadedFileName: 'test-data.csv',
    setDataCharacteristics: vi.fn(),
    setAssumptionResults: vi.fn()
  })
}))

describe('DataValidationStep UX Improvements', () => {

  const mockData: DataRow[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    age: 20 + i,
    score: 50 + Math.random() * 50,
    group: i % 2 === 0 ? 'A' : 'B'
  }))

  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 50,
    columnCount: 4,
    missingValues: 0,
    dataType: 'csv',
    variables: ['age', 'weight', 'score', 'group'],
    errors: [],
    warnings: [],
    columnStats: [
      {
        name: 'age',
        type: 'numeric',
        numericCount: 100,
        textCount: 0,
        uniqueValues: 50,
        missingCount: 0,
        mean: 44.5,
        std: 14.43,
        min: 20,
        max: 69
      },
      {
        name: 'score',
        type: 'numeric',
        numericCount: 100,
        textCount: 0,
        uniqueValues: 50,
        missingCount: 0,
        mean: 75,
        std: 14.43,
        min: 50,
        max: 100
      },
      {
        name: 'group',
        type: 'categorical',
        numericCount: 0,
        textCount: 100,
        uniqueValues: 2,
        missingCount: 0
      }
    ]
  }

  describe('표본 크기 중립 메시지', () => {
    it('30개 이상이면 "대표본"으로 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={{ ...mockValidationResults, totalRows: 50 }}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('대표본')).toBeInTheDocument()
      expect(screen.queryByText('충분')).not.toBeInTheDocument()
    })

    it('30개 미만이면 "소표본"으로 표시되어야 함', () => {
      const smallData = mockData.slice(0, 20)

      render(
        <DataValidationStep
          validationResults={{ ...mockValidationResults, totalRows: 20 }}
          data={smallData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('소표본')).toBeInTheDocument()
      expect(screen.queryByText('충분')).not.toBeInTheDocument()
    })

    it('Badge는 outline variant를 사용해야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      const badge = screen.getByText('대표본')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('기술통계 추천 제거', () => {
    it('추천 분석 목록에 기술통계가 없어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      const analysisCard = screen.getByText('💡 이 데이터로 할 수 있는 분석')
      expect(analysisCard).toBeInTheDocument()

      expect(screen.queryByText(/기술통계/)).not.toBeInTheDocument()
      expect(screen.queryByText(/평균, 표준편차, 분포/)).not.toBeInTheDocument()
    })

    it('다른 분석 추천은 정상 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText(/2집단 비교/)).toBeInTheDocument()
      expect(screen.getByText(/상관분석/)).toBeInTheDocument()
      expect(screen.getByText(/회귀분석/)).toBeInTheDocument()
    })
  })
})
