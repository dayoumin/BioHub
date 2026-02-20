'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserFriendlyErrorMessage } from '@/lib/constants/error-messages'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  // 사용자 친화적 메시지로 변환
  const userMessage = getUserFriendlyErrorMessage(error.message)

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle>분석 오류</CardTitle>
          </div>
          <CardDescription>
            통계 분석 중 오류가 발생했습니다.
            데이터를 확인하고 다시 시도해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground break-all">
              {userMessage}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전 페이지
            </Button>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              variant="ghost"
            >
              <Home className="w-4 h-4 mr-2" />
              대시보드
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                개발자용 상세 정보
              </summary>
              <div className="mt-2 space-y-2">
                <div className="bg-muted p-2 rounded">
                  <p className="text-xs font-mono text-muted-foreground">
                    원본 메시지: {error.message}
                  </p>
                </div>
                {error.stack && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
                    {error.stack}
                  </pre>
                )}
                {error.digest && (
                  <p className="text-xs text-muted-foreground">
                    Error Digest: {error.digest}
                  </p>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
