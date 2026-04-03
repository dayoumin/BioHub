'use client'

/**
 * Plate 수식 요소 컴포넌트
 *
 * 클릭 → Popover로 LaTeX 편집 (useEquationInput)
 * 표시 → KaTeX 라이브 렌더링 (useEquationElement)
 */

import { useState, useRef, useEffect } from 'react'
import type { TEquationElement } from 'platejs'
import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'
import { useEquationElement, useEquationInput } from '@platejs/math/react'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'

// KaTeX CSS — papers 페이지 전용 (dynamic() 경계 뒤라 초기 번들에 미포함)
import 'katex/dist/katex.min.css'

/** 빈 수식 삽입 시 자동으로 Popover 열기 (최초 1회) */
function useAutoOpenPopover(tex: string): { open: boolean; setOpen: (v: boolean) => void } {
  const [open, setOpen] = useState(false)
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (!tex && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      setOpen(true)
    }
  }, [tex])

  return { open, setOpen }
}

// ── 수식 입력 Popover (useEquationInput 래퍼) ──

interface EquationInputProps {
  isInline: boolean
  open: boolean
  onClose: () => void
}

function EquationInput({ isInline, open, onClose }: EquationInputProps): React.ReactElement {
  const { props: inputProps, ref, onSubmit, onDismiss } = useEquationInput({
    isInline,
    open,
    onClose,
  })

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        {...inputProps}
        className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="LaTeX 수식 입력 (예: E=mc^2)"
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1 text-xs rounded-md border hover:bg-muted transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          확인
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Enter: 확인 · Esc: 취소
      </p>
    </div>
  )
}

// ── 블록 수식 ($$...$$) ──

export function EquationElement(props: PlateElementProps<TEquationElement>): React.ReactElement {
  const { element, children } = props
  const tex = element.texExpression || ''
  const katexRef = useRef<HTMLDivElement>(null)
  const { open, setOpen } = useAutoOpenPopover(tex)

  useEquationElement({ element, katexRef, options: { displayMode: true, throwOnError: false } })

  return (
    <PlateElement {...props}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className="my-3 py-3 px-4 text-center rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/30 transition-colors select-none"
            contentEditable={false}
          >
            {tex ? (
              <div ref={katexRef} />
            ) : (
              <span className="text-muted-foreground italic text-sm">클릭하여 수식 입력</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()}>
          <EquationInput isInline={false} open={open} onClose={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
      {children}
    </PlateElement>
  )
}

// ── 인라인 수식 ($...$) ──

export function InlineEquationElement(props: PlateElementProps<TEquationElement>): React.ReactElement {
  const { element, children } = props
  const tex = element.texExpression || ''
  const katexRef = useRef<HTMLDivElement>(null)
  const { open, setOpen } = useAutoOpenPopover(tex)

  useEquationElement({ element, katexRef, options: { displayMode: false, throwOnError: false } })

  return (
    // @ts-expect-error platejs version mismatch for asChild
    <PlateElement {...props} asChild>
      <span className="inline-flex items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <span
              className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded bg-muted/40 border border-muted-foreground/20 cursor-pointer hover:bg-muted/60 transition-colors select-none"
              contentEditable={false}
            >
              {tex ? (
                <span ref={katexRef} />
              ) : (
                <span className="text-muted-foreground text-xs">수식</span>
              )}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-72" onOpenAutoFocus={(e) => e.preventDefault()}>
            <EquationInput isInline open={open} onClose={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
        {children}
      </span>
    </PlateElement>
  )
}
