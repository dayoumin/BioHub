/**
 * DataProfileSummary - 데이터 프로필 요약 카드
 *
 * 사용처:
 * 1. Smart Flow: Step 3 상단 (Step 2 결과 연계)
 * 2. 개별 통계 페이지: 데이터 적합도 확인
 * 3. 기타: 데이터 요약 정보 표시
 *
 * 특징:
 * - 4개 메트릭 (표본 크기, 변수, 데이터 품질, 권장 분석)
 * - 그리드 레이아웃 (2x2 → 4x1)
 * - 완전한 타입 안전성
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

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
  /** 권장 분석 유형 (옵션: '모수적' | '비모수적') */
  recommendedType?: 'parametric' | 'nonparametric' | null
  /** 타이틀 (옵션, 기본값: "데이터 검증 완료") */
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
  title = '데이터 검증 완료',
  className
}: DataProfileSummaryProps) {
  // 결측률 계산
  const missingRate = totalCells
    ? (missingValues / totalCells) * 100
    : 0

  return (
    <Card className={`animate-in fade-in duration-500 ${className || ''}`}>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold">{title}</span>
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
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                결측치 없음
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                결측치 {missingValues}개{totalCells ? ` (${missingRate.toFixed(1)}%)` : ''}
              </Badge>
            )}
          </div>
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
        </div>
      </CardContent>
    </Card>
  )
}
