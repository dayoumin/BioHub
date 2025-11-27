import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Activity,
  BarChart3,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PValueBadge } from './PValueBadge'
import { formatNumber, interpretPValue } from '@/lib/statistics/formatters'
import { getAlternatives } from '@/lib/statistics/alternative-mapping'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface AssumptionTest {
  name: string
  description?: string
  testStatistic?: number
  testName?: string // e.g., "Shapiro-Wilk", "Levene's"
  pValue: number | null
  passed: boolean | null
  alpha?: number
  details?: string
  recommendation?: string
  severity?: 'low' | 'medium' | 'high'
}

interface AssumptionTestCardProps {
  title?: string
  tests: AssumptionTest[]
  testType?: string
  showRecommendations?: boolean
  showDetails?: boolean
  className?: string
  onViolation?: (test: AssumptionTest) => void
}

/**
 * 통계 가정 검정 결과를 표시하는 카드 컴포넌트
 * 정규성, 등분산성, 독립성 등의 가정을 시각적으로 표현
 */
export function AssumptionTestCard({
  title = '가정 검정 결과',
  tests,
  testType,
  showRecommendations = true,
  showDetails = true,
  className,
  onViolation
}: AssumptionTestCardProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const router = useRouter()

  // 전체 가정 충족 여부
  const allPassed = tests.every(test => test.passed !== false)
  const hasViolations = tests.some(test => test.passed === false)
  const hasWarnings = tests.some(test => test.severity === 'medium')

  // 심각도에 따른 색상 결정
  const getStatusColor = () => {
    if (allPassed) return 'text-success bg-success-bg border-success-border'
    if (hasViolations) {
      const highSeverity = tests.some(t => t.severity === 'high' && !t.passed)
      if (highSeverity) return 'text-error bg-error-bg border-error-border'
      return 'text-warning bg-warning-bg border-warning-border'
    }
    if (hasWarnings) return 'text-warning bg-warning-bg border-warning-border'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // 상태 아이콘 결정
  const StatusIcon = allPassed ? CheckCircle2 : hasViolations ? XCircle : AlertCircle

  // 개별 테스트 아이콘
  const getTestIcon = (test: AssumptionTest) => {
    if (test.passed === null) return <Info className="w-4 h-4 text-gray-400" />
    if (test.passed) return <CheckCircle2 className="w-4 h-4 text-success" />
    if (test.severity === 'high') return <XCircle className="w-4 h-4 text-error" />
    if (test.severity === 'medium') return <AlertCircle className="w-4 h-4 text-warning" />
    return <XCircle className="w-4 h-4 text-warning" />
  }

  // 테스트 통계량 포맷
  const formatTestStatistic = (test: AssumptionTest) => {
    if (!test.testStatistic) return null
    const statName = test.testName || 'Statistic'
    return `${statName} = ${formatNumber(test.testStatistic, 4)}`
  }

  // 위반된 가정에 대한 권장사항 집계
  const recommendations = tests
    .filter(test => test.passed === false && test.recommendation)
    .map(test => ({
      name: test.name,
      recommendation: test.recommendation!,
      severity: test.severity || 'low'
    }))

  return (
    <Card className={cn('overflow-hidden transition-all duration-300', className)}>
      <CardHeader className={cn('pb-3', getStatusColor())}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasViolations && (
              <Badge variant="destructive" className="text-xs">
                {tests.filter(t => !t.passed).length}개 위반
              </Badge>
            )}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <button className="p-1 rounded-md hover:bg-white/20 transition-colors">
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isOpen && "rotate-90"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
        {!allPassed && (
          <CardDescription className="mt-1 text-sm font-medium">
            일부 통계적 가정이 충족되지 않았습니다
          </CardDescription>
        )}
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="pt-4 space-y-3">
            {/* 개별 가정 검정 결과 */}
            <div className="space-y-2">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200",
                    test.passed === true && "bg-success-bg/50 border-success-border hover:bg-success-bg",
                    test.passed === false && "bg-warning-bg/50 border-warning-border hover:bg-warning-bg",
                    test.passed === null && "bg-gray-50/50 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      {getTestIcon(test)}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{test.name}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  {test.description || `${test.name} 가정을 검정합니다`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* 테스트 통계량 및 p-value */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {formatTestStatistic(test) && (
                            <span className="font-mono">{formatTestStatistic(test)}</span>
                          )}
                          {test.pValue !== null && (
                            <PValueBadge
                              value={test.pValue}
                              alpha={test.alpha}
                              size="sm"
                              showLabel={false}
                            />
                          )}
                        </div>

                        {/* 상세 설명 */}
                        {showDetails && test.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {test.details}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 심각도 표시 */}
                    {test.passed === false && test.severity && (
                      <Badge
                        variant={
                          test.severity === 'high' ? 'destructive' :
                            test.severity === 'medium' ? 'secondary' : 'outline'
                        }
                        className="text-xs ml-2"
                      >
                        {test.severity === 'high' ? '심각' :
                          test.severity === 'medium' ? '보통' : '경미'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 권장사항 섹션 */}
            {showRecommendations && recommendations.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>권장 조치사항</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{rec.name}:</span>
                        <span className="text-sm ml-1">{rec.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* 대안 분석 버튼 */}
            {hasViolations && testType && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  추천 대안 분석 방법
                </p>
                <div className="grid gap-2">
                  {getAlternatives(testType).map((alt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <div className="font-medium text-sm">{alt.name}</div>
                        <div className="text-xs text-muted-foreground">{alt.reason}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => router.push(alt.route)}
                      >
                        이동 <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {getAlternatives(testType).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      이 분석에 대해 등록된 대안 분석 방법이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 기존 대안 분석 버튼 (Fallback) */}
            {hasViolations && !testType && onViolation && (
              <button
                onClick={() => {
                  const violatedTest = tests.find(t => !t.passed)
                  if (violatedTest) onViolation(violatedTest)
                }}
                className={cn(
                  "w-full mt-3 px-4 py-2 rounded-lg font-medium text-sm",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "transition-colors duration-200 flex items-center justify-center gap-2"
                )}
              >
                <Activity className="w-4 h-4" />
                대안 분석 방법 추천받기
              </button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

/**
 * 가정 검정 요약 컴포넌트 - 간단한 인라인 표시용
 */
interface AssumptionSummaryProps {
  tests: AssumptionTest[]
  className?: string
}

export function AssumptionSummary({ tests, className }: AssumptionSummaryProps) {
  const passedCount = tests.filter(t => t.passed === true).length
  const totalCount = tests.length
  const allPassed = passedCount === totalCount

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        {allPassed ? (
          <CheckCircle2 className="w-4 h-4 text-success" />
        ) : (
          <AlertCircle className="w-4 h-4 text-warning" />
        )}
        <span className="text-sm font-medium">
          가정 검정: {passedCount}/{totalCount} 충족
        </span>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              {tests.map((test, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {test.passed ? '✓' : '✗'}
                  <span>{test.name}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

/**
 * 가정 검정 진행 상황 표시 컴포넌트
 */
interface AssumptionProgressProps {
  tests: AssumptionTest[]
  currentTest?: string
  className?: string
}

export function AssumptionProgress({ tests, currentTest, className }: AssumptionProgressProps) {
  const completedCount = tests.filter(t => t.pValue !== null).length
  const totalCount = tests.length
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">가정 검정 진행</span>
        <span className="font-medium">{completedCount}/{totalCount}</span>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {currentTest && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Activity className="w-3 h-3 animate-pulse" />
          {currentTest} 검정 중...
        </p>
      )}
    </div>
  )
}