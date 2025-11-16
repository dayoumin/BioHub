'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronUp, Database, BarChart3, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractColumnData } from '@/lib/utils/data-extraction'

interface DataPreviewPanelProps {
  data: Array<Record<string, unknown>>
  className?: string
  defaultExpanded?: boolean
  maxPreviewRows?: number
  fileName?: string
  onOpenNewWindow?: () => void
}

interface ColumnStats {
  name: string
  type: 'numeric' | 'categorical' | 'mixed'
  count: number
  missing: number
  unique: number
  mean?: number
  std?: number
  min?: number
  max?: number
  topValues?: Array<{ value: string; count: number }>
}

export function DataPreviewPanel({
  data,
  className,
  defaultExpanded = false,
  maxPreviewRows = 10000, // 기본값 크게 증가 (전체 데이터 표시)
  fileName,
  onOpenNewWindow
}: DataPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // 컬럼 통계 계산
  const columnStats = useMemo(() => {
    if (!data || data.length === 0) return []

    const columns = Object.keys(data[0])
    const stats: ColumnStats[] = []

    for (const col of columns) {
      const values = data.map(row => row[col])
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '')
      const missing = values.length - nonNull.length

      // 숫자형 시도
      const numericValues = extractColumnData(data, col)
      const isNumeric = numericValues.length > nonNull.length * 0.8 // 80% 이상 숫자면 숫자형

      if (isNumeric && numericValues.length > 0) {
        // 숫자형 통계
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length
        const std = Math.sqrt(variance)
        const sorted = [...numericValues].sort((a, b) => a - b)

        stats.push({
          name: col,
          type: 'numeric',
          count: values.length,
          missing,
          unique: new Set(numericValues).size,
          mean: parseFloat(mean.toFixed(2)),
          std: parseFloat(std.toFixed(2)),
          min: sorted[0],
          max: sorted[sorted.length - 1]
        })
      } else {
        // 범주형 통계
        const valueCount = new Map<string, number>()
        nonNull.forEach(v => {
          const key = String(v)
          valueCount.set(key, (valueCount.get(key) || 0) + 1)
        })

        const topValues = Array.from(valueCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count }))

        stats.push({
          name: col,
          type: valueCount.size < 20 ? 'categorical' : 'mixed',
          count: values.length,
          missing,
          unique: valueCount.size,
          topValues
        })
      }
    }

    return stats
  }, [data])

  const previewData = useMemo(() => {
    return data.slice(0, maxPreviewRows)
  }, [data, maxPreviewRows])

  const columns = data.length > 0 ? Object.keys(data[0]) : []
  const totalRows = data.length
  const hasIssues = columnStats.some(s => s.missing > 0)

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "hover:shadow-lg hover:shadow-primary/5",
      isExpanded && "shadow-md",
      className
    )}>
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                업로드된 데이터
                {hasIssues && (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                {!hasIssues && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-xs">
                  {totalRows.toLocaleString()}개 행
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {columns.length}개 변수
                </Badge>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewWindow && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNewWindow}
                className="gap-2 hover:bg-primary/10 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                새 창으로 보기
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2 hover:bg-primary/10 transition-colors"
            >
              {isExpanded ? (
                <>
                  접기 <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  펼치기 <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="relative space-y-4 animate-in fade-in-50 duration-300">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <Database className="h-4 w-4 mr-2" />
                데이터 미리보기
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                기초 통계
              </TabsTrigger>
            </TabsList>

            {/* 데이터 미리보기 탭 */}
            <TabsContent value="preview" className="mt-4 space-y-2">
              {totalRows > maxPreviewRows && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    처음 <strong>{maxPreviewRows.toLocaleString()}개 행</strong>만 표시됩니다.
                    스크롤하여 더 많은 데이터를 확인하세요.
                  </p>
                </div>
              )}

              <ScrollArea className="h-[600px] w-full rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md z-10">
                    <TableRow className="hover:bg-muted/80">
                      <TableHead className="w-12 text-center font-semibold">#</TableHead>
                      {columns.map((col) => (
                        <TableHead key={col} className="font-semibold">
                          <div className="flex items-center gap-2">
                            {col}
                            {columnStats.find(s => s.name === col)?.type === 'numeric' && (
                              <Badge variant="secondary" className="text-xs">숫자</Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className="hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {idx + 1}
                        </TableCell>
                        {columns.map((col) => {
                          const value = row[col]
                          const isNull = value === null || value === undefined || value === ''
                          return (
                            <TableCell
                              key={col}
                              className={cn(
                                "font-mono text-sm",
                                isNull && "text-muted-foreground italic bg-destructive/5"
                              )}
                            >
                              {isNull ? 'null' : String(value)}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* 기초 통계 탭 */}
            <TabsContent value="stats" className="mt-4 space-y-4">
              <ScrollArea className="h-[400px] w-full">
                <div className="grid gap-3">
                  {columnStats.map((stat) => (
                    <Card
                      key={stat.name}
                      className="hover:shadow-md hover:shadow-primary/5 transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {stat.name}
                            <Badge variant={stat.type === 'numeric' ? 'default' : 'secondary'}>
                              {stat.type === 'numeric' ? '숫자형' : '범주형'}
                            </Badge>
                          </CardTitle>
                          {stat.missing > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {stat.missing}개 누락
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">총 개수</p>
                            <p className="font-mono font-semibold">{stat.count.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">고유값</p>
                            <p className="font-mono font-semibold">{stat.unique.toLocaleString()}</p>
                          </div>

                          {stat.type === 'numeric' && (
                            <>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">평균</p>
                                <p className="font-mono font-semibold">{stat.mean?.toFixed(2)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">표준편차</p>
                                <p className="font-mono font-semibold">{stat.std?.toFixed(2)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">최소값</p>
                                <p className="font-mono font-semibold">{stat.min}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">최대값</p>
                                <p className="font-mono font-semibold">{stat.max}</p>
                              </div>
                            </>
                          )}

                          {stat.type !== 'numeric' && stat.topValues && (
                            <div className="col-span-2 space-y-1">
                              <p className="text-xs text-muted-foreground">상위 값</p>
                              <div className="flex flex-wrap gap-1">
                                {stat.topValues.map((tv, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tv.value} ({tv.count})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
