'use client'

import { useState } from 'react'
import { Check, ChevronDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { StatisticalMethod } from '@/types/smart-flow'

interface MethodSelectorProps {
  methods: StatisticalMethod[]
  selectedMethod: StatisticalMethod | null
  dataProfile: any
  assumptionResults?: any
  onMethodSelect: (method: StatisticalMethod) => void
  checkMethodRequirements: (method: StatisticalMethod, profile: any) => any
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
      ? 'text-success'
      : type === 'warning'
        ? 'text-amber-500'
        : 'text-error'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

// 요구사항 체크리스트
function RequirementsChecklist({
  method,
  dataProfile,
  assumptionResults
}: {
  method: StatisticalMethod
  dataProfile: any
  assumptionResults?: any
}) {
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
    </div>
  )
}

export function MethodSelector({
  methods,
  selectedMethod,
  dataProfile,
  assumptionResults,
  onMethodSelect,
  checkMethodRequirements
}: MethodSelectorProps) {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null)

  return (
    <div className="grid gap-2">
      {methods.map((method) => {
        const requirements = dataProfile
          ? checkMethodRequirements(method, dataProfile)
          : { canUse: true, warnings: [] }

        return (
          <div
            key={method.id}
            className={`border rounded-lg transition-all ${
              selectedMethod?.id === method.id
                ? 'border-primary bg-primary/5'
                : 'border-border'
            } ${!requirements.canUse ? 'opacity-60' : ''}`}
          >
            <button
              onClick={() => onMethodSelect(method)}
              className="w-full text-left p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.name}</span>
                    {method.subcategory && (
                      <Badge variant="secondary" className="text-xs">
                        {method.subcategory}
                      </Badge>
                    )}
                    {!requirements.canUse && (
                      <Badge variant="destructive" className="text-xs">
                        요구사항 미충족
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {method.description}
                  </p>
                  {requirements.warnings.length > 0 && (
                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                      {requirements.warnings.map((warning: string, idx: number) => (
                        <div key={idx}>⚠️ {warning}</div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMethod?.id === method.id && (
                  <Check className="w-5 h-5 text-primary ml-2 flex-shrink-0" />
                )}
              </div>
            </button>

            {/* 요구사항 체크리스트 Collapsible */}
            {dataProfile && method.requirements && (
              <Collapsible
                open={expandedMethod === method.id}
                onOpenChange={(open) => setExpandedMethod(open ? method.id : null)}
              >
                <CollapsibleTrigger className="w-full px-3 pb-2 text-xs text-primary hover:underline flex items-center gap-1">
                  요구사항 확인
                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedMethod === method.id ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <RequirementsChecklist
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
        )
      })}
    </div>
  )
}