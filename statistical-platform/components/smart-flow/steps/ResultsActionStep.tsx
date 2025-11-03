'use client'

import { ChevronRight, Download, BarChart3, FileText, Save, History, FileDown, Copy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AnalysisResult } from '@/types/smart-flow'
import { ResultsVisualization } from '../ResultsVisualization'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { PDFReportService } from '@/lib/services/pdf-report-service'
import { useState, useRef, useEffect } from 'react'

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

export function ResultsActionStep({ results }: ResultsActionStepProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const { saveToHistory, reset, uploadedData } = useSmartFlowStore()
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  const handleSaveToHistory = () => {
    const defaultName = `분석 ${new Date().toLocaleString('ko-KR')}`
    const name = prompt('분석 이름을 입력하세요:', defaultName)

    if (name && name.trim()) {
      // XSS 방지를 위한 입력 검증
      const sanitizedName = name.trim().slice(0, 100) // 최대 100자 제한

      try {
        saveToHistory(sanitizedName)
        setIsSaved(true)
        toast.success('히스토리에 저장되었습니다', {
          description: sanitizedName
        })

        // 이전 타이머 정리
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)

        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false)
          savedTimeoutRef.current = null
        }, 3000)
      } catch (err) {
        toast.error('히스토리 저장에 실패했습니다', {
          description: err instanceof Error ? err.message : '알 수 없는 오류'
        })
      }
    }
  }

  const handleNewAnalysis = () => {
    if (confirm('현재 분석을 종료하고 새 분석을 시작하시겠습니까?')) {
      reset()
      toast.info('새 분석을 시작합니다')
    }
  }

  const handleGeneratePDF = async () => {
    if (!results) return

    setIsGeneratingPDF(true)

    try {
      // 데이터 정보 안전하게 구성
      const dataInfo = uploadedData && uploadedData.length > 0 ? {
        totalRows: uploadedData.length,
        columnCount: Object.keys(uploadedData[0] || {}).length,
        variables: Object.keys(uploadedData[0] || {})
      } : undefined

      await PDFReportService.generateReport({
        title: `${results.method} Analysis Report`,
        date: new Date(),
        analysisResult: results,
        dataInfo,
        chartElement: chartRef.current
      })

      toast.success('PDF 보고서가 생성되었습니다', {
        description: '다운로드 폴더를 확인해주세요'
      })
    } catch (error) {
      console.error('PDF 생성 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      toast.error('PDF 생성에 실패했습니다', {
        description: errorMessage
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleCopyResults = async () => {
    if (!results) return

    try {
      const summary = PDFReportService.generateSummaryText(results)
      await navigator.clipboard.writeText(summary)

      setIsCopied(true)
      toast.success('결과가 클립보드에 복사되었습니다')

      // 이전 타이머 정리
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)

      copiedTimeoutRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimeoutRef.current = null
      }, 2000)
    } catch (err) {
      console.error('복사 실패:', err)
      toast.error('클립보드 복사에 실패했습니다', {
        description: '브라우저 권한을 확인해주세요'
      })
    }
  }

  const handleNextAction = (action: string) => {
    // 추후 구현: 각 액션에 따른 다음 분석 실행
    const actionMessages: Record<string, string> = {
      'post-hoc': '사후검정',
      'effect-size': '효과크기 계산',
      'regression': '회귀분석',
      'non-parametric': '비모수 검정',
      'power-analysis': '검정력 분석',
      'visualization': '추가 시각화'
    }

    const message = actionMessages[action]
    if (message) {
      toast.info(`${message} 기능을 준비 중입니다`, {
        description: '곧 개발 예정입니다'
      })
    }
  }
  
  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">분석을 먼저 실행해주세요.</p>
      </div>
    )
  }

  // 분석 결과에 따른 동적 추천 생성
  const getNextActions = () => {
    const actions: Array<{
      title: string
      description: string
      icon: typeof BarChart3
      action: string
    }> = []

    // ANOVA 후 사후검정 추천
    if (results.method?.includes('ANOVA') && results.pValue < 0.05) {
      actions.push({
        title: 'Tukey HSD 사후검정',
        description: '어느 그룹 간 차이가 있는지 확인',
        icon: BarChart3,
        action: 'post-hoc'
      })
    }

    // t-test 후 효과크기 계산 추천
    if (results.method?.includes('t-test') && !results.effectSize) {
      actions.push({
        title: "Cohen's d 계산",
        description: '실질적 차이의 크기 평가',
        icon: BarChart3,
        action: 'effect-size'
      })
    }

    // 상관분석 후 회귀분석 추천
    if (results.method?.includes('상관') && Math.abs(results.statistic) > 0.3) {
      actions.push({
        title: '회귀분석 수행',
        description: '예측 모델 구축',
        icon: BarChart3,
        action: 'regression'
      })
    }

    // 가정 위반 시 비모수 검정 추천
    if (results.assumptions?.normality) {
      const norm = results.assumptions.normality
      if ((norm.group1 && !norm.group1.isNormal) || (norm.group2 && !norm.group2.isNormal)) {
        actions.push({
          title: '비모수 검정 수행',
          description: 'Mann-Whitney U 또는 Wilcoxon 검정',
          icon: BarChart3,
          action: 'non-parametric'
        })
      }
    }

    // 항상 포함되는 기본 액션
    actions.push({
      title: '검정력 분석',
      description: '적절한 표본 크기 계산',
      icon: BarChart3,
      action: 'power-analysis'
    })

    actions.push({
      title: '추가 시각화',
      description: '박스플롯, 히스토그램 생성',
      icon: BarChart3,
      action: 'visualization'
    })

    return actions.slice(0, 3) // 최대 3개까지만 표시
  }

  const nextActions = getNextActions()

  return (
    <div className="space-y-6">
      {/* 시각화 차트 추가 */}
      <div ref={chartRef}>
        <ResultsVisualization results={results} />
      </div>
      
      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 분석 결과</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">검정 방법</p>
            <p className="font-medium">{results.method}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">통계량</p>
              <p className="text-lg">{results.statistic.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">p-value</p>
              <p className={`text-lg ${
                results.pValue < 0.05 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {results.pValue.toFixed(3)}
              </p>
            </div>
            {results.effectSize && (
              <div>
                <p className="text-sm text-muted-foreground">효과크기</p>
                <p className="text-lg">{results.effectSize.toFixed(2)}</p>
              </div>
            )}
          </div>

          {results.confidence && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">95% 신뢰구간</p>
              <p className="font-medium">
                [{results.confidence.lower.toFixed(3)}, {results.confidence.upper.toFixed(3)}]
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="font-medium mb-2">💡 해석</p>
            <p className="text-sm">{results.interpretation}</p>
            {results.pValue < 0.05 && (
              <p className="text-sm mt-2">
                p-값이 0.05보다 작으므로 (p = {results.pValue.toFixed(3)} {'<'} 0.05),
                통계적으로 유의한 차이가 있습니다.
              </p>
            )}
          </div>
          
          {/* 가정 검정 결과 */}
          {results.assumptions && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">🔍 가정 검정</p>
              <div className="space-y-1 text-xs">
                {results.assumptions.normality && (
                  <>
                    <div className="flex justify-between">
                      <span>정규성 (그룹 1):</span>
                      <span className={results.assumptions.normality.group1.isNormal ? 'text-green-600' : 'text-orange-600'}>
                        {results.assumptions.normality.group1.isNormal ? '✓ 만족' : '⚠ 위반'}
                        (p={results.assumptions.normality.group1.pValue.toFixed(3)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>정규성 (그룹 2):</span>
                      <span className={results.assumptions.normality.group2.isNormal ? 'text-green-600' : 'text-orange-600'}>
                        {results.assumptions.normality.group2.isNormal ? '✓ 만족' : '⚠ 위반'}
                        (p={results.assumptions.normality.group2.pValue.toFixed(3)})
                      </span>
                    </div>
                  </>
                )}
                {results.assumptions.homogeneity && (
                  <div className="flex justify-between">
                    <span>등분산성:</span>
                    <span className={(results.assumptions.homogeneity.levene?.equalVariance ?? results.assumptions.homogeneity.bartlett?.equalVariance ?? false) ? 'text-green-600' : 'text-orange-600'}>
                      {(results.assumptions.homogeneity.levene?.equalVariance ?? results.assumptions.homogeneity.bartlett?.equalVariance ?? false) ? '✓ 만족' : '⚠ 위반'}
                      (p={(results.assumptions.homogeneity.levene?.pValue ?? results.assumptions.homogeneity.bartlett?.pValue ?? 0).toFixed(3)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">다음 단계 추천</h4>
        
        <div className="grid gap-3">
          {nextActions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={index}
                onClick={() => handleNextAction(action.action)}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleSaveToHistory}
            variant={isSaved ? "default" : "outline"}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaved ? '저장됨!' : '히스토리 저장'}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <FileDown className="w-4 h-4 mr-2 animate-pulse" />
                생성 중...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                PDF 보고서
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyResults}
            disabled={!results}
          >
            <Copy className="w-4 h-4 mr-2" />
            {isCopied ? '복사됨!' : '결과 복사'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleNewAnalysis}
          >
            새 분석 시작
          </Button>
        </div>
      </div>
      
    </div>
  )
}