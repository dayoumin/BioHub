'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BioToolsError({ error, reset }: ErrorProps): React.ReactElement {
  useEffect(() => {
    console.error('[Bio-Tools]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
      <AlertCircle className="w-10 h-10 text-destructive/60" />
      <div>
        <h2 className="text-lg font-semibold">분석 도구에서 오류가 발생했습니다</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          {error.message || '예기치 않은 오류가 발생했습니다.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="w-4 h-4 mr-1.5" />
        다시 시도
      </Button>
    </div>
  )
}
