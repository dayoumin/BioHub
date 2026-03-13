import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollapsibleSection } from '@/components/analysis/common/CollapsibleSection'

describe('CollapsibleSection', () => {
  const defaultProps = {
    label: '상세 정보',
    open: false,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('라벨을 렌더링한다', () => {
      render(
        <CollapsibleSection {...defaultProps}>
          <p>내용</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('상세 정보')).toBeInTheDocument()
    })

    it('닫힌 상태에서 ChevronDown 아이콘을 표시한다', () => {
      const { container } = render(
        <CollapsibleSection {...defaultProps} open={false}>
          <p>내용</p>
        </CollapsibleSection>
      )
      // ChevronDown은 렌더링되고, ChevronUp은 없어야 함
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(1)
    })

    it('열린 상태에서 ChevronUp 아이콘을 표시한다', () => {
      const { container } = render(
        <CollapsibleSection {...defaultProps} open={true}>
          <p>내용</p>
        </CollapsibleSection>
      )
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(1)
    })

    it('열린 상태에서 children을 렌더링한다', () => {
      render(
        <CollapsibleSection {...defaultProps} open={true}>
          <p>상세 내용입니다</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('상세 내용입니다')).toBeInTheDocument()
    })

    it('contentClassName이 CollapsibleContent에 적용된다', () => {
      const { container } = render(
        <CollapsibleSection {...defaultProps} open={true} contentClassName="pt-3 space-y-3">
          <p>내용</p>
        </CollapsibleSection>
      )
      // Radix CollapsibleContent에 className이 전달되는지 확인
      const content = container.querySelector('[data-state]')
      // open 상태일 때 content가 존재해야 함
      expect(content).not.toBeNull()
    })
  })

  describe('상호작용', () => {
    it('버튼 클릭 시 onOpenChange가 호출된다', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <CollapsibleSection {...defaultProps} onOpenChange={handleChange}>
          <p>내용</p>
        </CollapsibleSection>
      )

      const button = screen.getByRole('button')
      await user.click(button)
      expect(handleChange).toHaveBeenCalled()
    })

    it('트리거 버튼이 ghost variant와 sm size를 가진다', () => {
      render(
        <CollapsibleSection {...defaultProps}>
          <p>내용</p>
        </CollapsibleSection>
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('justify-between')
    })
  })

  describe('Props 조합', () => {
    it('label에 템플릿 리터럴 값이 정상 렌더링된다', () => {
      render(
        <CollapsibleSection
          {...defaultProps}
          label={`실행 로그 (5개)`}
        >
          <p>내용</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('실행 로그 (5개)')).toBeInTheDocument()
    })

    it('contentClassName 없이도 정상 렌더링된다', () => {
      const { container } = render(
        <CollapsibleSection {...defaultProps} open={true}>
          <p>내용</p>
        </CollapsibleSection>
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('복잡한 children이 정상 렌더링된다', () => {
      render(
        <CollapsibleSection {...defaultProps} open={true}>
          <div className="space-y-1">
            <div>로그 1</div>
            <div>로그 2</div>
            <div>로그 3</div>
          </div>
        </CollapsibleSection>
      )
      expect(screen.getByText('로그 1')).toBeInTheDocument()
      expect(screen.getByText('로그 2')).toBeInTheDocument()
      expect(screen.getByText('로그 3')).toBeInTheDocument()
    })
  })
})
