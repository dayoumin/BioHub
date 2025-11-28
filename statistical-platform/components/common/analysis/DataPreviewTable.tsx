'use client'

/**
 * DataPreviewTable - 데이터 미리보기 공통 컴포넌트
 *
 * 특징:
 * - 미니멀한 디자인 (토글 방식)
 * - 최대 100행 × 모든 컬럼 표시
 * - 가상 스크롤 (성능 최적화)
 * - 반응형 디자인 (모바일 가로 스크롤)
 *
 * 사용처:
 * - 스마트 분석 (데이터 검증 단계)
 * - 모든 통계 페이지 (데이터 확인용)
 */

import { useState, useMemo, Fragment } from 'react'
import { ChevronDown, ChevronUp, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DataRow } from '@/types/smart-flow'

export interface DataPreviewTableProps {
  /** 데이터 배열 */
  data: DataRow[]

  /** 최대 표시 행 수 (기본: 100) */
  maxRows?: number

  /** 초기 열림 상태 (기본: false) */
  defaultOpen?: boolean

  /** 제목 (기본: "데이터 미리보기") */
  title?: string

  /** 테이블 높이 (기본: 400px) */
  height?: string

  /** 추가 CSS 클래스 */
  className?: string

  /** 시작 행 번호 (기본: 1) - 행 번호 표시용 */
  startIndex?: number

  /** 생략된 행 수 (표시용) - 테이블 중간에 생략 행 표시 */
  omittedRows?: number

  /** 생략 행을 삽입할 위치 (0-indexed). omittedRows와 함께 사용 */
  omitAfterIndex?: number

  /** 각 행의 실제 행 번호 배열 (순서대로). 미지정 시 startIndex부터 순차 증가 */
  rowIndices?: number[]

  /** 하이라이트할 행 번호 배열 (1-indexed, 원본 데이터 기준) */
  highlightRows?: number[]

  /** 하이라이트할 컬럼명 (특정 컬럼만 강조) */
  highlightColumn?: string

  /** 하이라이트된 행 클릭 시 콜백 */
  onHighlightRowClick?: (rowIndex: number) => void
}

export function DataPreviewTable({
  data,
  maxRows = 100,
  defaultOpen = false,
  title = '데이터 미리보기',
  height = '400px',
  className,
  startIndex = 1,
  omittedRows,
  omitAfterIndex,
  rowIndices,
  highlightRows,
  highlightColumn,
  onHighlightRowClick
}: DataPreviewTableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // 데이터 샘플링 (최대 maxRows까지)
  const displayData = useMemo(() => {
    return data.slice(0, maxRows)
  }, [data, maxRows])

  // 컬럼 추출 (모든 행의 키 합집합)
  const columns = useMemo(() => {
    if (data.length === 0) return []

    // 모든 행의 키를 수집하여 중복 제거
    const allKeys = new Set<string>()
    for (const row of data) {
      Object.keys(row).forEach(key => allKeys.add(key))
    }

    return Array.from(allKeys)
  }, [data])

  if (data.length === 0) {
    return null
  }

  return (
    <Card className={cn('border-muted', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">
              {title}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              ({displayData.length.toLocaleString()}행 × {columns.length}열
              {data.length > maxRows && ` / 전체 ${data.length.toLocaleString()}행`})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0"
            aria-label={isOpen ? '데이터 테이블 접기' : '데이터 테이블 펼치기'}
            aria-expanded={isOpen}
            aria-controls="data-preview-table"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          {/* 테이블 컨테이너 (가로/세로 스크롤) */}
          <div
            id="data-preview-table"
            className="overflow-auto border rounded-md"
            style={{ maxHeight: height }}
            role="region"
            aria-label="데이터 미리보기 테이블"
          >
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  {/* 행 번호 */}
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b w-16">
                    #
                  </th>
                  {/* 컬럼 헤더 */}
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium border-b whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, rowIndex) => {
                  // 생략 행 삽입 위치 결정: omitAfterIndex가 지정되면 해당 위치, 아니면 중간 지점
                  const omitPosition = omitAfterIndex !== undefined ? omitAfterIndex : Math.floor(displayData.length / 2) - 1
                  const isOmitPoint = omittedRows && omittedRows > 0 && rowIndex === omitPosition + 1

                  // 행 번호: rowIndices가 있으면 해당 값 사용, 없으면 startIndex + rowIndex
                  const displayRowNumber = rowIndices?.[rowIndex] ?? (startIndex + rowIndex)

                  return (
                    <Fragment key={rowIndex}>
                      {isOmitPoint && (
                        <tr className="bg-muted/20">
                          <td
                            colSpan={columns.length + 1}
                            className="px-3 py-2 text-center text-muted-foreground border-b text-sm"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs">...</span>
                              <span>{omittedRows}행 생략</span>
                              <span className="text-xs">...</span>
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={cn(
                          "transition-colors",
                          highlightRows?.includes(displayRowNumber)
                            ? "bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 cursor-pointer"
                            : "hover:bg-muted/30"
                        )}
                        onClick={() => {
                          if (highlightRows?.includes(displayRowNumber) && onHighlightRowClick) {
                            onHighlightRowClick(displayRowNumber)
                          }
                        }}
                      >
                        {/* 행 번호 */}
                        <td className={cn(
                          "px-3 py-2 border-b font-mono text-xs",
                          highlightRows?.includes(displayRowNumber)
                            ? "text-yellow-700 dark:text-yellow-300 font-bold"
                            : "text-muted-foreground"
                        )}>
                          {highlightRows?.includes(displayRowNumber) && (
                            <span className="mr-1">●</span>
                          )}
                          {displayRowNumber}
                        </td>
                        {/* 데이터 셀 */}
                        {columns.map((col) => {
                          const value = row[col]
                          const displayValue =
                            value === null || value === undefined || value === ''
                              ? '—'
                              : String(value)

                          const isNumber = typeof value === 'number' || (!isNaN(Number(value)) && value !== '')
                          const isHighlightedCell = highlightRows?.includes(displayRowNumber) &&
                            (!highlightColumn || highlightColumn === col)

                          return (
                            <td
                              key={col}
                              className={cn(
                                'px-3 py-2 border-b',
                                isNumber && 'text-right font-mono',
                                (value === null || value === undefined || value === '') && 'text-muted-foreground',
                                isHighlightedCell && highlightColumn === col && 'bg-yellow-200 dark:bg-yellow-800/50 font-bold'
                              )}
                            >
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 안내 메시지 */}
          {data.length > maxRows && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              ⚠️ 전체 {data.length.toLocaleString()}행 중 {maxRows.toLocaleString()}행만 표시됩니다.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}