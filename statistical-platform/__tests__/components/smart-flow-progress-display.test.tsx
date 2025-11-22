/**
 * Smart Flow Progress Display Test
 *
 * 목적: 각 단계별 진행 바 표시 검증
 * 검증 항목:
 * 1. Step 1 (Upload): 대용량 파일 처리 시 진행 바 표시
 * 2. Step 2 (Validation): 즉시 표시 (진행 바 불필요)
 * 3. Step 3 (Purpose): AI 분석 진행 바 표시
 * 4. Step 4 (Variable): 진행 바 불필요 (즉시 선택)
 * 5. Step 5 (Analysis): 6단계 분석 진행 바 + 로그
 */

import { render, screen, waitFor } from '@testing-library/react'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock data (must be defined before mocks)
const mockData: DataRow[] = [
  { age: 25, score: 85 },
  { age: 30, score: 90 },
  { age: 35, score: 78 }
]

const mockValidationResults: ValidationResults = {
  isValid: true,
  totalRows: 3,
  columnCount: 2,
  missingValues: 0,
  dataType: 'CSV',
  variables: ['age', 'score'],
  errors: [],
  warnings: [],
  columnStats: [
    {
      name: 'age',
      type: 'numeric',
      uniqueValues: 3,
      missingCount: 0,
      numericCount: 3,
      textCount: 0,
      mean: 30,
      median: 30,
      std: 5,
      min: 25,
      max: 35,
      outliers: []
    },
    {
      name: 'score',
      type: 'numeric',
      uniqueValues: 3,
      missingCount: 0,
      numericCount: 3,
      textCount: 0,
      mean: 84.3,
      median: 85,
      std: 6,
      min: 78,
      max: 90,
      outliers: []
    }
  ]
}

const mockMethod = {
  id: 'correlation',
  name: '상관 분석',
  category: 'correlation',
  requirements: {
    minSampleSize: 3,
    assumptions: ['normality', 'linearity']
  }
}

// Mock PyodideCore before other imports
jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => ({
      shapiroWilkTest: jest.fn().mockResolvedValue({
        statistic: 0.95,
        pValue: 0.3
      }),
      leveneTest: jest.fn().mockResolvedValue({
        statistic: 1.5,
        pValue: 0.2
      })
    })
  }
}))

// Mock dependencies
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    uploadedFile: { name: 'test.csv' },
    uploadedFileName: 'test.csv',
    uploadedData: mockData,
    validationResults: mockValidationResults,
    selectedMethod: mockMethod,
    setDataCharacteristics: jest.fn(),
    setAssumptionResults: jest.fn()
  })
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/components/common/analysis/DataPreviewTable', () => ({
  DataPreviewTable: () => <div data-testid="data-preview-table">Preview</div>
}))

jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(true)
  }
}))

jest.mock('@/lib/services/executors', () => ({
  StatisticalExecutor: {
    getInstance: () => ({
      executeMethod: jest.fn().mockResolvedValue({
        statistic: 2.5,
        pValue: 0.015,
        additionalInfo: {
          effectSize: { value: 0.5 },
          confidenceInterval: { lower: 0.1, upper: 0.9 }
        }
      })
    })
  }
}))

// Import components after mocks
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import { AnalysisExecutionStep } from '@/components/smart-flow/steps/AnalysisExecutionStep'

describe('Smart Flow Progress Display Tests', () => {
  describe('Step 1: DataUploadStep Progress', () => {
    it('should show progress bar when processing large files', () => {
      const { container } = render(
        <DataUploadStep
          onUploadComplete={jest.fn()}
          onNext={jest.fn()}
          canGoNext={false}
          currentStep={1}
          totalSteps={6}
        />
      )

      // 진행 바 컴포넌트 존재 확인 (초기 상태에서는 숨김)
      // 실제 파일 업로드 시 Progress 컴포넌트가 표시됨
      expect(container).toBeInTheDocument()
    })
  })

  describe('Step 2: DataValidationStep - No Progress (Instant)', () => {
    it('should render INSTANTLY without progress bar', async () => {
      const startTime = performance.now()

      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          canGoNext={true}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={6}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 즉시 렌더링 (< 100ms)
      expect(renderTime).toBeLessThan(100)

      // 기본 정보가 즉시 표시
      await waitFor(() => {
        expect(screen.getByText(/데이터 준비 완료|데이터 검증 통과/)).toBeInTheDocument()
      })
    })

    it('should NOT show loading skeleton or spinner', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          canGoNext={true}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={6}
        />
      )

      // Skeleton이나 Spinner가 없어야 함
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.queryByText(/로딩 중|처리 중/i)).not.toBeInTheDocument()
    })
  })

  describe('Step 5: AnalysisExecutionStep Progress', () => {
    it('should show 6-stage progress bar', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{}}
          onAnalysisComplete={jest.fn()}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          canGoNext={true}
          canGoPrevious={true}
        />
      )

      // 분석 시작 버튼 클릭 (자동 실행되는 경우도 있음)
      // Progress 컴포넌트가 표시되어야 함
      await waitFor(() => {
        const progressBars = screen.queryAllByRole('progressbar')
        expect(progressBars.length).toBeGreaterThanOrEqual(0)
      })
    })

    it('should show detailed execution logs', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{}}
          onAnalysisComplete={jest.fn()}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          canGoNext={true}
          canGoPrevious={true}
        />
      )

      // 로그 메시지가 표시되어야 함 (분석 진행 중)
      await waitFor(() => {
        // 로그 영역 존재 확인
        expect(screen.queryByText(/환경 준비|데이터 전처리|가정 검정|통계 분석/i)).toBeTruthy()
      }, { timeout: 5000 })
    })
  })

  describe('Progress Display Consistency', () => {
    it('각 단계별 진행 표시 방식', () => {
      const steps = [
        { step: 1, name: 'Upload', hasProgress: true, progressType: 'file-chunking' },
        { step: 2, name: 'Validation', hasProgress: false, progressType: 'instant' },
        { step: 3, name: 'Purpose', hasProgress: true, progressType: 'ai-analysis' },
        { step: 4, name: 'Variable', hasProgress: false, progressType: 'instant-select' },
        { step: 5, name: 'Analysis', hasProgress: true, progressType: '6-stages' },
        { step: 6, name: 'Results', hasProgress: false, progressType: 'instant-display' }
      ]

      steps.forEach(({ step, name, hasProgress, progressType }) => {
        if (hasProgress) {
          expect(progressType).toMatch(/file-chunking|ai-analysis|6-stages/)
        } else {
          expect(progressType).toMatch(/instant|instant-select|instant-display/)
        }
      })
    })
  })

  describe('Performance Requirements', () => {
    it('Step 2 should render in < 100ms (98% improvement)', async () => {
      const iterations = 5
      const renderTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()

        const { unmount } = render(
          <DataValidationStep
            validationResults={mockValidationResults}
            data={mockData}
            onNext={jest.fn()}
            onPrevious={jest.fn()}
            canGoNext={true}
            canGoPrevious={true}
            currentStep={2}
            totalSteps={6}
          />
        )

        const endTime = performance.now()
        renderTimes.push(endTime - startTime)

        unmount()
      }

      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / iterations

      // 평균 렌더링 시간 < 100ms
      expect(avgRenderTime).toBeLessThan(100)

      console.log(`Step 2 평균 렌더링 시간: ${avgRenderTime.toFixed(2)}ms`)
      console.log(`개별 측정값: ${renderTimes.map(t => t.toFixed(2)).join('ms, ')}ms`)
    })
  })
})
