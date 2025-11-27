'use client'

import { memo, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Scatterplot } from '@/components/charts/scatterplot'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X, TrendingUp, ChartScatter, Loader2, ListOrdered, ArrowRight, Sparkles, ExternalLink, BarChart3, GitCommitHorizontal } from 'lucide-react'
import { ValidationResults, DataRow, StatisticalAssumptions } from '@/types/smart-flow'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { usePyodide } from '@/components/providers/PyodideProvider'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'
import { Histogram } from '@/components/charts/histogram'
import { BoxPlot } from '@/components/charts/boxplot'
import { openDataWindow } from '@/lib/utils/open-data-window'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StepNavigation } from '@/components/smart-flow/StepNavigation'
import { CorrelationHeatmap } from '@/components/smart-flow/steps/validation/charts/CorrelationHeatmap'
import { VariableGallery } from '@/components/smart-flow/steps/exploration/VariableGallery'
import { VariableDetailPanel } from '@/components/smart-flow/steps/exploration/VariableDetailPanel'

interface DataExplorationStepProps {
  validationResults: ValidationResults | null
  data: DataRow[]
  onNext: () => void
  onPrevious: () => void
  onUploadComplete?: (file: File, data: DataRow[]) => void
  existingFileName?: string
}

interface ScatterplotConfig {
  id: string
  xVariable: string
  yVariable: string  // 단일 Y축 (심플 UI)
}

/**
 * 통계 가정 검정 페이로드 타입
 * - values: 정규성 검정용 단일 수치형 배열
 * - groups: 등분산성 검정용 그룹별 수치형 배열
 */
interface AssumptionPayload {
  values?: number[]
  groups?: number[][]
  alpha: number
  normalityRule: 'any' | 'all' | 'majority'
}

/**
 * 상관계수 계산 (Pearson correlation coefficient)
 */
function calculateCorrelation(x: number[], y: number[]): { r: number; r2: number; n: number } {
  // x와 y는 이미 row-wise paired (길이 동일 보장)
  const n = x.length
  if (n < 2 || x.length !== y.length) return { r: 0, r2: 0, n: 0 }

  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumXX = x.reduce((sum, val) => sum + val * val, 0)
  const sumYY = y.reduce((sum, val) => sum + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  const r = denominator === 0 ? 0 : numerator / denominator
  const r2 = r * r

  return { r, r2, n }
}

export const DataExplorationStep = memo(function DataExplorationStep({
  validationResults,
  data,
  onNext,
  onPrevious: _onPrevious, // Reserved for future use
  onUploadComplete,
  existingFileName
}: DataExplorationStepProps) {
  void _onPrevious // Suppress unused warning
  // Pyodide 및 Store
  const { isLoaded: pyodideLoaded, service: pyodideService } = usePyodide()
  const { setAssumptionResults, uploadedFile, uploadedFileName } = useSmartFlowStore()

  // 새 창으로 데이터 보기
  const handleOpenDataInNewWindow = useCallback(() => {
    if (!data || data.length === 0) return
    const columns = Object.keys(data[0])
    openDataWindow({
      fileName: uploadedFile?.name || uploadedFileName || '업로드된 데이터',
      columns,
      data
    })
  }, [data, uploadedFile, uploadedFileName])

  // 가정 검정 상태
  const [isAssumptionLoading, setIsAssumptionLoading] = useState(false)
  const [assumptionResults, setLocalAssumptionResults] = useState<StatisticalAssumptions | null>(null)
  const assumptionRunId = useRef(0)

  // 차트 타입 상태 (변수 전환 시에도 유지)
  const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram')
  // 박스플롯 다중 변수 선택 상태
  const [selectedBoxplotVars, setSelectedBoxplotVars] = useState<string[]>([])
  // 히스토그램용 단일 변수 선택
  const [selectedHistogramVar, setSelectedHistogramVar] = useState<string>('')

  // 수치형/범주형 변수 목록
  // ID로 감지된 컬럼은 시각화/분석에서 제외
  const numericVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats
      .filter(col => col.type === 'numeric' && !col.idDetection?.isId)
      .map(col => col.name)
  }, [validationResults])

  // ID로 감지된 컬럼은 시각화/분석에서 제외
  const categoricalVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats
      .filter(col => col.type === 'categorical' && !col.idDetection?.isId)
      .map(col => col.name)
  }, [validationResults])

  // ID 감지된 컬럼 제외한 수치형 컬럼 통계
  const numericColumnStats = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.filter(col => col.type === 'numeric' && !col.idDetection?.isId)
  }, [validationResults])

  // 전체 변수 목록 (VariableGallery용)
  const allVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.filter(col => !col.idDetection?.isId)
  }, [validationResults])

  // 선택된 변수 상태 (VariableDetailPanel용)
  const [selectedVariable, setSelectedVariable] = useState<typeof allVariables[0] | null>(null)

  // 초기 변수 설정 (numericVariables 선언 이후)
  useEffect(() => {
    if (numericVariables.length > 0 && selectedHistogramVar === '') {
      setSelectedHistogramVar(numericVariables[0])
    }
    if (numericVariables.length > 0 && selectedBoxplotVars.length === 0) {
      setSelectedBoxplotVars(numericVariables.slice(0, Math.min(3, numericVariables.length)))
    }
  }, [numericVariables, selectedHistogramVar, selectedBoxplotVars.length])

  // 박스플롯 변수 토글
  const toggleBoxplotVar = useCallback((varName: string) => {
    setSelectedBoxplotVars(prev => {
      if (prev.includes(varName)) {
        if (prev.length <= 1) return prev
        return prev.filter(v => v !== varName)
      } else {
        if (prev.length >= 8) return prev
        return [...prev, varName]
      }
    })
  }, [])

  // 박스플롯 다중 변수 데이터 계산
  const boxplotMultiData = useMemo(() => {
    return selectedBoxplotVars.map(varName => {
      const colData = data
        .map(row => row[varName])
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(v => !isNaN(v))

      if (colData.length === 0) return null

      const sortedData = [...colData].sort((a, b) => a - b)
      const q1Index = Math.floor(sortedData.length * 0.25)
      const q3Index = Math.floor(sortedData.length * 0.75)
      const medianIndex = Math.floor(sortedData.length * 0.5)
      const q1 = sortedData[q1Index] || 0
      const q3 = sortedData[q3Index] || 0
      const median = sortedData[medianIndex] || 0
      const iqr = q3 - q1
      const mean = colData.reduce((a, b) => a + b, 0) / colData.length
      const std = Math.sqrt(colData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / colData.length)

      const lowerBound = q1 - 1.5 * iqr
      const upperBound = q3 + 1.5 * iqr
      const outliers = colData.filter(v => v < lowerBound || v > upperBound)

      return {
        name: varName,
        min: Math.min(...colData),
        q1,
        median,
        q3,
        max: Math.max(...colData),
        mean,
        std,
        outliers
      }
    }).filter(Boolean)
  }, [data, selectedBoxplotVars])

  const getNumericValues = useCallback((columnName: string): number[] => {
    return data
      .map(row => row[columnName])
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(Number)
      .filter(value => !isNaN(value))
  }, [data])

  const getPercentile = useCallback((sorted: number[], percentile: number): number | undefined => {
    if (sorted.length === 0) return undefined
    const index = (sorted.length - 1) * percentile
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    if (lower === upper) return sorted[lower]
    const weight = index - lower
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }, [])

  const numericDistributions = useMemo(() => {
    return numericColumnStats.map(col => {
      const values = getNumericValues(col.name)
      const n = values.length
      const sorted = [...values].sort((a, b) => a - b)

      const mean = col.mean ?? (n > 0 ? values.reduce((sum, v) => sum + v, 0) / n : undefined)
      const std = col.std ?? (n > 1 && mean !== undefined
        ? Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n)
        : undefined)

      const q1 = col.q1 ?? col.q25 ?? getPercentile(sorted, 0.25)
      const q3 = col.q3 ?? col.q75 ?? getPercentile(sorted, 0.75)
      const median = col.median ?? getPercentile(sorted, 0.5)
      const min = col.min ?? (n > 0 ? sorted[0] : undefined)
      const max = col.max ?? (n > 0 ? sorted[sorted.length - 1] : undefined)

      const iqr = q1 !== undefined && q3 !== undefined ? q3 - q1 : undefined
      const lowerBound = iqr !== undefined ? q1! - 1.5 * iqr : undefined
      const upperBound = iqr !== undefined ? q3! + 1.5 * iqr : undefined
      const outlierCount = lowerBound !== undefined && upperBound !== undefined
        ? values.filter(v => v < lowerBound || v > upperBound).length
        : 0

      let skewness = col.skewness
      if (skewness === undefined && n >= 3 && std && std > 0 && mean !== undefined) {
        skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0) / n
      }

      let kurtosis = col.kurtosis
      if (kurtosis === undefined && n >= 4 && std && std > 0 && mean !== undefined) {
        kurtosis = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0) / n - 3
      }

      return {
        ...col,
        n,
        mean,
        median,
        std,
        min,
        max,
        q1,
        q3,
        skewness,
        kurtosis,
        outlierCount
      }
    })
  }, [getNumericValues, getPercentile, numericColumnStats])

  const formatStat = useCallback((value?: number, digits = 2) => {
    return value !== undefined && !Number.isNaN(value) ? value.toFixed(digits) : 'N/A'
  }, [])

  // 다음 단계 진행 가능 여부 (데이터 검증 통과 필수)
  const canProceedToNext = useMemo(() => {
    // validationResults가 없거나 isValid가 false면 진행 불가
    if (!validationResults?.isValid) return false
    // 데이터가 없으면 진행 불가
    if (!data || data.length === 0) return false
    return true
  }, [validationResults, data])

  // Scatterplot 구성 목록
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([])

  // 로딩 상태 (상관계수 행렬 계산용)
  const [isCalculating, setIsCalculating] = useState(false)

  // 가정 검정 자동 실행 (Step 2: 데이터 탐색)
  useEffect(() => {
    if (!pyodideLoaded || !pyodideService) return
    if (!data || !validationResults) return
    if (numericVariables.length === 0) return

    // 중복 실행 방지
    assumptionRunId.current++
    const currentRunId = assumptionRunId.current

    // isActive 플래그를 effect 스코프에 선언 (cleanup에서 접근 가능)
    let isActive = true

    const timer = setTimeout(async () => {
      try {
        setIsAssumptionLoading(true)

        // 타입 안전한 페이로드 구성
        const payload: AssumptionPayload = {
          alpha: 0.05,
          normalityRule: 'any'
        }

        // 첫 번째 수치형 컬럼으로 정규성 검정
        const firstNumericCol = numericVariables[0]
        const values = data.map(row => parseFloat(String(row[firstNumericCol])))
          .filter(v => !isNaN(v))

        if (values.length >= 3) {
          payload.values = values
        }

        // 그룹이 여러 개 있으면 등분산성 검정
        if (categoricalVariables.length > 0) {
          const groupCol = categoricalVariables[0]
          const groups: number[][] = []

          const uniqueGroups = [...new Set(data.map(row => row[groupCol]))]
          for (const group of uniqueGroups) {
            const groupData = data
              .filter(row => row[groupCol] === group)
              .map(row => parseFloat(String(row[firstNumericCol])))
              .filter(v => !isNaN(v))

            if (groupData.length > 0) groups.push(groupData)
          }

          if (groups.length >= 2) {
            payload.groups = groups
          }
        }

        // 데이터가 없으면 호출 스킵
        if (!payload.values && !payload.groups) {
          logger.info('[DataExploration] 가정 검정 스킵: 유효한 데이터 없음')
          if (isActive && currentRunId === assumptionRunId.current) {
            setIsAssumptionLoading(false)
          }
          return
        }

        // 통계 가정 검정 실행
        const assumptions = await pyodideService.checkAllAssumptions(payload) as StatisticalAssumptions

        // 언마운트 체크: isActive가 false면 상태 업데이트 스킵
        if (isActive && currentRunId === assumptionRunId.current) {
          setLocalAssumptionResults(assumptions)
          setAssumptionResults(assumptions)
          logger.info('[DataExploration] 통계 가정 검정 완료', { summary: assumptions.summary })
        }
      } catch (error) {
        if (isActive) {
          logger.error('[DataExploration] 가정 검정 실패', { error })
        }
      } finally {
        // 언마운트 체크 후 로딩 상태 해제
        if (isActive && currentRunId === assumptionRunId.current) {
          setIsAssumptionLoading(false)
        }
      }
    }, 200)

    // Cleanup: 타이머 취소 + isActive 플래그 해제
    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [data, validationResults, pyodideLoaded, pyodideService, numericVariables, categoricalVariables, setAssumptionResults])

  // 비동기 데이터 로딩 대응: numericVariables 업데이트 시 기본 산점도 추가
  useEffect(() => {
    if (numericVariables.length >= 2 && scatterplots.length === 0) {
      setScatterplots([{
        id: '1',
        xVariable: numericVariables[0],
        yVariable: numericVariables[1]  // 단일 Y축
      }])
    }
  }, [numericVariables, scatterplots.length])

  // 변수 데이터 추출 (Raw - 필터링 없음, row index 유지)
  const getVariableDataRaw = useCallback((variableName: string): Array<number | null> => {
    return data.map(row => {
      const val = row[variableName]
      if (val === null || val === undefined || val === '') return null
      const num = Number(val)
      return isNaN(num) ? null : num
    })
  }, [data])

  // Row-wise pairwise deletion: X와 Y 모두 valid한 행만 유지
  const getPairedData = useCallback((var1: string, var2: string): { x: number[]; y: number[] } => {
    const raw1 = getVariableDataRaw(var1)
    const raw2 = getVariableDataRaw(var2)

    const paired: { x: number; y: number }[] = []
    for (let i = 0; i < Math.min(raw1.length, raw2.length); i++) {
      if (raw1[i] !== null && raw2[i] !== null) {
        paired.push({ x: raw1[i]!, y: raw2[i]! })
      }
    }

    return {
      x: paired.map(p => p.x),
      y: paired.map(p => p.y)
    }
  }, [getVariableDataRaw])

  // 새 Scatterplot 추가
  const addScatterplot = useCallback(() => {
    if (numericVariables.length < 2) return

    const newId = String(scatterplots.length + 1)
    const usedPairs = scatterplots.map(s => `${s.xVariable}-${s.yVariable}`)

    // 사용되지 않은 변수 조합 찾기
    let xVar = numericVariables[0]
    let yVar = numericVariables[1]

    for (const x of numericVariables) {
      for (const y of numericVariables) {
        if (x !== y && !usedPairs.includes(`${x}-${y}`)) {
          xVar = x
          yVar = y
          break
        }
      }
    }

    const newConfig: ScatterplotConfig = {
      id: newId,
      xVariable: xVar,
      yVariable: yVar
    }

    setScatterplots(prev => [...prev, newConfig])
  }, [numericVariables, scatterplots])

  // Scatterplot 삭제
  const removeScatterplot = useCallback((id: string) => {
    setScatterplots(prev => prev.filter(s => s.id !== id))
  }, [])

  // X축 변수 변경
  const updateXVariable = useCallback((id: string, newX: string) => {
    setScatterplots(prev => prev.map(s => {
      if (s.id !== id) return s
      // X=Y ��지: X가 현재 Y와 같으면 Y를 다른 변수로 변경
      const needNewY = s.yVariable === newX
      const newY = needNewY
        ? numericVariables.find(v => v !== newX) || s.yVariable
        : s.yVariable
      return { ...s, xVariable: newX, yVariable: newY }
    }))
  }, [numericVariables])

  // Y축 변수 변경 (단일 선택)
  const updateYVariable = useCallback((id: string, newY: string) => {
    setScatterplots(prev => prev.map(s =>
      s.id === id ? { ...s, yVariable: newY } : s
    ))
  }, [])



  // 상관계수 행렬 계산 (순수 함수 - 부작용 제거)
  const correlationMatrix = useMemo(() => {
    if (numericVariables.length < 2) {
      return []
    }

    const matrix: Array<{
      var1: string
      var2: string
      r: number
      r2: number
      strength: string
      color: string
    }> = []

    for (let i = 0; i < numericVariables.length; i++) {
      for (let j = i + 1; j < numericVariables.length; j++) {
        const var1 = numericVariables[i]
        const var2 = numericVariables[j]
        const { x: data1, y: data2 } = getPairedData(var1, var2)
        const { r, r2 } = calculateCorrelation(data1, data2)

        const absR = Math.abs(r)
        let strength = '약한'
        let color = 'bg-correlation-weak'

        if (absR >= 0.7) {
          strength = '매우 강한'
          color = 'bg-correlation-medium-neg'
        } else if (absR >= 0.5) {
          strength = '강한'
          color = 'bg-correlation-medium-neg dark:bg-orange-950'
        } else if (absR >= 0.3) {
          strength = '중간'
          color = 'bg-correlation-weak dark:bg-yellow-950'
        }

        matrix.push({ var1, var2, r, r2, strength, color })
      }
    }

    // 상관계수 절대값 내림차순 정렬
    return matrix.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  }, [numericVariables, getPairedData])

  // 로딩 상태 관리 (useEffect로 부작용 분리)
  useEffect(() => {
    if (numericVariables.length >= 2) {
      setIsCalculating(true)
      // 동기 계산이므로 즉시 완료
      const timer = setTimeout(() => setIsCalculating(false), 0)
      return () => clearTimeout(timer)
    } else {
      setIsCalculating(false)
    }
  }, [numericVariables.length])

  // 데이터 없을 때: 업로드 영역 표시
  if (!validationResults || !data || data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ChartScatter className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">데이터 탐색</h2>
        </div>

        {onUploadComplete && (
          <DataUploadStep
            onUploadComplete={onUploadComplete}
            existingFileName={existingFileName}
          />
        )}
      </div>
    )
  }

  // 수치형 변수 부족: 데이터 표시 + 경고
  if (numericVariables.length < 2) {
    return (
      <div className="space-y-6">
        {/* 헤더 + 다음 단계 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartScatter className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">데이터 탐색</h2>
          </div>
          <StepNavigation
            showNext={true}
            onNext={onNext}
            nextLabel="다음 단계로"
            disableNext={!canProceedToNext}
            className="mt-0 pt-0 border-t-0"
          />
        </div>

        <DataProfileSummary
          sampleSize={data.length}
          numericVars={numericVariables.length}
          categoricalVars={categoricalVariables.length}
          missingValues={validationResults.missingValues}
          totalCells={data.length * validationResults.columnCount}
          recommendedType={
            assumptionResults?.normality?.shapiroWilk?.isNormal === false
              ? 'nonparametric'
              : data.length >= 30
                ? 'parametric'
                : 'nonparametric'
          }
          status="warning"
          warnings={['수치형 변수가 2개 미만입니다. 상관분석이 제한됩니다.']}
          assumptionSummary={{
            normality: assumptionResults?.normality?.shapiroWilk?.isNormal ?? null,
            homogeneity: assumptionResults?.homogeneity?.levene?.equalVariance ?? null,
            isLoading: isAssumptionLoading
          }}
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">데이터 미리보기</CardTitle>
                <CardDescription>상위 {Math.min(20, data.length)}행</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenDataInNewWindow} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                전체 보기 ({data.length}행)
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataPreviewTable data={data} maxRows={20} defaultOpen={true} title="" height="300px" />
          </CardContent>
        </Card>

        <Card className="border-warning-border bg-warning-bg">
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              <p>상관분석에는 수치형 변수가 2개 이상 필요합니다.</p>
              <p className="text-sm mt-2">현재: 수치형 {numericVariables.length}개, 범주형 {categoricalVariables.length}개</p>
              <p className="text-sm mt-1">다음 단계에서 적합한 분석 방법을 선택할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 + 다음 단계 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartScatter className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">데이터 탐색</h2>
        </div>
        <StepNavigation
          showNext={true}
          onNext={onNext}
          nextLabel="다음 단계로"
          disableNext={!canProceedToNext}
          className="mt-0 pt-0 border-t-0"
        />
      </div>

      {/* 데이터 요약 (공통 컴포넌트) */}
      {validationResults && (
        <DataProfileSummary
          sampleSize={data.length}
          numericVars={numericVariables.length}
          categoricalVars={categoricalVariables.length}
          missingValues={validationResults.missingValues}
          totalCells={data.length * validationResults.columnCount}
          recommendedType={
            assumptionResults?.normality?.shapiroWilk?.isNormal === false
              ? 'nonparametric'
              : data.length >= 30
                ? 'parametric'
                : 'nonparametric'
          }
          status={
            !validationResults.isValid
              ? 'error'
              : (validationResults.warnings?.length || 0) > 0
                ? 'warning'
                : 'success'
          }
          errors={validationResults.errors}
          warnings={validationResults.warnings}
          assumptionSummary={{
            normality: assumptionResults?.normality?.shapiroWilk?.isNormal ?? null,
            homogeneity: assumptionResults?.homogeneity?.levene?.equalVariance ?? null,
            isLoading: isAssumptionLoading
          }}
        />
      )}

      {/* 메인 대시보드 탭 */}
      <Tabs defaultValue="variables" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="variables">
            <ListOrdered className="h-4 w-4 mr-2" />
            변수 상세 분석
          </TabsTrigger>
          <TabsTrigger value="correlation">
            <TrendingUp className="h-4 w-4 mr-2" />
            상관관계 분석
          </TabsTrigger>
        </TabsList>

        {/* 탭 1: 변수 갤러리 */}
        <TabsContent value="variables" className="mt-0 space-y-4">
          {/* 등분산성 검정 결과 (있을 경우) */}
          {assumptionResults?.homogeneity?.levene && (
            <div className="p-3 bg-white dark:bg-background rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">📏 등분산성 검정 (Levene)</span>
                <Badge variant={assumptionResults.homogeneity.levene.equalVariance ? "default" : "secondary"}>
                  {assumptionResults.homogeneity.levene.equalVariance ? '등분산' : '이분산'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">통계량: </span>
                  <span className="font-mono">{(assumptionResults.homogeneity.levene.statistic ?? 0).toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">p-value: </span>
                  <span className="font-mono">{(assumptionResults.homogeneity.levene.pValue ?? 0).toFixed(4)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {assumptionResults.homogeneity.levene.equalVariance
                  ? '✓ 등분산 가정을 만족합니다 (p ≥ 0.05).'
                  : '⚠ 등분산 가정을 만족하지 않습니다 (p < 0.05). Welch 검정 고려가 필요합니다.'}
              </p>
            </div>
          )}

          {/* 변수 갤러리 컴포넌트 */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ListOrdered className="h-4 w-4" />
                변수 목록
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                각 변수를 클릭하여 상세 통계와 분포를 확인하세요.
              </p>
            </div>
            <div className="p-4">
              <VariableGallery
                variables={allVariables}
                data={data}
                onVariableSelect={setSelectedVariable}
                selectedVariableId={selectedVariable?.name}
              />
            </div>
          </div>
        </TabsContent>

        {/* 탭 2: 상관관계 분석 (산점도 + 히트맵) */}
        <TabsContent value="correlation" className="mt-0 space-y-4">
          <Tabs defaultValue="scatterplots" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="scatterplots">
                <ChartScatter className="h-4 w-4 mr-2" />
                산점도
              </TabsTrigger>
              <TabsTrigger value="heatmap">
                <TrendingUp className="h-4 w-4 mr-2" />
                상관계수 행렬
              </TabsTrigger>
            </TabsList>

            {/* 산점도 탭 */}
            <TabsContent value="scatterplots" className="space-y-4">
              {scatterplots.map(config => {
                const { x: xData, y: yData } = getPairedData(config.xVariable, config.yVariable)
                const scatterData = xData.map((x, i) => ({ x, y: yData[i] }))
                const { r, r2 } = calculateCorrelation(xData, yData)

                return (
                  <Card key={config.id} className="overflow-hidden border-0 shadow-sm bg-card">
                    {/* 모던 헤더 - 변수 선택 영역 */}
                    <div className="px-5 py-4 border-b bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <ChartScatter className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">변수 관계 분석</span>
                        </div>
                        {scatterplots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScatterplot(config.id)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* 현대적 X → Y 변수 선택 UI */}
                      <div className="flex items-center gap-3">
                        {/* X축 선택 */}
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1.5 block">X축 (독립변수)</label>
                          <Select
                            value={config.xVariable}
                            onValueChange={(value) => updateXVariable(config.id, value)}
                          >
                            <SelectTrigger className="h-9 bg-background border-border/50 hover:border-primary/50 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {numericVariables.map(v => (
                                <SelectItem key={v} value={v} disabled={v === config.yVariable}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 화살표 */}
                        <div className="flex items-end pb-0.5">
                          <div className="p-2 rounded-full bg-primary/5">
                            <ArrowRight className="h-4 w-4 text-primary/70" />
                          </div>
                        </div>

                        {/* Y축 선택 */}
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1.5 block">Y축 (종속변수)</label>
                          <Select
                            value={config.yVariable}
                            onValueChange={(value) => updateYVariable(config.id, value)}
                          >
                            <SelectTrigger className="h-9 bg-background border-border/50 hover:border-primary/50 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {numericVariables.map(v => (
                                <SelectItem key={v} value={v} disabled={v === config.xVariable}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 상관계수 뱃지 바 */}
                    <div className="px-5 py-2.5 border-b bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">상관계수</span>
                          <Badge
                            variant={Math.abs(r) >= 0.7 ? "default" : Math.abs(r) >= 0.4 ? "secondary" : "outline"}
                            className="font-mono text-xs"
                          >
                            r = {r >= 0 ? '+' : ''}{r.toFixed(3)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">결정계수</span>
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            R² = {r2.toFixed(3)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          n = {xData.length}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Sparkles className="h-3 w-3" />
                        {Math.abs(r) >= 0.7 ? '강한 상관' : Math.abs(r) >= 0.4 ? '중간 상관' : '약한 상관'}
                      </Badge>
                    </div>

                    {/* 그래프 영역 */}
                    <CardContent className="p-5">
                      <Scatterplot
                        data={scatterData}
                        title={`${config.xVariable} vs ${config.yVariable}`}
                        xAxisLabel={config.xVariable}
                        yAxisLabel={config.yVariable}
                        showTrendLine={true}
                        correlationCoefficient={r}
                      />
                    </CardContent>
                  </Card>
                )
              })}

              {/* 산점도 추가 버튼 */}
              <button
                onClick={addScatterplot}
                disabled={scatterplots.length >= numericVariables.length}
                className="w-full py-3 border-2 border-dashed border-muted-foreground/20 rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">새 산점도 추가</span>
              </button>
            </TabsContent>

            {/* 히트맵 탭 */}
            <TabsContent value="heatmap">
              <Card>
                <CardHeader>
                  <CardTitle>상관계수 히트맵</CardTitle>
                  <CardDescription>
                    모든 수치형 변수 쌍의 상관관계를 시각화합니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isCalculating ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <div className="text-center">
                        <p className="text-sm font-medium">상관계수 계산 중...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {numericVariables.length}개 변수 분석
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 히트맵 시각화 */}
                      {numericVariables.length >= 2 && (
                        <CorrelationHeatmap
                          matrix={(() => {
                            // 상관계수 행렬 생성
                            const n = numericVariables.length
                            const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))
                            for (let i = 0; i < n; i++) {
                              matrix[i][i] = 1 // 대각선은 1
                              for (let j = i + 1; j < n; j++) {
                                const corr = correlationMatrix.find(
                                  c => (c.var1 === numericVariables[i] && c.var2 === numericVariables[j]) ||
                                    (c.var1 === numericVariables[j] && c.var2 === numericVariables[i])
                                )
                                const r = corr?.r ?? 0
                                matrix[i][j] = r
                                matrix[j][i] = r
                              }
                            }
                            return matrix
                          })()}
                          labels={numericVariables}
                          height={Math.max(350, numericVariables.length * 40)}
                        />
                      )}

                      {/* 해석 가이드 */}
                      <div className="mt-4 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="font-medium mb-1">💡 상관계수 해석:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div><span className="inline-block w-3 h-3 rounded bg-red-500 mr-1"></span> <strong>r ≈ +1</strong>: 강한 양의 상관</div>
                          <div><span className="inline-block w-3 h-3 rounded bg-blue-500 mr-1"></span> <strong>r ≈ -1</strong>: 강한 음의 상관</div>
                          <div><span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1"></span> <strong>r ≈ 0</strong>: 상관 없음</div>
                          <div><strong>|r| ≥ 0.7</strong>: 매우 강한 상관</div>
                        </div>
                      </div>

                      {/* 강한 상관관계 목록 */}
                      {correlationMatrix.filter(c => Math.abs(c.r) >= 0.5).length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">📌 주요 상관관계 (|r| ≥ 0.5)</p>
                          <div className="space-y-1">
                            {correlationMatrix
                              .filter(c => Math.abs(c.r) >= 0.5)
                              .slice(0, 5)
                              .map(({ var1, var2, r }) => (
                                <div key={`${var1}-${var2}`} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                  <span>{var1} ↔ {var2}</span>
                                  <Badge variant={Math.abs(r) >= 0.7 ? 'default' : 'secondary'}>
                                    r = {r >= 0 ? '+' : ''}{r.toFixed(3)}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* 변수 상세 패널 */}
      {selectedVariable && (
        <VariableDetailPanel
          variable={selectedVariable}
          data={data}
          onClose={() => setSelectedVariable(null)}
        />
      )}
    </div>
  )
})

export default DataExplorationStep
