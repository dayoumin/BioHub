'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Download,
  Table as TableIcon,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash,
  Type,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableViewerProps {
  /** 데이터 배열 */
  data: Record<string, unknown>[]
  /** 열 이름 배열 */
  columns: string[]
  /** 파일명 (표시용) */
  fileName?: string
  /** 트리거 버튼 커스텀 */
  trigger?: React.ReactNode
  /** 열 타입 정보 (자동 감지 또는 제공) */
  columnTypes?: Record<string, 'number' | 'string' | 'date' | 'boolean'>
  /** Sheet 열림 상태 제어 */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type SortDirection = 'asc' | 'desc' | null

/**
 * DataTableViewer - 데이터 전체보기 Sheet 컴포넌트
 *
 * 기능:
 * - 검색/필터
 * - 정렬
 * - 페이지네이션
 * - 열 타입 표시
 * - CSV 내보내기
 */
export function DataTableViewer({
  data,
  columns,
  fileName,
  trigger,
  columnTypes: providedColumnTypes,
  open,
  onOpenChange,
}: DataTableViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // 열 타입 자동 감지
  const columnTypes = useMemo(() => {
    if (providedColumnTypes) return providedColumnTypes

    const types: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {}

    columns.forEach(col => {
      // 첫 10개 행 샘플링
      const samples = data.slice(0, 10).map(row => row[col])
      const validSamples = samples.filter(v => v !== null && v !== undefined && v !== '')

      if (validSamples.length === 0) {
        types[col] = 'string'
        return
      }

      // 타입별 카운트
      let numberCount = 0
      let dateCount = 0
      let booleanCount = 0

      for (const v of validSamples) {
        // Boolean 체크
        if (typeof v === 'boolean') {
          booleanCount++
          continue
        }

        // 날짜 체크 (문자열이면서 날짜 패턴)
        if (typeof v === 'string') {
          // ISO 날짜 형식 또는 yyyy-mm-dd 패턴
          const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/
          if (datePattern.test(v) && !isNaN(Date.parse(v))) {
            dateCount++
            continue
          }
        }

        // 숫자 체크 (number 타입 또는 숫자로 변환 가능한 문자열)
        if (typeof v === 'number') {
          numberCount++
        } else if (typeof v === 'string') {
          const trimmed = v.trim()
          // 빈 문자열이 아니고, 숫자로 변환 가능하면
          if (trimmed !== '' && !isNaN(Number(trimmed))) {
            numberCount++
          }
        }
      }

      // 과반수 이상이면 해당 타입으로 결정
      const threshold = validSamples.length / 2
      if (booleanCount > threshold) {
        types[col] = 'boolean'
      } else if (dateCount > threshold) {
        types[col] = 'date'
      } else if (numberCount > threshold) {
        types[col] = 'number'
      } else {
        types[col] = 'string'
      }
    })

    return types
  }, [columns, data, providedColumnTypes])

  // 검색 필터링
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    const term = searchTerm.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        const value = row[col]
        return value !== null && value !== undefined &&
          String(value).toLowerCase().includes(term)
      })
    )
  }, [data, columns, searchTerm])

  // 정렬
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData

    return [...filteredData].sort((a, b) => {
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
  }, [filteredData, sortColumn, sortDirection])

  // 페이지네이션
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  // 정렬 토글
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }, [sortColumn, sortDirection])

  // CSV 내보내기
  const handleExport = useCallback(() => {
    const headers = columns.join(',')
    const rows = sortedData.map(row =>
      columns.map(col => {
        const val = row[col]
        if (val === null || val === undefined) return ''
        const str = String(val)
        // CSV 이스케이프
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    ).join('\n')

    const csv = `${headers}\n${rows}`
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName ? `${fileName.replace(/\.[^/.]+$/, '')}_export.csv` : 'data_export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [columns, sortedData, fileName])

  // 타입 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3" />
      case 'date':
        return <Calendar className="w-3 h-3" />
      default:
        return <Type className="w-3 h-3" />
    }
  }

  // 값 포맷팅
  const formatValue = (value: unknown, type: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>
    }
    if (type === 'number' && typeof value === 'number') {
      return value.toLocaleString('ko-KR', { maximumFractionDigits: 4 })
    }
    return String(value)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <TableIcon className="w-4 h-4 mr-2" />
            데이터 전체보기
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TableIcon className="w-5 h-5" />
            데이터 뷰어
          </SheetTitle>
          <SheetDescription>
            {fileName && <span className="font-medium">{fileName}</span>}
            {' · '}
            {data.length.toLocaleString()}행 × {columns.length}열
            {searchTerm && ` · 검색 결과: ${sortedData.length.toLocaleString()}행`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* 툴바 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 pr-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>

          {/* 테이블 */}
          <ScrollArea className="h-[calc(100vh-280px)] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  {columns.map(col => (
                    <TableHead
                      key={col}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5 px-1">
                          {getTypeIcon(columnTypes[col])}
                        </Badge>
                        <span className="truncate max-w-[120px]" title={col}>
                          {col}
                        </span>
                        {sortColumn === col ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 flex-shrink-0 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-8">
                      <span className="text-muted-foreground">
                        {searchTerm ? '검색 결과가 없습니다' : '데이터가 없습니다'}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </TableCell>
                      {columns.map(col => (
                        <TableCell key={col} className="max-w-[200px] truncate">
                          {formatValue(row[col], columnTypes[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">페이지당</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
