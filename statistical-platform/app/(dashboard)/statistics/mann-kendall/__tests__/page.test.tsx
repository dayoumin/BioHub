import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MannKendallPage from '../page'

// Mock PyodideService
const mockRunPython = jest.fn()
jest.mock('@/hooks/use-pyodide-service', () => ({
  usePyodideService: () => ({
    runPython: mockRunPython,
    isLoading: false,
    error: null
  })
}))

// Mock DataUploadStep - provides button to upload data
jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return function MockDataUploadStep({
    onUploadComplete
  }: {
    onUploadComplete: (file: File, data: Record<string, unknown>[]) => void
  }) {
    const handleUpload = () => {
      const mockData = [
        { time: 1, temperature: 15.2 },
        { time: 2, temperature: 16.1 },
        { time: 3, temperature: 17.5 },
        { time: 4, temperature: 18.9 },
        { time: 5, temperature: 19.8 }
      ]
      const mockFile = new File([''], 'test.csv')
      onUploadComplete(mockFile, mockData)
    }

    return (
      <div data-testid="data-upload-step">
        <div>Data Upload Step</div>
        <button onClick={handleUpload} data-testid="upload-button">
          Upload Data
        </button>
      </div>
    )
  }
})

// Mock VariableSelector
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: function MockVariableSelector({
    onVariablesSelected,
    methodId,
    data
  }: {
    onVariablesSelected: (mapping: unknown) => void
    methodId: string
    data: unknown
  }) {
    const handleSelect = () => {
      const mockMapping = {
        target: ['temperature'] // Single variable name
      }
      onVariablesSelected(mockMapping)
    }

    return (
      <div data-testid="variable-selector">
        <button onClick={handleSelect} data-testid="select-variables">
          Select Variables
        </button>
        <div data-testid="method-id">{methodId}</div>
        <div data-testid="has-data">{data ? 'yes' : 'no'}</div>
      </div>
    )
  }
}))

describe('Mann-Kendall Trend Test Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Helper function to render page and wait for VariableSelector
  async function uploadDataAndReachStep2() {
    render(<MannKendallPage />)

    // DataUploadStep auto-uploads on render
    // Wait for VariableSelector to appear (Step 2)
    await waitFor(() => {
      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
    }, { timeout: 2000 })
  }

  it('renders the page with correct title and structure', () => {
    render(<MannKendallPage />)

    expect(screen.getByText('Mann-Kendall 추세 검정')).toBeInTheDocument()
    expect(screen.getByText(/시계열 데이터의 단조 증가\/감소 추세 검정/)).toBeInTheDocument()

    // Check 4-step structure exists (may have duplicates in layout)
    expect(screen.getAllByText('방법론 이해').length).toBeGreaterThan(0)
    expect(screen.getAllByText('데이터 업로드').length).toBeGreaterThan(0)
    expect(screen.getAllByText('변수 선택 및 분석').length).toBeGreaterThan(0)
    expect(screen.getAllByText('결과 해석').length).toBeGreaterThan(0)
  })

  it('allows test method selection', () => {
    render(<MannKendallPage />)

    // Check all test methods are available
    expect(screen.getByText('기본 Mann-Kendall 검정')).toBeInTheDocument()
    expect(screen.getByText('Hamed-Rao 수정 MK 검정')).toBeInTheDocument()
    expect(screen.getByText('Yue-Wang 수정 MK 검정')).toBeInTheDocument()
    expect(screen.getByText('Pre-whitening MK 검정')).toBeInTheDocument()

    // Test method selection
    const hamedRaoOption = screen.getByLabelText('Hamed-Rao 수정 MK 검정')
    fireEvent.click(hamedRaoOption)
    expect(hamedRaoOption).toBeChecked()
  })

  it('performs analysis with increasing monotonic trend', async () => {
    // Mock successful analysis with increasing trend
    const mockResult = {
      trend: 'increasing',
      h: true,
      p: 0.0023,
      z: 3.162,
      tau: 0.733,
      s: 33,
      var_s: 109.33,
      slope: 4.2,
      intercept: -2.1
    }

    mockRunPython.mockResolvedValueOnce(mockResult)

    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    // Click variable selection
    const selectButton = screen.getByTestId('select-variables')
    fireEvent.click(selectButton)

    await waitFor(() => {
      expect(mockRunPython).toHaveBeenCalledWith(
        expect.stringContaining('pymannkendall as mk')
      )
    })

    // Check results are displayed
    await waitFor(() => {
      expect(screen.getByText('증가 추세')).toBeInTheDocument()
      expect(screen.getByText('유의함')).toBeInTheDocument()
      expect(screen.getByText('4.200000')).toBeInTheDocument() // Sen's slope
    })
  })

  it('performs analysis with decreasing monotonic trend', async () => {
    // Mock decreasing trend result
    const mockResult = {
      trend: 'decreasing',
      h: true,
      p: 0.0045,
      z: -2.891,
      tau: -0.644,
      s: -29,
      var_s: 102.67,
      slope: -3.1,
      intercept: 25.5
    }

    mockRunPython.mockResolvedValueOnce(mockResult)

    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    // Simulate variable selection
    fireEvent.click(screen.getByTestId('select-variables'))

    await waitFor(() => {
      expect(screen.getByText('감소 추세')).toBeInTheDocument()
      expect(screen.getByText('-3.100000')).toBeInTheDocument() // Negative slope
    })
  })

  it('handles no trend case', async () => {
    const mockResult = {
      trend: 'no trend',
      h: false,
      p: 0.456,
      z: 0.745,
      tau: 0.123,
      s: 5,
      var_s: 45.33,
      slope: 0.02,
      intercept: 10.5
    }

    mockRunPython.mockResolvedValueOnce(mockResult)

    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    fireEvent.click(screen.getByTestId('select-variables'))

    await waitFor(() => {
      expect(screen.getByText('추세 없음')).toBeInTheDocument()
      expect(screen.getByText('유의하지 않음')).toBeInTheDocument()
    })
  })

  it('validates Python code for monotonic trend detection', async () => {
    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    fireEvent.click(screen.getByTestId('select-variables'))

    await waitFor(() => {
      const pythonCall = mockRunPython.mock.calls[0][0]

      // Check essential components for monotonic trend analysis
      expect(pythonCall).toContain('import pymannkendall as mk')
      expect(pythonCall).toContain('mk.original_test(data, alpha=0.05)')
      expect(pythonCall).toContain('result.trend')
      expect(pythonCall).toContain('result.slope')
      expect(pythonCall).toContain('result.Tau')

      // Check data validation
      expect(pythonCall).toContain('len(data) < 4')
      expect(pythonCall).toContain('최소 4개의 관측값이 필요')
    })
  })

  it('displays correct interpretation for different trend types', async () => {
    const increasingResult = {
      trend: 'increasing',
      h: true,
      p: 0.001,
      z: 3.5,
      tau: 0.8,
      s: 40,
      var_s: 120,
      slope: 5.2,
      intercept: 2.1
    }

    mockRunPython.mockResolvedValueOnce(increasingResult)

    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    fireEvent.click(screen.getByTestId('select-variables'))

    await waitFor(() => {
      // Check trend interpretation
      expect(screen.getByText(/증가 추세 감지/)).toBeInTheDocument()
      expect(screen.getByText(/통계적으로 유의한 증가 추세/)).toBeInTheDocument()
      expect(screen.getByText(/단위 시간당 평균 증가량/)).toBeInTheDocument()
    })

    // Check tabs are present
    expect(screen.getByText('통계량')).toBeInTheDocument()
    expect(screen.getByText('해석')).toBeInTheDocument()
    expect(screen.getByText('가정')).toBeInTheDocument()
    expect(screen.getByText('시각화')).toBeInTheDocument()
  })

  it('handles analysis errors gracefully', async () => {
    mockRunPython.mockRejectedValueOnce(new Error('Analysis failed'))

    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    fireEvent.click(screen.getByTestId('select-variables'))

    await waitFor(() => {
      expect(screen.getByText('분석 오류')).toBeInTheDocument()
      expect(screen.getByText('Analysis failed')).toBeInTheDocument()
    })
  })

  it('validates monotonic trend detection requirements', async () => {
    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    // Check that VariableSelector is rendered with correct methodId
    const methodIdDisplay = screen.getByTestId('method-id')
    expect(methodIdDisplay).toHaveTextContent('mann-kendall-test')

    // Check that data is available
    const hasDataDisplay = screen.getByTestId('has-data')
    expect(hasDataDisplay).toHaveTextContent('yes')
  })

  it('provides comprehensive assumption information', () => {
    render(<MannKendallPage />)

    // Check assumption information is present
    expect(screen.getByText(/비모수적 방법/)).toBeInTheDocument()
    expect(screen.getByText(/정규분포 가정이 불필요/)).toBeInTheDocument()
    expect(screen.getByText(/독립성 가정/)).toBeInTheDocument()
    expect(screen.getByText(/최소 표본 크기/)).toBeInTheDocument()
    expect(screen.getByText(/단조성 가정/)).toBeInTheDocument()
    expect(screen.getByText(/단조 증가 또는 단조 감소 추세만 감지/)).toBeInTheDocument()
  })

  it('tests different Mann-Kendall variants for monotonic trends', async () => {
    // Test original method specifically
    mockRunPython.mockResolvedValueOnce({
      trend: 'increasing',
      h: true,
      p: 0.02,
      z: 2.1,
      tau: 0.5,
      s: 20,
      var_s: 90,
      slope: 2.5,
      intercept: 1.0
    })

    // Upload data and reach Step 2 (Variable Selection)
    await uploadDataAndReachStep2()

    // Default should be original test
    fireEvent.click(screen.getByTestId('select-variables'))

    await waitFor(() => {
      const pythonCall = mockRunPython.mock.calls[0][0]
      expect(pythonCall).toContain('mk.original_test')
      expect(pythonCall).toContain('test_type == "original"')
    })
  })
})