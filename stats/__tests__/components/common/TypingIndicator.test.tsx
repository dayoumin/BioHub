/**
 * TypingIndicator 컴포넌트 테스트
 *
 * 검증 범위:
 * 1. 기본 렌더링 (점 3개)
 * 2. 접근성 — role="status", aria-live, aria-label
 * 3. label prop 동작 (텍스트 표시 + aria-hidden)
 * 4. label 없을 때 aria-label 미설정
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TypingIndicator } from '@/components/common/TypingIndicator'

// framer-motion은 jsdom에서 스타일 적용 안 되지만 렌더링은 됨
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

describe('TypingIndicator', () => {
  describe('기본 렌더링', () => {
    it('점 3개를 렌더링한다 (aria-hidden 컨테이너 내부)', () => {
      const { container } = render(<TypingIndicator />)
      // role="status" 아래의 첫 번째 자식 div가 dotContainer
      const statusEl = container.querySelector('[role="status"]')
      const dotContainer = statusEl?.querySelector('[aria-hidden="true"]')
      expect(dotContainer).not.toBeNull()
      expect(dotContainer?.children).toHaveLength(3)
    })

    it('label 없이도 렌더링 된다', () => {
      const { container } = render(<TypingIndicator />)
      expect(container.firstChild).not.toBeNull()
    })

    it('label이 있으면 텍스트가 화면에 보인다', () => {
      render(<TypingIndicator label="분석 중..." />)
      expect(screen.getByText('분석 중...')).toBeInTheDocument()
    })
  })

  describe('접근성 (ARIA)', () => {
    it('role="status"가 설정된다', () => {
      render(<TypingIndicator label="처리 중..." />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('aria-live="polite"가 설정된다', () => {
      render(<TypingIndicator label="처리 중..." />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('label이 있으면 aria-label로 스크린 리더에 공지된다', () => {
      render(<TypingIndicator label="데이터 파악 중..." />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-label', '데이터 파악 중...')
    })

    it('label이 없으면 aria-label이 설정되지 않는다', () => {
      render(<TypingIndicator />)
      const status = screen.getByRole('status')
      // aria-label이 없거나 undefined
      expect(status.getAttribute('aria-label')).toBeNull()
    })

    it('보이는 label 텍스트는 aria-hidden — 스크린 리더 중복 방지', () => {
      render(<TypingIndicator label="추천 생성 중..." />)
      const labelEl = screen.getByText('추천 생성 중...')
      expect(labelEl).toHaveAttribute('aria-hidden', 'true')
    })

    it('점 컨테이너는 aria-hidden — 장식용 요소 제외', () => {
      const { container } = render(<TypingIndicator />)
      const statusEl = container.querySelector('[role="status"]')
      const dotContainer = statusEl?.querySelector('[aria-hidden="true"]')
      expect(dotContainer).toBeInTheDocument()
    })
  })

  describe('label 동작', () => {
    it('label이 변경되면 aria-label도 업데이트된다', () => {
      const { rerender } = render(<TypingIndicator label="분석 중..." />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', '분석 중...')

      rerender(<TypingIndicator label="추천 생성 중..." />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', '추천 생성 중...')
    })

    it('label이 제거되면 텍스트가 사라진다', () => {
      const { rerender } = render(<TypingIndicator label="분석 중..." />)
      expect(screen.getByText('분석 중...')).toBeInTheDocument()

      rerender(<TypingIndicator />)
      expect(screen.queryByText('분석 중...')).not.toBeInTheDocument()
    })
  })
})
