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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          이전 단계
        </Button>
        <StepHeader icon={Search} title="분석 방법 선택" />
      </div>

      {/* 정규성 탐색적 힌트 배너 — assumptionResults 없을 때만 표시 */}
      {normalitySummary && (
        <div className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
          !normalitySummary.mostlyNormal
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
            : 'bg-muted/50 text-muted-foreground'
        }`}>
          {!normalitySummary.mostlyNormal
            ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            : <Info className="w-4 h-4 mt-0.5 shrink-0" />
          }
          <div>
            <p className="font-medium">탐색적 정규성 요약</p>
            <p className="mt-1 text-xs opacity-80">
              Step 1에서 본 분포 요약입니다. 변수 선택 후 정확한 가정 검정이 다시 실행됩니다.
            </p>
            <p className="mt-2">
              수치 변수 {normalitySummary.testedCount}개 중 {normalitySummary.normalCount}개가 정규분포 경향을 보였습니다.
            </p>
            {!normalitySummary.mostlyNormal && (
              <p className="mt-1 text-xs opacity-80">
                비정규 변수가 많아 비모수 검정(Mann-Whitney, Kruskal-Wallis 등)을 우선 검토하는 편이 안전합니다.
              </p>
            )}
          </div>
        </div>
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
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm">
          <div className="text-sm">
            <span className="text-muted-foreground">선택됨: </span>
            <span className="font-medium text-foreground">{getKoreanName(browsedMethod.id) ?? browsedMethod.name}</span>
          </div>
          <Button size="sm" className="gap-1.5" onClick={handleConfirm}>
            이 방법으로 진행
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
