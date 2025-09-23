import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Copy,
  Download,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown
} from 'lucide-react'
import { PValueBadge } from './PValueBadge'
import { formatNumber, formatConfidenceInterval, formatPercentage } from '@/lib/statistics/formatters'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface TableColumn {
  key: string
  header: string
  type?: 'text' | 'number' | 'pvalue' | 'percentage' | 'ci' | 'custom'
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  formatter?: (value: any, row?: any) => React.ReactNode
  description?: string
  width?: string
  highlight?: (value: any, row?: any) => 'positive' | 'negative' | 'neutral' | null
}

export interface TableRow {
  [key: string]: any
  _highlighted?: boolean
  _className?: string
}

interface StatisticsTableProps {
  title?: string
  description?: string
  columns: TableColumn[]
  data: TableRow[]
  showRowNumbers?: boolean
  sortable?: boolean
  selectable?: boolean
  expandable?: boolean
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (rows: TableRow[]) => void
  }>
  onRowClick?: (row: TableRow) => void
  className?: string
  compactMode?: boolean
  stickyHeader?: boolean
  maxHeight?: string
}

/**
 * 통계 결과를 표시하는 고급 테이블 컴포넌트
 * 정렬, 필터링, 선택, 확장 등 다양한 기능 지원
 */
export function StatisticsTable({
  title,
  description,
  columns,
  data,
  showRowNumbers = false,
  sortable = true,
  selectable = false,
  expandable = false,
  actions,
  onRowClick,
  className,
  compactMode = false,
  stickyHeader = true,
  maxHeight = '600px'
}: StatisticsTableProps) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set())
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set())

  // 정렬된 데이터
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data

    const column = columns.find(col => col.key === sortColumn)
    if (!column) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      let comparison = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection, columns])

  // 정렬 토글
  const handleSort = (columnKey: string) => {
    if (!sortable) return

    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  // 행 선택 토글
  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(Array.from({ length: data.length }, (_, i) => i)))
    }
  }

  // 행 확장 토글
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  // 값 포맷팅
  const formatCellValue = (column: TableColumn, value: any, row: any) => {
    if (column.formatter) {
      return column.formatter(value, row)
    }

    switch (column.type) {
      case 'number':
        return formatNumber(value, 4)
      case 'pvalue':
        return <PValueBadge value={value} size="sm" showLabel={false} />
      case 'percentage':
        return formatPercentage(value)
      case 'ci':
        if (Array.isArray(value) && value.length === 2) {
          return formatConfidenceInterval(value[0], value[1])
        }
        return 'N/A'
      default:
        return value?.toString() || '-'
    }
  }

  // 하이라이트 스타일
  const getHighlightClass = (column: TableColumn, value: any, row: any) => {
    if (!column.highlight) return ''

    const highlightType = column.highlight(value, row)
    switch (highlightType) {
      case 'positive':
        return 'bg-green-50 text-green-700 font-medium'
      case 'negative':
        return 'bg-red-50 text-red-700 font-medium'
      case 'neutral':
        return 'bg-gray-50 text-gray-700'
      default:
        return ''
    }
  }

  // 클립보드 복사
  const copyToClipboard = () => {
    const selectedData = selectedRows.size > 0
      ? sortedData.filter((_, index) => selectedRows.has(index))
      : sortedData

    const headers = columns.map(col => col.header).join('\t')
    const rows = selectedData.map(row =>
      columns.map(col => {
        const value = row[col.key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'number') return value.toString()
        return String(value)
      }).join('\t')
    ).join('\n')

    navigator.clipboard.writeText(`${headers}\n${rows}`)
  }

  // CSV 다운로드
  const downloadCSV = () => {
    const selectedData = selectedRows.size > 0
      ? sortedData.filter((_, index) => selectedRows.has(index))
      : sortedData

    const headers = columns.map(col => col.header).join(',')
    const rows = selectedData.map(row =>
      columns.map(col => {
        const value = row[col.key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value)
      }).join(',')
    ).join('\n')

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'statistics-table.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const tableContent = (
    <div className={cn(
      'relative overflow-auto',
      stickyHeader && maxHeight && `max-h-[${maxHeight}]`
    )}>
      <Table className={cn(compactMode && 'text-sm')}>
        <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-background')}>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={toggleAllSelection}
                  className="rounded border-gray-300"
                />
              </TableHead>
            )}
            {expandable && <TableHead className="w-12" />}
            {showRowNumbers && <TableHead className="w-16">#</TableHead>}

            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.width && `w-[${column.width}]`,
                  sortable && column.sortable !== false && 'cursor-pointer select-none hover:bg-muted/50'
                )}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.header}</span>
                  {column.description && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{column.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {sortable && column.sortable !== false && (
                    <ArrowUpDown
                      className={cn(
                        'w-3 h-3 text-muted-foreground',
                        sortColumn === column.key && 'text-primary'
                      )}
                    />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedData.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <TableRow
                className={cn(
                  row._highlighted && 'bg-yellow-50',
                  row._className,
                  selectedRows.has(rowIndex) && 'bg-primary/5',
                  onRowClick && 'cursor-pointer hover:bg-muted/50'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => toggleRowSelection(rowIndex)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                )}

                {expandable && (
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRowExpansion(rowIndex)
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {expandedRows.has(rowIndex) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </TableCell>
                )}

                {showRowNumbers && (
                  <TableCell className="font-mono text-muted-foreground">
                    {rowIndex + 1}
                  </TableCell>
                )}

                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      getHighlightClass(column, row[column.key], row)
                    )}
                  >
                    {formatCellValue(column, row[column.key], row)}
                  </TableCell>
                ))}
              </TableRow>

              {expandable && expandedRows.has(rowIndex) && row._expandedContent && (
                <TableRow>
                  <TableCell colSpan={columns.length + (showRowNumbers ? 1 : 0) + 2}>
                    <div className="p-4 bg-muted/30">
                      {row._expandedContent}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  if (!title && !actions) {
    return tableContent
  }

  return (
    <Card className={className}>
      {(title || actions) && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>

            {actions && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  title="클립보드 복사"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadCSV}
                  title="CSV 다운로드"
                >
                  <Download className="w-4 h-4" />
                </Button>

                {actions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selected = selectedRows.size > 0
                        ? sortedData.filter((_, i) => selectedRows.has(i))
                        : sortedData
                      action.onClick(selected)
                    }}
                  >
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="mt-2">
              {selectedRows.size}개 선택됨
            </Badge>
          )}
        </CardHeader>
      )}

      <CardContent className={cn(!title && !actions && 'p-0')}>
        {tableContent}
      </CardContent>
    </Card>
  )
}