'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 외부 서비스로 전송 가능)
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle>페이지 오류</CardTitle>
          </div>
          <CardDescription>
            페이지를 불러오는 중 오류가 발생했습니다.
            다시 시도하거나 홈으로 이동해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message || '알 수 없는 오류가 발생했습니다.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              홈으로 이동
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                개발자용 상세 정보
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-64">
                {error.stack}
              </pre>
              {error.digest && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Error Digest: {error.digest}
                </p>
              )}
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
