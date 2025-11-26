/**
 * DataProfileSummary - 데이터 프로필 요약 카드
 *
 * 사용처:
 * 1. Smart Flow: Step 2 상단 (데이터 검토 결과)
 * 2. 개별 통계 페이지: 데이터 적합도 확인
 *
 * 특징:
 * - 상태별 표시 (성공/경고/오류)
 * - 가정 검정 결과 요약
 * - 에러/경고 메시지 표시
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export interface DataProfileSummaryProps {
  /** 표본 크기 */
  sampleSize: number
  /** 수치형 변수 수 */
  numericVars: number
  /** 범주형 변수 수 */
  categoricalVars: number
  /** 결측치 수 (옵션) */
  missingValues?: number
  /** 총 셀 수 (옵션, 결측률 계산용) */
  totalCells?: number
  /** 권장 분석 유형 */
  recommendedType?: 'parametric' | 'nonparametric' | null
  /** 검증 상태 */
  status?: 'success' | 'warning' | 'error'
  /** 오류 메시지 목록 */
  errors?: string[]
  /** 경고 메시지 목록 */
  warnings?: string[]
  /** 가정 검정 요약 */
  assumptionSummary?: {
    normality?: boolean | null  // 정규성: true=충족, false=불충족, null=검정 안함
    homogeneity?: boolean | null  // 등분산성: true=충족, false=불충족, null=검정 안함
    isLoading?: boolean  // 검정 진행 중
  }
  /** 타이틀 (옵션) */
  title?: string
  /** 추가 CSS 클래스 (옵션) */
  className?: string
}

export function DataProfileSummary({
  sampleSize,
  numericVars,
  categoricalVars,
  missingValues = 0,
  totalCells,
  recommendedType,
  status = 'success',
  errors = [],
  warnings = [],
  assumptionSummary,
  title,
  className
}: DataProfileSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 결측률 계산
  const missingRate = totalCells
    ? (missingValues / totalCells) * 100
    : 0

  // 상태별 설정
  const statusConfig = {
    success: {
      icon: CheckCircle,
      title: title || '검토 완료',
      iconColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    warning: {
      icon: AlertTriangle,
      title: title || `검토 완료 (경고 ${warnings.length}개)`,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    error: {
      icon: XCircle,
      title: title || '검토 실패',
      iconColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800'
    }
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon
  const hasMessages = errors.length > 0 || warnings.length > 0

  // 가정 검정 상태 렌더링
  const renderAssumptionBadge = (value: boolean | null | undefined, label: string) => {
    if (value === undefined) return null
    if (value === null) {
      return (
        <span className="text-muted-foreground text-xs">
          {label}: -
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">{label}:</span>
        {value ? (
          <Badge variant="outline" className="text-xs px-1 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            충족
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs px-1 py-0 bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            불충족
          </Badge>
        )}
      </span>
    )
  }

  return (
    <Card className={`animate-in fade-in duration-500 ${config.bgColor} ${config.borderColor} border ${className || ''}`}>
      <CardContent className="py-3">
        {/* 메인 요약 행 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 상태 아이콘 + 타이틀 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
            <span className="text-sm font-semibold">{config.title}</span>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* 표본 크기 */}
          <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
            <span className="text-muted-foreground">표본:</span>
            <span className="font-semibold">{sampleSize}</span>
            <Badge
              variant={sampleSize >= 30 ? 'default' : 'secondary'}
              className="text-xs px-1.5 py-0"
            >
              {sampleSize >= 30 ? '충분' : '소표본'}
            </Badge>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* 변수 */}
          <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
            <span className="text-muted-foreground">변수:</span>
            <span className="font-semibold">수치형 {numericVars}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold">범주형 {categoricalVars}</span>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* 결측치 */}
          <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
            <span className="text-muted-foreground">결측치:</span>
            {missingValues === 0 ? (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                없음
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
                {missingValues}개{totalCells ? ` (${missingRate.toFixed(1)}%)` : ''}
              </Badge>
            )}
          </div>

          {/* 가정 검정 결과 (있을 때만) */}
          {assumptionSummary && (
            <>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center gap-3 text-sm flex-shrink-0">
                {assumptionSummary.isLoading ? (
                  <span className="text-muted-foreground text-xs">가정 검정 중...</span>
                ) : (
                  <>
                    {renderAssumptionBadge(assumptionSummary.normality, '정규성')}
                    {renderAssumptionBadge(assumptionSummary.homogeneity, '등분산')}
                  </>
                )}
              </div>
            </>
          )}

          <div className="h-5 w-px bg-border" />

          {/* 권장 분석 */}
          <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
            <span className="text-muted-foreground">권장:</span>
            <span className="font-semibold">
              {recommendedType === 'parametric'
                ? '모수적'
                : recommendedType === 'nonparametric'
                  ? '비모수적'
                  : '분석 중...'}
            </span>
          </div>

          {/* 에러/경고 토글 버튼 */}
          {hasMessages && (
            <>
              <div className="flex-1" />
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <>
                    <span>접기</span>
                    <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <span>상세보기</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* 에러/경고 메시지 (확장 시) */}
        {hasMessages && isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((error, idx) => (
                  <div key={`error-${idx}`} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
            {warnings.length > 0 && (
              <div className="space-y-1">
                {warnings.map((warning, idx) => (
                  <div key={`warning-${idx}`} className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
