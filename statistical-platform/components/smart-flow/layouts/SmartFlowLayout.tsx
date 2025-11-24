'use client'

import React, { ReactNode } from 'react'
import { TwoPanelLayout, Step, BreadcrumbItem } from '@/components/statistics/layouts/TwoPanelLayout'
import { Sparkles, Clock, HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface SmartFlowLayoutProps {
  // TwoPanelLayout 기본 Props
  currentStep: number
  steps: Step[]
  onStepChange?: (step: number) => void

  // 메인 콘텐츠
  children: ReactNode

  // 하단 데이터 미리보기 (선택)
  bottomPreview?: {
    data: Array<Record<string, unknown>>
    fileName?: string
    maxRows?: number
    onOpenNewWindow?: () => void
  }

  // 분석 중 오버레이
  isAnalyzing?: boolean
  analyzingMessage?: string

  // 스마트 분석 전용 Props
  showHistory?: boolean
  showHelp?: boolean
  onHistoryToggle?: () => void
  onHelpToggle?: () => void
  systemMemory?: number | null
  historyPanel?: ReactNode

  // 옵셔널
  className?: string
}

/**
 * 스마트 통계 분석 전용 레이아웃
 *
 * TwoPanelLayout을 기반으로 하되, 스마트 분석 특화 기능 추가:
 * - Blue-Purple 그라데이션 색상 (개별 통계와 차별화)
 * - 분석 히스토리 패널
 * - 데이터 제한 안내 도움말
 * - AI 아이콘 강조
 */
export function SmartFlowLayout({
  currentStep,
  steps,
  onStepChange,
  children,
  bottomPreview,
  isAnalyzing = false,
  analyzingMessage,
  showHistory = false,
  showHelp = false,
  onHistoryToggle,
  onHelpToggle,
  systemMemory,
  historyPanel,
  className
}: SmartFlowLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* 상단 헤더 영역 (히스토리/도움말 토글만) */}
      <div className="bg-background border-b px-6 py-3 flex items-center justify-end">

        <div className="flex items-center gap-2">
          {onHistoryToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onHistoryToggle}
              className="h-8"
            >
              <Clock className="w-4 h-4 mr-2" />
              분석 히스토리
            </Button>
          )}
          {onHelpToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onHelpToggle}
              className="h-8"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              데이터 제한 안내
            </Button>
          )}
        </div>
      </div>

      {/* 도움말 패널 */}
      {showHelp && onHelpToggle && (
        <div className="px-6 pt-4">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">💾 데이터 크기 가이드</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHelpToggle}
                >
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

              <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                <p className="text-sm">
                  <strong>💡 팁:</strong> 브라우저는 시스템 메모리의 25-50%만 사용 가능합니다.
                  대용량 데이터는 샘플링하거나 필요한 컬럼만 선택하세요.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 분석 히스토리 패널 */}
      {showHistory && historyPanel && onHistoryToggle && (
        <div className="px-6 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">📊 분석 히스토리</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHistoryToggle}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyPanel}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TwoPanelLayout으로 메인 레이아웃 위임 */}
      <div className="flex-1 overflow-hidden">
        <TwoPanelLayout
          currentStep={currentStep}
          steps={steps}
          onStepChange={onStepChange}
          analysisTitle="스마트 통계 분석"
          analysisSubtitle="AI-powered Statistical Analysis"
          analysisIcon={<Sparkles className="w-5 h-5 text-blue-500" />}
          breadcrumbs={[
            { label: '홈', href: '/' },
            { label: '스마트 분석', href: '/smart-flow' }
          ]}
          bottomPreview={bottomPreview}
          isAnalyzing={isAnalyzing}
          analyzingMessage={analyzingMessage}
          className={className}
        >
          {children}
        </TwoPanelLayout>
      </div>
    </div>
  )
}
