'use client'

/**
 * Plate 수식 요소 컴포넌트 (편집 모드용)
 *
 * 편집 모드에서 LaTeX 소스를 styled inline/block으로 표시.
 * 전체 KaTeX 렌더링은 미리보기 모드(ReactMarkdown + rehype-katex)에서 제공.
 */

import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'

interface EquationNode {
  texExpression?: string
}

/** 블록 수식 ($$...$$) */
export function EquationElement(props: PlateElementProps): React.ReactElement {
  const { element, children } = props
  const tex = (element as unknown as EquationNode).texExpression || ''

  return (
    <PlateElement {...props}>
      <div className="my-3 py-3 px-4 text-center font-mono text-sm bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30 select-none">
        {tex ? (
          <span className="text-foreground/80">{`$$${tex}$$`}</span>
        ) : (
          <span className="text-muted-foreground italic">수식을 입력하세요</span>
        )}
      </div>
      {children}
    </PlateElement>
  )
}

/** 인라인 수식 ($...$) */
export function InlineEquationElement(props: PlateElementProps): React.ReactElement {
  const { element, children } = props
  const tex = (element as unknown as EquationNode).texExpression || ''

  return (
    <PlateElement {...props} asChild>
      <span className="inline-flex items-center mx-0.5 px-1.5 py-0.5 font-mono text-sm bg-muted/40 rounded border border-muted-foreground/20 select-none">
        {tex ? (
          <span className="text-foreground/80">{`$${tex}$`}</span>
        ) : (
          <span className="text-muted-foreground text-xs">수식</span>
        )}
        {children}
      </span>
    </PlateElement>
  )
}
