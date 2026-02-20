'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Info, Database, Settings2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatisticalMethodRequirements } from '@/lib/statistics/variable-requirements'

export interface AnalysisGuidePanelProps {
  /** Method metadata from variable-requirements.ts */
  method: StatisticalMethodRequirements
  /** Which sections to show */
  sections?: ('variables' | 'assumptions' | 'dataFormat' | 'sampleData')[]
  /** Default expanded sections */
  defaultExpanded?: string[]
  /** Custom class name */
  className?: string
  /** Compact mode for sidebar */
  compact?: boolean
}

/**
 * AnalysisGuidePanel - Comprehensive analysis guide component
 *
 * Displays variable requirements, assumptions, data format guide, and sample data
 * in an accordion-style collapsible panel.
 *
 * @example
 * const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'two-sample-t')
 * <AnalysisGuidePanel method={method} />
 */
export function AnalysisGuidePanel({
  method,
  sections = ['variables', 'assumptions', 'dataFormat', 'sampleData'],
  defaultExpanded = ['variables'],
  className,
  compact = false
}: AnalysisGuidePanelProps) {
  const showVariables = sections.includes('variables')
  const showAssumptions = sections.includes('assumptions')
  const showDataFormat = sections.includes('dataFormat') && method.dataFormat
  const showSampleData = sections.includes('sampleData') && method.sampleData

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className={cn(compact ? 'p-4 pb-2' : 'pb-2')}>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <CardTitle className={cn(compact ? 'text-base' : 'text-lg')}>
            {method.name} 분석 가이드
          </CardTitle>
        </div>
        <CardDescription className="text-sm">
          {method.description}
        </CardDescription>
      </CardHeader>

      <CardContent className={cn(compact ? 'p-4 pt-0' : 'pt-0')}>
        <Accordion
          type="multiple"
          defaultValue={defaultExpanded}
          className="w-full"
        >
          {/* Variables Section */}
          {showVariables && (
            <AccordionItem value="variables">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  변수 요구사항
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {method.variables.map((variable, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={variable.required ? 'default' : 'outline'}>
                          {variable.label}
                        </Badge>
                        {variable.required && (
                          <span className="text-xs text-destructive">*필수</span>
                        )}
                        {variable.multiple && (
                          <Badge variant="secondary" className="text-xs">
                            다중 선택
                            {variable.minCount && variable.maxCount && (
                              <span className="ml-1">
                                ({variable.minCount}-{variable.maxCount}개)
                              </span>
                            )}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {variable.description}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">허용 타입:</span>
                        {variable.types.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {getTypeLabel(type)}
                          </Badge>
                        ))}
                      </div>

                      {variable.example && (
                        <div className="text-xs bg-muted/50 rounded p-2">
                          <span className="font-medium">예시:</span> {variable.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Assumptions Section */}
          {showAssumptions && method.assumptions.length > 0 && (
            <AccordionItem value="assumptions">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  분석 가정
                  <Badge variant="secondary" className="text-xs">
                    {method.assumptions.length}개
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {method.assumptions.map((assumption, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
                {method.notes && method.notes.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">참고사항:</p>
                    <ul className="space-y-1">
                      {method.notes.map((note, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Data Format Section */}
          {showDataFormat && method.dataFormat && (
            <AccordionItem value="dataFormat">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  데이터 형식
                  <Badge variant="outline" className="text-xs">
                    {getFormatLabel(method.dataFormat.type)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {method.dataFormat.description}
                  </p>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">열 이름</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead className="w-[120px]">예시</TableHead>
                        <TableHead className="w-[60px]">필수</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {method.dataFormat.columns.map((col, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{col.name}</TableCell>
                          <TableCell className="text-muted-foreground">{col.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{col.example}</TableCell>
                          <TableCell>
                            {col.required ? (
                              <Badge variant="default" className="text-xs">필수</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">선택</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Sample Data Section */}
          {showSampleData && method.sampleData && (
            <AccordionItem value="sampleData">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  예시 데이터
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {method.sampleData.description && (
                    <p className="text-sm text-muted-foreground">
                      {method.sampleData.description}
                    </p>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {method.sampleData.headers.map((header, index) => (
                            <TableHead key={index}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {method.sampleData.rows.slice(0, 5).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {method.sampleData.rows.length > 5 && (
                          <TableRow>
                            <TableCell
                              colSpan={method.sampleData.headers.length}
                              className="text-center text-xs text-muted-foreground"
                            >
                              ... 외 {method.sampleData.rows.length - 5}개 행
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}

// Helper functions
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    continuous: '연속형',
    categorical: '범주형',
    binary: '이진형',
    ordinal: '순서형',
    count: '빈도형',
    datetime: '날짜/시간',
    numeric: '숫자형'
  }
  return labels[type] || type
}

function getFormatLabel(type: 'wide' | 'long' | 'both'): string {
  const labels: Record<string, string> = {
    wide: 'Wide 형식',
    long: 'Long 형식',
    both: 'Wide/Long 모두 가능'
  }
  return labels[type] || type
}
