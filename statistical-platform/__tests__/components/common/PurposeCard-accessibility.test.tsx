/**
 * PurposeCard 접근성 테스트 (ARIA Radio Semantics)
 *
 * 테스트 범위:
 * - Issue #3: ARIA radio semantics (role="radio", aria-checked)
 * - Keyboard navigation (Enter, Space)
 * - Screen reader support (aria-disabled)
 * - Focus management (tabIndex)
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { GitCompare } from 'lucide-react'

describe('PurposeCard - Accessibility (ARIA Radio)', () => {
  const defaultProps = {
    icon: <GitCompare className="w-5 h-5" />,
    title: '그룹 간 차이 비교',
    description: '두 개 이상의 그룹을 비교하여 평균이나 비율의 차이를 검정합니다.',
    examples: '예: 남녀 간 키 차이, 약물 효과 비교',
    onClick: jest.fn(),
    selected: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Issue #3: ARIA Radio Semantics', () => {
    it('should have role="radio" instead of role="button"', () => {
      render(<PurposeCard {...defaultProps} />)

      const card = screen.getByRole('radio')

      // ✅ role="radio" 적용됨
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('role', 'radio')
    })

    it('should use aria-checked instead of aria-pressed', () => {
      const { rerender } = render(<PurposeCard {...defaultProps} selected={false} />)

      let card = screen.getByRole('radio')

      // ✅ aria-checked="false" (선택 안 됨)
      expect(card).toHaveAttribute('aria-checked', 'false')
      expect(card).not.toHaveAttribute('aria-pressed')

      // 선택 상태로 변경
      rerender(<PurposeCard {...defaultProps} selected={true} />)

      card = screen.getByRole('radio')

      // ✅ aria-checked="true" (선택됨)
      expect(card).toHaveAttribute('aria-checked', 'true')
    })

    it('should have aria-disabled when disabled', () => {
      render(<PurposeCard {...defaultProps} disabled={true} />)

      const card = screen.getByRole('radio')

      // ✅ aria-disabled="true"
      expect(card).toHaveAttribute('aria-disabled', 'true')
    })

    it('should have tabIndex=0 when enabled', () => {
      render(<PurposeCard {...defaultProps} disabled={false} />)

      const card = screen.getByRole('radio')

      // ✅ 키보드 포커스 가능
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('should have tabIndex=-1 when disabled', () => {
      render(<PurposeCard {...defaultProps} disabled={true} />)

      const card = screen.getByRole('radio')

      // ✅ 키보드 포커스 불가능
      expect(card).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Keyboard Interaction', () => {
    it('should call onClick when Enter key is pressed', async () => {
      const user = userEvent.setup()
      const onClickSpy = jest.fn()

      render(<PurposeCard {...defaultProps} onClick={onClickSpy} />)

      const card = screen.getByRole('radio')

      // 포커스 후 Enter 키
      card.focus()
      await user.keyboard('{Enter}')

      // ✅ onClick 호출됨
      expect(onClickSpy).toHaveBeenCalledTimes(1)
    })

    it('should call onClick when Space key is pressed', async () => {
      const user = userEvent.setup()
      const onClickSpy = jest.fn()

      render(<PurposeCard {...defaultProps} onClick={onClickSpy} />)

      const card = screen.getByRole('radio')

      card.focus()
      await user.keyboard(' ') // Space 키

      // ✅ onClick 호출됨 (Space 기본 스크롤 동작 방지됨)
      expect(onClickSpy).toHaveBeenCalledTimes(1)
    })

    it('should NOT call onClick when disabled and Enter is pressed', async () => {
      const user = userEvent.setup()
      const onClickSpy = jest.fn()

      render(<PurposeCard {...defaultProps} onClick={onClickSpy} disabled={true} />)

      const card = screen.getByRole('radio')

      card.focus()
      await user.keyboard('{Enter}')

      // ✅ onClick 호출 안 됨
      expect(onClickSpy).not.toHaveBeenCalled()
    })

    it('should NOT call onClick when disabled and clicked', async () => {
      const user = userEvent.setup()
      const onClickSpy = jest.fn()

      render(<PurposeCard {...defaultProps} onClick={onClickSpy} disabled={true} />)

      const card = screen.getByRole('radio')

      await user.click(card)

      // ✅ onClick 호출 안 됨
      expect(onClickSpy).not.toHaveBeenCalled()
    })
  })

  describe('Visual Feedback', () => {
    it('should have selected styles when selected=true', () => {
      render(<PurposeCard {...defaultProps} selected={true} />)

      const card = screen.getByRole('radio')

      // ✅ 선택 스타일 (border-primary, bg-primary/5, shadow-md)
      expect(card.className).toContain('border-primary')
      expect(card.className).toContain('bg-primary/5')
      expect(card.className).toContain('shadow-md')
    })

    it('should show check icon when selected', () => {
      const { container } = render(<PurposeCard {...defaultProps} selected={true} />)

      // ✅ Check icon 렌더링됨 (lucide-react Check 컴포넌트)
      const checkIcon = container.querySelector('.text-primary.shrink-0')
      expect(checkIcon).toBeInTheDocument()
    })

    it('should NOT show check icon when not selected', () => {
      const { container } = render(<PurposeCard {...defaultProps} selected={false} />)

      // ✅ Check icon 렌더링 안 됨
      const checkIcon = container.querySelector('.text-primary.shrink-0')
      expect(checkIcon).not.toBeInTheDocument()
    })

    it('should have disabled styles when disabled=true', () => {
      render(<PurposeCard {...defaultProps} disabled={true} />)

      const card = screen.getByRole('radio')

      // ✅ 비활성화 스타일 (opacity-50, cursor-not-allowed)
      expect(card.className).toContain('opacity-50')
      expect(card.className).toContain('cursor-not-allowed')
    })
  })

  describe('Content Rendering', () => {
    it('should render title correctly', () => {
      render(<PurposeCard {...defaultProps} />)

      expect(screen.getByText('그룹 간 차이 비교')).toBeInTheDocument()
    })

    it('should render description correctly', () => {
      render(<PurposeCard {...defaultProps} />)

      expect(screen.getByText(/두 개 이상의 그룹을 비교하여/)).toBeInTheDocument()
    })

    it('should render examples when provided', () => {
      render(<PurposeCard {...defaultProps} examples="예: 테스트 예시" />)

      expect(screen.getByText('예: 테스트 예시')).toBeInTheDocument()
    })

    it('should NOT render examples section when not provided', () => {
      const { container } = render(
        <PurposeCard {...defaultProps} examples={undefined} />
      )

      // ✅ 예시 텍스트 없음
      const examplesText = container.querySelector('.text-xs.text-muted-foreground\\/80.italic')
      expect(examplesText).not.toBeInTheDocument()
    })
  })

  describe('Mouse Interaction', () => {
    it('should call onClick when clicked (enabled)', async () => {
      const user = userEvent.setup()
      const onClickSpy = jest.fn()

      render(<PurposeCard {...defaultProps} onClick={onClickSpy} />)

      const card = screen.getByRole('radio')

      await user.click(card)

      // ✅ onClick 호출됨
      expect(onClickSpy).toHaveBeenCalledTimes(1)
    })
  })
})
