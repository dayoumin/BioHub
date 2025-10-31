import { render, screen } from '@testing-library/react'
import StatisticsLayout from '../layout'
import { usePyodide } from '@/components/providers/PyodideProvider'

// Mock PyodideProvider
jest.mock('@/components/providers/PyodideProvider', () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="pyodide-provider">{children}</div>,
  usePyodide: jest.fn()
}))

describe('StatisticsLayout', () => {
  it('PyodideProvider로 children을 감싸야 함', () => {
    render(
      <StatisticsLayout>
        <div data-testid="child-content">Test Content</div>
      </StatisticsLayout>
    )

    // PyodideProvider가 렌더링되었는지 확인
    expect(screen.getByTestId('pyodide-provider')).toBeInTheDocument()

    // children이 정상적으로 렌더링되는지 확인
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('통계 페이지에서 usePyodide hook을 사용할 수 있어야 함', () => {
    // Mock usePyodide 응답 설정
    const mockUsePyodide = usePyodide as jest.Mock
    mockUsePyodide.mockReturnValue({
      isLoaded: true,
      isLoading: false,
      error: null,
      service: {
        oneSampleTTest: jest.fn(),
        normalityTest: jest.fn()
      }
    })

    // Test Component that uses usePyodide
    function TestComponent() {
      const { isLoaded, service } = usePyodide()
      return (
        <div>
          <span data-testid="loaded-status">{isLoaded ? 'loaded' : 'not-loaded'}</span>
          <span data-testid="service-status">{service ? 'has-service' : 'no-service'}</span>
        </div>
      )
    }

    render(
      <StatisticsLayout>
        <TestComponent />
      </StatisticsLayout>
    )

    // usePyodide가 호출되었는지 확인
    expect(mockUsePyodide).toHaveBeenCalled()

    // Pyodide 상태가 정상적으로 전달되는지 확인
    expect(screen.getByTestId('loaded-status')).toHaveTextContent('loaded')
    expect(screen.getByTestId('service-status')).toHaveTextContent('has-service')
  })
})