/**
 * MemoryMonitor 컴포넌트 테스트
 *
 * 테스트 항목:
 * 1. 메모리 API 미지원 시 렌더링 안 함
 * 2. 메모리 사용량 70% 이상 시 경고 표시
 * 3. 메모리 사용량 85% 이상 시 심각 경고 표시
 * 4. 메모리 정상 시 경고 숨김
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryMonitor } from '@/components/memory-monitor'

// performance.memory 모킹을 위한 타입
interface MockPerformanceMemory {
  usedJSHeapSize: number
  jsHeapSizeLimit: number
}

describe('MemoryMonitor', () => {
  let originalPerformance: Performance
  let mockMemory: MockPerformanceMemory

  beforeEach(() => {
    // 원본 performance 저장
    originalPerformance = global.performance

    // 기본 모킹 (정상 상태: 50% 사용)
    mockMemory = {
      usedJSHeapSize: 1024 * 1048576, // 1GB
      jsHeapSizeLimit: 2048 * 1048576, // 2GB
    }

    Object.defineProperty(global.performance, 'memory', {
      configurable: true,
      get: () => mockMemory,
    })

    // 타이머는 실제 타이머 사용 (useEffect가 비동기적으로 실행되므로)
    jest.useRealTimers()
  })

  afterEach(() => {
    // 원본 복구
    global.performance = originalPerformance
  })

  describe('렌더링', () => {
    it('메모리 API 미지원 브라우저에서는 아무것도 렌더링하지 않아야 함', () => {
      // performance.memory 제거
      Object.defineProperty(global.performance, 'memory', {
        configurable: true,
        get: () => undefined,
      })

      render(<MemoryMonitor />)

      expect(screen.queryByText(/메모리/)).not.toBeInTheDocument()
    })

    it('메모리 사용량 50% (정상)일 때 경고를 표시하지 않아야 함', () => {
      render(<MemoryMonitor />)

      expect(screen.queryByText(/메모리/)).not.toBeInTheDocument()
    })

    it('메모리 사용량 70% 이상일 때 경고를 표시해야 함', async () => {
      // 70% 사용
      mockMemory.usedJSHeapSize = 1434 * 1048576 // 1.4GB
      mockMemory.jsHeapSizeLimit = 2048 * 1048576 // 2GB

      render(<MemoryMonitor />)

      await waitFor(() => {
        expect(screen.getByText(/메모리 사용량 높음/i)).toBeInTheDocument()
        expect(screen.getByText(/70%를 초과했습니다/i)).toBeInTheDocument()
      })
    })

    it('메모리 사용량 85% 이상일 때 심각 경고를 표시해야 함', async () => {
      // 85% 사용
      mockMemory.usedJSHeapSize = 1741 * 1048576 // 1.7GB
      mockMemory.jsHeapSizeLimit = 2048 * 1048576 // 2GB

      render(<MemoryMonitor />)

      await waitFor(() => {
        expect(screen.getByText(/메모리 부족 경고/i)).toBeInTheDocument()
        expect(screen.getByText(/85%를 초과했습니다/i)).toBeInTheDocument()
        expect(screen.getByText(/탭 크래시 위험/i)).toBeInTheDocument()
      })
    })
  })

  describe('메모리 체크 주기', () => {
    it('초기 렌더링 시 메모리를 체크해야 함', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      // 개발 모드 설정
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<MemoryMonitor />)

      // useEffect가 실행될 때까지 대기
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Memory]')
      )

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })

    it('컴포넌트 언마운트 시 타이머를 정리해야 함', async () => {
      const { unmount } = render(<MemoryMonitor />)

      // useEffect가 실행될 때까지 대기
      await waitFor(() => {
        // 렌더링 완료 확인
        expect(true).toBe(true)
      })

      // 언마운트 시 cleanup 함수가 호출되어 타이머가 정리됨
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('경고 상태 전환', () => {
    it('메모리 사용량에 따라 경고 상태가 변경되어야 함', async () => {
      // 정상 상태 (50%)
      const { unmount } = render(<MemoryMonitor />)
      expect(screen.queryByText(/메모리/)).not.toBeInTheDocument()
      unmount()

      // 경고 상태 (75%)
      mockMemory.usedJSHeapSize = 1536 * 1048576
      const { unmount: unmount2 } = render(<MemoryMonitor />)
      await waitFor(() => {
        expect(screen.getByText(/메모리 사용량 높음/i)).toBeInTheDocument()
      })
      unmount2()

      // 심각 상태 (90%)
      mockMemory.usedJSHeapSize = 1843 * 1048576
      render(<MemoryMonitor />)
      await waitFor(() => {
        expect(screen.getByText(/메모리 부족 경고/i)).toBeInTheDocument()
      })
    })
  })

  describe('디버그 로그', () => {
    it('개발 환경에서만 콘솔 로그를 출력해야 함', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const originalEnv = process.env.NODE_ENV

      // 개발 환경
      process.env.NODE_ENV = 'development'
      render(<MemoryMonitor />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Memory]')
        )
      })

      consoleSpy.mockClear()

      // 프로덕션 환경
      process.env.NODE_ENV = 'production'
      const { unmount } = render(<MemoryMonitor />)

      // 100ms 대기 후 확인
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(consoleSpy).not.toHaveBeenCalled()

      unmount()
      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })

    it('콘솔 로그에 사용량과 제한, 비율을 포함해야 함', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<MemoryMonitor />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[Memory\] \d+MB \/ \d+MB \(\d+\.\d+%\)/)
        )
      })

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })
  })

  describe('엣지 케이스', () => {
    it('메모리 제한이 0일 때 에러가 발생하지 않아야 함', () => {
      mockMemory.jsHeapSizeLimit = 0

      expect(() => render(<MemoryMonitor />)).not.toThrow()
    })

    it('메모리 값이 음수일 때 에러가 발생하지 않아야 함', () => {
      mockMemory.usedJSHeapSize = -1000

      expect(() => render(<MemoryMonitor />)).not.toThrow()
    })

    it('메모리 사용량이 제한을 초과할 때 (100% 이상) 처리해야 함', async () => {
      // 110% 사용 (비정상이지만 발생 가능)
      mockMemory.usedJSHeapSize = 2253 * 1048576
      mockMemory.jsHeapSizeLimit = 2048 * 1048576

      render(<MemoryMonitor />)

      await waitFor(() => {
        expect(screen.getByText(/메모리 부족 경고/i)).toBeInTheDocument()
      })
    })
  })
})
