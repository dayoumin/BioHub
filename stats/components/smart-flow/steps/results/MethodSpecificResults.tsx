'use client'

import { type AnalysisResult } from '@/types/smart-flow'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StatisticCard } from '@/components/smart-flow/common/StatisticCard'
import { useTerminology } from '@/hooks/use-terminology'
import type { MethodSpecificResultsText } from '@/lib/terminology/terminology-types'
import { AlertTriangle } from 'lucide-react'

interface MethodSpecificResultsProps {
  results: AnalysisResult
}

/**
 * 분석 방법별 추가 메트릭 표시
 * - results.additional 필드 기반으로 해당하는 메트릭만 렌더링
 * - 데이터가 없으면 아무것도 렌더링하지 않음
 */
export function MethodSpecificResults({ results }: MethodSpecificResultsProps) {
  const t = useTerminology()
  const ms = t.methodSpecificResults

  const a = results.additional
  if (!a) return null

  const method = results.method.toLowerCase()

  // 회귀분석 메트릭
  const isRegression = method.includes('회귀') || method.includes('regression')
  const hasRegressionMetrics = a.rSquared !== undefined || a.rmse !== undefined

  // 분류 메트릭
  const hasClassificationMetrics = a.accuracy !== undefined || a.f1Score !== undefined

  // PCA/요인분석
  const hasPcaMetrics = a.explainedVarianceRatio?.length || a.eigenvalues?.length

  // 군집분석
  const hasClusterMetrics = a.silhouetteScore !== undefined || a.centers?.length

  // 기술통계
  const hasDescriptiveMetrics = a.mean !== undefined && a.std !== undefined

  // 신뢰도
  const hasReliabilityMetrics = a.alpha !== undefined

  // 검정력
  const hasPowerMetrics = a.power !== undefined

  // 아무 메트릭도 없으면 렌더링 안 함
  if (!hasRegressionMetrics && !hasClassificationMetrics && !hasPcaMetrics &&
      !hasClusterMetrics && !hasDescriptiveMetrics && !hasReliabilityMetrics && !hasPowerMetrics) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="space-y-3" data-testid="method-specific-results">
        {/* 회귀분석 */}
        {(isRegression || hasRegressionMetrics) && (
          <RegressionMetrics additional={a} ms={ms} />
        )}

        {/* 분류 */}
        {hasClassificationMetrics && (
          <ClassificationMetrics additional={a} ms={ms} />
        )}

        {/* PCA/요인분석 */}
        {hasPcaMetrics && (
          <PcaMetrics additional={a} ms={ms} />
        )}

        {/* 군집분석 */}
        {hasClusterMetrics && (
          <ClusterMetrics additional={a} ms={ms} />
        )}

        {/* 기술통계 */}
        {hasDescriptiveMetrics && (
          <DescriptiveMetrics additional={a} ms={ms} />
        )}

        {/* 신뢰도 */}
        {hasReliabilityMetrics && (
          <ReliabilityMetrics additional={a} ms={ms} />
        )}

        {/* 검정력 */}
        {hasPowerMetrics && (
          <PowerMetrics additional={a} ms={ms} />
        )}
      </div>
    </TooltipProvider>
  )
}

// ============================================
// Sub-components
// ============================================

type Additional = NonNullable<AnalysisResult['additional']>

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </h4>
  )
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {children}
    </div>
  )
}

function fmt(value: number | undefined, digits: number = 4): string {
  return value !== undefined ? value.toFixed(digits) : '-'
}

function pct(value: number | undefined): string {
  return value !== undefined ? `${(value * 100).toFixed(1)}%` : '-'
}

// --- 회귀분석 ---
function RegressionMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  const hasVif = a.vif?.length && a.vif.some(v => v > 5)

  return (
    <div>
      <SectionTitle>{ms.regression.sectionTitle}</SectionTitle>
      <MetricGrid>
        {a.rSquared !== undefined && (
          <StatisticCard label="R²" tooltip={ms.regression.rSquaredTooltip}>
            <p className="text-lg font-bold">{fmt(a.rSquared)}</p>
          </StatisticCard>
        )}
        {(a.adjustedRSquared ?? a.adjRSquared) !== undefined && (
          <StatisticCard label="Adj R²" tooltip={ms.regression.adjRSquaredTooltip}>
            <p className="text-lg font-bold">{fmt(a.adjustedRSquared ?? a.adjRSquared)}</p>
          </StatisticCard>
        )}
        {a.rmse !== undefined && (
          <StatisticCard label="RMSE" tooltip={ms.regression.rmseTooltip}>
            <p className="text-lg font-bold">{fmt(a.rmse)}</p>
          </StatisticCard>
        )}
        {a.aic !== undefined && (
          <StatisticCard label="AIC" tooltip={ms.regression.aicTooltip}>
            <p className="text-lg font-bold">{fmt(a.aic, 1)}</p>
          </StatisticCard>
        )}
        {a.bic !== undefined && (
          <StatisticCard label="BIC" tooltip={ms.regression.bicTooltip}>
            <p className="text-lg font-bold">{fmt(a.bic, 1)}</p>
          </StatisticCard>
        )}
        {a.intercept !== undefined && (
          <StatisticCard label={ms.regression.interceptLabel} tooltip={ms.regression.interceptTooltip}>
            <p className="text-lg font-bold">{fmt(a.intercept)}</p>
          </StatisticCard>
        )}
      </MetricGrid>

      {/* VIF 경고 */}
      {hasVif && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">{ms.regression.vifWarningTitle}:</span>{' '}
            {ms.regression.vifWarningMessage(a.vif?.filter(v => v > 5).length ?? 0)}
          </div>
        </div>
      )}
    </div>
  )
}

// --- 분류 ---
function ClassificationMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  return (
    <div>
      <SectionTitle>{ms.classification.sectionTitle}</SectionTitle>
      <MetricGrid>
        {a.accuracy !== undefined && (
          <StatisticCard label={ms.classification.accuracyLabel} tooltip={ms.classification.accuracyTooltip}>
            <p className="text-lg font-bold">{pct(a.accuracy)}</p>
          </StatisticCard>
        )}
        {a.precision !== undefined && (
          <StatisticCard label={ms.classification.precisionLabel} tooltip={ms.classification.precisionTooltip}>
            <p className="text-lg font-bold">{pct(a.precision)}</p>
          </StatisticCard>
        )}
        {a.recall !== undefined && (
          <StatisticCard label={ms.classification.recallLabel} tooltip={ms.classification.recallTooltip}>
            <p className="text-lg font-bold">{pct(a.recall)}</p>
          </StatisticCard>
        )}
        {a.f1Score !== undefined && (
          <StatisticCard label="F1 Score" tooltip={ms.classification.f1Tooltip}>
            <p className="text-lg font-bold">{fmt(a.f1Score)}</p>
          </StatisticCard>
        )}
        {a.rocAuc !== undefined && (
          <StatisticCard label="ROC AUC" tooltip={ms.classification.rocAucTooltip}>
            <p className="text-lg font-bold">{fmt(a.rocAuc)}</p>
          </StatisticCard>
        )}
      </MetricGrid>

      {/* 혼동행렬 */}
      {a.confusionMatrix?.length && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">{ms.classification.confusionMatrixLabel}</p>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-auto">
              <thead>
                <tr>
                  <th className="p-1.5 border text-muted-foreground" />
                  {a.confusionMatrix[0].map((_, j) => (
                    <th key={j} className="p-1.5 border text-center font-medium">
                      {ms.classification.predicted(j)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.confusionMatrix.map((row, i) => (
                  <tr key={i}>
                    <td className="p-1.5 border font-medium text-muted-foreground">{ms.classification.actual(i)}</td>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`p-1.5 border text-center ${
                          i === j ? 'bg-green-50 dark:bg-green-950/20 font-bold' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// --- PCA/요인분석 ---
function PcaMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  return (
    <div>
      <SectionTitle>{ms.pca.sectionTitle}</SectionTitle>

      {/* 분산설명률 */}
      {a.explainedVarianceRatio?.length && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{ms.pca.varianceExplainedLabel}</p>
          {a.explainedVarianceRatio.map((ratio, i) => {
            const cumulative = a.explainedVarianceRatio!
              .slice(0, i + 1)
              .reduce((sum, r) => sum + r, 0)
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-muted-foreground">PC{i + 1}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right tabular-nums">
                  {pct(ratio)} ({ms.pca.cumulativePrefix} {pct(cumulative)})
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 고유값 */}
      {a.eigenvalues?.length && (
        <MetricGrid>
          {a.eigenvalues.slice(0, 6).map((ev, i) => (
            <StatisticCard
              key={i}
              label={ms.pca.eigenvalueLabel(i + 1)}
              tooltip={ms.pca.eigenvalueTooltip(i + 1, ev >= 1)}
            >
              <p className={`text-lg font-bold ${ev >= 1 ? '' : 'text-muted-foreground'}`}>
                {fmt(ev, 3)}
              </p>
            </StatisticCard>
          ))}
        </MetricGrid>
      )}
    </div>
  )
}

// --- 군집분석 ---
function ClusterMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  return (
    <div>
      <SectionTitle>{ms.cluster.sectionTitle}</SectionTitle>
      <MetricGrid>
        {a.silhouetteScore !== undefined && (
          <StatisticCard
            label="Silhouette"
            tooltip={ms.cluster.silhouetteTooltip}
          >
            <p className="text-lg font-bold">{fmt(a.silhouetteScore, 3)}</p>
          </StatisticCard>
        )}
        {a.clusters?.length && (
          <StatisticCard label={ms.cluster.dataCountLabel} tooltip={ms.cluster.dataCountTooltip}>
            <p className="text-lg font-bold">{a.clusters.length}</p>
          </StatisticCard>
        )}
        {a.centers?.length && (
          <StatisticCard label={ms.cluster.clusterCountLabel} tooltip={ms.cluster.clusterCountTooltip}>
            <p className="text-lg font-bold">{a.centers.length}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}

// --- 기술통계 ---
function DescriptiveMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  return (
    <div>
      <SectionTitle>{ms.descriptive.sectionTitle}</SectionTitle>
      <MetricGrid>
        {a.mean !== undefined && (
          <StatisticCard label={ms.descriptive.meanLabel} tooltip={ms.descriptive.meanTooltip}>
            <p className="text-lg font-bold">{fmt(a.mean, 3)}</p>
          </StatisticCard>
        )}
        {a.median !== undefined && (
          <StatisticCard label={ms.descriptive.medianLabel} tooltip={ms.descriptive.medianTooltip}>
            <p className="text-lg font-bold">{fmt(a.median, 3)}</p>
          </StatisticCard>
        )}
        {a.std !== undefined && (
          <StatisticCard label={ms.descriptive.stdDevLabel} tooltip={ms.descriptive.stdDevTooltip}>
            <p className="text-lg font-bold">{fmt(a.std, 3)}</p>
          </StatisticCard>
        )}
        {a.skewness !== undefined && (
          <StatisticCard label={ms.descriptive.skewnessLabel} tooltip={ms.descriptive.skewnessTooltip}>
            <p className="text-lg font-bold">{fmt(a.skewness, 3)}</p>
          </StatisticCard>
        )}
        {a.kurtosis !== undefined && (
          <StatisticCard label={ms.descriptive.kurtosisLabel} tooltip={ms.descriptive.kurtosisTooltip}>
            <p className="text-lg font-bold">{fmt(a.kurtosis, 3)}</p>
          </StatisticCard>
        )}
        {a.n !== undefined && (
          <StatisticCard label={ms.descriptive.sampleSizeLabel} tooltip={ms.descriptive.sampleSizeTooltip}>
            <p className="text-lg font-bold">{a.n}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}

// --- 신뢰도 ---
function ReliabilityMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  return (
    <div>
      <SectionTitle>{ms.reliability.sectionTitle}</SectionTitle>
      <MetricGrid>
        {a.alpha !== undefined && (
          <StatisticCard
            label="Cronbach's \u03b1"
            tooltip={ms.reliability.alphaTooltip}
          >
            <p className="text-lg font-bold">{fmt(a.alpha, 3)}</p>
          </StatisticCard>
        )}
        {a.itemTotalCorrelations?.length && (
          <StatisticCard label={ms.reliability.itemCountLabel} tooltip={ms.reliability.itemCountTooltip}>
            <p className="text-lg font-bold">{a.itemTotalCorrelations.length}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}

// --- 검정력 ---
function PowerMetrics({ additional: a, ms }: { additional: Additional; ms: MethodSpecificResultsText }) {
  return (
    <div>
      <SectionTitle>{ms.power.sectionTitle}</SectionTitle>
      <MetricGrid>
        {a.power !== undefined && (
          <StatisticCard label={ms.power.powerLabel} tooltip={ms.power.powerTooltip}>
            <p className="text-lg font-bold">{pct(a.power)}</p>
          </StatisticCard>
        )}
        {a.requiredSampleSize !== undefined && (
          <StatisticCard label={ms.power.requiredSampleLabel} tooltip={ms.power.requiredSampleTooltip}>
            <p className="text-lg font-bold">{a.requiredSampleSize}</p>
          </StatisticCard>
        )}
        {a.sampleSize !== undefined && (
          <StatisticCard label={ms.power.analysisSampleLabel} tooltip={ms.power.analysisSampleTooltip}>
            <p className="text-lg font-bold">{a.sampleSize}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}
