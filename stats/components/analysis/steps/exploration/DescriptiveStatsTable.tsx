'use client'

import { memo, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { AlertTriangle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import type { NumericDistribution } from '@/hooks/use-descriptive-stats'

interface DescriptiveStatsTableProps {
  numericDistributions: NumericDistribution[]
  formatStat: (value?: number, digits?: number) => string
  totalOutlierCount: number
  onOpenOutlierModal: (varName: string) => void
}

export const DescriptiveStatsTable = memo(function DescriptiveStatsTable({
  numericDistributions,
  formatStat,
  totalOutlierCount,
  onOpenOutlierModal
}: DescriptiveStatsTableProps) {
  const t = useTerminology()
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false)

  // 이상치가 있는 변수 목록 (배너용)
  const varsWithOutliers = useMemo(
    () => {
      const vars = numericDistributions.filter(v => v.outlierCount > 0)
      return vars.length > 0 ? vars.sort((a, b) => b.outlierCount - a.outlierCount) : []
    },
    [numericDistributions]
  )

  return (
    <>
      {/* 이상치 요약 배너 */}
      {totalOutlierCount > 0 && (
        <div className="p-3 bg-warning-bg border border-warning-border rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm leading-5">
              <div className="font-medium text-warning">
                {t.dataExploration.outlier.detected(varsWithOutliers.length, totalOutlierCount)}
              </div>
              {varsWithOutliers.length > 0 && (
                <div className="mt-1 text-warning/80 text-xs">
                  {varsWithOutliers.slice(0, 5).map(v => t.dataExploration.outlier.variableDetail(v.name, v.outlierCount)).join(', ')}
                  {varsWithOutliers.length > 5 && ` ${t.dataExploration.outlier.moreVars(varsWithOutliers.length - 5)}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 기초 통계량 테이블 */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          기본 8개 지표를 먼저 보여줍니다. {showAdvancedColumns ? 'Q1/Q3, 왜도, 첨도, 정규성까지 표시 중입니다.' : '필요하면 추가 지표를 펼쳐 보세요.'}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedColumns(prev => !prev)}
          className="h-8 shrink-0 text-xs"
        >
          {showAdvancedColumns ? '필수 지표만 보기' : '전체 13개 지표 보기'}
        </Button>
      </div>

      <div className="overflow-x-auto max-h-[400px] border border-border/40 rounded-xl">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur-md z-10">
            <tr className="border-b border-border/40">
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap sticky left-0 z-20 bg-muted/95 backdrop-blur-md">{t.dataExploration.headers.variableName}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.count}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.mean}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.stdDev}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.median}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.min}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.max}</th>
              <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.outliers}</th>
              {showAdvancedColumns && (
                <>
                  <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline decoration-dotted cursor-help">Q1</span>
                        </TooltipTrigger>
                        <TooltipContent>{t.dataExploration.headers.q1Tooltip}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline decoration-dotted cursor-help">Q3</span>
                        </TooltipTrigger>
                        <TooltipContent>{t.dataExploration.headers.q3Tooltip}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                  <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.skewness}</th>
                  <th scope="col" className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t.dataExploration.headers.kurtosis}</th>
                  <th scope="col" className="text-center px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline decoration-dotted cursor-help">{t.dataExploration.normality.title.split(' (')[0]}</span>
                        </TooltipTrigger>
                        <TooltipContent>{t.dataExploration.normality.title}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {numericDistributions.map(col => {
              const skewWarning = col.skewness !== undefined && Math.abs(col.skewness) > 2
              const kurtWarning = col.kurtosis !== undefined && Math.abs(col.kurtosis) > 7
              return (
                <tr key={col.name} className="hover:bg-muted/30 transition-colors duration-150">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap tracking-tight sticky left-0 z-10 bg-background">{col.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{col.n}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.mean)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.std)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.median)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.min)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.max)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {col.outlierCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] cursor-pointer hover:bg-warning-bg transition-colors font-mono"
                        onClick={() => onOpenOutlierModal(col.name)}
                      >
                        {t.dataExploration.outlier.count(col.outlierCount)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </td>
                  {showAdvancedColumns && (
                    <>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.q1)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{formatStat(col.q3)}</td>
                      <td className={cn("px-3 py-2.5 text-right font-mono text-xs tabular-nums", skewWarning && "text-warning font-semibold")}>
                        {formatStat(col.skewness)}
                        {skewWarning && <AlertTriangle className="h-3 w-3 inline ml-0.5" />}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right font-mono text-xs tabular-nums", kurtWarning && "text-warning font-semibold")}>
                        {formatStat(col.kurtosis)}
                        {kurtWarning && <AlertTriangle className="h-3 w-3 inline ml-0.5" />}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {col.normality ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={col.normality.isNormal ? 'default' : 'destructive'}
                                  className="text-[10px] font-mono cursor-help"
                                >
                                  {col.normality.isNormal ? '✓' : '✗'} p={col.normality.pValue.toFixed(3)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {col.normality.isNormal
                                  ? t.dataExploration.normality.normalInterpretation
                                  : t.dataExploration.normality.nonNormalInterpretation}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 해석 가이드 */}
      <div className="text-xs text-muted-foreground bg-info-bg p-3 rounded-lg border border-info-border">
        <p className="font-medium mb-1 flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" />{t.dataExploration.interpretGuide.title}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <div>{t.dataExploration.interpretGuide.skewness}</div>
          <div>{t.dataExploration.interpretGuide.kurtosis}</div>
          <div>{t.dataExploration.interpretGuide.outlierDef}</div>
          <div>{t.dataExploration.interpretGuide.nDef}</div>
        </div>
      </div>
    </>
  )
})
