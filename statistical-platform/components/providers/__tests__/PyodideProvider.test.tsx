import { render, screen, waitFor } from '@testing-library/react'
import { PyodideProvider, usePyodide } from '../PyodideProvider'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

// Mock PyodideStatisticsService
jest.mock('@/lib/services/pyodide-statistics', () => ({
  PyodideStatisticsService: {
    getInstance: jest.fn()
  }
}))

// Mock retryPyodideOperation
jest.mock('@/lib/services/pyodide-helper', () => ({
  retryPyodideOperation: jest.fn((fn) => fn())
}))

// Test component that uses usePyodide hook
function TestComponent() {
  const { isLoaded, isLoading, error, service } = usePyodide()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="loaded">{isLoaded ? 'loaded' : 'not-loaded'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="service">{service ? 'has-service' : 'no-service'}</div>
    </div>
  )
}

describe('PyodideProvider', () => {
  let mockService: {
    isInitialized: jest.Mock
    initialize: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockService = {
      isInitialized: jest.fn().mockReturnValue(false),
      initialize: jest.fn().mockResolvedValue(undefined)
    }

    ;(PyodideStatisticsService.getInstance as jest.Mock).mockReturnValue(mockService)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('초기 상태가 올바르게 설정됨', () => {
    render(
      <PyodideProvider>
        <TestComponent />
      </PyodideProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('loaded')).toHaveTextContent('not-loaded')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
  })

  it('Pyodide 초기화 성공 시 상태 업데이트', async () => {
    render(
      <PyodideProvider>
        <TestComponent />
      </PyodideProvider>
    )

    // 초기화 완료 대기
    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded')
    }, { timeout: 5000 })

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    expect(screen.getByTestId('service')).toHaveTextContent('has-service')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
  })

  it('Pyodide 초기화 실패 시 에러 상태 설정', async () => {
    const errorMessage = 'Pyodide 초기화 실패'
    mockService.initialize.mockRejectedValue(new Error(errorMessage))

    render(
      <PyodideProvider>
        <TestComponent />
      </PyodideProvider>
    )

    // 에러 발생 대기
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(errorMessage)
    }, { timeout: 5000 })

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    expect(screen.getByTestId('loaded')).toHaveTextContent('not-loaded')
  })

  it('이미 초기화된 경우 빠른 상태 복구', async () => {
    mockService.isInitialized.mockReturnValue(true)

    render(
      <PyodideProvider>
        <TestComponent />
      </PyodideProvider>
    )

    // 즉시 로드 완료 상태
    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded')
    })

    // initialize()가 호출되지 않아야 함
    expect(mockService.initialize).not.toHaveBeenCalled()
  })

  it('setError 함수가 올바르게 작동함 (Line 51, 71, 119 검증)', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    const errorMessage = 'Test error'
    mockService.initialize.mockRejectedValue(new Error(errorMessage))

    render(
      <PyodideProvider>
        <TestComponent />
      </PyodideProvider>
    )

    // 에러 발생 대기 (Line 71: setError() 호출 확인)
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(errorMessage)
    }, { timeout: 5000 })

    // 에러 메시지가 UI에 표시됨
    expect(screen.getByText('⚠️ 통계 엔진 로드 실패')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})