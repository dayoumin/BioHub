'use client'

import React, { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 단계 인터페이스
export interface StatisticsStep {
  id: string
  number: number
  title: string
  description?: string
  icon?: ReactNode
  status: 'pending' | 'current' | 'completed' | 'error'
}

// Props 인터페이스
interface StatisticsPageLayoutProps {
  // 기본 정보
  title: string
  subtitle?: string
  description?: string  // 기존 페이지 호환성을 위한 description
  icon?: ReactNode
  methodInfo?: {
    formula?: string
    assumptions?: string[]
    sampleSize?: string
    usage?: string
  }

  // 선택된 분석 방법 정보 (컨텍스트 바)
  selectedMethod?: {
    name: string
    subtitle?: string
  }

  // 단계 관리 (옵션)
  steps?: StatisticsStep[]
  currentStep?: number
  onStepChange?: (step: number) => void

  // 콘텐츠
  children?: ReactNode

  // 다단계 분석 지원 (cluster, factor-analysis 등)
  onDataUpload?: (file: File, data: unknown[]) => void
  variableSelectionStep?: ReactNode
  resultsStep?: ReactNode

  // 액션
  onRun?: () => void
  onReset?: () => void
  onExport?: () => void
  onHelp?: () => void
  isRunning?: boolean

  // 추가 옵션
  showProgress?: boolean
  showTips?: boolean
  className?: string
}

// 단계별 애니메이션 설정
const stepVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

export function StatisticsPageLayout({
  title,
  subtitle,
  description,
  icon,
  selectedMethod,
  steps,
  currentStep = 0,
  onStepChange,
  children,
  onDataUpload,
  variableSelectionStep,
  resultsStep,
  onReset,
  isRunning = false,
  showProgress = true,
  className
}: StatisticsPageLayoutProps) {

  // 기존 페이지 호환성: steps가 없으면 간단한 모드
  const isAdvancedMode = steps && steps.length > 0

  // 진행률 계산 (고급 모드에서만)
  const progress = isAdvancedMode ? ((currentStep + 1) / steps.length) * 100 : 0


  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* 미니멀 헤더 */}
      <div className="border-b bg-card">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center justify-between">
            {/* 좌측: 제목 + 아이콘 */}
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 bg-primary/10 rounded-lg">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                {(subtitle || description) && (
                  <p className="text-xs text-muted-foreground">
                    {subtitle || description}
                  </p>
                )}
              </div>
            </div>

            {/* 우측: 액션 버튼 */}
            {isAdvancedMode && (
              <div className="flex gap-2">
                {onReset && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    disabled={isRunning}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    초기화
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 선택한 분석 방법 컨텍스트 바 */}
      {selectedMethod && currentStep > 0 && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto py-2 px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">선택된 방법:</span>
              <span className="text-sm font-medium">{selectedMethod.name}</span>
              {selectedMethod.subtitle && (
                <span className="text-xs text-muted-foreground">({selectedMethod.subtitle})</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 메인 레이아웃: 사이드바 + 콘텐츠 */}
      <div className="container mx-auto flex">
        {/* 좌측 사이드바 (단계 표시) */}
        {isAdvancedMode && showProgress && (
          <aside className="w-48 border-r bg-card/50 min-h-[calc(100vh-64px)] p-4">
            <div className="space-y-2 sticky top-4">
              {steps.map((step, idx) => (
                <TooltipProvider key={step.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onStepChange?.(idx)}
                        disabled={idx > currentStep}
                        className={cn(
                          "w-full flex items-start gap-2 p-2 rounded text-left transition-all",
                          idx === currentStep && "bg-primary/10 text-primary",
                          idx < currentStep && "text-muted-foreground hover:bg-muted",
                          idx > currentStep && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                          idx === currentStep && "bg-primary text-primary-foreground",
                          idx < currentStep && "bg-muted-foreground/20",
                          idx > currentStep && "bg-muted"
                        )}>
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : step.status === 'error' ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            step.number
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{step.title}</p>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-sm">{step.title}</p>
                      {step.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}

              {/* 이전 단계 버튼 */}
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStepChange?.(currentStep - 1)}
                  className="w-full mt-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전 단계
                </Button>
              )}

              {/* 진행률 표시 */}
              <div className="pt-4 mt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">진행률</span>
                  <span className="text-xs font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            </div>
          </aside>
        )}

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {(onDataUpload || variableSelectionStep || resultsStep) ? (
                <>
                  {currentStep === 1 && onDataUpload && (
                    <div>Data Upload Step</div>
                  )}
                  {currentStep === 2 && variableSelectionStep}
                  {currentStep === 3 && variableSelectionStep}
                  {steps && currentStep === steps.length - 1 && resultsStep}
                </>
              ) : (
                children
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// 단계 카드 컴포넌트 (미니멀)
export function StepCard({
  title,
  description,
  children,
  icon,
  className
}: {
  title?: string
  description?: string
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("border shadow-sm", className)}>
      {(title || description) && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="p-1.5 bg-primary/10 rounded">
                {icon}
              </div>
            )}
            <div>
              {title && <CardTitle className="text-base">{title}</CardTitle>}
              {description && (
                <CardDescription className="text-xs mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}