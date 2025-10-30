'use client'

import React, { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronRight,
  Info,
  Settings,
  FileText,
  Download,
  Share2,
  HelpCircle,
  Play,
  RotateCcw,
  BookOpen,
  Video,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BarChart3
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
  methodInfo,
  steps,
  currentStep = 0,
  onStepChange,
  children,
  onDataUpload,
  variableSelectionStep,
  resultsStep,
  onRun,
  onReset,
  onExport,
  onHelp,
  isRunning = false,
  showProgress = true,
  showTips = true,
  className
}: StatisticsPageLayoutProps) {
  const [showMethodInfo, setShowMethodInfo] = useState(false)
  const [showQuickTip, setShowQuickTip] = useState(true)

  // 기존 페이지 호환성: steps가 없으면 간단한 모드
  const isAdvancedMode = steps && steps.length > 0

  // 진행률 계산 (고급 모드에서만)
  const progress = isAdvancedMode ? ((currentStep + 1) / steps.length) * 100 : 0

  // 현재 단계 정보 (고급 모드에서만)
  const currentStepInfo = isAdvancedMode ? steps[currentStep] : null

  // 빠른 도움말
  const quickTips = [
    "💡 데이터는 CSV, Excel 형식을 지원합니다",
    "📊 변수 타입이 자동으로 감지됩니다",
    "🎯 AI가 최적의 변수를 추천해드립니다",
    "📈 결과는 자동으로 시각화됩니다",
    "📝 보고서를 PDF로 저장할 수 있습니다"
  ]

  const randomTip = quickTips[Math.floor(Math.random() * quickTips.length)]

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-background via-background to-muted/20", className)}>
      <div className="container mx-auto py-6 space-y-6">
        {/* 헤더 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Card className="border-2 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* 아이콘 */}
                  {icon && (
                    <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                      <div className="text-primary">
                        {icon}
                      </div>
                    </div>
                  )}

                  {/* 제목 */}
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      {title}
                    </CardTitle>
                    {(subtitle || description) && (
                      <CardDescription className="mt-1">
                        {subtitle || description}
                      </CardDescription>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  {/* 방법 정보 */}
                  {methodInfo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowMethodInfo(!showMethodInfo)}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>통계 방법 정보</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* 설정 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <FileText className="w-4 h-4 mr-2" />
                        보고서 생성
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onExport}>
                        <Download className="w-4 h-4 mr-2" />
                        결과 내보내기
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="w-4 h-4 mr-2" />
                        공유하기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* 도움말 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <HelpCircle className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={onHelp}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        사용 가이드
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Video className="w-4 h-4 mr-2" />
                        동영상 튜토리얼
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        커뮤니티 질문
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 방법 정보 표시 */}
              <AnimatePresence>
                {showMethodInfo && methodInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      {methodInfo.formula && (
                        <div>
                          <p className="text-sm font-medium mb-1">수식</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {methodInfo.formula}
                          </code>
                        </div>
                      )}
                      {methodInfo.assumptions && (
                        <div>
                          <p className="text-sm font-medium mb-1">가정</p>
                          <div className="flex flex-wrap gap-1">
                            {methodInfo.assumptions.map((assumption, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {assumption}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {methodInfo.sampleSize && (
                        <div>
                          <p className="text-sm font-medium mb-1">표본 크기</p>
                          <p className="text-xs text-muted-foreground">
                            {methodInfo.sampleSize}
                          </p>
                        </div>
                      )}
                      {methodInfo.usage && (
                        <div>
                          <p className="text-sm font-medium mb-1">사용 예시</p>
                          <p className="text-xs text-muted-foreground">
                            {methodInfo.usage}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardHeader>

            {/* 진행 상태 바 (고급 모드에서만) */}
            {showProgress && isAdvancedMode && (
              <>
                <Separator />
                <CardContent className="pt-4 pb-3">
                  <div className="space-y-3">
                    {/* 단계 표시 */}
                    <div className="flex items-center justify-between">
                      {steps.map((step, idx) => (
                        <React.Fragment key={step.id}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onStepChange?.(idx)}
                                  disabled={idx > currentStep}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                                    idx === currentStep && "bg-primary/10 ring-2 ring-primary",
                                    idx < currentStep && "bg-green-500/10 text-green-700",
                                    idx > currentStep && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                    idx === currentStep && "bg-primary text-primary-foreground",
                                    idx < currentStep && "bg-green-500 text-white",
                                    idx > currentStep && "bg-muted"
                                  )}>
                                    {step.status === 'completed' ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : step.status === 'error' ? (
                                      <XCircle className="w-4 h-4" />
                                    ) : (
                                      step.number
                                    )}
                                  </div>
                                  <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium">{step.title}</p>
                                    {step.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {step.description}
                                      </p>
                                    )}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{step.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {idx < steps.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* 진행률 바 */}
                    <Progress value={progress} className="h-2" />

                    {/* 현재 단계 정보 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          단계 {currentStep + 1}/{steps.length}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {currentStepInfo?.title}
                        </span>
                      </div>

                      {/* 실행/초기화 버튼 */}
                      <div className="flex gap-2">
                        {onReset && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onReset}
                            disabled={isRunning}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            초기화
                          </Button>
                        )}
                        {onRun && currentStep === steps.length - 2 && (
                          <Button
                            size="sm"
                            onClick={onRun}
                            disabled={isRunning}
                            className="bg-gradient-to-r from-blue-500 to-purple-500"
                          >
                            {isRunning ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                분석 중...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                분석 실행
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>

          {/* 빠른 도움말 */}
          {showTips && showQuickTip && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-12 left-4 right-4"
            >
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {randomTip}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowQuickTip(false)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 메인 콘텐츠 영역 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className={showQuickTip ? "mt-16" : "mt-6"}
          >
            {/* Multi-step workflow support (cluster, factor-analysis) */}
            {(onDataUpload || variableSelectionStep || resultsStep) ? (
              <>
                {currentStep === 1 && onDataUpload && (
                  <div>Data Upload Step</div>
                )}
                {currentStep === 2 && variableSelectionStep}
                {currentStep === 3 && variableSelectionStep}
                {currentStep === 4 && resultsStep}
              </>
            ) : (
              children
            )}
          </motion.div>
        </AnimatePresence>

        {/* 플로팅 액션 버튼 (빠른 분석) */}
        {onRun && (
          <motion.div
            className="fixed bottom-8 right-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-primary to-purple-600"
                    onClick={onRun}
                    disabled={isRunning}
                  >
                    <Zap className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>빠른 분석 실행 (Ctrl+Enter)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// 단계 카드 컴포넌트
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
    <Card className={cn("shadow-lg border-2", className)}>
      {(title || description) && (
        <CardHeader>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  )
}