/**
 * 수식 요소 컴포넌트 테스트
 *
 * Plate/KaTeX 의존성을 mock하여 렌더링 + 편집 Popover 검증.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EquationElement, InlineEquationElement } from '../equation-element'

// PlateElement → passthrough 래퍼
vi.mock('platejs/react', () => ({
  PlateElement: ({ children, asChild, ...props }: Record<string, unknown>) => {
    const Tag = asChild ? 'span' : 'div'
    return <Tag data-testid="plate-element" {...props}>{children}</Tag>
  },
}))

// useEquationElement → useEffect로 KaTeX 대신 텍스트 삽입 (실제 타이밍과 동일)
vi.mock('@platejs/math/react', async () => {
  const { useEffect } = await import('react')
  return {
    useEquationElement: ({ element, katexRef }: { element: { texExpression: string }, katexRef: { current: HTMLElement | null } }) => {
      useEffect(() => {
        if (katexRef.current && element.texExpression) {
          katexRef.current.textContent = element.texExpression
        }
      }, [element.texExpression])
    },
    useEquationInput: ({ onClose }: { onClose: () => void }) => ({
      props: { value: '', onChange: vi.fn(), onKeyDown: vi.fn() },
      ref: { current: null },
      onSubmit: onClose,
      onDismiss: onClose,
    }),
  }
})

// KaTeX CSS import → noop
vi.mock('katex/dist/katex.min.css', () => ({}))

// Popover → passthrough (항상 열림/닫힘은 props 기반)
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode, open: boolean }) => (
    <div data-testid="popover" data-open={open}>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}))

describe('EquationElement (block)', () => {
  const baseProps = {
    attributes: { 'data-slate-node': 'element' as const },
    children: <span data-testid="children" />,
    element: { type: 'equation', texExpression: 'E=mc^2', children: [{ text: '' }] },
    nodeProps: {},
  }

  it('should render KaTeX output for non-empty expression', () => {
    render(<EquationElement {...baseProps as never} />)
    // useEquationElement mock이 katexRef에 texExpression 텍스트를 삽입
    expect(screen.getByText('E=mc^2')).toBeDefined()
  })

  it('should show placeholder when texExpression is empty', () => {
    const props = {
      ...baseProps,
      element: { type: 'equation', texExpression: '', children: [{ text: '' }] },
    }
    render(<EquationElement {...props as never} />)
    expect(screen.getByText('클릭하여 수식 입력')).toBeDefined()
  })

  it('should contain Popover for editing', () => {
    render(<EquationElement {...baseProps as never} />)
    expect(screen.getByTestId('popover')).toBeDefined()
    expect(screen.getByTestId('popover-content')).toBeDefined()
  })

  it('should contain LaTeX input textarea inside popover', () => {
    render(<EquationElement {...baseProps as never} />)
    const content = screen.getByTestId('popover-content')
    expect(content.querySelector('textarea')).toBeDefined()
  })
})

describe('InlineEquationElement (inline)', () => {
  const baseProps = {
    attributes: { 'data-slate-node': 'element' as const },
    children: <span data-testid="children" />,
    element: { type: 'inline_equation', texExpression: 'x^2', children: [{ text: '' }] },
    nodeProps: {},
  }

  it('should render KaTeX output for non-empty expression', () => {
    render(<InlineEquationElement {...baseProps as never} />)
    expect(screen.getByText('x^2')).toBeDefined()
  })

  it('should show placeholder when texExpression is empty', () => {
    const props = {
      ...baseProps,
      element: { type: 'inline_equation', texExpression: '', children: [{ text: '' }] },
    }
    render(<InlineEquationElement {...props as never} />)
    expect(screen.getByText('수식')).toBeDefined()
  })

  it('should render as inline element (asChild=span)', () => {
    render(<InlineEquationElement {...baseProps as never} />)
    const el = screen.getByTestId('plate-element')
    expect(el.tagName).toBe('SPAN')
  })

  it('should contain editing popover', () => {
    render(<InlineEquationElement {...baseProps as never} />)
    expect(screen.getByTestId('popover')).toBeDefined()
  })
})
