/**
 * 다중 탭 차단 시스템
 *
 * localStorage 기반 단순 탭 관리:
 * - 첫 번째 탭만 허용
 * - 두 번째 탭부터 완전 차단
 * - 5초 타임아웃으로 비정상 종료 처리
 */

'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MultiTabWarning() {
  const [isBlocked, setIsBlocked] = useState(false)
  const TAB_KEY = 'app-active-tab'
  const HEARTBEAT_KEY = 'app-tab-heartbeat'
  const HEARTBEAT_INTERVAL = 2000 // 2초마다 갱신
  const HEARTBEAT_TIMEOUT = 5000 // 5초 동안 신호 없으면 정리

  useEffect(() => {
    const myTabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    // 1단계: 기존 탭 확인
    const checkExistingTab = (): boolean => {
      const existingTab = localStorage.getItem(TAB_KEY)
      const lastHeartbeat = localStorage.getItem(HEARTBEAT_KEY)

      if (!existingTab || !lastHeartbeat) {
        // 탭 없음 → 내가 첫 탭
        return false
      }

      const timeSinceLastBeat = Date.now() - parseInt(lastHeartbeat, 10)
      if (timeSinceLastBeat > HEARTBEAT_TIMEOUT) {
        // 이전 탭 타임아웃 → 정리 후 내가 첫 탭
        localStorage.removeItem(TAB_KEY)
        localStorage.removeItem(HEARTBEAT_KEY)
        return false
      }

      // 살아있는 탭 존재 → 차단
      return existingTab !== myTabId
    }

    if (checkExistingTab()) {
      setIsBlocked(true)
      return // 여기서 종료 (더 이상 진행 안 함)
    }

    // 2단계: 내가 활성 탭으로 등록
    localStorage.setItem(TAB_KEY, myTabId)
    localStorage.setItem(HEARTBEAT_KEY, Date.now().toString())

    // 3단계: 하트비트 시작
    const heartbeatTimer = setInterval(() => {
      const currentTab = localStorage.getItem(TAB_KEY)
      if (currentTab === myTabId) {
        localStorage.setItem(HEARTBEAT_KEY, Date.now().toString())
      } else {
        // 다른 탭이 활성화됨 → 내가 차단됨
        setIsBlocked(true)
        clearInterval(heartbeatTimer)
      }
    }, HEARTBEAT_INTERVAL)

    // 4단계: 탭 닫을 때 정리
    const handleUnload = (): void => {
      if (localStorage.getItem(TAB_KEY) === myTabId) {
        localStorage.removeItem(TAB_KEY)
        localStorage.removeItem(HEARTBEAT_KEY)
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(heartbeatTimer)
      window.removeEventListener('beforeunload', handleUnload)
      handleUnload()
    }
  }, [])

  if (!isBlocked) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md mx-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-lg mb-2">다중 탭 감지</h3>
            <p className="text-sm text-muted-foreground mb-3">
              이미 다른 탭에서 애플리케이션이 실행 중입니다.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800 mb-4">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                왜 한 번에 하나의 탭만 사용할 수 있나요?
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <li>• 데이터 충돌 및 손실 방지</li>
                <li>• 채팅 히스토리 동기화 보장</li>
                <li>• 통계 계산 결과 정확성 유지</li>
                <li>• IndexedDB 동시성 문제 방지</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.close()}
              >
                이 탭 닫기
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
              >
                새로고침 (재시도)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
