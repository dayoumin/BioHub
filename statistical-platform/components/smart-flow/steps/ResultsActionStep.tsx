'use client'

import { Save, FileDown, Copy, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AnalysisResult } from '@/types/smart-flow'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { PDFReportService } from '@/lib/services/pdf-report-service'
import { startNewAnalysis } from '@/lib/services/data-management'
import { useState, useRef, useEffect, useMemo } from 'react'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { AnalysisInfoCard } from '@/components/smart-flow/components/AnalysisInfoCard'

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

export function ResultsActionStep({ results }: ResultsActionStepProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const {
    saveToHistory,
    reset,
    uploadedData,
    variableMapping,
    uploadedFileName,
    selectedMethod,
    validationResults,
    assumptionResults
  } = useSmartFlowStore()
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  // AnalysisResult -> StatisticalResult 변환
  const statisticalResult = useMemo(() => {
    if (!results) return null

    // 변수 목록 추출
    const variables: string[] = []
    if (variableMapping?.dependentVar) {
      if (Array.isArray(variableMapping.dependentVar)) {
        variables.push(...variableMapping.dependentVar)
      } else {
        variables.push(variableMapping.dependentVar)
      }
    }
    if (variableMapping?.independentVar) {
      if (Array.isArray(variableMapping.independentVar)) {
        variables.push(...variableMapping.independentVar)
      } else {
        variables.push(variableMapping.independentVar)
      }
    }
    if (variableMapping?.groupVar) {
      variables.push(variableMapping.groupVar)
    }

    return convertToStatisticalResult(results, {
      sampleSize: uploadedData?.length,
      groups: results.groupStats?.length,
      variables: variables.length > 0 ? variables : undefined,
      timestamp: new Date()
    })
  }, [results, uploadedData, variableMapping])

  const handleSaveToHistory = async () => {
    const defaultName = `분석 ${new Date().toLocaleString('ko-KR')}`
    const name = prompt('분석 이름을 입력하세요:', defaultName)

    if (name && name.trim()) {
      // XSS 방지를 위한 입력 검증
      const sanitizedName = name.trim().slice(0, 100) // 최대 100자 제한

      try {
        await saveToHistory(sanitizedName)
        setIsSaved(true)
        toast.success('히스토리에 저장되었습니다 (IndexedDB)', {
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

  const handleNewAnalysis = async () => {
    try {
      await startNewAnalysis()
      toast.info('새 분석을 시작합니다', {
        description: '데이터와 캐시가 초기화되었습니다'
      })
    } catch (error) {
      console.error('Failed to start new analysis:', error)
      // Fallback to basic reset
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

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">분석을 먼저 실행해주세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={chartRef}>
      {/* 분석 정보 카드 */}
      <AnalysisInfoCard
        fileName={uploadedFileName}
        dataRows={uploadedData?.length}
        dataColumns={uploadedData && uploadedData.length > 0 ? Object.keys(uploadedData[0]).length : undefined}
        method={selectedMethod}
        timestamp={new Date()}
        variableMapping={variableMapping}
        validationResults={validationResults}
        assumptionResults={assumptionResults}
      />

      {/* StatisticalResultCard - 핵심 결과만 표시 */}
      {statisticalResult && (
        <StatisticalResultCard
          result={statisticalResult}
          showAssumptions={true}
          showEffectSize={true}
          showConfidenceInterval={true}
          showInterpretation={true}
          showActions={false}  // 아래에 커스텀 액션 버튼 사용
          expandable={false}   // 기본 펼침 상태
        />
      )}

      {/* 액션 버튼 */}
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
            variant="default"
            className="flex-1"
            onClick={handleNewAnalysis}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            새 분석 시작
          </Button>
        </div>
      </div>
    </div>
  )
}