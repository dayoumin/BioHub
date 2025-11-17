'use client'

import { useState } from 'react'
import { Check, Sparkles, ChevronDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { QUESTION_TYPES, checkMethodRequirements } from '@/lib/statistics/method-mapping'
import type { StatisticalMethod } from '@/types/smart-flow'

interface RecommendedMethodsProps {
  methods: StatisticalMethod[]
  selectedMethod: StatisticalMethod | null
  showRecommendations: boolean
  onToggle: () => void
  onMethodSelect: (method: StatisticalMethod) => void
  onQuestionTypeChange: (typeId: string) => void
  dataProfile?: any // 데이터 프로파일 (requirements 체크용)
  assumptionResults?: any // 가정 검정 결과
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
      ? CheckCircle
      : type === 'warning' ? AlertCircle : XCircle

  const color = passed === undefined
    ? 'text-muted-foreground'
    : passed
      ? 'text-green-500'
      : type === 'warning'
        ? 'text-amber-500'
        : 'text-red-500'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

// 추천 이유 체크리스트
function RecommendationChecklist({
  method,
  dataProfile,
  assumptionResults
}: {
  method: StatisticalMethod
  dataProfile?: any
  assumptionResults?: any
}) {
  if (!dataProfile) {
    return (
      <div className="text-xs text-muted-foreground">
        데이터 프로파일 정보가 없습니다
      </div>
    )
  }

  const requirements = checkMethodRequirements(method, dataProfile)
  const methodReq = method.requirements

  // 신뢰도 점수 계산
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

  // 가정 체크 (assumptionResults 우선, dataProfile fallback)
  if (methodReq?.assumptions) {
    methodReq.assumptions.forEach((assumption) => {
      if (assumption === '정규성') {
        // assumptionResults에서 최신 값 우선 사용
        const normalityPassed =
          assumptionResults?.normality?.shapiroWilk?.isNormal ??
          assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
          dataProfile.normalityPassed

        // 검정 결과가 있을 때만 분모/분자에 반영
        if (normalityPassed !== undefined) {
          totalCount++
          if (normalityPassed) passedCount++
        }
      }

      if (assumption === '등분산성') {
        // assumptionResults에서 최신 값 우선 사용
        const homogeneityPassed =
          assumptionResults?.homogeneity?.levene?.equalVariance ??
          assumptionResults?.homogeneity?.bartlett?.equalVariance ??
          dataProfile.homogeneityPassed

        // 검정 결과가 있을 때만 분모/분자에 반영
        if (homogeneityPassed !== undefined) {
          totalCount++
          if (homogeneityPassed) passedCount++
        }
      }
    })
  }

  const confidence = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-2">
      {/* 신뢰도 점수 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">일치율</span>
        <Badge variant={confidence >= 80 ? 'default' : confidence >= 60 ? 'secondary' : 'outline'}>
          {confidence}%
        </Badge>
      </div>

      {/* 체크리스트 */}
      <div className="space-y-1">
        {/* 샘플 크기 */}
        {methodReq?.minSampleSize && (
          <ChecklistItem
            passed={dataProfile.totalRows >= methodReq.minSampleSize}
            label={`샘플 크기 충분 (n=${dataProfile.totalRows}, 필요: ${methodReq.minSampleSize})`}
          />
        )}

        {/* 변수 타입 */}
        {methodReq?.variableTypes?.includes('numeric') && (
          <ChecklistItem
            passed={dataProfile.numericVars > 0}
            label={`수치형 변수 있음 (${dataProfile.numericVars}개)`}
          />
        )}
        {methodReq?.variableTypes?.includes('categorical') && (
          <ChecklistItem
            passed={dataProfile.categoricalVars > 0}
            label={`범주형 변수 있음 (${dataProfile.categoricalVars}개)`}
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
              label={`정규성 검정 ${normalityPassed === undefined ? '미실행' : normalityPassed ? '통과' : '실패'}`}
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
              label={`등분산성 검정 ${homogeneityPassed === undefined ? '미실행' : homogeneityPassed ? '통과' : '실패'}`}
              type="warning"
            />
          )
        })()}
      </div>

      {/* 경고 메시지 */}
      {requirements.warnings.length > 0 && (
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-400 space-y-1">
          {requirements.warnings.map((warning, idx) => (
            <div key={idx}>⚠️ {warning}</div>
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
      {/* AI 추천 버튼 */}
      <div className="flex gap-2">
        <Button onClick={onToggle} variant="outline" className="flex-1">
          <Sparkles className="w-4 h-4 mr-2" />
          AI 추천 방법 {showRecommendations ? '숨기기' : '보기'}
          {methods.length > 0 && `(${methods.length}개)`}
        </Button>
      </div>

      {/* AI 추천 방법 표시 */}
      {showRecommendations && methods.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm mb-2">🤖 데이터 특성 기반 추천</h4>
          {methods.map((method) => (
            <div
              key={method.id}
              className={`bg-white dark:bg-background rounded border transition-all ${
                selectedMethod?.id === method.id ? 'ring-2 ring-primary border-primary' : 'border-border'
              }`}
            >
              <button
                onClick={() => {
                  onMethodSelect(method)
                  // 해당 카테고리로 이동
                  const questionType = QUESTION_TYPES.find(
                    q => q.methods.includes(method.category)
                  )
                  if (questionType) {
                    onQuestionTypeChange(questionType.id)
                  }
                }}
                className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{method.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        AI 추천
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                    {['mannwhitney','kruskal-wallis','welchAnova','gamesHowell','permutation'].includes(method.id) && (
                      <div className="text-[11px] text-blue-600 mt-1">
                        {method.id === 'mannwhitney' && '정규성 위반 또는 소표본에서 평균 비교 대안'}
                        {method.id === 'kruskal-wallis' && '정규성 위반 다집단 평균 비교 대안'}
                        {method.id === 'welchAnova' && '이분산 환경에서 평균 비교(ANOVA) 대안'}
                        {method.id === 'gamesHowell' && '이분산 사후검정 (등분산 가정 불필요)'}
                        {method.id === 'permutation' && '표본 수가 작을 때 견고한 검정'}
                      </div>
                    )}
                  </div>
                  {selectedMethod?.id === method.id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>

              {/* 추천 이유 Collapsible */}
              {dataProfile && (
                <Collapsible
                  open={expandedMethod === method.id}
                  onOpenChange={(open) => setExpandedMethod(open ? method.id : null)}
                >
                  <CollapsibleTrigger className="w-full px-3 pb-2 text-xs text-primary hover:underline flex items-center gap-1">
                    왜 추천되나요?
                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedMethod === method.id ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <RecommendationChecklist
                          method={method}
                          dataProfile={dataProfile}
                          assumptionResults={assumptionResults}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}