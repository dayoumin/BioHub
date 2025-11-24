'use client'

/**
 * MobileWarning - 모바일 접속 시 PC 안내
 *
 * 목표:
 * - 모바일(태블릿 포함) 접속 감지
 * - PC 접속 권장 메시지 표시
 * - 강제로 진행 옵션 제공 (선택)
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Monitor, Smartphone, AlertTriangle } from 'lucide-react'

export function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    // 모바일 감지 (화면 너비 + User Agent)
    const checkMobile = () => {
      const width = window.innerWidth
      const userAgent = navigator.userAgent.toLowerCase()

      const isMobileWidth = width < 768 // Tailwind md breakpoint
      const isMobileUA = /mobile|android|iphone|ipad|tablet/.test(userAgent)

      return isMobileWidth || isMobileUA
    }

    const mobile = checkMobile()
    setIsMobile(mobile)

    // 세션 스토리지에서 경고 표시 여부 확인
    const hideWarning = sessionStorage.getItem('hideMobileWarning')
    if (mobile && !hideWarning) {
      setShowWarning(true)
    }
  }, [])

  const handleContinueAnyway = () => {
    sessionStorage.setItem('hideMobileWarning', 'true')
    setShowWarning(false)
  }

  if (!isMobile || !showWarning) {
    return null
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <DialogTitle>모바일 접속 감지</DialogTitle>
          </div>
          <DialogDescription>
            이 플랫폼은 PC 환경에 최적화되어 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* PC 권장 안내 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Monitor className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">PC에서 접속하세요</h4>
                  <p className="text-xs text-muted-foreground">
                    변수 선택, 통계 분석, 결과 해석 등 복잡한 작업은
                    <strong className="text-foreground"> PC 또는 노트북</strong>에서
                    사용하시길 권장합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 모바일 문제점 */}
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Smartphone className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">모바일에서 발생 가능한 문제</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>변수 선택 UI 레이아웃 깨짐</li>
                    <li>표 및 그래프 가독성 저하</li>
                    <li>드래그 앤 드롭 기능 제한</li>
                    <li>파일 업로드 호환성 문제</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 권장 해상도 */}
          <div className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
            <strong>권장 해상도:</strong> 1280px × 720px 이상 (HD 이상)
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleContinueAnyway}
            >
              그래도 계속
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowWarning(false)}
            >
              확인
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            "그래도 계속"을 선택하면 이 세션에서 다시 표시하지 않습니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
