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
  // 데이터 품질 계산
  const missingRate = totalCells
    ? (missingValues / totalCells) * 100
    : 0

  const qualityLabel =
    missingValues === 0
      ? '완벽'
      : missingRate < 5
        ? '양호'
        : '주의'

  return (
    <Card className={`animate-in fade-in duration-500 ${className || ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 표본 크기 */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">표본 크기</p>
            <p className="text-lg font-semibold">{sampleSize}</p>
            <Badge
              variant={sampleSize >= 30 ? 'default' : 'secondary'}
              className="mt-1"
            >
              {sampleSize >= 30 ? '충분' : '소표본'}
            </Badge>
          </div>

          {/* 변수 */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">변수</p>
            <p className="text-sm font-semibold">
              수치형 {numericVars}개
            </p>
            <p className="text-xs text-muted-foreground">
              범주형 {categoricalVars}개
            </p>
          </div>

          {/* 데이터 품질 */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">데이터 품질</p>
            <p className="text-lg font-semibold">{qualityLabel}</p>
            <p className="text-xs text-muted-foreground">
              결측 {missingValues}개
              {totalCells && ` (${missingRate.toFixed(1)}%)`}
            </p>
          </div>

          {/* 권장 분석 */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">권장 분석</p>
            <p className="text-sm font-semibold">
              {recommendedType === 'parametric'
                ? '모수적'
                : recommendedType === 'nonparametric'
                  ? '비모수적'
                  : '분석 중...'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
