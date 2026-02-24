/**
 * TypingIndicator 컴포넌트 테스트
 *
 * 검증 범위:
 * 1. 기본 렌더링 (점 3개)
 * 2. 접근성 — role="status", aria-live, aria-atomic
 * 3. label prop 동작 (sr-only 스크린 리더 텍스트 + 시각적 aria-hidden 텍스트)
 * 4. label 없을 때 sr-only span 미생성
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

    it('label이 있으면 시각적 텍스트가 화면에 보인다 (aria-hidden span)', () => {
      const { container } = render(<TypingIndicator label="분석 중..." />)
      const statusEl = container.querySelector('[role="status"]')
      // 시각적 span: aria-hidden="true", sr-only 아님
      const visibleSpan = Array.from(statusEl?.querySelectorAll('span') ?? [])
        .find(el => !el.classList.contains('sr-only') && el.textContent === '분석 중...')
      expect(visibleSpan).toBeInTheDocument()
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

    it('aria-atomic="true"가 설정된다 — 라이브 리전 원자적 공지', () => {
      render(<TypingIndicator />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-atomic', 'true')
    })

    it('label이 있으면 sr-only span으로 스크린 리더에 공지된다', () => {
      const { container } = render(<TypingIndicator label="데이터 파악 중..." />)
      const statusEl = container.querySelector('[role="status"]')
      const srSpan = statusEl?.querySelector('.sr-only')
      expect(srSpan).toBeInTheDocument()
      expect(srSpan).toHaveTextContent('데이터 파악 중...')
    })

    it('label이 없으면 sr-only span이 생성되지 않는다', () => {
      const { container } = render(<TypingIndicator />)
      const statusEl = container.querySelector('[role="status"]')
      expect(statusEl?.querySelector('.sr-only')).toBeNull()
    })

    it('보이는 label 텍스트는 aria-hidden — 스크린 리더 중복 방지', () => {
      const { container } = render(<TypingIndicator label="추천 생성 중..." />)
      const statusEl = container.querySelector('[role="status"]')
      const visibleSpan = Array.from(statusEl?.querySelectorAll('span') ?? [])
        .find(el => !el.classList.contains('sr-only') && el.textContent === '추천 생성 중...')
      expect(visibleSpan).toHaveAttribute('aria-hidden', 'true')
    })

    it('점 컨테이너는 aria-hidden — 장식용 요소 제외', () => {
      const { container } = render(<TypingIndicator />)
      const statusEl = container.querySelector('[role="status"]')
      const dotContainer = statusEl?.querySelector('[aria-hidden="true"]')
      expect(dotContainer).toBeInTheDocument()
    })
  })

  describe('label 동작', () => {
    it('label이 변경되면 sr-only 텍스트도 업데이트된다', () => {
      const { container, rerender } = render(<TypingIndicator label="분석 중..." />)
      const statusEl = container.querySelector('[role="status"]')
      expect(statusEl?.querySelector('.sr-only')).toHaveTextContent('분석 중...')

      rerender(<TypingIndicator label="추천 생성 중..." />)
      expect(statusEl?.querySelector('.sr-only')).toHaveTextContent('추천 생성 중...')
    })

    it('label이 제거되면 텍스트가 사라진다', () => {
      const { container, rerender } = render(<TypingIndicator label="분석 중..." />)
      const statusEl = container.querySelector('[role="status"]')
      expect(statusEl?.querySelector('.sr-only')).toHaveTextContent('분석 중...')

      rerender(<TypingIndicator />)
      expect(statusEl?.querySelector('.sr-only')).toBeNull()
    })
  })
})
