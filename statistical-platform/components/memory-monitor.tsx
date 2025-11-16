/**
 * 메모리 모니터링 시스템
 *
 * 다중 탭 허용하되, 메모리 사용량을 모니터링하여 경고
 * - 크롬/엣지: performance.memory API 사용
 * - Firefox/Safari: 지원하지 않음 (조용히 무시)
 *
 * 경고 기준 (브라우저 힙 메모리 비율):
 * - 70% 이상: 경고 (1회만, 남은 메모리 30% 미만)
 * - 85% 이상: 심각 (반복 표시, 탭 크래시 위험)
 *
 * 왜 비율 기준인가?
 * - 브라우저마다 힙 제한이 다름 (1GB~4GB)
 * - 사용자 PC 메모리에 따라 동적으로 할당됨
 * - jsHeapSizeLimit: 브라우저가 허용하는 최대 힙 크기
 */

'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function MemoryMonitor() {
  const [memoryWarning, setMemoryWarning] = useState<'none' | 'warning' | 'critical'>('none')
  const [warningShown, setWarningShown] = useState(false)

  useEffect(() => {
    // 크롬/엣지에서만 지원
    if (!('memory' in performance)) {
      return
    }

    const checkMemory = (): void => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
      if (!memory) return

      const usedMB = memory.usedJSHeapSize / 1048576 // bytes → MB
      const limitMB = memory.jsHeapSizeLimit / 1048576 // 브라우저 힙 제한
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100

      // 비율 기준 (남은 메모리 고려)
      if (usagePercent > 85) {
        // 85% 이상: 심각 (남은 메모리 15% 미만)
        setMemoryWarning('critical')
      } else if (usagePercent > 70) {
        // 70% 이상: 경고 (남은 메모리 30% 미만, 1회만)
        if (!warningShown) {
          setMemoryWarning('warning')
          setWarningShown(true)
        }
      } else {
        setMemoryWarning('none')
      }

      // 디버그 로그 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Memory] ${usedMB.toFixed(0)}MB / ${limitMB.toFixed(0)}MB (${usagePercent.toFixed(1)}%)`)
      }
    }

    // 10초마다 체크
    const timer = setInterval(checkMemory, 10000)

    // 초기 체크
    checkMemory()

    return () => clearInterval(timer)
  }, [warningShown])

  if (memoryWarning === 'none') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant={memoryWarning === 'critical' ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          {memoryWarning === 'critical' ? '⚠️ 메모리 부족 경고' : 'ℹ️ 메모리 사용량 높음'}
        </AlertTitle>
        <AlertDescription className="text-sm">
          {memoryWarning === 'critical' ? (
            <>
              메모리 사용량이 85%를 초과했습니다. 일부 탭을 닫거나 브라우저를
              재시작하세요. (탭 크래시 위험)
            </>
          ) : (
            <>
              메모리 사용량이 70%를 초과했습니다. 여러 탭을 사용 중이라면 일부
              탭을 닫는 것을 권장합니다.
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
