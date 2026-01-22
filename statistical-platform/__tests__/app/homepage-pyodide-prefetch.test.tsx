/**
 * Homepage Pyodide Prefetch Test
 *
 * "분석 시작하기" 버튼 hover 시 Pyodide prefetch가 올바르게 동작하는지 검증
 */

import { render, screen, fireEvent } from '@testing-library/react'

import { vi } from 'vitest'
// Mock PyodideCoreService
const mockInitialize = vi.fn().mockResolvedValue(undefined)
const mockGetInstance = vi.fn().mockReturnValue({
  initialize: mockInitialize
})

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => mockGetInstance()
  }
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/'
}))

// Mock STATISTICS_MENU
vi.mock('@/lib/statistics/menu-config', () => ({
  STATISTICS_MENU: [
    {
      id: 'basic',
      title: 'Basic',
      icon: () => null,
      items: [
        { id: 't-test', title: 'T-Test', href: '/statistics/t-test', implemented: true }
      ]
    }
  ]
}))

// Import after mocks
import HomePage from '@/app/page'

describe('Homepage Pyodide Prefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // localStorage mock
    Storage.prototype.getItem = vi.fn(() => null)
    Storage.prototype.setItem = vi.fn()
  })

  it('should prefetch Pyodide when hovering over "Start Analysis" button', () => {
    // Arrange: Render HomePage
    render(<HomePage />)

    // Act: Find the button and simulate hover
    const startButton = screen.getByRole('button', { name: /분석 시작하기/i })
    fireEvent.mouseEnter(startButton)

    // Assert: PyodideCoreService.getInstance().initialize() should be called
    expect(mockGetInstance).toHaveBeenCalledTimes(1)
    expect(mockInitialize).toHaveBeenCalledTimes(1)
  })

  it('should only prefetch once even with multiple hovers', () => {
    // Arrange
    render(<HomePage />)
    const startButton = screen.getByRole('button', { name: /분석 시작하기/i })

    // Act: Hover multiple times
    fireEvent.mouseEnter(startButton)
    fireEvent.mouseLeave(startButton)
    fireEvent.mouseEnter(startButton)
    fireEvent.mouseLeave(startButton)
    fireEvent.mouseEnter(startButton)

    // Assert: Should only call initialize once (useRef guard)
    expect(mockInitialize).toHaveBeenCalledTimes(1)
  })

  it('should silently catch initialization errors', async () => {
    // Arrange: Make initialize reject
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation()
    mockInitialize.mockRejectedValueOnce(new Error('Network error'))

    render(<HomePage />)
    const startButton = screen.getByRole('button', { name: /분석 시작하기/i })

    // Act: Hover (this will trigger the rejected promise)
    fireEvent.mouseEnter(startButton)

    // Wait for promise to settle
    await new Promise(resolve => setTimeout(resolve, 0))

    // Assert: No unhandled rejection (error is caught silently)
    // If there was an unhandled rejection, the test would fail
    expect(mockInitialize).toHaveBeenCalledTimes(1)

    consoleErrorSpy.mockRestore()
  })

  it('should not prefetch on page load (only on hover)', () => {
    // Arrange & Act: Just render, no hover
    render(<HomePage />)

    // Assert: initialize should NOT be called
    expect(mockInitialize).not.toHaveBeenCalled()
  })
})
