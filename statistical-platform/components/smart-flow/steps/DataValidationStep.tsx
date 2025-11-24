'use client'

import { memo, useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Sparkles, ExternalLink } from 'lucide-react'
import { ValidationResults, ColumnStatistics, StatisticalAssumptions } from '@/types/smart-flow'
import { usePyodide } from '@/components/providers/PyodideProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { GuidanceCard } from '@/components/common/analysis/GuidanceCard'
import { Histogram } from '@/components/charts/histogram'
import { BoxPlot } from '@/components/charts/boxplot'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'

// HTML escape 함수 - XSS 공격 방지
function escapeHtml(text: string | number | null | undefined): string {
  if (text == null) return ''
  const str = String(text)
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return str.replace(/[&<>"']/g, m => map[m])
}

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

  // 가정 검정은 Step 2 (DataExplorationStep)에서 수행

  // 중복 클릭 방지
  const [isNavigating, setIsNavigating] = useState(false)

  // 새 창으로 데이터 보기
  const handleOpenDataInNewWindow = useCallback(() => {
    if (!data || data.length === 0) return

    // 데이터를 HTML 테이블로 변환
    const columns = Object.keys(data[0])
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>전체 데이터 - ${uploadedFile?.name || uploadedFileName || '데이터'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 20px;
    }
    .header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e5e5;
    }
    h1 {
      font-size: 24px;
      color: #333;
      margin-bottom: 8px;
    }
    .info {
      color: #666;
      font-size: 14px;
    }
    .table-wrapper {
      overflow: auto;
      max-height: calc(100vh - 140px);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      position: sticky;
      top: 0;
      background: #f8f9fa;
      color: #333;
      font-weight: 600;
      padding: 12px 8px;
      text-align: left;
      border-bottom: 2px solid #dee2e6;
      z-index: 10;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e9ecef;
      color: #495057;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .row-number {
      background: #f1f3f5;
      font-weight: 500;
      color: #868e96;
      text-align: center;
      width: 60px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(uploadedFile?.name || uploadedFileName || '업로드된 데이터')}</h1>
      <div class="info">
        총 ${validationResults.totalRows.toLocaleString()}행 × ${validationResults.columnCount}개 변수
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="row-number">#</th>
            ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, idx) => `
            <tr>
              <td class="row-number">${idx + 1}</td>
              ${columns.map(col => `<td>${escapeHtml(row[col])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
    `

    // 새 창 열기
    const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    if (newWindow) {
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    }
  }, [data, uploadedFile, uploadedFileName, validationResults?.totalRows, validationResults?.columnCount])

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
            text: '2집단 비교 (t-검정, Mann-Whitney)'
          })
        }

        if (hasMultipleGroups) {
          analyses.push({
            emoji: '📈',
            text: '다집단 비교 (ANOVA, Kruskal-Wallis)'
          })
        }
      }
    }

    // 상관분석 (실질적 연속형 2개 이상)
    if (continuousColumns.length >= 2) {
      analyses.push({
        emoji: '🔗',
        text: '상관분석 (Pearson, Spearman)'
      })
    }

    // 회귀분석 (실질적 연속형 2개 이상)
    if (continuousColumns.length >= 2) {
      analyses.push({
        emoji: '📉',
        text: '회귀분석 (예측 모델)'
      })
    }

    // 카이제곱 (범주형 2개, 각각 수준 2개 이상)
    const validCategoricalForChiSquare = categoricalColumns.filter(
      col => col.uniqueValues && col.uniqueValues >= 2
    )
    if (validCategoricalForChiSquare.length >= 2) {
      analyses.push({
        emoji: '🎲',
        text: '카이제곱 검정 (범주형 연관성)'
      })
    }

    return analyses
  }, [numericColumns, categoricalColumns, validationResults?.totalRows])

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
        <p className="text-muted-foreground">데이터를 먼저 업로드해주세요.</p>
      </div>
    )
  }

  const hasErrors = (validationResults.errors?.length || 0) > 0
  const hasWarnings = (validationResults.warnings?.length || 0) > 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 파일명 최상단 표시 */}
      {uploadedFile || uploadedFileName ? (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="font-normal">
              현재 파일
            </Badge>
            <span className="font-medium truncate" title={uploadedFile?.name || uploadedFileName || ''}>
              {uploadedFile?.name || uploadedFileName}
            </span>
            <span className="text-muted-foreground">
              ({validationResults.totalRows.toLocaleString()}행 × {validationResults.columnCount}열)
            </span>
          </div>
        </div>
      ) : null}


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
              <Badge variant="outline" className="mt-1">
                {validationResults.totalRows >= 30 ? '대표본' : '소표본'}
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

      {/* 다음 단계 버튼 */}
      {!hasErrors && onNext && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleNext}
              disabled={isNavigating}
              className="w-full"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              데이터 탐색하기
            </Button>
            {hasWarnings && (
              <p className="text-xs text-warning mt-2 text-center">
                ⚠ 경고 사항이 있지만 분석을 계속할 수 있습니다
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 분석 추천 카드 */}
      {!hasErrors && recommendedAnalyses.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base">💡 이 데이터로 할 수 있는 분석</CardTitle>
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
              💡 다음 단계에서 분석 목적을 선택하면 AI가 최적의 방법을 추천합니다.
            </p>
          </CardContent>
        </Card>
      )}


      {/* 데이터 시각화 카드 */}
      {!hasErrors && hasColumnStats(validationResults) && (
        <Card className="border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20">
          <CardHeader>
            <CardTitle className="text-base">📊 데이터 분포 시각화</CardTitle>
            <p className="text-sm text-muted-foreground">
              변수를 선택하기 전에 데이터 분포를 확인하세요
            </p>
          </CardHeader>
          <CardContent>
            {validationResults.columnStats && validationResults.columnStats.filter(col => col.type === 'numeric').length > 0 ? (
              <Tabs defaultValue={validationResults.columnStats.filter(col => col.type === 'numeric')[0]?.name} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {validationResults.columnStats
                    .filter(col => col.type === 'numeric')
                    .slice(0, 3)
                    .map(col => (
                      <TabsTrigger key={col.name} value={col.name}>
                        {col.name}
                      </TabsTrigger>
                    ))}
                </TabsList>

                {validationResults.columnStats
                  .filter(col => col.type === 'numeric')
                  .slice(0, 3)
                  .map(col => {
                    const colData = data
                      .map(row => row[col.name])
                      .filter(v => v !== null && v !== undefined && v !== '')
                      .map(Number)
                      .filter(v => !isNaN(v))

                    // 사분위수 계산
                    const sortedData = [...colData].sort((a, b) => a - b)
                    const q1Index = Math.floor(sortedData.length * 0.25)
                    const q3Index = Math.floor(sortedData.length * 0.75)
                    const medianIndex = Math.floor(sortedData.length * 0.5)
                    const q1 = sortedData[q1Index] || 0
                    const q3 = sortedData[q3Index] || 0
                    const median = sortedData[medianIndex] || 0
                    const iqr = q3 - q1

                    // 이상치 계산
                    const lowerBound = q1 - 1.5 * iqr
                    const upperBound = q3 + 1.5 * iqr
                    const outliers = colData.filter(v => v < lowerBound || v > upperBound)

                    return (
                      <TabsContent key={col.name} value={col.name} className="space-y-4 mt-4">
                        {/* Histogram - 분포 확인 */}
                        <Histogram
                          data={colData}
                          title={`${col.name} 분포`}
                          xAxisLabel={col.name}
                          yAxisLabel="빈도"
                          bins={10}
                        />

                        {/* BoxPlot - 사분위수 시각화 */}
                        <BoxPlot
                          data={[
                            {
                              name: col.name,
                              min: Math.min(...colData),
                              q1: q1,
                              median: median,
                              q3: q3,
                              max: Math.max(...colData),
                              mean: col.mean || 0,
                              std: col.std || 0,
                              outliers: outliers
                            }
                          ]}
                          title={`${col.name} 박스플롯`}
                          showMean={true}
                          showOutliers={true}
                          showStatistics={false}
                          height={300}
                        />

                        {/* 사분위수 & 이상치 정보 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-xs bg-info-bg border border-info-border p-3 rounded-lg">
                            <p className="font-medium mb-2">📊 사분위수</p>
                            <div className="space-y-1">
                              <div><span className="font-medium">Q1 (25%):</span> {q1.toFixed(2)}</div>
                              <div><span className="font-medium">중앙값 (50%):</span> {median.toFixed(2)}</div>
                              <div><span className="font-medium">Q3 (75%):</span> {q3.toFixed(2)}</div>
                              <div><span className="font-medium">IQR:</span> {iqr.toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="text-xs bg-background border p-3 rounded-lg">
                            <p className="font-medium mb-2">📈 통계량</p>
                            <div className="space-y-1">
                              <div><span className="font-medium">평균:</span> {col.mean?.toFixed(2)}</div>
                              <div><span className="font-medium">표준편차:</span> {col.std?.toFixed(2)}</div>
                              <div><span className="font-medium">최소값:</span> {col.min?.toFixed(2)}</div>
                              <div><span className="font-medium">최대값:</span> {col.max?.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>

                        {/* 이상치 정보 */}
                        {outliers.length > 0 && (
                          <div className="text-xs bg-warning-bg border border-warning-border p-3 rounded-lg">
                            <p className="font-medium mb-1">⚠️ 이상치 감지</p>
                            <p className="text-muted-foreground">
                              {outliers.length}개의 이상치 발견 (1.5 × IQR 기준)
                              <br />
                              범위: &lt; {lowerBound.toFixed(2)} 또는 &gt; {upperBound.toFixed(2)}
                            </p>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground bg-background p-3 rounded-lg border">
                          <p className="font-medium mb-1">💡 해석 가이드:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>히스토그램</strong>: 데이터의 분포 형태 확인 (정규분포, 왜도, 첨도)</li>
                            <li><strong>사분위수</strong>: 데이터를 4등분한 값 (Q1, 중앙값, Q3)</li>
                            <li><strong>IQR</strong>: Q3 - Q1, 데이터의 중간 50% 범위</li>
                            <li><strong>이상치</strong>: Q1 - 1.5×IQR 미만 또는 Q3 + 1.5×IQR 초과</li>
                          </ul>
                        </div>
                      </TabsContent>
                    )
                  })}
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">수치형 변수가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 가정 검증은 Step 2 (데이터 탐색)에서 수행됨 */}

      {/* 전체 데이터 확인 - 스크롤 가능 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>업로드된 전체 데이터</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDataInNewWindow}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              새 창으로 보기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataPreviewTable
            data={data}
            maxRows={validationResults.totalRows}
            defaultOpen={true}
            title=""
            height="500px"
          />
        </CardContent>
      </Card>
    </div>
  )
})
