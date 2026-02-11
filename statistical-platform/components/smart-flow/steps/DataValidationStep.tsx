'use client'

import { memo, useMemo, useEffect, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react'
import { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useTerminology } from '@/hooks/use-terminology'
import { logger } from '@/lib/utils/logger'

// Type guard for ValidationResults with columnStats
function hasColumnStats(results: ValidationResults | null): results is ValidationResults & { columnStats: ColumnStatistics[] } {
  return results !== null && 'columnStats' in results && Array.isArray(results.columnStats)
}

export const DataValidationStep = memo(function DataValidationStep({
  validationResults,
  data,
  onNext
}: DataValidationStepProps) {
  // Store에서 상태 관리
  const {
    uploadedFile,
    uploadedFileName,
    setDataCharacteristics,
    setAssumptionResults
  } = useSmartFlowStore()

  const t = useTerminology()

  // 가정 검정은 Step 2 (DataExplorationStep)에서 수행

  // 중복 클릭 방지
  const [isNavigating, setIsNavigating] = useState(false)

  // Type-safe column stats extraction
  const columnStats = useMemo(() =>
    hasColumnStats(validationResults) ? validationResults.columnStats : undefined,
    [validationResults]
  )

  // Memoize numeric/categorical columns
  // ID로 감지된 열은 분석 추천에서 제외
  const numericColumns = useMemo(() =>
    columnStats?.filter(s => s.type === 'numeric' && !s.idDetection?.isId) || [],
    [columnStats]
  )

  // ID로 감지된 열은 분석 추천에서 제외
  const categoricalColumns = useMemo(() =>
    // Bug #2 Fix (Revised): 범주형 또는 고유값이 적은 숫자형 열 포함
    // - 명시적 categorical 타입
    // - 또는 고유값 <= 20인 numeric 타입 (숫자 인코딩된 범주형: 0/1, 1/2/3 등)
    // - ID로 감지된 열은 제외
    columnStats?.filter(s =>
      !s.idDetection?.isId && (
        s.type === 'categorical' ||
        (s.type === 'numeric' && s.uniqueValues <= 20)
      )
    ) || [],
    [columnStats]
  )

  // 분석 추천 로직
  const recommendedAnalyses = useMemo(() => {
    const analyses: Array<{ emoji: string; text: string }> = []

    // 실질적 연속형 변수 판단: uniqueValues가 전체 행의 5% 이상인 숫자형만
    const continuousColumns = numericColumns.filter(col => {
      const uniqueRatio = col.uniqueValues / (validationResults?.totalRows || 1)
      return uniqueRatio >= 0.05 // 5% 미만이면 코드형/ID형으로 간주
    })

    // 그룹 비교 (범주형 1개 + 연속형 1개)
    // 범주형 컬럼 중 실제 그룹이 2개 이상인 것만 검사
    if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
      const validGroupColumns = categoricalColumns.filter(
        col => col.uniqueValues && col.uniqueValues >= 2
      )
      if (validGroupColumns.length > 0) {
        // 2집단 가능 여부 검사 (모든 범주형 컬럼 고려)
        const has2Groups = validGroupColumns.some(col => col.uniqueValues === 2)

        // 다집단 가능 여부 검사 (모든 범주형 컬럼 고려)
        const hasMultipleGroups = validGroupColumns.some(col => col.uniqueValues >= 3)

        if (has2Groups) {
          analyses.push({
            emoji: '⚖️',
            text: t.dataValidation.recommendations.twoGroupComparison
          })
        }

        if (hasMultipleGroups) {
          analyses.push({
            emoji: '📈',
            text: t.dataValidation.recommendations.multiGroupComparison
          })
        }
      }
    }

    // 상관분석 (실질적 연속형 2개 이상)
    if (continuousColumns.length >= 2) {
      analyses.push({
        emoji: '🔗',
        text: t.dataValidation.recommendations.correlation
      })
    }

    // 회귀분석 (실질적 연속형 2개 이상)
    if (continuousColumns.length >= 2) {
      analyses.push({
        emoji: '📉',
        text: t.dataValidation.recommendations.regression
      })
    }

    // 카이제곱 (범주형 2개, 각각 수준 2개 이상)
    const validCategoricalForChiSquare = categoricalColumns.filter(
      col => col.uniqueValues && col.uniqueValues >= 2
    )
    if (validCategoricalForChiSquare.length >= 2) {
      analyses.push({
        emoji: '🎲',
        text: t.dataValidation.recommendations.chiSquare
      })
    }

    return analyses
  }, [numericColumns, categoricalColumns, validationResults?.totalRows, t])

  // 기본 데이터 특성 저장
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

    logger.info('Basic data characteristics saved (fast validation)', { characteristics })
  }, [data, validationResults, categoricalColumns, setDataCharacteristics])

  // 가정 검정은 Step 2 (DataExplorationStep)으로 이동됨 (2025-11-24)

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
        <p className="text-muted-foreground">{t.dataValidation.status.dataRequired}</p>
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
              <CheckCircle2 className="w-6 h-6 text-success" />
            )}
            <span>
              {hasErrors ? t.dataValidation.status.failed :
               hasWarnings ? t.dataValidation.status.warningComplete :
               t.dataValidation.status.readyComplete}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 표본 크기 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">{t.dataValidation.labels.sampleSize}</p>
              <p className="text-2xl font-bold">{validationResults.totalRows}</p>
              <Badge variant="outline" className="mt-1">
                {validationResults.totalRows >= 30 ? t.dataValidation.badges.largeSample : t.dataValidation.badges.smallSample}
              </Badge>
            </div>

            {/* 변수 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">{t.dataValidation.labels.analyzableVariables}</p>
              <p className="text-lg font-semibold">
                {t.dataValidation.labels.numeric} {numericColumns.length}{t.dataValidation.units.count}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.dataValidation.labels.categorical} {categoricalColumns.length}{t.dataValidation.units.count}
              </p>
              {columnStats?.some(s => s.idDetection?.isId) && (
                <p className="text-xs text-amber-600 mt-1">
                  {t.dataValidation.idDetection.label} {columnStats.filter(s => s.idDetection?.isId).length}{t.dataValidation.units.count}
                </p>
              )}
            </div>

            {/* 데이터 품질 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">{t.dataValidation.labels.dataQuality}</p>
              <p className="text-2xl font-bold">
                {validationResults.missingValues === 0 ? t.dataValidation.quality.perfect :
                 validationResults.missingValues < validationResults.totalRows * 0.05 ? t.dataValidation.quality.good : t.dataValidation.quality.caution}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.dataValidation.labels.missing} {validationResults.missingValues}{t.dataValidation.units.count} ({((validationResults.missingValues / (validationResults.totalRows * validationResults.columnCount)) * 100).toFixed(1)}%)
              </p>
            </div>

            {/* 파일 정보 */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">{t.dataValidation.labels.uploadedFile}</p>
              <p className="text-sm font-medium truncate" title={uploadedFile?.name || uploadedFileName || ''}>
                {uploadedFile?.name || uploadedFileName || t.dataValidation.fallback.noFileName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.dataValidation.labels.columnsCount(validationResults.columnCount)}
              </p>
            </div>
          </div>

          {/* 에러/경고 메시지 */}
          {(hasErrors || hasWarnings) && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium mb-2">{t.dataValidation.sections.needsAttention}</p>
              <ul className="text-sm space-y-1">
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

      {/* 경고 메시지 (버튼은 상단으로 이동) */}
      {hasWarnings && !hasErrors && (
        <div className="text-xs text-warning text-center bg-warning-bg border border-warning-border rounded-lg p-2">
          {t.dataValidation.warnings.canContinue}
        </div>
      )}

      {/* 분석 추천 카드 */}
      {!hasErrors && recommendedAnalyses.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base">{t.dataValidation.recommendations.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendedAnalyses.map((analysis, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span>{analysis.emoji}</span>
                  <span>{analysis.text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {t.dataValidation.recommendations.hint}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 데이터 분포 시각화 및 가정 검증은 Step 2 (데이터 탐색)에서 수행됨 */}

      {/* 변수 요약 테이블 */}
      {!hasErrors && hasColumnStats(validationResults) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dataValidation.sections.variableSummary}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">{t.dataValidation.table.variableName}</th>
                    <th className="text-center p-2 font-medium">{t.dataValidation.table.type}</th>
                    <th className="text-center p-2 font-medium">{t.dataValidation.table.uniqueValues}</th>
                    <th className="text-center p-2 font-medium">{t.dataValidation.table.missing}</th>
                    <th className="text-center p-2 font-medium">{t.dataValidation.table.excluded}</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.columnStats?.slice(0, 10).map((col: ColumnStatistics) => (
                    <tr key={col.name} className={`border-b hover:bg-muted/30 ${col.idDetection?.isId ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                      <td className="p-2 font-medium">
                        {col.name}
                        {col.idDetection?.isId && (
                          <span className="ml-2 text-xs text-amber-600" title={col.idDetection.reason}>
                            🔑
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={col.type === 'numeric' ? 'default' : 'secondary'}>
                          {col.type === 'numeric' ? t.dataValidation.badges.numeric : t.dataValidation.badges.categorical}
                        </Badge>
                      </td>
                      <td className="p-2 text-center text-muted-foreground">{col.uniqueValues}</td>
                      <td className="p-2 text-center text-muted-foreground">{col.missingCount}</td>
                      <td className="p-2 text-center">
                        {col.idDetection?.isId ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            {t.dataValidation.badges.idSequential}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validationResults.columnStats && validationResults.columnStats.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {t.dataValidation.labels.otherVariables(validationResults.columnStats.length - 10)}
                </p>
              )}
              {/* ID/일련번호 감지 안내 */}
              {validationResults.columnStats?.some(col => col.idDetection?.isId) && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                  <span className="font-medium text-amber-700 dark:text-amber-400">{t.dataValidation.idDetection.heading}</span>
                  <span className="text-amber-600 dark:text-amber-500 ml-1">
                    {t.dataValidation.idDetection.explanation}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
})