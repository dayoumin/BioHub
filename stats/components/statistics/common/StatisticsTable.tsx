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
  ArrowUpDown,
  TableProperties,
  Check,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { copyApaTable } from '@/lib/utils/apa-table-formatter'

export interface TableColumn {
  key: string
  header: string
  type?: 'text' | 'number' | 'pvalue' | 'percentage' | 'ci' | 'custom'
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  formatter?: (value: unknown, row?: Record<string, unknown>) => React.ReactNode
  description?: string
  width?: string
  highlight?: (value: unknown, row?: Record<string, unknown>) => 'positive' | 'negative' | 'neutral' | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 다양한 행 타입을 수용하기 위한 의도적 any (내부에서 unknown으로 처리)
export type TableRow = Record<string, any> & {
  _highlighted?: boolean
  _className?: string
  _expandedContent?: React.ReactNode
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
  bordered?: boolean
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
  bordered = false,
  stickyHeader = true,
  maxHeight = '600px'
}: StatisticsTableProps) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set())
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set())
  const [apaCopied, setApaCopied] = React.useState(false)

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
  const formatCellValue = (column: TableColumn, value: unknown, row: TableRow) => {
    if (column.formatter) {
      return column.formatter(value, row)
    }

    const numValue = typeof value === 'number' ? value : null

    switch (column.type) {
      case 'number':
        return formatNumber(numValue, 4)
      case 'pvalue':
        return <PValueBadge value={numValue} size="sm" showLabel={false} />
      case 'percentage':
        return formatPercentage(numValue ?? 0)
      case 'ci':
        if (Array.isArray(value) && value.length === 2) {
          return formatConfidenceInterval(value[0] as number, value[1] as number)
        }
        return 'N/A'
      default:
        if (value == null) return '-'
        return String(value)
    }
  }

  // 하이라이트 스타일
  const getHighlightClass = (column: TableColumn, value: unknown, row: TableRow) => {
    if (!column.highlight) return ''

    const highlightType = column.highlight(value, row)
    switch (highlightType) {
      case 'positive':
        return 'bg-success-bg text-success font-medium'
      case 'negative':
        return 'bg-error-bg text-error font-medium'
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

  // APA 서식 복사 (Word/Google Docs에 붙여넣기용)
  const copyApaFormat = async () => {
    const targetData = selectedRows.size > 0
      ? sortedData.filter((_, index) => selectedRows.has(index))
      : sortedData

    const ok = await copyApaTable(columns, targetData, title)
    if (ok) {
      setApaCopied(true)
      setTimeout(() => setApaCopied(false), 2000)
    }
  }

  const tableContent = (
    <div className={cn(
      'relative overflow-auto',
      stickyHeader && maxHeight && `max-h-[${maxHeight}]`
    )}>
      <Table className={cn(
        compactMode && 'text-sm',
        bordered && 'border-collapse border'
      )}>
        <TableHeader className={cn(
          stickyHeader && 'sticky top-0 z-10 bg-background',
          bordered && 'bg-muted'
        )}>
          <TableRow className={cn(
            'hover:bg-transparent',
            bordered && 'bg-muted'
          )}>
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
                  sortable && column.sortable !== false && 'cursor-pointer select-none hover:bg-muted/50',
                  bordered && 'border p-2'
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
                      getHighlightClass(column, row[column.key], row),
                      bordered && 'border p-2'
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

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title="복사">
                    {apaCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />
                    Excel 복사 (탭 구분)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyApaFormat}>
                    <TableProperties className="w-4 h-4 mr-2" />
                    APA 서식 복사 (Word용)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    CSV 다운로드
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {actions?.map((action, idx) => (
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