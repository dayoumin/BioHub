/**
 * Numeric Statistics Table Component
 *
 * @description
 * 수치형 변수의 상세 통계를 표 형식으로 표시하는 컴포넌트
 * - 기술통계량 (평균, 중앙값, 표준편차 등)
 * - 분포 특성 (왜도, 첨도)
 * - 이상치 정보
 * - 문제 해결 가이드
 */

'use client'

import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ColumnStatistics } from '@/types/smart-flow'

export interface NumericStatsTableProps {
  /** 컬럼 통계 (수치형만 필터링됨) */
  columnStats: ColumnStatistics[]
}

export const NumericStatsTable = memo(function NumericStatsTable({
  columnStats
}: NumericStatsTableProps) {
  const numericStats = columnStats.filter(s => s.type === 'numeric')

  if (numericStats.length === 0) {
    return null
  }

  const hasProblems = numericStats.some(s =>
    Math.abs(s.skewness || 0) >= 1 ||
    Math.abs(s.kurtosis || 0) >= 3 ||
    (s.outliers && s.outliers.length > s.numericCount * 0.1)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>수치형 변수 상세 통계</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Statistics Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">변수명</th>
                <th className="text-right p-2">평균</th>
                <th className="text-right p-2">중앙값</th>
                <th className="text-right p-2">표준편차</th>
                <th className="text-right p-2">CV(%)</th>
                <th className="text-right p-2">왜도</th>
                <th className="text-right p-2">첨도</th>
                <th className="text-right p-2">최소값</th>
                <th className="text-right p-2">최대값</th>
                <th className="text-right p-2">이상치</th>
              </tr>
            </thead>
            <tbody>
              {numericStats.map((stat, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{stat.name}</td>
                  <td className="text-right p-2">{stat.mean?.toFixed(2)}</td>
                  <td className="text-right p-2">{stat.median?.toFixed(2)}</td>
                  <td className="text-right p-2">{stat.std?.toFixed(2)}</td>
                  <td className="text-right p-2">
                    {stat.cv !== undefined ? stat.cv.toFixed(1) : '-'}
                  </td>
                  <td className="text-right p-2">
                    {stat.skewness !== undefined ? (
                      <span className={getSkewnessColor(stat.skewness)}>
                        {stat.skewness.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="text-right p-2">
                    {stat.kurtosis !== undefined ? (
                      <span className={getKurtosisColor(stat.kurtosis)}>
                        {stat.kurtosis.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="text-right p-2">{stat.min?.toFixed(2)}</td>
                  <td className="text-right p-2">{stat.max?.toFixed(2)}</td>
                  <td className="text-right p-2">
                    {stat.outliers?.length || 0}
                    {stat.outliers && stat.outliers.length > 0 && (
                      <span className="text-xs text-orange-600 ml-1">
                        ({((stat.outliers.length / stat.numericCount) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statistics Explanation */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs space-y-1">
          <p><strong>CV (변동계수)</strong>: 표준편차를 평균으로 나눈 값의 백분율. 15% 이하면 안정적</p>
          <p>
            <strong>왜도</strong>:
            <span className="text-success ml-2">|값| &lt; 0.5 정규분포</span>
            <span className="text-warning ml-2">|값| &lt; 1 약간 치우침</span>
            <span className="text-error ml-2">|값| ≥ 1 심하게 치우침</span>
          </p>
          <p>
            <strong>첨도</strong>:
            <span className="text-success ml-2">|값| &lt; 1 정규분포</span>
            <span className="text-warning ml-2">|값| &lt; 3 약간 뾰족/평평</span>
            <span className="text-error ml-2">|값| ≥ 3 매우 뾰족/평평</span>
          </p>
        </div>

        {/* Problem Solving Guide */}
        {hasProblems && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                데이터 문제 해결 가이드
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Skewness Problems */}
              {numericStats.some(s => Math.abs(s.skewness || 0) >= 1) && (
                <div className="border-l-2 border-amber-400 pl-3">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    🔄 왜도 문제 (|왜도| ≥ 1) 해결 방법:
                  </p>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                    <li>• <strong>양의 왜도 (오른쪽 꼬리):</strong> 로그 변환(log), 제곱근 변환(sqrt), Box-Cox 변환 적용</li>
                    <li>• <strong>음의 왜도 (왼쪽 꼬리):</strong> 제곱 변환, 지수 변환, 역수 변환 적용</li>
                    <li>• <strong>대안:</strong> 비모수 검정 사용 (Mann-Whitney U, Kruskal-Wallis)</li>
                  </ul>
                </div>
              )}

              {/* Kurtosis Problems */}
              {numericStats.some(s => Math.abs(s.kurtosis || 0) >= 3) && (
                <div className="border-l-2 border-amber-400 pl-3">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    📊 첨도 문제 (|첨도| ≥ 3) 해결 방법:
                  </p>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                    <li>• <strong>높은 첨도 (뾰족한 분포):</strong> 이상치 제거, Winsorization, Trimming 적용</li>
                    <li>• <strong>낮은 첨도 (평평한 분포):</strong> 데이터 범위 확인, 다봉분포 가능성 검토</li>
                    <li>• <strong>대안:</strong> 로버스트 통계 방법 사용, 부트스트랩 적용</li>
                  </ul>
                </div>
              )}

              {/* Outlier Problems */}
              {numericStats.some(s => s.outliers && s.outliers.length > s.numericCount * 0.1) && (
                <div className="border-l-2 border-amber-400 pl-3">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    ⚠️ 이상치 문제 (10% 초과) 해결 방법:
                  </p>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                    <li>• <strong>원인 파악:</strong> 입력 오류, 측정 오류, 실제 극단값 구분</li>
                    <li>• <strong>처리 방법:</strong> 제거, Winsorization (극단값을 경계값으로 대체), 변환</li>
                    <li>• <strong>대안:</strong> 로버스트 회귀, 중앙값 기반 분석, M-추정량 사용</li>
                  </ul>
                </div>
              )}

              {/* General Recommendations */}
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">💡 일반 권장사항:</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• 변환 전후 결과를 비교하여 최적 방법 선택</li>
                  <li>• 여러 문제가 동시에 있으면 비모수 검정 우선 고려</li>
                  <li>• 원본 데이터도 보존하여 해석 시 참고</li>
                  <li>• 표본 크기가 충분하면(n≥30) 중심극한정리 활용 가능</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

/**
 * 왜도 값에 따른 색상 클래스 반환
 */
function getSkewnessColor(skewness: number): string {
  const abs = Math.abs(skewness)
  if (abs < 0.5) return 'text-success'
  if (abs < 1) return 'text-warning'
  return 'text-error'
}

/**
 * 첨도 값에 따른 색상 클래스 반환
 */
function getKurtosisColor(kurtosis: number): string {
  const abs = Math.abs(kurtosis)
  if (abs < 1) return 'text-success'
  if (abs < 3) return 'text-warning'
  return 'text-error'
}
