'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { getDataFormatGuide, getGenericGuide, type DataFormatGuideInfo } from '@/lib/constants/data-format-guides'
import { validateDataFormat, type FormatValidationResult } from '@/lib/utils/data-format-validator'

interface DataPrepGuideProps {
  /** 통계 방법 ID (예: 't-test', 'anova'). 없으면 범용 가이드 표시 */
  methodId?: string
  /** 직접 가이드 데이터 전달 (methodId 무시) */
  guide?: DataFormatGuideInfo
  /** 접힘 상태로 시작 (기본: false) */
  defaultCollapsed?: boolean
  /** 업로드된 데이터 (있으면 형태 검증 수행) */
  uploadedData?: Record<string, unknown>[]
  /** 추가 className */
  className?: string
}

/**
 * 데이터 준비 안내 컴포넌트 (사용자 친화적)
 *
 * 각 통계 페이지의 데이터 업로드 단계에 표시합니다.
 * "이렇게 엑셀을 만들어주세요" 형태의 직관적 안내를 제공합니다.
 *
 * @example
 * // 방법을 알 때 (빠른 분석)
 * <DataPrepGuide methodId="t-test" />
 * // 방법을 모를 때 (범용 안내)
 * <DataPrepGuide />
 */
export function DataPrepGuide({
  methodId,
  guide: guideProp,
  defaultCollapsed = false,
  uploadedData,
  className = '',
}: DataPrepGuideProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed)

  const guide = guideProp ?? (methodId ? getDataFormatGuide(methodId) : getGenericGuide())
  if (!guide) return null

  // 데이터가 업로드되면 형태 검증 수행 (methodId가 있을 때만)
  const validation: FormatValidationResult | null =
    methodId && uploadedData && uploadedData.length > 0
      ? validateDataFormat(methodId, uploadedData)
      : null

  const handleDownload = () => {
    if (!guide.exampleFile) return
    const link = document.createElement('a')
    link.href = `/example-data/${guide.exampleFile}`
    link.download = guide.exampleFile
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card data-testid="data-prep-guide" className={`border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 ${className}`}>
      <CardContent className="p-4">
        {/* 헤더 (항상 표시) */}
        <button
          type="button"
          data-testid="data-prep-guide-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              데이터 준비 방법
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 truncate">
              {guide.summary}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-blue-400 flex-shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-400 flex-shrink-0 ml-2" />
          )}
        </button>

        {/* 상세 내용 (펼쳤을 때) */}
        {isExpanded && (
          <div data-testid="data-prep-guide-content" className="mt-3 space-y-3">
            {/* 엑셀 정리 방법 */}
            <div className="space-y-1.5">
              {guide.instructions.map((instruction, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <span className="text-blue-400 font-medium mt-px flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>

            {/* 예시 미리보기 테이블 */}
            <div className="rounded-md border border-blue-200 dark:border-blue-700 overflow-hidden">
              <div className="px-3 py-1.5 bg-blue-100/60 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-700">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  이렇게 만들어 주세요
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      {guide.example.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-3 py-1.5 text-left font-semibold text-blue-900 dark:text-blue-100 border-b border-blue-200 dark:border-blue-700 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guide.example.rows.slice(0, 4).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={
                          rowIdx % 2 === 0
                            ? 'bg-white dark:bg-gray-900'
                            : 'bg-blue-50/40 dark:bg-blue-900/10'
                        }
                      >
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-3 py-1 text-blue-800 dark:text-blue-200 border-b border-blue-100 dark:border-blue-800 whitespace-nowrap"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* "..." 행 표시 */}
                    <tr className="bg-white dark:bg-gray-900">
                      {guide.example.headers.map((_, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-3 py-0.5 text-blue-400 text-center text-xs"
                        >
                          ...
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 주의사항 */}
            {guide.warnings && guide.warnings.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  {guide.warnings.map((warning, i) => (
                    <span key={i} className="block">{warning}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 하단 영역 */}
            <div className="flex items-center justify-between">
              {guide.exampleFile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs h-7 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  예시 CSV 다운로드
                </Button>
              ) : (
                <div />
              )}
              {guide.spssMenu && (
                <span className="text-[10px] text-blue-400 dark:text-blue-500">
                  SPSS: {guide.spssMenu}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 데이터 형태 검증 결과 (업로드 후 표시) */}
        {validation && (
          <div className="mt-3">
            {validation.isCompatible ? (
              <div data-testid="data-prep-validation-ok" className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-md border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  데이터 형태가 적합합니다 (열 {validation.detected.totalColumns}개, 행 {validation.detected.rowCount}개)
                </span>
              </div>
            ) : (
              <div data-testid="data-prep-validation-warn" className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-200 dark:border-red-800">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium block mb-1">데이터 형태 확인이 필요합니다</span>
                  {validation.warnings.map((warning, i) => (
                    <span key={i} className="block">{warning}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}