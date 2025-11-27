'use client'

import { useState } from 'react'
import { Check, Sparkles, ChevronDown, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { QUESTION_TYPES, checkMethodRequirements } from '@/lib/statistics/method-mapping'
import { FitScoreIndicator, FitScoreBadge } from '@/components/smart-flow/visualization/FitScoreIndicator'
import type { StatisticalMethod } from '@/types/smart-flow'

interface RecommendedMethodsProps {
  methods: StatisticalMethod[]
  selectedMethod: StatisticalMethod | null
  showRecommendations: boolean
  onToggle: () => void
  onMethodSelect: (method: StatisticalMethod) => void
  onQuestionTypeChange: (typeId: string) => void
  dataProfile?: {
    totalRows: number
    numericVars: number
    categoricalVars: number
    normalityPassed?: boolean
    homogeneityPassed?: boolean
  }
  assumptionResults?: {
    normality?: {
      shapiroWilk?: { isNormal?: boolean }
      kolmogorovSmirnov?: { isNormal?: boolean }
    }
    homogeneity?: {
      levene?: { equalVariance?: boolean }
      bartlett?: { equalVariance?: boolean }
    }
  }
}

// 체크리스트 아이템 컴포넌트
function ChecklistItem({
  passed,
  label,
  type = 'check'
}: {
  passed: boolean | undefined
  label: string
  type?: 'check' | 'warning'
}) {
  const Icon = passed === undefined
    ? AlertCircle
    : passed
      ? CheckCircle2
      : type === 'warning' ? AlertCircle : XCircle

  const color = passed === undefined
    ? 'text-muted-foreground'
    : passed
      ? 'text-green-600 dark:text-green-400'
      : type === 'warning'
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

// 신뢰도 점수 계산 함수
function calculateFitScore(
  method: StatisticalMethod,
  dataProfile?: RecommendedMethodsProps['dataProfile'],
  assumptionResults?: RecommendedMethodsProps['assumptionResults']
): number {
  if (!dataProfile) return 0

  const methodReq = method.requirements
  let passedCount = 0
  let totalCount = 0

  // 샘플 크기 체크
  if (methodReq?.minSampleSize) {
    totalCount++
    if (dataProfile.totalRows >= methodReq.minSampleSize) passedCount++
  }

  // 변수 타입 체크
  if (methodReq?.variableTypes) {
    if (methodReq.variableTypes.includes('numeric')) {
      totalCount++
      if (dataProfile.numericVars > 0) passedCount++
    }
    if (methodReq.variableTypes.includes('categorical')) {
      totalCount++
      if (dataProfile.categoricalVars > 0) passedCount++
    }
  }

  // 가정 체크
  if (methodReq?.assumptions) {
    methodReq.assumptions.forEach((assumption) => {
      if (assumption === '정규성') {
        const normalityPassed =
          assumptionResults?.normality?.shapiroWilk?.isNormal ??
          assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
          dataProfile.normalityPassed

        if (normalityPassed !== undefined) {
          totalCount++
          if (normalityPassed) passedCount++
        }
      }

      if (assumption === '등분산성') {
        const homogeneityPassed =
          assumptionResults?.homogeneity?.levene?.equalVariance ??
          assumptionResults?.homogeneity?.bartlett?.equalVariance ??
          dataProfile.homogeneityPassed

        if (homogeneityPassed !== undefined) {
          totalCount++
          if (homogeneityPassed) passedCount++
        }
      }
    })
  }

  return totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 75 // default to good if no requirements
}

// 추천 이유 체크리스트 (확장 시 표시)
function RecommendationDetails({
  method,
  dataProfile,
  assumptionResults
}: {
  method: StatisticalMethod
  dataProfile?: RecommendedMethodsProps['dataProfile']
  assumptionResults?: RecommendedMethodsProps['assumptionResults']
}) {
  if (!dataProfile) {
    return (
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <Info className="w-4 h-4 inline mr-1" />
        데이터 프로파일 정보가 없습니다
      </div>
    )
  }

  const methodReq = method.requirements
  const requirements = checkMethodRequirements(method, dataProfile)

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
      <h5 className="text-xs font-medium text-muted-foreground">적합도 상세</h5>

      <div className="space-y-1.5">
        {/* 샘플 크기 */}
        {methodReq?.minSampleSize && (
          <ChecklistItem
            passed={dataProfile.totalRows >= methodReq.minSampleSize}
            label={`샘플 크기: ${dataProfile.totalRows}개 (최소 ${methodReq.minSampleSize}개 필요)`}
          />
        )}

        {/* 변수 타입 */}
        {methodReq?.variableTypes?.includes('numeric') && (
          <ChecklistItem
            passed={dataProfile.numericVars > 0}
            label={`수치형 변수: ${dataProfile.numericVars}개`}
          />
        )}
        {methodReq?.variableTypes?.includes('categorical') && (
          <ChecklistItem
            passed={dataProfile.categoricalVars > 0}
            label={`범주형 변수: ${dataProfile.categoricalVars}개`}
          />
        )}

        {/* 가정 검정 */}
        {methodReq?.assumptions?.includes('정규성') && (() => {
          const normalityPassed =
            assumptionResults?.normality?.shapiroWilk?.isNormal ??
            assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
            dataProfile.normalityPassed

          return (
            <ChecklistItem
              passed={normalityPassed}
              label={`정규성: ${normalityPassed === undefined ? '검정 필요' : normalityPassed ? '충족' : '불충족 → 비모수 검정 권장'}`}
              type="warning"
            />
          )
        })()}
        {methodReq?.assumptions?.includes('등분산성') && (() => {
          const homogeneityPassed =
            assumptionResults?.homogeneity?.levene?.equalVariance ??
            assumptionResults?.homogeneity?.bartlett?.equalVariance ??
            dataProfile.homogeneityPassed

          return (
            <ChecklistItem
              passed={homogeneityPassed}
              label={`등분산성: ${homogeneityPassed === undefined ? '검정 필요' : homogeneityPassed ? '충족' : '불충족 → Welch 검정 권장'}`}
              type="warning"
            />
          )
        })()}
      </div>

      {/* 경고 메시지 */}
      {requirements.warnings.length > 0 && (
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-400 space-y-1">
          {requirements.warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RecommendedMethods({
  methods,
  selectedMethod,
  showRecommendations,
  onToggle,
  onMethodSelect,
  onQuestionTypeChange,
  dataProfile,
  assumptionResults
}: RecommendedMethodsProps) {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null)

  return (
    <>
      {/* 스마트 추천 버튼 */}
      <div className="flex gap-2">
        <Button onClick={onToggle} variant="outline" className="flex-1">
          <Sparkles className="w-4 h-4 mr-2" />
          스마트 추천 방법 {showRecommendations ? '숨기기' : '보기'}
          {methods.length > 0 && ` (${methods.length}개)`}
        </Button>
      </div>

      {/* 스마트 추천 방법 표시 */}
      {showRecommendations && methods.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="font-medium text-sm">데이터 기반 AI 추천</h4>
          </div>

          {methods.map((method) => {
            const fitScore = calculateFitScore(method, dataProfile, assumptionResults)
            const isExpanded = expandedMethod === method.id
            const isSelected = selectedMethod?.id === method.id

            return (
              <div
                key={method.id}
                className={`bg-white dark:bg-background rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                {/* 메인 카드 - 항상 표시 (간단 버전) */}
                <button
                  onClick={() => {
                    onMethodSelect(method)
                    const questionType = QUESTION_TYPES.find(
                      q => q.methods.includes(method.category)
                    )
                    if (questionType) {
                      onQuestionTypeChange(questionType.id)
                    }
                  }}
                  className="w-full text-left p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 방법명 + 배지 */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{method.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                          추천
                        </Badge>
                      </div>

                      {/* 설명 */}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {method.description}
                      </p>

                      {/* 적합도 표시 (간단 버전) */}
                      <div className="mt-3">
                        <FitScoreIndicator score={fitScore} />
                      </div>
                    </div>

                    {/* 선택 체크 */}
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>

                {/* 자세히 보기 (점진적 공개) */}
                {dataProfile && (
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedMethod(open ? method.id : null)}
                  >
                    <CollapsibleTrigger className="w-full px-4 pb-3 text-xs text-primary hover:underline flex items-center justify-center gap-1 border-t border-border/50 pt-2 mt-1">
                      {isExpanded ? '간략히 보기' : '자세히 보기'}
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <RecommendationDetails
                          method={method}
                          dataProfile={dataProfile}
                          assumptionResults={assumptionResults}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
