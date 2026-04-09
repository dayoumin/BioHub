'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowRight, ArrowLeft, Search, AlertTriangle, Info, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { getAllMethodsGrouped } from '@/lib/statistics/method-catalog'
import { getKoreanName } from '@/lib/constants/statistical-methods'
import { getNormalitySummary } from '@/hooks/use-method-compatibility'
import { StepHeader } from '@/components/analysis/common'
import { MethodBrowser } from './purpose/MethodBrowser'
import type { StatisticalMethod } from '@/types/analysis'

interface MethodBrowserStepProps {
  onMethodConfirm: (method: StatisticalMethod) => void
  onBack: () => void
  onAskAiRecommendation?: () => void
}

export function MethodBrowserStep({
  onMethodConfirm,
  onBack,
  onAskAiRecommendation,
}: MethodBrowserStepProps) {
  const validationResults = useAnalysisStore((state) => state.validationResults)
  const cachedAiRecommendation = useAnalysisStore((state) => state.cachedAiRecommendation)
  const assumptionResults = useAnalysisStore((state) => state.assumptionResults)

  const [browsedMethod, setBrowsedMethod] = useState<StatisticalMethod | null>(null)

  const methodGroups = useMemo(() => getAllMethodsGrouped(), [])

  const dataProfile = useMemo(() => {
    if (!validationResults?.columns) return undefined
    const columns = validationResults.columns
    return {
      totalRows: validationResults.totalRows,
      numericVars: columns.filter((column) => column.type === 'numeric').length,
      categoricalVars: columns.filter((column) => column.type === 'categorical').length,
    }
  }, [validationResults])

  const normalitySummary = useMemo(() => {
    if (assumptionResults) return null
    return getNormalitySummary(validationResults?.columnStats ?? validationResults?.columns)
  }, [validationResults, assumptionResults])

  const recommendedMethodId = cachedAiRecommendation?.method?.id

  const handleMethodSelect = useCallback((method: StatisticalMethod) => {
    setBrowsedMethod(method)
  }, [])

  const handleConfirm = useCallback(() => {
    if (browsedMethod) {
      onMethodConfirm(browsedMethod)
    }
  }, [browsedMethod, onMethodConfirm])

  return (
    <div className="space-y-5">
      <StepHeader
        icon={Search}
        title="분석 방법 선택"
        action={(
          <div className="flex items-center gap-2">
            {onAskAiRecommendation && (
              <Button variant="secondary" size="sm" className="h-9 gap-1.5 px-3" onClick={onAskAiRecommendation}>
                <Sparkles className="w-4 h-4" />
                AI 추천 받기
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
              이전 단계
            </Button>
          </div>
        )}
      />

      <Card className="border-border/50 bg-surface-container-lowest shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
        <CardContent className="px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Step 2
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">데이터에 맞는 분석 방법을 고르세요</p>
              <p className="mt-1 text-sm text-muted-foreground">
                방법을 선택한 후 다음 단계에서 변수 역할을 지정합니다.
              </p>
              {onAskAiRecommendation && (
                <p className="mt-2 text-xs text-muted-foreground">
                  업로드된 데이터를 기준으로 AI 추천을 다시 받을 수 있습니다.
                </p>
              )}
            </div>
            {dataProfile && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-mono tabular-nums">{dataProfile.totalRows} rows</Badge>
                <Badge variant="outline" className="font-mono tabular-nums">{dataProfile.numericVars} numeric</Badge>
                <Badge variant="outline" className="font-mono tabular-nums">{dataProfile.categoricalVars} categorical</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {normalitySummary && (
        <Card className={`shadow-[0px_6px_24px_rgba(25,28,30,0.04)] ${
          !normalitySummary.mostlyNormal
            ? 'border-warning-border/70 bg-warning-bg/80'
            : 'border-border/50 bg-surface-container-lowest'
        }`}>
          <CardContent className="px-5 py-4">
            <div className="flex items-start gap-3 text-sm">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                !normalitySummary.mostlyNormal ? 'bg-warning/10' : 'bg-muted'
              }`}>
                {!normalitySummary.mostlyNormal
                  ? <AlertTriangle className="h-4 w-4 text-warning" />
                  : <Info className="h-4 w-4 text-muted-foreground" />
                }
              </div>
              <div>
                <p className="font-semibold tracking-tight text-foreground">변수 분포 요약</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Step 1에서 계산한 정규성 요약입니다. 실제 분석 전 단계에서 다시 검증됩니다.
                </p>
                <p className="mt-2 text-muted-foreground">
                  수치형 변수 {normalitySummary.testedCount}개 중 {normalitySummary.normalCount}개가 정규분포 경향을 보입니다.
                </p>
                {!normalitySummary.mostlyNormal && (
                  <p className="mt-1 text-xs text-warning">
                    비정규 변수가 많아 비모수 검정(Mann-Whitney, Kruskal-Wallis)도 우선 검토하는 편이 안전합니다.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <MethodBrowser
        methodGroups={methodGroups}
        selectedMethod={browsedMethod}
        recommendedMethodId={recommendedMethodId}
        onMethodSelect={handleMethodSelect}
        dataProfile={dataProfile}
      />

      {browsedMethod && (
        <Card className="sticky bottom-3 z-10 border-border/60 bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardContent className="px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  선택한 방법
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {getKoreanName(browsedMethod.id) ?? browsedMethod.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  다음 단계에서 분석에 사용할 변수 역할을 확인하고 지정합니다.
                </p>
              </div>
              <Button
                size="default"
                className="h-10 w-full gap-1.5 sm:w-auto sm:px-4"
                onClick={handleConfirm}
              >
                이 방법으로 진행
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
