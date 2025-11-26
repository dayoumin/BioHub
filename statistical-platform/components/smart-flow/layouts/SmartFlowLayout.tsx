'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useUI } from '@/contexts/ui-context'
import { SettingsModal } from '@/components/layout/settings-modal'
import { HelpModal } from '@/components/layout/help-modal'
import {
  Clock,
  HelpCircle,
  X,
  Check,
  BarChart3,
  Target,
  Settings,
  Play,
  MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 4단계 스텝 정의
const STEPS = [
  { id: 1, label: '탐색', icon: BarChart3 },
  { id: 2, label: '방법', icon: Target },
  { id: 3, label: '변수', icon: Settings },
  { id: 4, label: '분석', icon: Play },
]



export interface SmartFlowLayoutProps {
  currentStep: number
  steps: Array<{ id: number; label: string; completed?: boolean }>
  onStepChange?: (step: number) => void
  children: ReactNode

  // 히스토리/도움말 (SmartFlow 전용)
  showHistory?: boolean
  showHelp?: boolean
  onHistoryToggle?: () => void
  onHelpToggle?: () => void
  systemMemory?: number | null
  historyPanel?: ReactNode

  // 분석 상태
  isAnalyzing?: boolean
  analyzingMessage?: string

  className?: string
}

/**
 * 스마트 통계 분석 레이아웃 (v7 - Clean Stepper)
 *
 * 변경사항 (2025-11-26):
 * - h-screen 제거 → 부모 레이아웃 스크롤 사용
 * - 이중 스크롤 제거 → Single Page
 * - 헤더(sticky) + 스테퍼(sticky) + 콘텐츠
 * - 좌우 버튼 제거 → 스텝 클릭으로 이동
 */
export function SmartFlowLayout({
  currentStep,
  steps,
  onStepChange,
  children,
  showHistory = false,
  showHelp = false,
  onHistoryToggle,
  onHelpToggle,
  systemMemory,
  historyPanel,
  isAnalyzing = false,
  analyzingMessage,
  className
}: SmartFlowLayoutProps) {
  // 완료된 단계 확인
  const completedSteps = steps.filter(s => s.completed).map(s => s.id)

  // 전역 UI 컨텍스트 (채팅, 설정, 도움말 모달)
  const {
    openChatPanel,
    openSettings,
    openHelp: openGlobalHelp,
    isSettingsOpen,
    isHelpOpen,
    closeSettings,
    closeHelp: closeGlobalHelp,
  } = useUI()

  return (
    <div className={cn("min-h-full bg-background", className)}>
      {/* ===== 헤더 (Sticky) ===== */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* 좌측: 로고 + 히스토리 버튼 */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-lg font-bold text-foreground hover:text-primary transition-colors"
              >
                NIFS 통계 분석
              </Link>
              {onHistoryToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHistoryToggle}
                  className={cn(
                    "h-8 px-2 gap-1.5",
                    showHistory && "bg-muted"
                  )}
                  title="분석 히스토리"
                >
                  <Clock className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* 우측: 앱 아이콘 (채팅, 도움말, 설정) */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={openChatPanel}
                title="AI 챗봇"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={openGlobalHelp}
                title="도움말"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={openSettings}
                title="설정"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== 스테퍼 (Sticky, 헤더 아래) ===== */}
      <div className="sticky top-14 z-40 pointer-events-none">
        <div className="max-w-6xl mx-auto px-6 pt-4 pb-2">
          <div className="flex items-center justify-center">
            {/* 스테퍼 (Floating Pill) */}
            <nav className="pointer-events-auto inline-flex items-center bg-background/80 backdrop-blur-md border shadow-sm rounded-full px-6 py-2">
              {STEPS.map((step, idx) => {
                const isActive = step.id === currentStep
                const isCompleted = completedSteps.includes(step.id)
                const canClick = onStepChange && (isCompleted || step.id <= Math.max(...completedSteps, currentStep))

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => canClick && onStepChange?.(step.id)}
                      disabled={!canClick}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm",
                        canClick && "hover:bg-muted cursor-pointer",
                        !canClick && "cursor-default opacity-50",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary shadow-sm",
                        isCompleted && !isActive && "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        isCompleted && !isActive && "bg-primary/10 text-primary",
                        isActive && "bg-background text-primary",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted && !isActive ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </div>
                      <span className={cn("font-medium", isActive ? "text-primary-foreground" : "")}>{step.label}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className="w-4 h-px bg-border mx-1" />
                    )}
                  </div>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* ===== 메인 콘텐츠 ===== */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* SmartFlow 전용 도움말 패널 */}
        {showHelp && onHelpToggle && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">💾 데이터 크기 가이드</CardTitle>
                <Button variant="ghost" size="sm" onClick={onHelpToggle}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">현재 제한사항</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 최대 파일: 50MB</li>
                    <li>• 최대 데이터: 100,000행 × 1,000열</li>
                    <li>• 권장: 10,000행 이하 (빠른 처리)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">메모리별 권장 크기</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 4GB RAM: ~10,000행</li>
                    <li>• 8GB RAM: ~30,000행</li>
                    <li>• 16GB RAM: ~60,000행</li>
                    {systemMemory && (
                      <li className="font-medium text-blue-700 dark:text-blue-300">
                        → 감지된 메모리: {systemMemory}GB
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 히스토리 패널 */}
        {showHistory && historyPanel && onHistoryToggle && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">📊 분석 히스토리</CardTitle>
                <Button variant="ghost" size="sm" onClick={onHistoryToggle}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyPanel}
            </CardContent>
          </Card>
        )}

        {/* 메인 콘텐츠 */}
        {children}
      </main>

      {/* 분석 중 오버레이 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-80">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {analyzingMessage || '분석 중...'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 전역 모달들 */}
      <SettingsModal open={isSettingsOpen} onOpenChange={closeSettings} />
      <HelpModal open={isHelpOpen} onOpenChange={closeGlobalHelp} />
    </div>
  )
}
