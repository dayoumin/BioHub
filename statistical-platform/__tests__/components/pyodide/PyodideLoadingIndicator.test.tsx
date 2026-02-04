/**
 * PyodideLoadingIndicator 컴포넌트 테스트
 *
 * 테스트 시나리오:
 * 1. 로딩 중 상태 표시
 * 2. 에러 상태 표시 및 재시도
 * 3. 성공 상태 표시 및 자동 숨김
 * 4. 확장/축소 동작
 * 5. 조건부 렌더링 (아무것도 표시 안함)
 * 6. 캐시 복원 UX (fromCache=true)
 * 7. 일반 로딩 UX (fromCache=false/undefined)
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PyodideLoadingIndicator } from '@/components/pyodide/PyodideLoadingIndicator'
import type { PyodideLoadingProgress } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('PyodideLoadingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ===== 시나리오 1: 로딩 중 상태 =====
  describe('로딩 중 상태', () => {
    it('로딩 중일 때 프로그레스 바와 퍼센트를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'numpy',
        progress: 45,
        message: 'NumPy 로딩 중...'
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 로딩 중...')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
    })

    it('확장 버튼 클릭 시 상세 정보를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'scipy',
        progress: 70,
        message: 'SciPy 패키지 로딩'
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      // 확장 버튼 클릭
      const expandButton = screen.getByRole('button')
      fireEvent.click(expandButton)

      // 상세 정보 표시 확인
      expect(screen.getByText('SciPy 로딩 중...')).toBeInTheDocument()
      expect(screen.getByText('SciPy 패키지 로딩')).toBeInTheDocument()
    })

    it('progress가 null이면 로딩 UI를 표시하지 않는다', () => {
      render(
        <PyodideLoadingIndicator
          progress={null}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      expect(screen.queryByText('통계 엔진 로딩 중...')).not.toBeInTheDocument()
    })
  })

  // ===== 시나리오 2: 에러 상태 =====
  describe('에러 상태', () => {
    it('에러가 있으면 에러 메시지를 표시한다', () => {
      render(
        <PyodideLoadingIndicator
          progress={null}
          isLoading={false}
          isLoaded={false}
          error="네트워크 오류"
        />
      )

      expect(screen.getByText('통계 엔진 로드 실패')).toBeInTheDocument()
    })

    it('재시도 버튼 클릭 시 onRetry 콜백을 호출한다', () => {
      const onRetry = vi.fn()

      render(
        <PyodideLoadingIndicator
          progress={null}
          isLoading={false}
          isLoaded={false}
          error="로드 실패"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByText('다시 시도')
      fireEvent.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('onRetry가 없으면 재시도 버튼을 표시하지 않는다', () => {
      render(
        <PyodideLoadingIndicator
          progress={null}
          isLoading={false}
          isLoaded={false}
          error="로드 실패"
        />
      )

      expect(screen.queryByText('다시 시도')).not.toBeInTheDocument()
    })
  })

  // ===== 시나리오 3: 성공 상태 =====
  describe('성공 상태', () => {
    it('로딩 완료 시 성공 메시지를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'complete',
        progress: 100,
        message: '완료'
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={false}
          isLoaded={true}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 준비 완료')).toBeInTheDocument()
    })

    it('성공 메시지는 3초 후 자동으로 숨겨진다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'complete',
        progress: 100,
        message: '완료'
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={false}
          isLoaded={true}
          error={null}
        />
      )

      // 성공 메시지 표시 확인
      expect(screen.getByText('통계 엔진 준비 완료')).toBeInTheDocument()

      // 3초 후 자동 숨김 (fake timers 사용)
      act(() => {
        vi.advanceTimersByTime(3100) // 3초 + 여유
      })

      // 숨겨짐 확인 (동기적으로)
      expect(screen.queryByText('통계 엔진 준비 완료')).not.toBeInTheDocument()
    })
  })

  // ===== 시나리오 4: 조건부 렌더링 =====
  describe('조건부 렌더링', () => {
    it('로딩/에러/성공 모두 아니면 아무것도 렌더링하지 않는다', () => {
      const { container } = render(
        <PyodideLoadingIndicator
          progress={null}
          isLoading={false}
          isLoaded={true}
          error={null}
        />
      )

      // 성공 상태지만 stage가 complete가 아니면 성공 메시지 안 나옴
      // 그리고 3초 후에는 숨겨짐
      act(() => {
        vi.advanceTimersByTime(3500)
      })

      expect(container.firstChild).toBeNull()
    })
  })

  // ===== 시나리오 5: 캐시 복원 UX (fromCache=true) =====
  describe('캐시 복원 UX', () => {
    it('fromCache=true일 때 "통계 엔진 복원 중..." 메시지를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'numpy',
        progress: 45,
        message: '캐시에서 NumPy 복원 중...',
        fromCache: true
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 복원 중...')).toBeInTheDocument()
      expect(screen.queryByText('통계 엔진 로딩 중...')).not.toBeInTheDocument()
    })

    it('fromCache=true + 확장 시 "캐시에서 빠르게 복원 중" 힌트를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'scipy',
        progress: 70,
        message: '캐시에서 SciPy 복원 중...',
        fromCache: true
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      // 확장 클릭
      const expandButton = screen.getByRole('button')
      fireEvent.click(expandButton)

      // 캐시 힌트 확인
      expect(screen.getByText('캐시에서 빠르게 복원 중')).toBeInTheDocument()
    })

    it('fromCache=true + 확장 시 stage 라벨에 "복원 중..."을 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'scipy',
        progress: 70,
        message: '캐시에서 SciPy 복원 중...',
        fromCache: true
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      const expandButton = screen.getByRole('button')
      fireEvent.click(expandButton)

      // "SciPy 복원 중..." 표시
      expect(screen.getByText('SciPy 복원 중...')).toBeInTheDocument()
    })

    it('fromCache=true + 완료 시 "통계 엔진 복원 완료" 성공 메시지', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'complete',
        progress: 100,
        message: '통계 엔진 복원 완료',
        fromCache: true
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={false}
          isLoaded={true}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 복원 완료')).toBeInTheDocument()
      expect(screen.queryByText('통계 엔진 준비 완료')).not.toBeInTheDocument()
    })
  })

  // ===== 시나리오 6: 일반 로딩 UX (fromCache=false/undefined) =====
  describe('일반 로딩 UX', () => {
    it('fromCache=false일 때 "통계 엔진 로딩 중..." 메시지를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'numpy',
        progress: 45,
        message: 'NumPy 패키지 로딩 중...',
        fromCache: false
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 로딩 중...')).toBeInTheDocument()
      expect(screen.queryByText('통계 엔진 복원 중...')).not.toBeInTheDocument()
    })

    it('fromCache=undefined일 때 "통계 엔진 로딩 중..." 메시지를 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'runtime',
        progress: 10,
        message: 'Pyodide 런타임 로딩 중...'
        // fromCache 생략 (undefined)
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 로딩 중...')).toBeInTheDocument()
    })

    it('fromCache=false + 확장 시 "캐시에서 빠르게 복원 중" 힌트가 없다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'scipy',
        progress: 70,
        message: 'SciPy 패키지 로딩 중...',
        fromCache: false
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      const expandButton = screen.getByRole('button')
      fireEvent.click(expandButton)

      // 캐시 힌트가 없어야 함
      expect(screen.queryByText('캐시에서 빠르게 복원 중')).not.toBeInTheDocument()
    })

    it('fromCache=false + 확장 시 stage 라벨에 "로딩 중..."을 표시한다', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'scipy',
        progress: 70,
        message: 'SciPy 패키지 로딩 중...',
        fromCache: false
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={true}
          isLoaded={false}
          error={null}
        />
      )

      const expandButton = screen.getByRole('button')
      fireEvent.click(expandButton)

      // "SciPy 로딩 중..." 표시
      expect(screen.getByText('SciPy 로딩 중...')).toBeInTheDocument()
    })

    it('fromCache=false + 완료 시 "통계 엔진 준비 완료" 성공 메시지', () => {
      const progress: PyodideLoadingProgress = {
        stage: 'complete',
        progress: 100,
        message: '통계 엔진 준비 완료',
        fromCache: false
      }

      render(
        <PyodideLoadingIndicator
          progress={progress}
          isLoading={false}
          isLoaded={true}
          error={null}
        />
      )

      expect(screen.getByText('통계 엔진 준비 완료')).toBeInTheDocument()
      expect(screen.queryByText('통계 엔진 복원 완료')).not.toBeInTheDocument()
    })
  })
})
