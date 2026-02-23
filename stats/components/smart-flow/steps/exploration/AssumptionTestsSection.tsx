'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, BarChart3, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatisticalAssumptions } from '@/types/smart-flow'
import { useTerminology } from '@/hooks/use-terminology'

interface AssumptionTestsSectionProps {
  assumptionResults: StatisticalAssumptions | null
  isLoading: boolean
  visibility: 'primary' | 'secondary' | 'hidden'
}

export const AssumptionTestsSection = memo(function AssumptionTestsSection({
  assumptionResults,
  isLoading,
  visibility
}: AssumptionTestsSectionProps) {
  const t = useTerminology()

  if (visibility === 'hidden') return null

  const secondaryClass = visibility === 'secondary' ? 'opacity-50 border-l-2 border-l-muted-foreground/30' : ''

  // 로딩 중
  if (isLoading) {
    return (
      <Card className={cn("border-info-border bg-info-bg", secondaryClass)}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.dataExploration.assumptions.loading}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t.dataExploration.assumptions.loadingDescription}
          </p>
        </CardContent>
      </Card>
    )
  }

  // 결과 없음
  if (!assumptionResults) return null

  return (
    <Card className={cn("border-border/40 shadow-sm overflow-hidden", secondaryClass)}>
      {visibility === 'secondary' && (
        <div className="px-4 pt-3">
          <Badge variant="outline" className="text-[10px] text-muted-foreground">{t.dataExploration.assumptions.badge}</Badge>
        </div>
      )}
      <CardHeader className="bg-muted/10">
        <CardTitle className="text-base flex items-center gap-2.5 tracking-tight">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Search className="h-4 w-4 text-primary" />
          </div>
          {t.dataExploration.assumptions.title}
        </CardTitle>
        <CardDescription>
          {t.dataExploration.assumptions.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* 정규성 검정 결과 */}
          {assumptionResults.normality?.shapiroWilk && (
            <div className="p-4 bg-background rounded-xl border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm flex items-center gap-2 tracking-tight">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.dataExploration.normality.title}
                </span>
                <Badge variant={assumptionResults.normality.shapiroWilk.isNormal ? "default" : "secondary"} className="text-[10px]">
                  {assumptionResults.normality.shapiroWilk.isNormal ? t.dataExploration.normality.normal : t.dataExploration.normality.nonNormal}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">{t.dataExploration.normality.statLabel}</span>
                  <div className="font-mono text-sm font-medium tabular-nums mt-0.5">{(assumptionResults.normality.shapiroWilk.statistic ?? 0).toFixed(4)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">p-value</span>
                  <div className="font-mono text-sm font-medium tabular-nums mt-0.5">{(assumptionResults.normality.shapiroWilk.pValue ?? 0).toFixed(4)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {assumptionResults.normality.shapiroWilk.isNormal
                  ? t.dataExploration.normality.normalInterpretation
                  : t.dataExploration.normality.nonNormalInterpretation}
              </p>
            </div>
          )}

          {/* 등분산성 검정 결과 */}
          {assumptionResults.homogeneity?.levene && (
            <div className="p-4 bg-background rounded-xl border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm flex items-center gap-2 tracking-tight">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.dataExploration.homogeneity.title}
                </span>
                <Badge variant={assumptionResults.homogeneity.levene.equalVariance ? "default" : "secondary"} className="text-[10px]">
                  {assumptionResults.homogeneity.levene.equalVariance ? t.dataExploration.homogeneity.equal : t.dataExploration.homogeneity.unequal}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">{t.dataExploration.homogeneity.statLabel}</span>
                  <div className="font-mono text-sm font-medium tabular-nums mt-0.5">{(assumptionResults.homogeneity.levene.statistic ?? 0).toFixed(4)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">p-value</span>
                  <div className="font-mono text-sm font-medium tabular-nums mt-0.5">{(assumptionResults.homogeneity.levene.pValue ?? 0).toFixed(4)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {assumptionResults.homogeneity.levene.equalVariance
                  ? t.dataExploration.homogeneity.equalInterpretation
                  : t.dataExploration.homogeneity.unequalInterpretation}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
