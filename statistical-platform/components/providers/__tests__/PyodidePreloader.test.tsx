import { render, screen, waitFor, act } from '@testing-library/react'
import { PyodidePreloader } from '../PyodidePreloader'

// Mock PyodideCoreService 전체 모듈
jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: jest.fn()
  }
}))

// Import the mocked module
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('PyodidePreloader', () => {
  let mockCoreService: {
    isInitialized: jest.Mock
    initialize: jest.Mock
    onProgress: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockCoreService = {
      isInitialized: jest.fn().mockReturnValue(false),
      initialize: jest.fn().mockResolvedValue(undefined),
      onProgress: jest.fn().mockReturnValue(() => {}) // removeListener 함수 반환
    }

    ;(PyodideCoreService.getInstance as jest.Mock).mockReturnValue(mockCoreService)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('이미 초기화된 경우 렌더링하지 않아야 함', () => {
    mockCoreService.isInitialized.mockReturnValue(true)

    const { container } = render(<PyodidePreloader />)

    expect(container.firstChild).toBeNull()
    expect(mockCoreService.initialize).not.toHaveBeenCalled()
  })

  it('1초 후 프리로딩을 시작해야 함', async () => {
    render(<PyodidePreloader />)

    // 1초 전에는 initialize 호출 안 됨
    expect(mockCoreService.initialize).not.toHaveBeenCalled()

    // 1초 후
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockCoreService.initialize).toHaveBeenCalledTimes(1)
    })
  })

  it('프리로딩 중 UI를 표시해야 함', async () => {
    let progressCallback: ((progress: { progress: number }) => void) | null = null

    mockCoreService.onProgress.mockImplementation((callback: (progress: { progress: number }) => void) => {
      progressCallback = callback
      return () => {} // removeListener
    })

    mockCoreService.initialize.mockImplementation(async () => {
      // 초기화 지연 (UI가 표시되도록)
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    render(<PyodidePreloader />)

    // 1초 후 프리로딩 시작
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText('통계 엔진 준비 중')).toBeInTheDocument()
    })

    // 진행률 업데이트
    act(() => {
      if (progressCallback) {
        progressCallback({ progress: 25 })
      }
    })

    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument()
      expect(screen.getByText(/NumPy 패키지 로딩 중/)).toBeInTheDocument()
    })
  })

  it('진행률 스테이지별 메시지가 올바르게 표시되어야 함', async () => {
    let progressCallback: ((progress: { progress: number }) => void) | null = null

    mockCoreService.onProgress.mockImplementation((callback: (progress: { progress: number }) => void) => {
      progressCallback = callback
      return () => {}
    })

    mockCoreService.initialize.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    render(<PyodidePreloader />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText('통계 엔진 준비 중')).toBeInTheDocument()
    })

    // 0-25%: Pyodide 런타임
    act(() => {
      if (progressCallback) progressCallback({ progress: 10 })
    })
    await waitFor(() => {
      expect(screen.getByText(/Pyodide 런타임 로딩 중/)).toBeInTheDocument()
    })

    // 25-50%: NumPy
    act(() => {
      if (progressCallback) progressCallback({ progress: 30 })
    })
    await waitFor(() => {
      expect(screen.getByText(/NumPy 패키지 로딩 중/)).toBeInTheDocument()
    })

    // 50-85%: SciPy
    act(() => {
      if (progressCallback) progressCallback({ progress: 60 })
    })
    await waitFor(() => {
      expect(screen.getByText(/SciPy 패키지 로딩 중/)).toBeInTheDocument()
    })

    // 85-100%: 헬퍼
    act(() => {
      if (progressCallback) progressCallback({ progress: 90 })
    })
    await waitFor(() => {
      expect(screen.getByText(/헬퍼 모듈 로딩 중/)).toBeInTheDocument()
    })

    // 100%: 완료
    act(() => {
      if (progressCallback) progressCallback({ progress: 100 })
    })
    await waitFor(() => {
      expect(screen.getByText(/준비 완료/)).toBeInTheDocument()
    })
  })

  it('프리로딩 완료 후 UI를 숨겨야 함', async () => {
    mockCoreService.initialize.mockResolvedValue(undefined)

    const { container } = render(<PyodidePreloader />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockCoreService.initialize).toHaveBeenCalled()
    })

    // 프리로딩 완료 후
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('프리로딩 실패 시 조용히 무시해야 함', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    mockCoreService.initialize.mockRejectedValue(new Error('Network error'))

    const { container } = render(<PyodidePreloader />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockCoreService.initialize).toHaveBeenCalled()
    })

    // 에러가 발생해도 UI가 사라져야 함
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })

    // console.warn이 호출되어야 함
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PyodidePreloader] 백그라운드 프리로딩 실패:',
      expect.any(Error)
    )

    consoleWarnSpy.mockRestore()
  })

  it('컴포넌트 unmount 시 타이머를 정리해야 함', () => {
    const { unmount } = render(<PyodidePreloader />)

    // unmount 전에 타이머가 pending 상태여야 함
    expect(jest.getTimerCount()).toBeGreaterThan(0)

    unmount()

    // unmount 후 타이머가 정리되어야 함
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // initialize가 호출되지 않아야 함 (타이머가 정리됨)
    expect(mockCoreService.initialize).not.toHaveBeenCalled()
  })

  it('진행률 리스너를 올바르게 등록 및 제거해야 함', async () => {
    const removeListenerMock = jest.fn()
    mockCoreService.onProgress.mockReturnValue(removeListenerMock)

    const { unmount } = render(<PyodidePreloader />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(mockCoreService.onProgress).toHaveBeenCalled()
    })

    // 프리로딩 완료 후 리스너 제거
    await waitFor(() => {
      expect(removeListenerMock).toHaveBeenCalled()
    })
  })
})
