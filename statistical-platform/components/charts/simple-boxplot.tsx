"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SimpleBoxPlotProps {
  data: number[]
  title?: string
  variable?: string
}

export function SimpleBoxPlot({
  data,
  title = "Box Plot",
  variable = "변수"
}: SimpleBoxPlotProps) {

  const stats = useMemo(() => {
    if (data.length === 0) return null

    const sorted = [...data].sort((a, b) => a - b)
    const n = sorted.length

    const q1 = sorted[Math.floor(n * 0.25)]
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const iqr = q3 - q1

    const lowerFence = q1 - 1.5 * iqr
    const upperFence = q3 + 1.5 * iqr

    const min = Math.max(sorted[0], lowerFence)
    const max = Math.min(sorted[n - 1], upperFence)

    const outliers = sorted.filter(v => v < lowerFence || v > upperFence)

    return { q1, median, q3, min, max, outliers, iqr }
  }, [data])

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>데이터가 없습니다</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // SVG 좌표 계산
  const dataRange = stats.max - stats.min + stats.iqr
  const padding = 40
  const width = 300
  const height = 200
  const plotHeight = height - 2 * padding

  const scale = (value: number) => {
    return height - padding - ((value - stats.min) / dataRange) * plotHeight
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          중앙값: {stats.median.toFixed(2)} | IQR: {stats.iqr.toFixed(2)}
          {stats.outliers.length > 0 && ` | 이상치: ${stats.outliers.length}개`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <svg width={width} height={height} className="border rounded-lg">
            {/* Y축 */}
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={height - padding}
              stroke="#666"
              strokeWidth="1"
            />

            {/* Box (Q1 ~ Q3) */}
            <rect
              x={width / 2 - 30}
              y={scale(stats.q3)}
              width={60}
              height={scale(stats.q1) - scale(stats.q3)}
              fill="#8884d8"
              fillOpacity="0.3"
              stroke="#8884d8"
              strokeWidth="2"
            />

            {/* Median line */}
            <line
              x1={width / 2 - 30}
              y1={scale(stats.median)}
              x2={width / 2 + 30}
              y2={scale(stats.median)}
              stroke="#ff7300"
              strokeWidth="3"
            />

            {/* Whisker top */}
            <line
              x1={width / 2}
              y1={scale(stats.q3)}
              x2={width / 2}
              y2={scale(stats.max)}
              stroke="#8884d8"
              strokeWidth="1.5"
              strokeDasharray="4"
            />
            <line
              x1={width / 2 - 15}
              y1={scale(stats.max)}
              x2={width / 2 + 15}
              y2={scale(stats.max)}
              stroke="#8884d8"
              strokeWidth="2"
            />

            {/* Whisker bottom */}
            <line
              x1={width / 2}
              y1={scale(stats.q1)}
              x2={width / 2}
              y2={scale(stats.min)}
              stroke="#8884d8"
              strokeWidth="1.5"
              strokeDasharray="4"
            />
            <line
              x1={width / 2 - 15}
              y1={scale(stats.min)}
              x2={width / 2 + 15}
              y2={scale(stats.min)}
              stroke="#8884d8"
              strokeWidth="2"
            />

            {/* Outliers */}
            {stats.outliers.map((outlier, idx) => (
              <circle
                key={idx}
                cx={width / 2}
                cy={scale(outlier)}
                r="3"
                fill="#ff4444"
                stroke="#cc0000"
                strokeWidth="1"
              />
            ))}

            {/* Labels */}
            <text x={padding - 10} y={scale(stats.max)} fontSize="10" textAnchor="end" fill="#666">
              {stats.max.toFixed(1)}
            </text>
            <text x={padding - 10} y={scale(stats.q3)} fontSize="10" textAnchor="end" fill="#666">
              {stats.q3.toFixed(1)}
            </text>
            <text x={padding - 10} y={scale(stats.median)} fontSize="10" textAnchor="end" fill="#ff7300" fontWeight="bold">
              {stats.median.toFixed(1)}
            </text>
            <text x={padding - 10} y={scale(stats.q1)} fontSize="10" textAnchor="end" fill="#666">
              {stats.q1.toFixed(1)}
            </text>
            <text x={padding - 10} y={scale(stats.min)} fontSize="10" textAnchor="end" fill="#666">
              {stats.min.toFixed(1)}
            </text>

            {/* Variable name */}
            <text x={width / 2} y={height - 10} fontSize="12" textAnchor="middle" fill="#333" fontWeight="500">
              {variable}
            </text>
          </svg>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div><span className="font-medium">최소값:</span> {stats.min.toFixed(3)}</div>
          <div><span className="font-medium">최대값:</span> {stats.max.toFixed(3)}</div>
          <div><span className="font-medium">Q1 (25%):</span> {stats.q1.toFixed(3)}</div>
          <div><span className="font-medium">Q3 (75%):</span> {stats.q3.toFixed(3)}</div>
          <div className="col-span-2">
            <span className="font-medium">IQR:</span> {stats.iqr.toFixed(3)}
            {stats.outliers.length > 0 && (
              <span className="ml-2 text-red-600">
                (이상치 {stats.outliers.length}개: {stats.outliers.slice(0, 3).map(v => v.toFixed(1)).join(', ')}
                {stats.outliers.length > 3 && '...'})
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
