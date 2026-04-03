'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** 클립보드 복사 버튼 — genetics 영역 공통 */
export function CopyButton({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      console.warn('[CopyButton] 클립보드 복사 실패')
    }
  }, [text])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
      onClick={handleCopy}
      title={copied ? '복사됨' : '서열 복사'}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}
