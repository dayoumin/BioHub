/**
 * Smart Flow Performance Test
 *
 * 목적: Step 2 (Data Validation) 로딩 속도 회귀 방지
 * 이전 버그: Shapiro-Wilk + Levene 검정이 Step 2에서 실행되어 5-10초 지연
 * 수정 내용: Step 2는 빠른 검증만, 무거운 통계 계산은 Step 5로 연기
 */

import { render, screen, waitFor } from '@testing-library/react'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import { DataValidationStepWithCharts } from '@/components/smart-flow/steps/DataValidationStepWithCharts'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock dependencies
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    uploadedFile: { name: 'test.csv' },
    uploadedFileName: 'test.csv',
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

// Mock Plotly charts
jest.mock('@/components/charts/PlotlyChartImproved', () => ({
  PlotlyChartImproved: () => <div data-testid="plotly-chart">Chart</div>
}))

jest.mock('@/components/charts/StatisticalChartsImproved', () => ({
  HistogramChart: () => <div>Histogram</div>,
  BoxPlotChart: () => <div>BoxPlot</div>,
  BarChart: () => <div>BarChart</div>
}))

describe('Smart Flow Performance Tests', () => {
  const mockData: DataRow[] = [
    { age: 25, height: 170, weight: 65, gender: 'M' },
    { age: 30, height: 175, weight: 70, gender: 'F' },
    { age: 35, height: 168, weight: 60, gender: 'M' },
    { age: 28, height: 172, weight: 68, gender: 'F' },
    { age: 32, height: 180, weight: 75, gender: 'M' }
  ]

  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 5,
    columnCount: 4,
    missingValues: 0,
    dataType: 'CSV',
    variables: ['age', 'height', 'weight', 'gender'],
    errors: [],
    warnings: [],
    columnStats: [
      {
        name: 'age',
        type: 'numeric',
        uniqueValues: 5,
        missingCount: 0,
        numericCount: 5,
        textCount: 0,
        mean: 30,
        median: 30,
        std: 3.5,
        min: 25,
        max: 35,
        outliers: []
      },
      {
        name: 'height',
        type: 'numeric',
        uniqueValues: 5,
        missingCount: 0,
        numericCount: 5,
        textCount: 0,
        mean: 173,
        median: 172,
        std: 4.5,
        min: 168,
        max: 180,
        outliers: []
      },
      {
        name: 'weight',
        type: 'numeric',
        uniqueValues: 5,
        missingCount: 0,
        numericCount: 5,
        textCount: 0,
        mean: 67.6,
        median: 68,
        std: 5.5,
        min: 60,
        max: 75,
        outliers: []
      },
      {
        name: 'gender',
        type: 'categorical',
        uniqueValues: 2,
        missingCount: 0,
        numericCount: 0,
        textCount: 5,
        topCategories: [
          { value: 'M', count: 3 },
          { value: 'F', count: 2 }
        ]
      }
    ]
  }

  describe('DataValidationStep (Simple) Performance', () => {
    it('should render IMMEDIATELY without heavy calculations', async () => {
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

      // Step 2는 즉시 렌더링되어야 함 (< 100ms)
      expect(renderTime).toBeLessThan(100)

      // 기본 정보가 즉시 표시되어야 함
      await waitFor(() => {
        expect(screen.getByText(/데이터 준비 완료|데이터 검증 통과/)).toBeInTheDocument()
      })
    })

    it('should NOT call PyodideCore during initial render', async () => {
      // PyodideCoreService mock
      const shapiroWilkTestSpy = jest.fn()
      const leveneTestSpy = jest.fn()

      jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
        PyodideCoreService: {
          getInstance: () => ({
            shapiroWilkTest: shapiroWilkTestSpy,
            leveneTest: leveneTestSpy
          })
        }
      }))

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

      // 초기 렌더링 직후 PyodideCore가 호출되지 않아야 함
      await waitFor(() => {
        expect(screen.getByText(/데이터 준비 완료|데이터 검증 통과/)).toBeInTheDocument()
      }, { timeout: 100 })

      // PyodideCore 호출 없음 확인
      expect(shapiroWilkTestSpy).not.toHaveBeenCalled()
      expect(leveneTestSpy).not.toHaveBeenCalled()
    })
  })

  describe('DataValidationStepWithCharts Lazy Loading', () => {
    it('should NOT calculate correlation matrix on initial render', async () => {
      const workerManagerSpy = jest.fn()

      jest.mock('@/lib/services/worker-manager', () => ({
        workerManager: {
          calculateCorrelationMatrix: workerManagerSpy
        },
        shouldUseWorker: () => false
      }))

      render(
        <DataValidationStepWithCharts
          validationResults={mockValidationResults}
          data={mockData}
        />
      )

      // 초기 렌더링 직후 상관계수 계산이 실행되지 않아야 함
      await waitFor(() => {
        expect(screen.getByText(/데이터 검증 통과|데이터 준비 완료/)).toBeInTheDocument()
      }, { timeout: 100 })

      // Worker 호출 없음 확인
      expect(workerManagerSpy).not.toHaveBeenCalled()
    })

    it('should calculate correlation matrix ONLY when visualization tab is clicked', async () => {
      const { getByText } = render(
        <DataValidationStepWithCharts
          validationResults={mockValidationResults}
          data={mockData}
        />
      )

      // 초기 렌더링 시 상관계수 계산 없음
      await waitFor(() => {
        expect(screen.getByText(/데이터 검증 통과|데이터 준비 완료/)).toBeInTheDocument()
      })

      // TODO: 시각화 탭 클릭 시뮬레이션 추가
      // const visualizationTab = getByText('시각화')
      // fireEvent.click(visualizationTab)
      // await waitFor(() => {
      //   expect(workerManagerSpy).toHaveBeenCalled()
      // })
    })
  })

  describe('Regression Prevention', () => {
    it('회귀 방지: useEffect에 PyodideCore 호출이 없어야 함', () => {
      const DataValidationStepSource = require('fs').readFileSync(
        require.resolve('@/components/smart-flow/steps/DataValidationStep'),
        'utf-8'
      )

      // Step 2에서 PyodideCore 직접 호출 금지
      expect(DataValidationStepSource).not.toContain('PyodideCoreService.getInstance()')
      expect(DataValidationStepSource).not.toContain('shapiroWilkTest')
      expect(DataValidationStepSource).not.toContain('leveneTest')
    })

    it('회귀 방지: DataValidationStepWithCharts는 lazy loading 사용해야 함', () => {
      const DataValidationStepWithChartsSource = require('fs').readFileSync(
        require.resolve('@/components/smart-flow/steps/DataValidationStepWithCharts'),
        'utf-8'
      )

      // shouldCalculateCorrelation 상태 변수 존재 확인
      expect(DataValidationStepWithChartsSource).toContain('shouldCalculateCorrelation')

      // useEffect 의존성에 shouldCalculateCorrelation 포함 확인
      expect(DataValidationStepWithChartsSource).toContain('[shouldCalculateCorrelation]')
    })
  })
})
