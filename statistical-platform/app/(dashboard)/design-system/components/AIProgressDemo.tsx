'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'

export function AIProgressDemo() {
  const [progress, setProgress] = useState(0)
  const [isProgressing, setIsProgressing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setIsProgressing(true)
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsProgressing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }, [])

  const resetProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setProgress(0)
    setIsProgressing(false)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-4 mt-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>AIAnalysisProgress</CardTitle>
          <CardDescription>AI 분석 진행률 표시 - 프로그레스 바와 단계 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 라이브 데모 */}
          <AIAnalysisProgress progress={progress} />
          <div className="flex gap-2">
            <Button onClick={startProgress} disabled={isProgressing}>
              <Play className="mr-2 h-4 w-4" />
              시작
            </Button>
            <Button onClick={resetProgress} variant="outline">
              <Pause className="mr-2 h-4 w-4" />
              리셋
            </Button>
          </div>

          {/* Props 테이블 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Props:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <code>progress</code>: number - 진행률 (0-100)</li>
            </ul>
          </div>

          {/* 사용 예제 */}
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`const [progress, setProgress] = useState(0)

<AIAnalysisProgress progress={progress} />`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
