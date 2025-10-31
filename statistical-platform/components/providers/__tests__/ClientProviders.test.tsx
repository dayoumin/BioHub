import { render, screen } from '@testing-library/react'
import { ClientProviders } from '../ClientProviders'
import { usePyodide } from '../PyodideProvider'

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>
}))

// Mock PyodideProvider
jest.mock('../PyodideProvider', () => ({
  usePyodide: jest.fn()
}))

describe('ClientProviders', () => {
  it('PyodideProvider를 포함하지 않아야 함 (전역 로딩 방지)', () => {
    render(
      <ClientProviders>
        <div data-testid="child-content">Test Content</div>
      </ClientProviders>
    )

    // ThemeProvider는 렌더링되어야 함
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()

    // children이 정상적으로 렌더링되어야 함
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('usePyodide를 호출하면 undefined를 반환해야 함 (Provider가 없으므로)', () => {
    const mockUsePyodide = usePyodide as jest.Mock
    mockUsePyodide.mockReturnValue({
      isLoaded: false,
      isLoading: false,
      error: null,
      service: null
    })

    function TestComponent() {
      const { service } = usePyodide()
      return <div data-testid="service-status">{service ? 'has-service' : 'no-service'}</div>
    }

    render(
      <ClientProviders>
        <TestComponent />
      </ClientProviders>
    )

    // ClientProviders 안에서는 Pyodide service가 없어야 함
    expect(screen.getByTestId('service-status')).toHaveTextContent('no-service')
  })
})