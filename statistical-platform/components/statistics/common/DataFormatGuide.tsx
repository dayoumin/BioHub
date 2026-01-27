'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Rows3, Columns3, ArrowRightLeft, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DataFormatGuide as DataFormatGuideType, SampleDataTable } from '@/lib/statistics/variable-requirements'

export interface DataFormatGuideProps {
  /** Data format configuration from method metadata */
  dataFormat: DataFormatGuideType
  /** Sample data for visualization (optional) */
  sampleData?: SampleDataTable
  /** Show format comparison (Wide vs Long) */
  showComparison?: boolean
  /** Custom class name */
  className?: string
  /** Compact mode */
  compact?: boolean
}

/**
 * DataFormatGuide - Visual guide for data arrangement
 *
 * Shows how data should be structured for the analysis method.
 * Can display Wide format, Long format, or a comparison of both.
 *
 * @example
 * <DataFormatGuide
 *   dataFormat={method.dataFormat}
 *   sampleData={method.sampleData}
 * />
 */
export function DataFormatGuide({
  dataFormat,
  sampleData,
  showComparison = false,
  className,
  compact = false
}: DataFormatGuideProps) {
  const FormatIcon = dataFormat.type === 'wide' ? Columns3 : dataFormat.type === 'long' ? Rows3 : ArrowRightLeft

  // For 'both' type, show comparison tabs
  if (dataFormat.type === 'both' || showComparison) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className={cn(compact ? 'p-4 pb-2' : 'pb-2')}>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <CardTitle className={cn(compact ? 'text-base' : 'text-lg')}>
              데이터 형식 가이드
            </CardTitle>
          </div>
          <CardDescription>{dataFormat.description}</CardDescription>
        </CardHeader>
        <CardContent className={cn(compact ? 'p-4 pt-0' : 'pt-0')}>
          <Tabs defaultValue="wide" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wide" className="flex items-center gap-2">
                <Columns3 className="h-4 w-4" />
                Wide 형식
              </TabsTrigger>
              <TabsTrigger value="long" className="flex items-center gap-2">
                <Rows3 className="h-4 w-4" />
                Long 형식
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wide">
              <WideFormatExample />
            </TabsContent>
            <TabsContent value="long">
              <LongFormatExample />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  // Single format display
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className={cn(compact ? 'p-4 pb-2' : 'pb-2')}>
        <div className="flex items-center gap-2">
          <FormatIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className={cn(compact ? 'text-base' : 'text-lg')}>
            데이터 형식
          </CardTitle>
          <Badge variant="secondary">
            {dataFormat.type === 'wide' ? 'Wide 형식' : 'Long 형식'}
          </Badge>
        </div>
        <CardDescription>{dataFormat.description}</CardDescription>
      </CardHeader>
      <CardContent className={cn(compact ? 'p-4 pt-0' : 'pt-0')}>
        <div className="space-y-4">
          {/* Column Requirements */}
          <div>
            <h4 className="text-sm font-medium mb-2">필요한 열 구성:</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">열 이름</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="w-[120px]">예시</TableHead>
                  <TableHead className="w-[60px] text-center">필수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataFormat.columns.map((col, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{col.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {col.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {col.example}
                    </TableCell>
                    <TableCell className="text-center">
                      {col.required ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Sample Data Preview */}
          {sampleData && (
            <div>
              <h4 className="text-sm font-medium mb-2">예시 데이터:</h4>
              {sampleData.description && (
                <p className="text-xs text-muted-foreground mb-2">
                  {sampleData.description}
                </p>
              )}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {sampleData.headers.map((header, index) => (
                        <TableHead key={index} className="text-xs">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleData.rows.slice(0, 5).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="text-sm">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * WideFormatExample - Visual example of Wide format data
 */
function WideFormatExample() {
  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-start gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Wide 형식 (넓은 형식)</p>
          <p className="text-muted-foreground text-xs">
            각 행이 하나의 관측 단위(개체)이고, 측정값이 각각의 열에 배치됩니다.
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">사전점수</TableHead>
              <TableHead className="text-xs">사후점수</TableHead>
              <TableHead className="text-xs">그룹</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>1</TableCell>
              <TableCell>75</TableCell>
              <TableCell>82</TableCell>
              <TableCell>처리군</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>2</TableCell>
              <TableCell>68</TableCell>
              <TableCell>71</TableCell>
              <TableCell>대조군</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>3</TableCell>
              <TableCell>82</TableCell>
              <TableCell>89</TableCell>
              <TableCell>처리군</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        * 대부분의 스프레드시트 소프트웨어에서 기본적으로 사용하는 형식입니다.
      </p>
    </div>
  )
}

/**
 * LongFormatExample - Visual example of Long format data
 */
function LongFormatExample() {
  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-start gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Long 형식 (긴 형식)</p>
          <p className="text-muted-foreground text-xs">
            각 행이 하나의 측정값이고, 측정 시점/조건이 별도의 열로 구분됩니다.
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">시점</TableHead>
              <TableHead className="text-xs">점수</TableHead>
              <TableHead className="text-xs">그룹</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>1</TableCell>
              <TableCell>사전</TableCell>
              <TableCell>75</TableCell>
              <TableCell>처리군</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>1</TableCell>
              <TableCell>사후</TableCell>
              <TableCell>82</TableCell>
              <TableCell>처리군</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>2</TableCell>
              <TableCell>사전</TableCell>
              <TableCell>68</TableCell>
              <TableCell>대조군</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>2</TableCell>
              <TableCell>사후</TableCell>
              <TableCell>71</TableCell>
              <TableCell>대조군</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        * 반복측정, 시계열 분석 등에서 주로 사용하는 형식입니다.
      </p>
    </div>
  )
}

/**
 * DataFormatBadge - Compact badge showing format type
 */
export interface DataFormatBadgeProps {
  type: 'wide' | 'long' | 'both'
  className?: string
}

export function DataFormatBadge({ type, className }: DataFormatBadgeProps) {
  const Icon = type === 'wide' ? Columns3 : type === 'long' ? Rows3 : ArrowRightLeft
  const label = type === 'wide' ? 'Wide' : type === 'long' ? 'Long' : 'Wide/Long'

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}
