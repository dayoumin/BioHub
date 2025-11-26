import React from 'react'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Database, Variable, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ResultContextHeaderProps {
  /** 분석 유형 (예: "독립표본 t-검정") */
  analysisType: string
  /** 분석 부제목 (예: "Independent Samples t-test") */
  analysisSubtitle?: string
  /** 데이터 파일명 */
  fileName?: string
  /** 사용된 변수 목록 */
  variables?: string[]
  /** 표본 크기 */
  sampleSize?: number
  /** 분석 시간 */
  timestamp?: Date
  /** 추가 클래스명 */
  className?: string
}

/**
 * 분석 결과 페이지 상단에 표시되는 컨텍스트 헤더
 * 데이터 출처, 변수, 표본크기 등 분석 맥락 정보 제공
 */
export function ResultContextHeader({
  analysisType,
  analysisSubtitle,
  fileName,
  variables,
  sampleSize,
  timestamp,
  className
}: ResultContextHeaderProps) {
  return (
    <div className={cn('p-4 bg-muted/30 rounded-lg border', className)}>
      <div className="flex flex-col gap-3">
        {/* 분석 유형 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{analysisType}</h2>
            {analysisSubtitle && (
              <p className="text-sm text-muted-foreground">{analysisSubtitle}</p>
            )}
          </div>
          {timestamp && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {timestamp.toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>

        {/* 메타 정보 */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {fileName && (
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{fileName}</span>
            </div>
          )}

          {sampleSize !== undefined && (
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">N = {sampleSize.toLocaleString()}</span>
            </div>
          )}

          {variables && variables.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Variable className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {variables.map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
