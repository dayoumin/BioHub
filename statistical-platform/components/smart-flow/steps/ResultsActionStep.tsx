'use client'

import { Save, FileDown, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnalysisResult, EffectSizeInfo } from '@/types/smart-flow'
import { ResultsVisualization } from '../ResultsVisualization'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { PDFReportService } from '@/lib/services/pdf-report-service'
import { useState, useRef, useEffect, useMemo } from 'react'
import { getInterpretation } from '@/lib/interpretation/engine'



// 가설 생성 함수
function generateHypothesis(method: string): { null: string; alternative: string } | null {
  const methodLower = method.toLowerCase();

  // 독립표본 t-검정 (한글 + 영어)
  if ((methodLower.includes('독립표본') || methodLower.includes('independent')) && methodLower.includes('t')) {
    return {
      null: '두 그룹의 평균이 같다 (μ₁ = μ₂)',
      alternative: '두 그룹의 평균이 다르다 (μ₁ ≠ μ₂)'
    };
  }

  // 대응표본 t-검정 (한글 + 영어)
  if (methodLower.includes('대응') || methodLower.includes('paired') || methodLower.includes('dependent samples')) {
    return {
      null: '측정 전후 평균 차이가 없다 (μd = 0)',
      alternative: '측정 전후 평균 차이가 있다 (μd ≠ 0)'
    };
  }

  // 일원배치 ANOVA (한글 + 영어)
  if (methodLower.includes('anova') || methodLower.includes('분산분석')) {
    return {
      null: '모든 그룹의 평균이 같다 (μ₁ = μ₂ = ... = μₖ)',
      alternative: '적어도 한 그룹의 평균이 다르다'
    };
  }

  // 상관분석 (한글 + 영어)
  if (methodLower.includes('상관') || methodLower.includes('correlation')) {
    return {
      null: '두 변수 간 상관관계가 없다 (ρ = 0)',
      alternative: '두 변수 간 상관관계가 있다 (ρ ≠ 0)'
    };
  }

  // 회귀분석 (한글 + 영어)
  if (methodLower.includes('회귀') || methodLower.includes('regression')) {
    return {
      null: '회귀계수가 0이다 (β = 0)',
      alternative: '회귀계수가 0이 아니다 (β ≠ 0)'
    };
  }

  // 카이제곱 검정 (한글 + 영어)
  if (methodLower.includes('카이') || methodLower.includes('chi')) {
    return {
      null: '두 변수는 독립적이다 (관련성 없음)',
      alternative: '두 변수는 독립적이지 않다 (관련성 있음)'
    };
  }

  // Mann-Whitney U 검정
  if (methodLower.includes('mann') || methodLower.includes('whitney')) {
    return {
      null: '두 그룹의 중위수가 같다',
      alternative: '두 그룹의 중위수가 다르다'
    };
  }

  // Wilcoxon 부호순위 검정
  if (methodLower.includes('wilcoxon')) {
    return {
      null: '측정 전후 중위수 차이가 없다',
      alternative: '측정 전후 중위수 차이가 있다'
    };
  }

  // Kruskal-Wallis 검정
  if (methodLower.includes('kruskal')) {
    return {
      null: '모든 그룹의 중위수가 같다',
      alternative: '적어도 한 그룹의 중위수가 다르다'
    };
  }

  // 기본값 (방법을 모르는 경우)
  return null;
}

// p-value 자연어 해석 함수
function interpretPValue(pValue: number): string {
  if (pValue < 0.001) return "매우 강력한 증거 (p < 0.001)"
  if (pValue < 0.01) return "강력한 증거 (p < 0.01)"
  if (pValue < 0.05) return "유의한 차이 있음 (p < 0.05)"
  if (pValue < 0.10) return "약한 경향성 (p < 0.10)"
  return "통계적 차이 없음"
}


// 효과크기 타입 정규화 함수 (별칭 → 표준 이름)
function normalizeEffectSizeType(type: string): string {
  const typeLower = type.toLowerCase().replace(/[_\s-]/g, '');

  // Cohen's d 별칭
  if (typeLower.includes('cohen') || typeLower === 'd') {
    return "Cohen's d";
  }

  // Pearson r 별칭
  if (typeLower === 'r' || typeLower === 'pearson' || typeLower === 'pearsonr') {
    return "Pearson r";
  }

  // Eta-squared 별칭
  if (typeLower === 'etasquared' || typeLower === 'eta2' || typeLower === 'η2' || typeLower === 'η²') {
    return "Eta-squared";
  }

  // R-squared 별칭
  if (typeLower === 'rsquared' || typeLower === 'r2') {
    return "R-squared";
  }

  // Omega-squared 별칭
  if (typeLower === 'omegasquared' || typeLower === 'omega2' || typeLower === 'ω2' || typeLower === 'ω²') {
    return "Omega-squared";
  }

  // Correlation (일반)
  if (typeLower === 'correlation' || typeLower === 'corr') {
    return "Correlation";
  }

  return type; // 알 수 없는 타입은 그대로 반환
}

// 효과크기 해석 함수
function interpretEffectSize(effectSize: number | EffectSizeInfo, type?: string): string {
  // effectSize가 객체인 경우
  if (typeof effectSize === 'object' && effectSize !== null) {
    const { value, type: effectType } = effectSize
    const absValue = Math.abs(value)
    const normalizedType = normalizeEffectSizeType(effectType)

    if (normalizedType === "Cohen's d") {
      if (absValue < 0.2) return "무시할 만한 차이"
      if (absValue < 0.5) return "작은 효과"
      if (absValue < 0.8) return "중간 효과"
      return "큰 효과"
    }

    if (normalizedType === "Pearson r" || normalizedType === "Correlation") {
      if (absValue < 0.3) return "약한 상관"
      if (absValue < 0.5) return "중간 상관"
      return "강한 상관"
    }

    if (normalizedType === "Eta-squared" || normalizedType === "R-squared" || normalizedType === "Omega-squared") {
      if (absValue < 0.01) return "무시할 만한 효과"
      if (absValue < 0.06) return "작은 효과"
      if (absValue < 0.14) return "중간 효과"
      return "큰 효과"
    }
  }

  // effectSize가 숫자인 경우 (type 파라미터 사용)
  if (typeof effectSize === 'number') {
    const absValue = Math.abs(effectSize)
    const normalizedType = type ? normalizeEffectSizeType(type) : undefined

    if (normalizedType === "Cohen's d") {
      if (absValue < 0.2) return "무시할 만한 차이"
      if (absValue < 0.5) return "작은 효과"
      if (absValue < 0.8) return "중간 효과"
      return "큰 효과"
    }

    // 기본: 상관계수 기준
    if (absValue < 0.3) return "약한 효과"
    if (absValue < 0.5) return "중간 효과"
    return "큰 효과"
  }

  return "효과크기 정보 없음"
}

// 목적별 해석 패널 Props
interface ResultInterpretationPanelProps {
  results: AnalysisResult
  purpose: string
}

// 목적별 해석 컴포넌트
// ✅ 중앙 엔진으로 교체 (lib/interpretation/engine.ts)
function ResultInterpretationPanel({ results, purpose }: ResultInterpretationPanelProps) {
  const interpretation = useMemo(() => {
    return getInterpretation(results, purpose)
  }, [results, purpose])

  if (!interpretation) return null

  return (
    <Alert className="bg-highlight-bg border-highlight-border">
      <AlertDescription>
        <h4 className="font-semibold mb-2">{interpretation.title}</h4>
        <div className="space-y-1 text-sm">
          <p>📊 {interpretation.summary}</p>
          <p>📈 {interpretation.statistical}</p>
          {interpretation.practical && <p>💡 {interpretation.practical}</p>}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface ResultsActionStepProps {
  results: AnalysisResult | null
}

export function ResultsActionStep({ results }: ResultsActionStepProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const { saveToHistory, reset, uploadedData, variableMapping, analysisPurpose } = useSmartFlowStore()
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

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

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">분석을 먼저 실행해주세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 시각화 차트 추가 */}
      <div ref={chartRef}>
        <ResultsVisualization results={results} />
      </div>
      
      

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 분석 결과</h3>


        {/* 분석 요약 배지 */}
        {variableMapping && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground font-medium">분석 요약</p>
            <div className="flex flex-wrap gap-2">
              {uploadedData && (
                <Badge variant="outline" className="text-xs">
                  표본 크기: N={uploadedData.length}
                </Badge>
              )}
              {variableMapping.dependentVar && (
                <Badge variant="secondary" className="text-xs">
                  종속변수: {Array.isArray(variableMapping.dependentVar)
                    ? variableMapping.dependentVar.join(', ')
                    : variableMapping.dependentVar}
                </Badge>
              )}
              {variableMapping.independentVar && (
                <Badge variant="secondary" className="text-xs">
                  독립변수: {Array.isArray(variableMapping.independentVar)
                    ? variableMapping.independentVar.join(', ')
                    : variableMapping.independentVar}
                </Badge>
              )}
              {variableMapping.groupVar && (
                <Badge variant="secondary" className="text-xs">
                  그룹변수: {variableMapping.groupVar}
                </Badge>
              )}
              {variableMapping.covariate && (
                <Badge variant="secondary" className="text-xs">
                  공변량: {Array.isArray(variableMapping.covariate)
                    ? variableMapping.covariate.join(', ')
                    : variableMapping.covariate}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 목적별 해석 패널 */}
        {analysisPurpose && (
          <ResultInterpretationPanel results={results} purpose={analysisPurpose} />
        )}

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">검정 방법</p>
            <p className="font-medium">{results.method}</p>
          </div>

          {/* 가설 */}
          {(() => {
            const hypothesis = generateHypothesis(results.method);
            if (!hypothesis) return null;

            return (
              <div className="mb-4 p-4 bg-highlight-bg rounded-lg border border-highlight-border dark:border-blue-800">
                <p className="text-sm font-semibold text-foreground mb-2">📝 검정 가설</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span className="text-xs font-medium text-highlight min-w-[60px]">귀무가설:</span>
                    <span className="text-xs text-foreground/90">{hypothesis.null}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-medium text-highlight min-w-[60px]">대립가설:</span>
                    <span className="text-xs text-foreground/90">{hypothesis.alternative}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 기본 통계량 - 확장된 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">통계량</p>
              <p className="text-lg font-medium">{results.statistic.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">p-value</p>
              <p className={`text-lg font-medium ${
                results.pValue < 0.05 ? 'text-success' : 'text-gray-600'
              }`}>
                {results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}
              </p>
            </div>
            {/* 자유도 표시 */}
            {results.df !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">자유도 (df)</p>
                <p className="text-lg font-medium">{results.df}</p>
              </div>
            )}
            {/* 효과크기 - 상세 정보 포함 */}
            {results.effectSize && (
              <div>
                <p className="text-sm text-muted-foreground">효과크기</p>
                {typeof results.effectSize === 'number' ? (
                  <div>
                    <p className="text-lg font-medium">{results.effectSize.toFixed(3)}</p>
                    <p className="text-xs text-primary/80">
                      {interpretEffectSize(results.effectSize)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium">{results.effectSize.value.toFixed(3)}</p>
                    <p className="text-sm text-muted-foreground">
                      {results.effectSize.type}
                    </p>
                    <p className="text-xs text-primary/80 mt-1">
                      → {interpretEffectSize(results.effectSize)}
                      {results.effectSize.interpretation &&
                        results.effectSize.interpretation !== interpretEffectSize(results.effectSize) &&
                        ` (실무적으로 의미 있는 차이)`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 신뢰구간 */}
          {results.confidence && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {results.confidence.level ? `${(results.confidence.level * 100).toFixed(0)}%` : '95%'} 신뢰구간
              </p>
              <p className="font-medium">
                [{results.confidence.lower.toFixed(3)}, {results.confidence.upper.toFixed(3)}]
              </p>
            </div>
          )}

          {/* 그룹별 통계 */}
          {results.groupStats && results.groupStats.length > 0 && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">📈 그룹별 통계</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">그룹</th>
                      <th className="text-right py-2 px-2">n</th>
                      <th className="text-right py-2 px-2">평균</th>
                      <th className="text-right py-2 px-2">표준편차</th>
                      {results.groupStats.some(g => g.median !== undefined) && (
                        <th className="text-right py-2 px-2">중위수</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {results.groupStats.map((group, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2">{group.name || `그룹 ${idx + 1}`}</td>
                        <td className="text-right py-2 px-2">{group.n}</td>
                        <td className="text-right py-2 px-2">{group.mean.toFixed(3)}</td>
                        <td className="text-right py-2 px-2">{group.std.toFixed(3)}</td>
                        {group.median !== undefined && (
                          <td className="text-right py-2 px-2">{group.median.toFixed(3)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 회귀 계수표 */}
          {results.coefficients && results.coefficients.length > 0 && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">📐 회귀 계수</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">변수</th>
                      <th className="text-right py-2 px-2">계수</th>
                      <th className="text-right py-2 px-2">표준오차</th>
                      <th className="text-right py-2 px-2">t-값</th>
                      <th className="text-right py-2 px-2">p-값</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.coefficients.map((coef, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2">{coef.name}</td>
                        <td className="text-right py-2 px-2">{coef.value.toFixed(4)}</td>
                        <td className="text-right py-2 px-2">{coef.stdError.toFixed(4)}</td>
                        <td className="text-right py-2 px-2">{coef.tValue.toFixed(3)}</td>
                        <td className={`text-right py-2 px-2 ${coef.pvalue < 0.05 ? 'font-medium text-success' : ''}`}>
                          {coef.pvalue < 0.001 ? '< 0.001' : coef.pvalue.toFixed(3)}
                          {coef.pvalue < 0.05 && ' *'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* R², Adjusted R², VIF */}
              {results.additional && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {results.additional.rSquared !== undefined && (
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">R²</p>
                      <p className="font-medium">{results.additional.rSquared.toFixed(4)}</p>
                    </div>
                  )}
                  {results.additional.adjustedRSquared !== undefined && (
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">Adj. R²</p>
                      <p className="font-medium">{results.additional.adjustedRSquared.toFixed(4)}</p>
                    </div>
                  )}
                  {results.additional.rmse !== undefined && (
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">RMSE</p>
                      <p className="font-medium">{results.additional.rmse.toFixed(4)}</p>
                    </div>
                  )}
                  {results.additional.vif && results.additional.vif.length > 0 && (
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">VIF (max)</p>
                      <p className={`font-medium ${Math.max(...results.additional.vif) > 10 ? 'text-error' : ''}`}>
                        {Math.max(...results.additional.vif).toFixed(2)}
                        {Math.max(...results.additional.vif) > 10 && ' ⚠'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 사후검정 결과 */}
          {results.postHoc && results.postHoc.length > 0 && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">🔬 사후검정 결과</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">비교</th>
                      {results.postHoc[0].meanDiff !== undefined && (
                        <th className="text-right py-2 px-2">평균차</th>
                      )}
                      {results.postHoc[0].zStatistic !== undefined && (
                        <th className="text-right py-2 px-2">Z</th>
                      )}
                      <th className="text-right py-2 px-2">p-값</th>
                      {results.postHoc[0].pvalueAdjusted !== undefined && (
                        <th className="text-right py-2 px-2">보정 p</th>
                      )}
                      <th className="text-center py-2 px-2">유의</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.postHoc.map((item, idx) => (
                      <tr key={idx} className={`border-b border-gray-200 dark:border-gray-700 ${item.significant ? 'bg-success-bg' : ''}`}>
                        <td className="py-2 px-2">{item.group1} vs {item.group2}</td>
                        {item.meanDiff !== undefined && (
                          <td className="text-right py-2 px-2">{item.meanDiff.toFixed(3)}</td>
                        )}
                        {item.zStatistic !== undefined && (
                          <td className="text-right py-2 px-2">{item.zStatistic.toFixed(3)}</td>
                        )}
                        <td className="text-right py-2 px-2">
                          {item.pvalue < 0.001 ? '< 0.001' : item.pvalue.toFixed(3)}
                        </td>
                        {item.pvalueAdjusted !== undefined && (
                          <td className="text-right py-2 px-2">
                            {item.pvalueAdjusted < 0.001 ? '< 0.001' : item.pvalueAdjusted.toFixed(3)}
                          </td>
                        )}
                        <td className="text-center py-2 px-2">
                          {item.significant ? '✓' : '−'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 고급 분석 결과 */}
          {results.additional && (
            <>
              {/* 분류 모델 성능 (로지스틱 회귀 등) */}
              {results.additional.accuracy !== undefined && (
                <div className="pt-4 border-t">
                  <p className="font-medium mb-2">🎯 분류 성능</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">정확도</p>
                      <p className="font-medium">{(results.additional.accuracy * 100).toFixed(1)}%</p>
                    </div>
                    {results.additional.precision !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">정밀도</p>
                        <p className="font-medium">{(results.additional.precision * 100).toFixed(1)}%</p>
                      </div>
                    )}
                    {results.additional.recall !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">재현율</p>
                        <p className="font-medium">{(results.additional.recall * 100).toFixed(1)}%</p>
                      </div>
                    )}
                    {results.additional.f1Score !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">F1 Score</p>
                        <p className="font-medium">{results.additional.f1Score.toFixed(3)}</p>
                      </div>
                    )}
                    {results.additional.rocAuc !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">ROC AUC</p>
                        <p className="font-medium">{results.additional.rocAuc.toFixed(3)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 군집 분석 결과 */}
              {results.additional.silhouetteScore !== undefined && (
                <div className="pt-4 border-t">
                  <p className="font-medium mb-2">🎯 군집 분석</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">Silhouette Score</p>
                      <p className="font-medium">{results.additional.silhouetteScore.toFixed(3)}</p>
                    </div>
                    {results.additional.clusters && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">군집 수</p>
                        <p className="font-medium">{new Set(results.additional.clusters).size}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PCA/요인분석 결과 */}
              {results.additional.explainedVarianceRatio && results.additional.explainedVarianceRatio.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="font-medium mb-2">📊 분산 설명률</p>
                  <div className="space-y-2 text-sm">
                    {results.additional.explainedVarianceRatio.slice(0, 5).map((ratio, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-20">PC{idx + 1}</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                        <span className="w-16 text-right">{(ratio * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground">
                      누적: {(results.additional.explainedVarianceRatio.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* 신뢰도 분석 결과 */}
              {results.additional.alpha !== undefined && (
                <div className="pt-4 border-t">
                  <p className="font-medium mb-2">📏 신뢰도</p>
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-sm">Cronbach's Alpha = <span className="font-medium">{results.additional.alpha.toFixed(3)}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.additional.alpha >= 0.9 ? '우수한 신뢰도' :
                       results.additional.alpha >= 0.8 ? '좋은 신뢰도' :
                       results.additional.alpha >= 0.7 ? '수용 가능한 신뢰도' :
                       results.additional.alpha >= 0.6 ? '의문스러운 신뢰도' : '낮은 신뢰도'}
                    </p>
                  </div>
                </div>
              )}

              {/* 검정력 분석 결과 */}
              {(results.additional?.power !== undefined || results.additional?.requiredSampleSize !== undefined) && (
                <div className="pt-4 border-t">
                  <p className="font-medium mb-2">⚡ 검정력 분석</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {results.additional?.power !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">검정력</p>
                        <p className={`font-medium ${results.additional.power >= 0.8 ? 'text-success' : 'text-warning'}`}>
                          {(results.additional.power * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {results.additional?.requiredSampleSize !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-sm text-muted-foreground">필요 표본 크기</p>
                        <p className="font-medium">{results.additional.requiredSampleSize}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 해석 */}
          <div className="pt-4 border-t">
            <p className="font-medium mb-2">💡 해석</p>
            <p className="text-sm">{results.interpretation}</p>

            {/* p-value 자연어 해석 */}
            <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>통계적 유의성:</strong> {interpretPValue(results.pValue)}
              </p>
              <p className="text-sm text-muted-foreground">
                {results.pValue < 0.05
                  ? `두 집단 간 유의한 차이가 있습니다 (p=${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}).`
                  : `통계적으로 유의한 차이가 발견되지 않았습니다 (p=${results.pValue.toFixed(3)}).`
                }
              </p>
            </div>
          </div>

          {/* 가정 검정 결과 */}
          {results.assumptions && (
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">🔍 가정 검정</p>
              <div className="space-y-1 text-xs">
                {results.assumptions.normality && (
                  <>
                    {results.assumptions.normality.group1 && (
                      <div className="flex justify-between">
                        <span>정규성 (그룹 1):</span>
                        <span className={results.assumptions.normality.group1.isNormal ? 'text-success' : 'text-warning'}>
                          {results.assumptions.normality.group1.isNormal ? '✓ 만족' : '⚠ 위반'}
                          {results.assumptions.normality.group1.pValue !== undefined && (
                            <> (p={results.assumptions.normality.group1.pValue.toFixed(3)})</>
                          )}
                        </span>
                      </div>
                    )}
                    {results.assumptions.normality.group2 && (
                      <div className="flex justify-between">
                        <span>정규성 (그룹 2):</span>
                        <span className={results.assumptions.normality.group2.isNormal ? 'text-success' : 'text-warning'}>
                          {results.assumptions.normality.group2.isNormal ? '✓ 만족' : '⚠ 위반'}
                          {results.assumptions.normality.group2.pValue !== undefined && (
                            <> (p={results.assumptions.normality.group2.pValue.toFixed(3)})</>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {results.assumptions.homogeneity && (
                  <div className="flex justify-between">
                    <span>등분산성:</span>
                    <span className={(results.assumptions.homogeneity.levene?.equalVariance ?? results.assumptions.homogeneity.bartlett?.equalVariance ?? false) ? 'text-success' : 'text-warning'}>
                      {(results.assumptions.homogeneity.levene?.equalVariance ?? results.assumptions.homogeneity.bartlett?.equalVariance ?? false) ? '✓ 만족' : '⚠ 위반'}
                      {(() => {
                        const pValue = results.assumptions.homogeneity.levene?.pValue ?? results.assumptions.homogeneity.bartlett?.pValue
                        return pValue !== undefined ? ` (p=${pValue.toFixed(3)})` : ''
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
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