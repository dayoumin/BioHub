import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import AnalysisLayout from '../layout'
import { usePyodide } from '@/components/providers/PyodideProvider'

// Mock PyodideProvider - 실제 Pyodide 로딩은 테스트하지 않음
vi.mock('@/components/providers/PyodideProvider', () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="pyodide-provider">{children}</div>,
  usePyodide: vi.fn()
}))

describe('AnalysisLayout', () => {
  it('children을 그대로 렌더링해야 함', () => {
    // AnalysisLayout은 /analysis → / 리다이렉트 라우트의 최소 레이아웃
    // PyodideProvider 래퍼 없이 children을 직접 렌더링
    render(
      <AnalysisLayout>
        <div data-testid="child-content">Test Content</div>
      </AnalysisLayout>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.queryByTestId('pyodide-provider')).not.toBeInTheDocument()
  })

  it('Smart Flow 페이지에서 usePyodide hook을 사용할 수 있어야 함', () => {
    // Mock usePyodide 응답 설정
    const mockUsePyodide = usePyodide as jest.Mock
    mockUsePyodide.mockReturnValue({
      isLoaded: true,
      isLoading: false,
      error: null,
      service: {
        checkAllAssumptions: vi.fn()
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
      <AnalysisLayout>
        <TestComponent />
      </AnalysisLayout>
    )

    // usePyodide가 호출되었는지 확인
    expect(mockUsePyodide).toHaveBeenCalled()

    // Pyodide 상태가 정상적으로 전달되는지 확인
    expect(screen.getByTestId('loaded-status')).toHaveTextContent('loaded')
    expect(screen.getByTestId('service-status')).toHaveTextContent('has-service')
  })
})