'use client'

import { memo, useMemo, useEffect, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Sparkles } from 'lucide-react'
import { ValidationResults, ColumnStatistics, DataRow } from '@/types/smart-flow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'

// Type guard for ValidationResults with columnStats
function hasColumnStats(results: ValidationResults | null): results is ValidationResults & { columnStats: ColumnStatistics[] } {
  return results !== null && 'columnStats' in results && Array.isArray(results.columnStats)
}

export const DataValidationStep = memo(function DataValidationStep({
  validationResults,
  data,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  currentStep,
  totalSteps
}: DataValidationStepProps) {
  // Store에서 상태 관리
  const {
    uploadedFile,
    uploadedFileName,
    setDataCharacteristics,
    setAssumptionResults
  } = useSmartFlowStore()

  // 중복 클릭 방지
  const [isNavigating, setIsNavigating] = useState(false)

  // Type-safe column stats extraction
  const columnStats = useMemo(() =>
    hasColumnStats(validationResults) ? validationResults.columnStats : undefined,
    [validationResults]
  )

  // Memoize numeric/categorical columns
  const numericColumns = useMemo(() =>
    columnStats?.filter(s => s.type === 'numeric') || [],
    [columnStats]
  )

  const categoricalColumns = useMemo(() =>
    // Bug #2 Fix (Revised): 범주형 또는 고유값이 적은 숫자형 열 포함
    // - 명시적 categorical 타입
    // - 또는 고유값 <= 20인 numeric 타입 (숫자 인코딩된 범주형: 0/1, 1/2/3 등)
    columnStats?.filter(s =>
      s.type === 'categorical' ||
      (s.type === 'numeric' && s.uniqueValues <= 20)
    ) || [],
    [columnStats]
  )

  // 기본 데이터 특성 저장 (가정 검정은 Step 5에서 수행)
  useEffect(() => {
    if (!data || !validationResults) {
      return
    }

    // 간단한 데이터 특성만 저장 (무거운 통계 계산 없음)
    const characteristics = {
      sampleSize: data.length,
      structure: 'wide' as const,
      studyDesign: 'cross-sectional' as const,
      columns: [],
      groupCount: categoricalColumns.length > 0 ? 2 : 1,
      hasTimeComponent: false,
      hasPairedData: false,
      hasRepeatedMeasures: false,
      recommendations: []
    }
    setDataCharacteristics(characteristics)

    // 가정 검정은 Step 5 (AnalysisExecutionStep)에서 수행
    setAssumptionResults(null)

    logger.info('Basic data characteristics saved (fast validation)', { characteristics })
  }, [data, validationResults, categoricalColumns, setDataCharacteristics, setAssumptionResults])

  // 다음 단계로 이동 (중복 클릭 방지 + 에러 복구)
  const handleNext = useCallback(() => {
    if (isNavigating || !onNext) return

    setIsNavigating(true)
    try {
      onNext()
      // ✅ 정상 케이스: goToNextStep()은 동기 함수로 즉시 currentStep 변경
      // → 컴포넌트 언마운트 → React가 자동으로 상태 정리
    } catch (error) {
      // ⚠️ 엣지 케이스: onNext() 호출 실패 시 (미래의 검증 로직 추가 등)
      // → 컴포넌트가 언마운트되지 않으므로 isNavigating 수동 리셋 필요
      logger.error('Navigation failed', { error })
      setIsNavigating(false)
    }
  }, [isNavigating, onNext])

  // ✅ Cleanup: 컴포넌트 언마운트 시 상태 리셋 (추가 안전장치)
  useEffect(() => {
    return () => {
      // 정상 네비게이션 시에는 이미 언마운트되어 실행 안 됨
      // 비정상 케이스에서만 실행됨 (메모리 누수 방지)
      setIsNavigating(false)
    }
  }, [])

  if (!validationResults || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">데이터를 먼저 업로드해주세요.</p>
      </div>
    )
  }

  const hasErrors = (validationResults.errors?.length || 0) > 0
  const hasWarnings = (validationResults.warnings?.length || 0) > 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 검증 요약 카드 */}
      <Card className={`border-2 ${
        hasErrors ? 'border-error-border bg-error-bg' :
        hasWarnings ? 'border-warning-border bg-warning-bg' :
        'border-success-border bg-success-bg'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasErrors ? (
              <XCircle className="w-6 h-6 text-error" />
            ) : hasWarnings ? (
              <AlertTriangle className="w-6 h-6 text-warning" />
            ) : (
              <CheckCircle className="w-6 h-6 text-success" />
            )}
            <span>
              {hasErrors ? '데이터 검증 실패' :
               hasWarnings ? '데이터 검증 완료 (경고 있음)' :
               '데이터 준비 완료'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 표본 크기 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">표본 크기</p>
              <p className="text-2xl font-bold">{validationResults.totalRows}</p>
              <Badge variant={validationResults.totalRows >= 30 ? "default" : "secondary"} className="mt-1">
                {validationResults.totalRows >= 30 ? '충분' : '소표본'}
              </Badge>
            </div>

            {/* 변수 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">분석 가능 변수</p>
              <p className="text-lg font-semibold">
                수치형 {numericColumns.length}개
              </p>
              <p className="text-sm text-muted-foreground">
                범주형 {categoricalColumns.length}개
              </p>
            </div>

            {/* 데이터 품질 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">데이터 품질</p>
              <p className="text-2xl font-bold">
                {validationResults.missingValues === 0 ? '완벽' :
                 validationResults.missingValues < validationResults.totalRows * 0.05 ? '양호' : '주의'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                결측 {validationResults.missingValues}개 ({((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%)
              </p>
            </div>

            {/* 파일 정보 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">업로드 파일</p>
              <p className="text-sm font-medium truncate" title={uploadedFile?.name || uploadedFileName || ''}>
                {uploadedFile?.name || uploadedFileName || '파일명 없음'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {validationResults.columnCount}개 컬럼
              </p>
            </div>
          </div>

          {/* 에러/경고 메시지 */}
          {(hasErrors || hasWarnings) && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium mb-2">확인 필요 사항</p>
              <ul className="text-xs space-y-1">
                {validationResults.errors?.map((error: string, idx: number) => (
                  <li key={`error-${idx}`} className="text-error">• {error}</li>
                ))}
                {validationResults.warnings?.map((warning: string, idx: number) => (
                  <li key={`warning-${idx}`} className="text-warning">• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 다음 단계 안내 메시지 */}
      {!hasErrors && onNext && (
        <GuidanceCard
          title="데이터 준비 완료!"
          description={
            <>
              총 <strong>{validationResults.totalRows.toLocaleString()}개</strong> 데이터, <strong>{validationResults.columnCount}개</strong> 변수가 분석 준비되었습니다.
            </>
          }
          steps={[
            { emoji: '1️⃣', text: '분석 목적 선택 (그룹 비교, 관계 분석 등)' },
            { emoji: '2️⃣', text: 'AI가 데이터를 분석하여 최적의 통계 방법 추천' },
            { emoji: '3️⃣', text: '변수 선택 후 자동 분석 실행' }
          ]}
          ctaText="분석 목적 선택하기"
          ctaIcon={<Sparkles className="w-4 h-4" />}
          onCtaClick={handleNext}
          ctaDisabled={isNavigating}
          warningMessage={hasWarnings ? '경고 사항이 있지만 분석을 계속할 수 있습니다' : undefined}
          data-testid="step2-guidance-card"
        />
      )}

      {/* 데이터 미리보기 */}
      <DataPreviewTable
        data={data}
        maxRows={100}
        defaultOpen={false}
        title="원본 데이터 확인"
        height="400px"
      />
    </div>
  )
})
