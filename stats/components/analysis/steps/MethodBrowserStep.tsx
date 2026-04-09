'use client'

/**
 * MethodBrowserStep — Step 2: 메서드 브라우저
 *
 * 수동 메서드 선택 전용. AI 추천은 허브 채팅이 담당.
 * 기존 MethodBrowser를 래핑하여 StepHeader + 선택 확정 버튼 제공.
 */

import { useState, useMemo, useCallback } from 'react'
import { ArrowRight, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { getAllMethodsGrouped } from '@/lib/statistics/method-catalog'
import { getKoreanName } from '@/lib/constants/statistical-methods'
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <StepHeader icon={Search} title="분석 방법 선택" />
      </div>

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
