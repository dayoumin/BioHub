'use client'

import { useCallback } from 'react'
import { Copy, Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AssemblyResult } from '@/lib/research/paper-package-types'

interface PackagePreviewProps {
  result: AssemblyResult
  packageTitle: string
}

export default function PackagePreview({ result, packageTitle }: PackagePreviewProps): React.ReactElement {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result.markdown).catch(() => {
      // clipboard not available — silently ignore
    })
  }, [result.markdown])

  const handleDownload = useCallback(() => {
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = packageTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 60)
    a.download = `${safeName || 'paper-package'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [result.markdown, packageTitle])

  return (
    <div className="space-y-4">
      {/* 경고 */}
      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            조립 중 감지된 경고 ({result.warnings.length}건)
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 pl-6 list-disc">
            {result.warnings.map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: warning list is stable after assembly
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 액션 바 */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          토큰 추정: ~{result.tokenEstimate.toLocaleString()}
        </Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            클립보드 복사
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            .md 다운로드
          </Button>
        </div>
      </div>

      {/* 마크다운 미리보기 */}
      <pre className="rounded-xl border bg-muted/40 p-4 text-xs leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap font-mono">
        {result.markdown}
      </pre>

      {/* AI에게 보내는 법 가이드 */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold">AI에게 보내는 법</p>
        <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
          <li>위 "클립보드 복사" 버튼을 누릅니다.</li>
          <li>Claude, ChatGPT 등 AI 채팅창을 엽니다.</li>
          <li>복사한 내용을 붙여넣고 "논문을 작성해줘" 라고 입력하면 됩니다.</li>
        </ol>
      </div>
    </div>
  )
}
