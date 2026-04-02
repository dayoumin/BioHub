/**
 * 수식 요소 컴포넌트 테스트
 *
 * PlateElement 의존성을 mock하여 렌더링 검증.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquationElement, InlineEquationElement } from '../equation-element'

// PlateElement를 passthrough 래퍼로 mock
vi.mock('platejs/react', () => ({
  PlateElement: ({ children, asChild, ...props }: Record<string, unknown>) => {
    const Tag = asChild ? 'span' : 'div'
    return <Tag data-testid="plate-element" {...props}>{children}</Tag>
  },
}))

describe('EquationElement (block)', () => {
  const baseProps = {
    attributes: { 'data-slate-node': 'element' as const },
    children: <span data-testid="children" />,
    element: { type: 'equation', texExpression: 'E=mc^2', children: [{ text: '' }] },
    nodeProps: {},
  }

  it('should render LaTeX source wrapped in $$', () => {
    render(<EquationElement {...baseProps as never} />)
    expect(screen.getByText('$$E=mc^2$$')).toBeDefined()
  })

  it('should show placeholder when texExpression is empty', () => {
    const props = {
      ...baseProps,
      element: { type: 'equation', texExpression: '', children: [{ text: '' }] },
    }
    render(<EquationElement {...props as never} />)
    expect(screen.getByText('수식을 입력하세요')).toBeDefined()
  })
})

describe('InlineEquationElement (inline)', () => {
  const baseProps = {
    attributes: { 'data-slate-node': 'element' as const },
    children: <span data-testid="children" />,
    element: { type: 'inline_equation', texExpression: 'x^2', children: [{ text: '' }] },
    nodeProps: {},
  }

  it('should render LaTeX source wrapped in $', () => {
    render(<InlineEquationElement {...baseProps as never} />)
    expect(screen.getByText('$x^2$')).toBeDefined()
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
})
