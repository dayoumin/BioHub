/**
 * 다중 탭 경고 모달
 *
 * 동시에 여러 탭에서 애플리케이션이 실행되고 있을 때 경고를 표시합니다.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MultiTabDetector } from '@/lib/services/multi-tab-detector'

export function MultiTabWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [otherTabCount, setOtherTabCount] = useState(0)
  const [isDisabled, setIsDisabled] = useState(false)

  useEffect(() => {
    const detector = MultiTabDetector.getInstance()

    // 다중 탭 감지 시 경고 표시
    const handleTabCountChange = (count: number) => {
      setOtherTabCount(count)

      if (count > 0) {
        setShowWarning(true)
        setIsDisabled(true) // 기능 비활성화
      }
    }

    detector.onTabCountChange(handleTabCountChange)

    return () => {
      detector.removeListener(handleTabCountChange)
    }
  }, [])

  const handleCloseThisTab = useCallback(() => {
    window.close()
  }, [])

  const handleDisableFunctionality = useCallback(() => {
    setShowWarning(false)
    setIsDisabled(true)
  }, [])

  return (
    <>
      {/* 기능 비활성화 상태일 때 오버레이 */}
      {isDisabled && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md pointer-events-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">다중 탭 감지됨</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  현재 {otherTabCount}개의 다른 탭에서 이 애플리케이션이 실행 중입니다.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  데이터 손상을 방지하기 위해 이 탭의 기능이 비활성화되었습니다.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCloseThisTab}
                  >
                    이 탭 닫기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    새로고침
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 초기 경고 모달 */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>다중 탭 실행 감지</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>
                  현재 {otherTabCount}개의 다른 탭에서 이 애플리케이션이 실행 중입니다.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                    ⚠️ 발생 가능한 문제:
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <li>• 메시지/데이터 손실</li>
                    <li>• 채팅 히스토리 중복 또는 불일치</li>
                    <li>• 통계 계산 결과 오류</li>
                    <li>• 설정 변경사항 반영 안 됨</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  한 번에 하나의 탭에서만 사용하시기를 권장합니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>계속 사용</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseThisTab}>
              이 탭 닫기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}