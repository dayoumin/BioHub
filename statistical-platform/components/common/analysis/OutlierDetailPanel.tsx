'use client'

/**
 * OutlierDetailPanel - 이상치 상세 정보 패널
 *
 * 기능:
 * - 박스플롯 시각화 (이상치 점 강조 + 행 번호 표시)
 * - 이상치 목록 테이블 (값, 행 번호, 기준 범위)
 * - "데이터에서 보기" 버튼 → 데이터 미리보기 탭 연동
 *
 * SPSS 스타일: 케이스 번호 표시
 * Tableau 스타일: 인터랙티브 연동
 */

import { memo, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  BarChart3,
  Table as TableIcon,
  ExternalLink,
  CircleDot,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OutlierInfo {
  /** 이상치 값 */
  value: number
  /** 원본 데이터에서의 행 번호 (1-indexed) */
  rowIndex: number
  /** 극단 이상치 여부 (3.0 IQR 기준) */
  isExtreme?: boolean
}

export interface OutlierDetailPanelProps {
  /** 모달 열림 상태 */
  open: boolean
  /** 모달 닫기 핸들러 */
  onOpenChange: (open: boolean) => void
  /** 변수명 */
  variableName: string
  /** 이상치 정보 배열 */
  outliers: OutlierInfo[]
  /** 통계 정보 */
  statistics: {
    min: number
    q1: number
    median: number
    q3: number
    max: number
    mean?: number
    iqr: number
    lowerBound: number
    upperBound: number
    /** 극단 이상치 기준 (3.0 IQR) */
    extremeLowerBound?: number
    extremeUpperBound?: number
  }
  /** "데이터에서 보기" 클릭 시 콜백 */
  onViewInData?: (rowIndices: number[]) => void
}

export const OutlierDetailPanel = memo(function OutlierDetailPanel({
  open,
  onOpenChange,
  variableName,
  outliers,
  statistics,
  onViewInData
}: OutlierDetailPanelProps) {
  const [hoveredOutlier, setHoveredOutlier] = useState<number | null>(null)
  const [selectedOutliers, setSelectedOutliers] = useState<Set<number>>(new Set())

  // 이상치 분류: mild vs extreme
  const { mildOutliers, extremeOutliers } = useMemo(() => {
    const mild: OutlierInfo[] = []
    const extreme: OutlierInfo[] = []

    outliers.forEach(o => {
      if (o.isExtreme) {
        extreme.push(o)
      } else {
        mild.push(o)
      }
    })

    return { mildOutliers: mild, extremeOutliers: extreme }
  }, [outliers])

  // 박스플롯 렌더링을 위한 스케일 계산
  const { plotMin, plotMax, scale } = useMemo(() => {
    let min = statistics.min
    let max = statistics.max

    // 이상치를 포함해 범위 확장
    outliers.forEach(o => {
      min = Math.min(min, o.value)
      max = Math.max(max, o.value)
    })

    // 최소/최대가 동일한 경우 범위가 0이 되는 것을 방지해 시각화가 무너지는 것을 예방
    if (min === max) {
      min -= 1
      max += 1
    }

    const padding = (max - min) * 0.1 || 1
    const plotMin = min - padding
    const plotMax = max + padding
    const range = plotMax - plotMin || 1

    return {
      plotMin,
      plotMax,
      scale: (value: number) => ((value - plotMin) / range) * 100
    }
  }, [statistics, outliers])

  // 이상치 선택 토글
  const toggleOutlierSelection = (rowIndex: number) => {
    setSelectedOutliers(prev => {
      const next = new Set(prev)
      if (next.has(rowIndex)) {
        next.delete(rowIndex)
      } else {
        next.add(rowIndex)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedOutliers.size === outliers.length) {
      setSelectedOutliers(new Set())
    } else {
      setSelectedOutliers(new Set(outliers.map(o => o.rowIndex)))
    }
  }

  // 데이터에서 보기
  const handleViewInData = () => {
    const indices = selectedOutliers.size > 0
      ? Array.from(selectedOutliers)
      : outliers.map(o => o.rowIndex)
    onViewInData?.(indices)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            이상치 상세: {variableName}
          </DialogTitle>
          <DialogDescription>
            IQR × 1.5 기준으로 {outliers.length}개의 이상치가 감지되었습니다.
            {extremeOutliers.length > 0 && (
              <span className="text-red-500 ml-1">
                (극단 이상치 {extremeOutliers.length}개 포함)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              박스플롯
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="h-4 w-4" />
              이상치 목록
            </TabsTrigger>
          </TabsList>

          {/* 박스플롯 탭 */}
          <TabsContent value="chart" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              {/* 박스플롯 시각화 */}
              <div className="relative h-48 bg-muted/30 rounded-lg p-4">
                {/* Y축 라벨 */}
                <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground py-4">
                  <span>{plotMax.toFixed(1)}</span>
                  <span>{((plotMax + plotMin) / 2).toFixed(1)}</span>
                  <span>{plotMin.toFixed(1)}</span>
                </div>

                {/* 플롯 영역 */}
                <div className="ml-16 h-full relative">
                  {/* IQR 범위 배경 (정상 범위) */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-20 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                    style={{
                      top: `${100 - scale(statistics.upperBound)}%`,
                      height: `${scale(statistics.upperBound) - scale(statistics.lowerBound)}%`
                    }}
                  />

                  {/* 박스 (Q1-Q3) */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-16 bg-primary/20 border-2 border-primary rounded"
                    style={{
                      top: `${100 - scale(statistics.q3)}%`,
                      height: `${scale(statistics.q3) - scale(statistics.q1)}%`
                    }}
                  />

                  {/* 중앙값 선 */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-16 h-0.5 bg-primary"
                    style={{ top: `${100 - scale(statistics.median)}%` }}
                  />

                  {/* 평균 점 */}
                  {statistics.mean !== undefined && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full"
                      style={{ top: `${100 - scale(statistics.mean)}%`, marginTop: '-6px' }}
                      title={`평균: ${statistics.mean.toFixed(2)}`}
                    />
                  )}

                  {/* 위스커 (상단) */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-px bg-primary/60"
                    style={{
                      top: `${100 - scale(Math.min(statistics.max, statistics.upperBound))}%`,
                      height: `${scale(Math.min(statistics.max, statistics.upperBound)) - scale(statistics.q3)}%`
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-8 h-px bg-primary"
                    style={{ top: `${100 - scale(Math.min(statistics.max, statistics.upperBound))}%` }}
                  />

                  {/* 위스커 (하단) */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-px bg-primary/60"
                    style={{
                      top: `${100 - scale(statistics.q1)}%`,
                      height: `${scale(statistics.q1) - scale(Math.max(statistics.min, statistics.lowerBound))}%`
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-8 h-px bg-primary"
                    style={{ top: `${100 - scale(Math.max(statistics.min, statistics.lowerBound))}%` }}
                  />

                  {/* 이상치 점들 (SPSS 스타일: 케이스 번호 표시) */}
                  {outliers.map((outlier, idx) => {
                    const isHovered = hoveredOutlier === outlier.rowIndex
                    const isSelected = selectedOutliers.has(outlier.rowIndex)
                    const isExtreme = outlier.isExtreme

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "absolute cursor-pointer transition-all duration-150",
                          "flex items-center gap-1"
                        )}
                        style={{
                          top: `${100 - scale(outlier.value)}%`,
                          left: '50%',
                          transform: 'translate(40px, -50%)'
                        }}
                        onMouseEnter={() => setHoveredOutlier(outlier.rowIndex)}
                        onMouseLeave={() => setHoveredOutlier(null)}
                        onClick={() => toggleOutlierSelection(outlier.rowIndex)}
                      >
                        {/* 이상치 마커: ○ (mild) 또는 ★ (extreme) - SPSS 스타일 */}
                        {isExtreme ? (
                          <Star
                            className={cn(
                              "h-4 w-4 transition-colors",
                              isSelected ? "text-red-500 fill-red-500" : "text-red-400",
                              isHovered && "scale-125"
                            )}
                          />
                        ) : (
                          <CircleDot
                            className={cn(
                              "h-4 w-4 transition-colors",
                              isSelected ? "text-yellow-600" : "text-yellow-500",
                              isHovered && "scale-125"
                            )}
                          />
                        )}

                        {/* 행 번호 (SPSS 스타일) */}
                        <span
                          className={cn(
                            "text-xs font-mono",
                            isExtreme ? "text-red-600" : "text-yellow-700",
                            isHovered && "font-bold"
                          )}
                        >
                          #{outlier.rowIndex}
                        </span>

                        {/* 호버 시 값 표시 */}
                        {isHovered && (
                          <span className="text-xs bg-background/90 px-1.5 py-0.5 rounded shadow-sm border">
                            {outlier.value.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 범례 */}
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-yellow-500" />
                  <span>일반 이상치 (1.5×IQR)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-red-500" />
                  <span>극단 이상치 (3.0×IQR)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                  <span>평균</span>
                </div>
              </div>

              {/* 통계 요약 */}
              <div className="grid grid-cols-4 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                <div>
                  <div className="text-muted-foreground text-xs">Q1</div>
                  <div className="font-mono">{statistics.q1.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">중앙값</div>
                  <div className="font-mono font-medium">{statistics.median.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Q3</div>
                  <div className="font-mono">{statistics.q3.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">IQR</div>
                  <div className="font-mono">{statistics.iqr.toFixed(2)}</div>
                </div>
              </div>

              {/* 정상 범위 안내 */}
              <div className="text-sm p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="font-medium text-green-700 dark:text-green-300 mb-1">
                  정상 범위 (IQR × 1.5)
                </div>
                <div className="text-green-600 dark:text-green-400 font-mono">
                  {statistics.lowerBound.toFixed(2)} ~ {statistics.upperBound.toFixed(2)}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 이상치 목록 탭 */}
          <TabsContent value="table" className="flex-1 overflow-auto mt-4">
            <div className="space-y-3">
              {/* 선택 컨트롤 */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedOutliers.size === outliers.length ? '전체 해제' : '전체 선택'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedOutliers.size}개 선택됨
                </span>
              </div>

              {/* 이상치 테이블 */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedOutliers.size === outliers.length}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">행 번호</th>
                      <th className="px-3 py-2 text-right">값</th>
                      <th className="px-3 py-2 text-center">유형</th>
                      <th className="px-3 py-2 text-right">편차</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outliers
                      .sort((a, b) => Math.abs(b.value - statistics.median) - Math.abs(a.value - statistics.median))
                      .map((outlier, idx) => {
                        const deviation = outlier.value > statistics.upperBound
                          ? outlier.value - statistics.upperBound
                          : statistics.lowerBound - outlier.value
                        const isSelected = selectedOutliers.has(outlier.rowIndex)

                        return (
                          <tr
                            key={idx}
                            className={cn(
                              "border-t hover:bg-muted/30 cursor-pointer transition-colors",
                              isSelected && "bg-yellow-50 dark:bg-yellow-950/20"
                            )}
                            onClick={() => toggleOutlierSelection(outlier.rowIndex)}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOutlierSelection(outlier.rowIndex)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 font-mono">
                              #{outlier.rowIndex}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium">
                              {outlier.value.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {outlier.isExtreme ? (
                                <Badge variant="destructive" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  극단
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <CircleDot className="h-3 w-3 mr-1" />
                                  일반
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                              {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>

              {/* 요약 통계 */}
              <div className="grid grid-cols-2 gap-3">
                {mildOutliers.length > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
                      <CircleDot className="h-4 w-4" />
                      일반 이상치: {mildOutliers.length}개
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Q1 - 1.5×IQR ~ Q3 + 1.5×IQR 범위 밖
                    </div>
                  </div>
                )}
                {extremeOutliers.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                      <Star className="h-4 w-4" />
                      극단 이상치: {extremeOutliers.length}개
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Q1 - 3.0×IQR ~ Q3 + 3.0×IQR 범위 밖
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 하단 액션 버튼 */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          {onViewInData && (
            <Button onClick={handleViewInData} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              데이터에서 보기
              {selectedOutliers.size > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedOutliers.size}개
                </Badge>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

export default OutlierDetailPanel