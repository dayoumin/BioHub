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
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
  Lightbulb,
  BookOpen
} from 'lucide-react'
import { PValueBadge, PValueWithSignificance } from './PValueBadge'
import { EffectSizeCard } from './EffectSizeCard'
import { AssumptionTestCard } from './AssumptionTestCard'
import { StatisticsTable } from './StatisticsTable'
import { ConfidenceIntervalDisplay } from './ConfidenceIntervalDisplay'
import { ResultActionButtons } from './ResultActionButtons'
import { EasyExplanation } from './EasyExplanation'
import { NextStepsCard } from './NextStepsCard'
import { formatNumber, formatStatisticalResult } from '@/lib/statistics/formatters'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

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
  const { userLevel, setUserLevel } = useSettingsStore()

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

        {/* 사용자 레벨 선택 UI */}
        <div className="mt-4 flex justify-end">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground px-2">설명 수준:</span>
            <RadioGroup
              value={userLevel}
              onValueChange={(v) => setUserLevel(v as any)}
              className="flex gap-1"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="beginner" id="r1" className="sr-only" />
                <Label
                  htmlFor="r1"
                  className={cn(
                    "text-xs px-2 py-1 rounded cursor-pointer transition-colors",
                    userLevel === 'beginner' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  초보자
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="intermediate" id="r2" className="sr-only" />
                <Label
                  htmlFor="r2"
                  className={cn(
                    "text-xs px-2 py-1 rounded cursor-pointer transition-colors",
                    userLevel === 'intermediate' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  중급자
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="expert" id="r3" className="sr-only" />
                <Label
                  htmlFor="r3"
                  className={cn(
                    "text-xs px-2 py-1 rounded cursor-pointer transition-colors",
                    userLevel === 'expert' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  전문가
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* 쉬운 설명 (초보자용) */}
        {userLevel === 'beginner' && (
          <div className="mt-4">
            <EasyExplanation
              pValue={result.pValue}
              effectSize={result.effectSize ? {
                value: result.effectSize.value,
                type: result.effectSize.type || 'unknown'
              } : undefined}
              isSignificant={isSignificant}
              testType={result.testType}
              alpha={result.alpha}
            />
          </div>
        )}

        {/* 주요 결과 요약 (중급/전문가용) */}
        {userLevel !== 'beginner' && (
          <div className="mt-4 p-4 bg-background rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 통계량 */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">통계량</p>
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
                <p className="text-sm text-muted-foreground mb-1">유의확률</p>
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
                  <p className="text-sm text-muted-foreground mb-1">효과크기</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(result.effectSize.value, 3)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.effectSize.type?.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 다음 단계 안내 (초보자/중급자용) */}
        {userLevel !== 'expert' && (
          <div className="mt-4">
            <NextStepsCard
              isSignificant={isSignificant}
              testType={result.testType}
              assumptionsPassed={assumptionsPassed}
              hasPostHoc={result.testName.toLowerCase().includes('anova')}
            />
          </div>
        )}

        {/* 빠른 해석 */}
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