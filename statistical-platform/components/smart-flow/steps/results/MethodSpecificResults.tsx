'use client'

import { type AnalysisResult } from '@/types/smart-flow'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StatisticCard } from '@/components/smart-flow/common/StatisticCard'
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
          <RegressionMetrics additional={a} />
        )}

        {/* 분류 */}
        {hasClassificationMetrics && (
          <ClassificationMetrics additional={a} />
        )}

        {/* PCA/요인분석 */}
        {hasPcaMetrics && (
          <PcaMetrics additional={a} />
        )}

        {/* 군집분석 */}
        {hasClusterMetrics && (
          <ClusterMetrics additional={a} />
        )}

        {/* 기술통계 */}
        {hasDescriptiveMetrics && (
          <DescriptiveMetrics additional={a} />
        )}

        {/* 신뢰도 */}
        {hasReliabilityMetrics && (
          <ReliabilityMetrics additional={a} />
        )}

        {/* 검정력 */}
        {hasPowerMetrics && (
          <PowerMetrics additional={a} />
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
function RegressionMetrics({ additional: a }: { additional: Additional }) {
  const hasVif = a.vif?.length && a.vif.some(v => v > 5)

  return (
    <div>
      <SectionTitle>모델 적합도</SectionTitle>
      <MetricGrid>
        {a.rSquared !== undefined && (
          <StatisticCard label="R²" tooltip="결정계수: 독립변수가 종속변수 분산의 몇 %를 설명하는지 나타냄">
            <p className="text-lg font-bold">{fmt(a.rSquared)}</p>
          </StatisticCard>
        )}
        {(a.adjustedRSquared ?? a.adjRSquared) !== undefined && (
          <StatisticCard label="Adj R²" tooltip="수정 결정계수: 변수 수를 보정한 R²">
            <p className="text-lg font-bold">{fmt(a.adjustedRSquared ?? a.adjRSquared)}</p>
          </StatisticCard>
        )}
        {a.rmse !== undefined && (
          <StatisticCard label="RMSE" tooltip="평균 제곱근 오차: 예측 정확도 (작을수록 좋음)">
            <p className="text-lg font-bold">{fmt(a.rmse)}</p>
          </StatisticCard>
        )}
        {a.aic !== undefined && (
          <StatisticCard label="AIC" tooltip="아카이케 정보 기준: 모델 선택 지표 (작을수록 좋음)">
            <p className="text-lg font-bold">{fmt(a.aic, 1)}</p>
          </StatisticCard>
        )}
        {a.bic !== undefined && (
          <StatisticCard label="BIC" tooltip="베이지안 정보 기준: 모델 선택 지표 (작을수록 좋음)">
            <p className="text-lg font-bold">{fmt(a.bic, 1)}</p>
          </StatisticCard>
        )}
        {a.intercept !== undefined && (
          <StatisticCard label="절편" tooltip="회귀 절편 (y-intercept)">
            <p className="text-lg font-bold">{fmt(a.intercept)}</p>
          </StatisticCard>
        )}
      </MetricGrid>

      {/* VIF 경고 */}
      {hasVif && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">다중공선성 경고:</span>{' '}
            VIF &gt; 5인 변수가 있습니다 ({a.vif?.filter(v => v > 5).length}개).
            독립변수 간 상관이 높아 회귀계수 해석에 주의가 필요합니다.
          </div>
        </div>
      )}
    </div>
  )
}

// --- 분류 ---
function ClassificationMetrics({ additional: a }: { additional: Additional }) {
  return (
    <div>
      <SectionTitle>분류 성능</SectionTitle>
      <MetricGrid>
        {a.accuracy !== undefined && (
          <StatisticCard label="정확도" tooltip="전체 예측 중 정확한 비율">
            <p className="text-lg font-bold">{pct(a.accuracy)}</p>
          </StatisticCard>
        )}
        {a.precision !== undefined && (
          <StatisticCard label="정밀도" tooltip="양성 예측 중 실제 양성 비율">
            <p className="text-lg font-bold">{pct(a.precision)}</p>
          </StatisticCard>
        )}
        {a.recall !== undefined && (
          <StatisticCard label="재현율" tooltip="실제 양성 중 양성으로 예측한 비율">
            <p className="text-lg font-bold">{pct(a.recall)}</p>
          </StatisticCard>
        )}
        {a.f1Score !== undefined && (
          <StatisticCard label="F1 Score" tooltip="정밀도와 재현율의 조화평균">
            <p className="text-lg font-bold">{fmt(a.f1Score)}</p>
          </StatisticCard>
        )}
        {a.rocAuc !== undefined && (
          <StatisticCard label="ROC AUC" tooltip="ROC 곡선 아래 면적 (1에 가까울수록 좋음)">
            <p className="text-lg font-bold">{fmt(a.rocAuc)}</p>
          </StatisticCard>
        )}
      </MetricGrid>

      {/* 혼동행렬 */}
      {a.confusionMatrix?.length && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">혼동행렬</p>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-auto">
              <thead>
                <tr>
                  <th className="p-1.5 border text-muted-foreground" />
                  {a.confusionMatrix[0].map((_, j) => (
                    <th key={j} className="p-1.5 border text-center font-medium">
                      예측 {j}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.confusionMatrix.map((row, i) => (
                  <tr key={i}>
                    <td className="p-1.5 border font-medium text-muted-foreground">실제 {i}</td>
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
function PcaMetrics({ additional: a }: { additional: Additional }) {
  return (
    <div>
      <SectionTitle>주성분/요인 분석</SectionTitle>

      {/* 분산설명률 */}
      {a.explainedVarianceRatio?.length && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">분산 설명률</p>
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
                  {pct(ratio)} (누적 {pct(cumulative)})
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
              label={`고유값 ${i + 1}`}
              tooltip={`${i + 1}번째 주성분/요인의 고유값${ev >= 1 ? ' (Kaiser 기준 충족)' : ''}`}
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
function ClusterMetrics({ additional: a }: { additional: Additional }) {
  return (
    <div>
      <SectionTitle>군집 분석</SectionTitle>
      <MetricGrid>
        {a.silhouetteScore !== undefined && (
          <StatisticCard
            label="Silhouette"
            tooltip="군집 품질 지표 (-1~1, 높을수록 잘 분리됨). 0.5+ 양호, 0.7+ 우수"
          >
            <p className="text-lg font-bold">{fmt(a.silhouetteScore, 3)}</p>
          </StatisticCard>
        )}
        {a.clusters?.length && (
          <StatisticCard label="데이터 수" tooltip="군집에 할당된 데이터 포인트 수">
            <p className="text-lg font-bold">{a.clusters.length}</p>
          </StatisticCard>
        )}
        {a.centers?.length && (
          <StatisticCard label="군집 수" tooltip="최종 결정된 군집 개수">
            <p className="text-lg font-bold">{a.centers.length}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}

// --- 기술통계 ---
function DescriptiveMetrics({ additional: a }: { additional: Additional }) {
  return (
    <div>
      <SectionTitle>기술통계량</SectionTitle>
      <MetricGrid>
        {a.mean !== undefined && (
          <StatisticCard label="평균" tooltip="산술 평균">
            <p className="text-lg font-bold">{fmt(a.mean, 3)}</p>
          </StatisticCard>
        )}
        {a.median !== undefined && (
          <StatisticCard label="중앙값" tooltip="데이터를 크기순 정렬 시 중간값">
            <p className="text-lg font-bold">{fmt(a.median, 3)}</p>
          </StatisticCard>
        )}
        {a.std !== undefined && (
          <StatisticCard label="표준편차" tooltip="데이터 산포도의 대표 지표">
            <p className="text-lg font-bold">{fmt(a.std, 3)}</p>
          </StatisticCard>
        )}
        {a.skewness !== undefined && (
          <StatisticCard label="왜도" tooltip="분포의 비대칭 정도 (0이면 대칭)">
            <p className="text-lg font-bold">{fmt(a.skewness, 3)}</p>
          </StatisticCard>
        )}
        {a.kurtosis !== undefined && (
          <StatisticCard label="첨도" tooltip="분포의 뾰족한 정도 (정규분포=3 기준)">
            <p className="text-lg font-bold">{fmt(a.kurtosis, 3)}</p>
          </StatisticCard>
        )}
        {a.n !== undefined && (
          <StatisticCard label="표본 크기" tooltip="분석에 사용된 데이터 수">
            <p className="text-lg font-bold">{a.n}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}

// --- 신뢰도 ---
function ReliabilityMetrics({ additional: a }: { additional: Additional }) {
  return (
    <div>
      <SectionTitle>신뢰도 분석</SectionTitle>
      <MetricGrid>
        {a.alpha !== undefined && (
          <StatisticCard
            label="Cronbach's \u03b1"
            tooltip="내적 일관성 신뢰도. 0.7+ 수용, 0.8+ 양호, 0.9+ 우수"
          >
            <p className="text-lg font-bold">{fmt(a.alpha, 3)}</p>
          </StatisticCard>
        )}
        {a.itemTotalCorrelations?.length && (
          <StatisticCard label="항목 수" tooltip="신뢰도 분석에 포함된 항목 수">
            <p className="text-lg font-bold">{a.itemTotalCorrelations.length}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}

// --- 검정력 ---
function PowerMetrics({ additional: a }: { additional: Additional }) {
  return (
    <div>
      <SectionTitle>통계적 검정력</SectionTitle>
      <MetricGrid>
        {a.power !== undefined && (
          <StatisticCard label="검정력" tooltip="실제 효과가 있을 때 이를 탐지할 확률. 0.8+ 권장">
            <p className="text-lg font-bold">{pct(a.power)}</p>
          </StatisticCard>
        )}
        {a.requiredSampleSize !== undefined && (
          <StatisticCard label="필요 표본" tooltip="목표 검정력 달성에 필요한 최소 표본 크기">
            <p className="text-lg font-bold">{a.requiredSampleSize}</p>
          </StatisticCard>
        )}
        {a.sampleSize !== undefined && (
          <StatisticCard label="분석 표본" tooltip="검정력 분석에 사용된 표본 크기">
            <p className="text-lg font-bold">{a.sampleSize}</p>
          </StatisticCard>
        )}
      </MetricGrid>
    </div>
  )
}
