'use client'

/**
 * MethodBrowserStep — Step 2: 메서드 브라우저
 *
 * 수동 메서드 선택 전용. AI 추천은 허브 채팅이 담당.
 * 기존 MethodBrowser를 래핑하여 StepHeader + 선택 확정 버튼 제공.
 *
 * 정규성 기반 가이드:
 * Step 1의 컬럼별 정규성 결과를 요약 배너로 표시.
 * 비정규 변수가 과반이면 비모수 검정 추천 안내.
 */

import { useState, useMemo, useCallback } from 'react'
import { ArrowRight, ArrowLeft, Search, AlertTriangle, Info } from 'lucide-react'
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
}

export function MethodBrowserStep({ onMethodConfirm, onBack }: MethodBrowserStepProps) {
  const validationResults = useAnalysisStore((s) => s.validationResults)
  const cachedAiRecommendation = useAnalysisStore((s) => s.cachedAiRecommendation)

  // 브라우저 내부 선택 상태 (확정 전)
  const [browsedMethod, setBrowsedMethod] = useState<StatisticalMethod | null>(null)

  const methodGroups = useMemo(() => getAllMethodsGrouped(), [])

  const dataProfile = useMemo(() => {
    if (!validationResults?.columns) return undefined
    const cols = validationResults.columns
    return {
      totalRows: validationResults.totalRows,
      numericVars: cols.filter((c) => c.type === 'numeric').length,
      categoricalVars: cols.filter((c) => c.type === 'categorical').length,
    }
  }, [validationResults])

  const assumptionResults = useAnalysisStore((s) => s.assumptionResults)

  // Step 3 확정 결과가 있으면 배너 숨김 (카드에 정확한 결과가 표시됨)
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
        action={
          <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            이전 단계
          </Button>
        }
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
                방법을 선택한 뒤, 다음 단계에서 변수 역할을 지정합니다.
              </p>
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

      {/* 정규성 탐색적 힌트 배너 — assumptionResults 없을 때만 표시 */}
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
                <p className="font-semibold tracking-tight text-foreground">탐색적 정규성 요약</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Step 1에서 본 분포 요약입니다. 변수 선택 후 정확한 가정 검정이 다시 실행됩니다.
                </p>
                <p className="mt-2 text-muted-foreground">
                  수치 변수 {normalitySummary.testedCount}개 중 {normalitySummary.normalCount}개가 정규분포 경향을 보였습니다.
                </p>
                {!normalitySummary.mostlyNormal && (
                  <p className="mt-1 text-xs text-warning">
                    비정규 변수가 많아 비모수 검정(Mann-Whitney, Kruskal-Wallis 등)을 우선 검토하는 편이 안전합니다.
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

      {/* 선택 확정 바 */}
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
                  다음 단계에서 분석에 사용할 변수를 확인하고 지정합니다.
                </p>
              </div>
              <Button size="default" className="h-10 w-full gap-1.5 sm:w-auto sm:px-4" onClick={handleConfirm}>
                변수 선택으로 계속
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
