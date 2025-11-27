import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
  Lightbulb,
  HelpCircle
} from 'lucide-react'
import { PValueWithSignificance } from './PValueBadge'
import { EffectSizeCard } from './EffectSizeCard'
import { AssumptionTestCard } from './AssumptionTestCard'
import { StatisticsTable } from './StatisticsTable'
import { ConfidenceIntervalDisplay } from './ConfidenceIntervalDisplay'
import { ResultActionButtons } from './ResultActionButtons'
import { formatNumber, formatStatisticalResult } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// 효과크기 타입별 툴팁 설명
function getEffectSizeTooltip(type?: string): string {
  switch (type) {
    case 'cohen_d':
      return "Cohen's d: 두 그룹 평균 차이를 표준편차로 나눈 값. |d| < 0.2 작음, 0.2-0.8 중간, > 0.8 큼"
    case 'eta_squared':
      return "Eta squared (η²): 총 분산 중 그룹 간 차이로 설명되는 비율. < 0.01 작음, 0.01-0.06 중간, > 0.14 큼"
    case 'r':
      return "상관계수 r: 두 변수 간 선형 관계 강도. |r| < 0.1 작음, 0.1-0.3 중간, > 0.5 큼"
    case 'phi':
      return "Phi (φ): 2×2 분할표에서의 연관성 강도. 해석은 r과 동일"
    case 'cramers_v':
      return "Cramer's V: 분할표에서의 연관성 강도. 자유도에 따라 해석이 달라짐"
    default:
      return "효과크기는 통계적 유의성과 별개로 실질적인 효과의 크기를 나타냅니다."
  }
}

// 효과크기 해석
function getEffectSizeInterpretation(value: number, type?: string): string {
  const absValue = Math.abs(value)

  switch (type) {
    case 'cohen_d':
      if (absValue < 0.2) return '작음'
      if (absValue < 0.5) return '작음~중간'
      if (absValue < 0.8) return '중간'
      return '큼'
    case 'eta_squared':
      if (absValue < 0.01) return '작음'
      if (absValue < 0.06) return '중간'
      if (absValue < 0.14) return '중간~큼'
      return '큼'
    case 'r':
    case 'phi':
      if (absValue < 0.1) return '작음'
      if (absValue < 0.3) return '중간'
      if (absValue < 0.5) return '중간~큼'
      return '큼'
    case 'cramers_v':
      if (absValue < 0.1) return '작음'
      if (absValue < 0.3) return '중간'
      return '큼'
    default:
      if (absValue < 0.2) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
  }
}

export interface StatisticalResult {
  // 기본 정보
  testName: string
  testType?: string
  description?: string

  // 주요 통계량
  statistic: number
  statisticName?: string // 't', 'F', 'χ²' 등
  df?: number | number[]
  pValue: number
  alpha?: number

  // 효과크기
  effectSize?: {
    value: number
    type?: 'cohen_d' | 'eta_squared' | 'r' | 'phi' | 'cramers_v'
    ci?: [number, number]
  }

  // 신뢰구간
  confidenceInterval?: {
    estimate: number
    lower: number
    upper: number
    level?: number
  }

  // 가정 검정
  assumptions?: Array<{
    name: string
    description?: string
    testStatistic?: number
    pValue: number | null
    passed: boolean | null
    recommendation?: string
  }>

  // 추가 결과 테이블
  additionalResults?: {
    title: string
    columns: any[]
    data: any[]
  }

  // 해석 및 권장사항
  interpretation?: string
  recommendations?: string[]
  warnings?: string[]
  alternatives?: Array<{
    name: string
    reason: string
    action?: () => void
  }>

  // 메타데이터
  sampleSize?: number
  groups?: number
  variables?: string[]
  timestamp?: Date
}

interface StatisticalResultCardProps {
  result: StatisticalResult
  showAssumptions?: boolean
  showEffectSize?: boolean
  showConfidenceInterval?: boolean
  showInterpretation?: boolean
  showActions?: boolean
  expandable?: boolean
  className?: string
  onRerun?: () => void
  onViewDetails?: () => void
}

/**
 * 통계 분석 결과를 종합적으로 표시하는 통합 카드 컴포넌트
 * 모든 개별 컴포넌트를 조합하여 완전한 결과 표시
 */
export function StatisticalResultCard({
  result,
  showAssumptions = true,
  showEffectSize = true,
  showConfidenceInterval = true,
  showInterpretation = true,
  showActions = true,
  expandable = true,
  className,
  onRerun,
  onViewDetails
}: StatisticalResultCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(!expandable)
  const [activeTab, setActiveTab] = React.useState('main')

  // 유의성 판단
  const isSignificant = result.pValue < (result.alpha || 0.05)

  // 가정 충족 여부
  const assumptionsPassed = result.assumptions?.every(a => a.passed !== false) ?? true

  // 상태 색상
  const getStatusColor = () => {
    if (!assumptionsPassed) return 'border-warning-border bg-warning-bg/50'
    if (isSignificant) return 'border-stat-significant/30 bg-stat-significant/5'
    return 'border-gray-200'
  }

  // 상태 아이콘
  const StatusIcon = !assumptionsPassed ? AlertCircle :
    isSignificant ? CheckCircle2 : XCircle

  return (
    <Card className={cn('transition-all duration-300', getStatusColor(), className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn(
                'w-5 h-5',
                !assumptionsPassed ? 'text-warning' :
                  isSignificant ? 'text-stat-significant' : 'text-stat-non-significant'
              )} />
              <CardTitle className="text-xl">{result.testName}</CardTitle>
              {result.testType && (
                <Badge variant="secondary" className="ml-2">
                  {result.testType}
                </Badge>
              )}
            </div>
            {result.description && (
              <CardDescription className="mt-2">
                {result.description}
              </CardDescription>
            )}
          </div>

          {expandable && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="p-2 rounded-md hover:bg-muted transition-colors">
                  <ChevronRight
                    className={cn(
                      'w-5 h-5 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>

        {/* 주요 결과 요약 */}
        <TooltipProvider>
          <div className="mt-4 p-4 bg-background rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 통계량 */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-sm text-muted-foreground">통계량</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">검정통계량은 귀무가설 하에서 표본 데이터가 얼마나 극단적인지를 나타냅니다.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">
                  {result.statisticName || 'Statistic'} = {formatNumber(result.statistic, 4)}
                </p>
                {result.df && (
                  <p className="text-xs text-muted-foreground mt-1">
                    df = {Array.isArray(result.df) ? result.df.join(', ') : result.df}
                  </p>
                )}
              </div>

              {/* P-value */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-sm text-muted-foreground">p-value</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">귀무가설이 참일 때 현재 결과 이상으로 극단적인 값을 얻을 확률입니다. p {'<'} {result.alpha || 0.05}이면 통계적으로 유의합니다.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex justify-center mt-2">
                  <PValueWithSignificance
                    value={result.pValue}
                    alpha={result.alpha}
                    showSignificance={true}
                    size="lg"
                  />
                </div>
              </div>

              {/* 효과크기 */}
              {result.effectSize && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <p className="text-sm text-muted-foreground">효과크기</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          {getEffectSizeTooltip(result.effectSize.type)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(result.effectSize.value, 3)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.effectSize.type?.replace('_', ' ')} ({getEffectSizeInterpretation(result.effectSize.value, result.effectSize.type)})
                  </p>
                </div>
              )}
            </div>
          </div>
        </TooltipProvider>

        {/* 가정 위반 경고 */}
        {!assumptionsPassed && (
          <Alert className="mt-3" variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>주의사항</AlertTitle>
            <AlertDescription>
              일부 통계적 가정이 충족되지 않았습니다. 결과 해석에 주의가 필요합니다.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="main" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  주요 결과
                </TabsTrigger>
                <TabsTrigger value="assumptions" className="flex items-center gap-1">
                  <Settings className="w-4 h-4" />
                  가정 검정
                </TabsTrigger>
                <TabsTrigger value="interpretation" className="flex items-center gap-1">
                  <Lightbulb className="w-4 h-4" />
                  해석
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  상세
                </TabsTrigger>
              </TabsList>

              {/* 주요 결과 탭 */}
              <TabsContent value="main" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 효과크기 카드 */}
                  {showEffectSize && result.effectSize && (
                    <EffectSizeCard
                      title="효과크기"
                      value={result.effectSize.value}
                      type={result.effectSize.type}
                      showInterpretation={true}
                      showVisualScale={true}
                    />
                  )}

                  {/* 신뢰구간 표시 */}
                  {showConfidenceInterval && result.confidenceInterval && (
                    <ConfidenceIntervalDisplay
                      lower={result.confidenceInterval.lower}
                      upper={result.confidenceInterval.upper}
                      estimate={result.confidenceInterval.estimate}
                      level={result.confidenceInterval.level}
                      label="신뢰구간"
                      showVisualization={true}
                      showInterpretation={false}
                    />
                  )}
                </div>

                {/* 추가 결과 테이블 */}
                {result.additionalResults && (
                  <StatisticsTable
                    title={result.additionalResults.title}
                    columns={result.additionalResults.columns}
                    data={result.additionalResults.data}
                    compactMode={true}
                  />
                )}
              </TabsContent>

              {/* 가정 검정 탭 */}
              <TabsContent value="assumptions" className="mt-4">
                {showAssumptions && result.assumptions && (
                  <AssumptionTestCard
                    tests={result.assumptions}
                    testType={result.testType}
                    showRecommendations={true}
                    showDetails={true}
                  />
                )}
                {!result.assumptions && (
                  <div className="text-center py-8 text-muted-foreground">
                    가정 검정 결과가 없습니다.
                  </div>
                )}
              </TabsContent>

              {/* 해석 탭 */}
              <TabsContent value="interpretation" className="space-y-4 mt-4">
                {showInterpretation && (
                  <>
                    {/* 결과 해석 */}
                    {result.interpretation && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>결과 해석</AlertTitle>
                        <AlertDescription className="mt-2">
                          {result.interpretation}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 권장사항 */}
                    {result.recommendations && result.recommendations.length > 0 && (
                      <Card className="bg-blue-50/50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-600" />
                            권장사항
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {result.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5" />
                                <span className="text-sm">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* 경고사항 */}
                    {result.warnings && result.warnings.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>주의사항</AlertTitle>
                        <AlertDescription>
                          <ul className="mt-2 space-y-1">
                            {result.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 대안 분석 방법 */}
                    {result.alternatives && result.alternatives.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">대안 분석 방법</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {result.alternatives.map((alt, idx) => (
                            <div
                              key={idx}
                              className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={alt.action}
                            >
                              <div className="font-medium text-sm">{alt.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {alt.reason}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* 상세 정보 탭 */}
              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  {/* 메타데이터 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">분석 정보</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        {result.sampleSize && (
                          <>
                            <dt className="text-muted-foreground">표본크기:</dt>
                            <dd className="font-medium">{result.sampleSize}</dd>
                          </>
                        )}
                        {result.groups && (
                          <>
                            <dt className="text-muted-foreground">그룹 수:</dt>
                            <dd className="font-medium">{result.groups}</dd>
                          </>
                        )}
                        {result.variables && (
                          <>
                            <dt className="text-muted-foreground">변수:</dt>
                            <dd className="font-medium">{result.variables.join(', ')}</dd>
                          </>
                        )}
                        {result.timestamp && (
                          <>
                            <dt className="text-muted-foreground">분석 시간:</dt>
                            <dd className="font-medium">
                              {new Date(result.timestamp).toLocaleString('ko-KR')}
                            </dd>
                          </>
                        )}
                        <dt className="text-muted-foreground">유의수준:</dt>
                        <dd className="font-medium">{result.alpha || 0.05}</dd>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* 전체 결과 요약 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">통계 요약</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-xs bg-muted p-3 rounded-lg block">
                        {formatStatisticalResult(
                          result.statisticName || 'Statistic',
                          result.statistic,
                          result.df || 0,
                          result.pValue
                        )}
                      </code>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* 액션 버튼 */}
            {showActions && (
              <div className="mt-6 pt-6 border-t">
                <ResultActionButtons
                  onExportReport={(options) => console.log('Export report:', options)}
                  onExportData={(format) => console.log('Export data:', format)}
                  onShare={(options) => console.log('Share:', options)}
                  onCopyToClipboard={() => {
                    const text = formatStatisticalResult(
                      result.statisticName || 'Statistic',
                      result.statistic,
                      result.df || 0,
                      result.pValue
                    )
                    navigator.clipboard.writeText(text)
                  }}
                  compact={false}
                  showLabels={true}
                />
              </div>
            )}

            {/* 재분석 버튼 */}
            {(onRerun || onViewDetails) && (
              <div className="mt-4 flex gap-2">
                {onRerun && (
                  <button
                    onClick={onRerun}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    다시 분석
                  </button>
                )}
                {onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                  >
                    자세히 보기
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}