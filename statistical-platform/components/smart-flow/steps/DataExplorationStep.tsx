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
import { X, ChartScatter, Loader2, ListOrdered, ArrowRight, Sparkles, ExternalLink, BarChart3, GitCommitHorizontal, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { OutlierDetailPanel, OutlierInfo } from '@/components/common/analysis/OutlierDetailPanel'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'

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
  const { uploadedFile, uploadedFileName } = useSmartFlowStore()
  // Note: setAssumptionResults는 useEffect에서 getState()로 직접 접근 (의존성 루프 방지)

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

  // 이상치 상세 모달 상태
  const [outlierModalOpen, setOutlierModalOpen] = useState(false)
  const [selectedOutlierVar, setSelectedOutlierVar] = useState<string | null>(null)

  // 데이터 미리보기 탭에서 하이라이트할 행들
  const [highlightedRows, setHighlightedRows] = useState<number[]>([])

  // 산점도/히트맵 탭 상태 (ContentTabs 스타일용)
  const [explorationTab, setExplorationTab] = useState<'scatterplots' | 'heatmap'>('scatterplots')
  const [highlightedColumn, setHighlightedColumn] = useState<string | undefined>(undefined)


  // 이상치가 포함된 행만 미리보기에서 확인하기 위한 필터링 데이터
  const highlightedPreview = useMemo(() => {
    if (highlightedRows.length === 0) {
      return { rows: [] as DataRow[], rowIndices: [] as number[] }
    }

    const sortedIndices = Array.from(new Set(highlightedRows)).sort((a, b) => a - b)
    const rows: DataRow[] = []
    const rowIndices: number[] = []

    sortedIndices.forEach(idx => {
      const row = data[idx - 1]
      if (row !== undefined) {
        rows.push(row)
        rowIndices.push(idx)
      }
    })

    return { rows, rowIndices }
  }, [data, highlightedRows])

  // 현재 활성 탭 (기초 통계량 / 데이터 미리보기)
  const [activeDataTab, setActiveDataTab] = useState<string>('statistics')

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

  // 이전 numericVariables 추적 (데이터셋 변경 감지용)
  const prevNumericVarsRef = useRef<string[]>([])

  // 히스토그램/박스플롯 선택 상태 추적용 ref (무한 루프 방지)
  const selectedHistogramVarRef = useRef(selectedHistogramVar)
  const selectedBoxplotVarsRef = useRef(selectedBoxplotVars)
  
  // ref 동기화
  useEffect(() => {
    selectedHistogramVarRef.current = selectedHistogramVar
  }, [selectedHistogramVar])
  
  useEffect(() => {
    selectedBoxplotVarsRef.current = selectedBoxplotVars
  }, [selectedBoxplotVars])

  // 차트 변수 초기화 및 데이터셋 변경 시 재동기화
  useEffect(() => {
    const prevVars = prevNumericVarsRef.current
    const currentVars = numericVariables
    const currentHistogramVar = selectedHistogramVarRef.current
    const currentBoxplotVars = selectedBoxplotVarsRef.current

    // 데이터셋이 변경되었는지 확인 (변수 목록이 다른 경우)
    const isDatasetChanged = prevVars.length > 0 && (
      prevVars.length !== currentVars.length ||
      !prevVars.every(v => currentVars.includes(v))
    )

    if (currentVars.length > 0) {
      // 히스토그램: 초기화 또는 데이터셋 변경 시 재설정
      if (currentHistogramVar === '' || isDatasetChanged || !currentVars.includes(currentHistogramVar)) {
        setSelectedHistogramVar(currentVars[0])
      }

      // 박스플롯: 초기화 또는 데이터셋 변경 시 재설정
      if (currentBoxplotVars.length === 0 || isDatasetChanged) {
        setSelectedBoxplotVars(currentVars.slice(0, Math.min(3, currentVars.length)))
      } else {
        // 기존 선택 중 유효하지 않은 변수 필터링
        const validVars = currentBoxplotVars.filter(v => currentVars.includes(v))
        if (validVars.length !== currentBoxplotVars.length) {
          setSelectedBoxplotVars(validVars.length > 0 ? validVars : currentVars.slice(0, Math.min(3, currentVars.length)))
        }
      }
    }

    // 현재 변수 목록 저장
    prevNumericVarsRef.current = currentVars
  }, [numericVariables])

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

  // 특정 변수의 이상치 상세 정보 계산
  const getOutlierDetails = useCallback((varName: string): {
    outliers: OutlierInfo[]
    statistics: {
      min: number
      q1: number
      median: number
      q3: number
      max: number
      mean?: number
      iqr: number
      lowerBound: number
      upperBound: number
      extremeLowerBound: number
      extremeUpperBound: number
    }
  } | null => {
    const values = getNumericValues(varName)
    if (values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length

    const q1 = getPercentile(sorted, 0.25) ?? 0
    const q3 = getPercentile(sorted, 0.75) ?? 0
    const median = getPercentile(sorted, 0.5) ?? 0
    const iqr = q3 - q1

    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    const extremeLowerBound = q1 - 3.0 * iqr
    const extremeUpperBound = q3 + 3.0 * iqr

    const mean = values.reduce((sum, v) => sum + v, 0) / n

    // 이상치 찾기 (행 번호 포함)
    const outliers: OutlierInfo[] = []
    data.forEach((row, idx) => {
      const val = row[varName]
      if (val === null || val === undefined || val === '') return
      const numVal = Number(val)
      if (isNaN(numVal)) return

      if (numVal < lowerBound || numVal > upperBound) {
        const isExtreme = numVal < extremeLowerBound || numVal > extremeUpperBound
        outliers.push({
          value: numVal,
          rowIndex: idx + 1, // 1-indexed
          isExtreme
        })
      }
    })

    return {
      outliers,
      statistics: {
        min: sorted[0],
        q1,
        median,
        q3,
        max: sorted[n - 1],
        mean,
        iqr,
        lowerBound,
        upperBound,
        extremeLowerBound,
        extremeUpperBound
      }
    }
  }, [data, getNumericValues, getPercentile])

  // 이상치 모달 열기 핸들러
  const handleOpenOutlierModal = useCallback((varName: string) => {
    setSelectedOutlierVar(varName)
    setOutlierModalOpen(true)
  }, [])

  // 이상치 데이터에서 보기 핸들러
  const handleViewOutliersInData = useCallback((rowIndices: number[]) => {
    setHighlightedRows(rowIndices)
    setHighlightedColumn(selectedOutlierVar ?? undefined)
    setActiveDataTab('preview')
  }, [selectedOutlierVar])

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
    // 데이터가 없거나 수치형 변수가 없으면 결과 초기화
    if (!data || !validationResults || numericVariables.length === 0) {
      // 이미 null이면 setState 호출 스킵 (무한 루프 방지)
      if (assumptionResults !== null) {
        setLocalAssumptionResults(null)
      }
      if (useSmartFlowStore.getState().assumptionResults !== null) {
        useSmartFlowStore.getState().setAssumptionResults(null)
      }
      return
    }

    // Pyodide 미로드 시: 결과 초기화하고 대기 (로딩 완료 시 재실행됨)
    if (!pyodideLoaded || !pyodideService) {
      // 이미 null이면 setState 호출 스킵 (무한 루프 방지)
      if (assumptionResults !== null) {
        setLocalAssumptionResults(null)
      }
      if (useSmartFlowStore.getState().assumptionResults !== null) {
        useSmartFlowStore.getState().setAssumptionResults(null)
      }
      return
    }

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

        // 데이터가 없으면 호출 스킵 + 결과 초기화
        if (!payload.values && !payload.groups) {
          logger.info('[DataExploration] 가정 검정 스킵: 유효한 데이터 없음')
          if (isActive && currentRunId === assumptionRunId.current) {
            setLocalAssumptionResults(null)
            useSmartFlowStore.getState().setAssumptionResults(null)
            setIsAssumptionLoading(false)
          }
          return
        }

        // 통계 가정 검정 실행
        const assumptions = await pyodideService.checkAllAssumptions(payload) as StatisticalAssumptions

        // 언마운트 체크: isActive가 false면 상태 업데이트 스킵
        if (isActive && currentRunId === assumptionRunId.current) {
          setLocalAssumptionResults(assumptions)
          useSmartFlowStore.getState().setAssumptionResults(assumptions)
          logger.info('[DataExploration] 통계 가정 검정 완료', { summary: assumptions.summary })
        }
      } catch (error) {
        if (isActive) {
          logger.error('[DataExploration] 가정 검정 실패', { error })
          // 에러 시에도 결과 초기화
          setLocalAssumptionResults(null)
          useSmartFlowStore.getState().setAssumptionResults(null)
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
  }, [data, validationResults, pyodideLoaded, pyodideService, numericVariables, categoricalVariables, assumptionResults]) // assumptionResults 추가 (null 체크로 무한 루프 방지)

  // 산점도 상태 추적용 ref (무한 루프 방지)
  const scatterplotsRef = useRef(scatterplots)
  useEffect(() => {
    scatterplotsRef.current = scatterplots
  }, [scatterplots])

  // 산점도 초기화 및 데이터셋 변경 시 재동기화
  useEffect(() => {
    const currentScatterplots = scatterplotsRef.current

    if (numericVariables.length < 2) {
      // 수치형 변수가 2개 미만이면 산점도 초기화
      if (currentScatterplots.length > 0) {
        setScatterplots([])
      }
      return
    }

    // 산점도가 없으면 초기화
    if (currentScatterplots.length === 0) {
      setScatterplots([{
        id: '1',
        xVariable: numericVariables[0],
        yVariable: numericVariables[1]
      }])
      return
    }

    // 기존 산점도의 변수가 유효한지 검증 및 재설정
    const updatedScatterplots = currentScatterplots.map(sp => {
      const xValid = numericVariables.includes(sp.xVariable)
      const yValid = numericVariables.includes(sp.yVariable)

      if (xValid && yValid) {
        return sp // 변경 없음
      }

      // 유효하지 않은 변수 대체
      const newX = xValid ? sp.xVariable : numericVariables[0]
      const newY = yValid && newX !== sp.yVariable
        ? sp.yVariable
        : numericVariables.find(v => v !== newX) || numericVariables[1]

      return { ...sp, xVariable: newX, yVariable: newY }
    })

    // 변경이 있을 때만 업데이트
    const hasChanges = updatedScatterplots.some((sp, i) =>
      sp.xVariable !== currentScatterplots[i].xVariable || sp.yVariable !== currentScatterplots[i].yVariable
    )
    if (hasChanges) {
      setScatterplots(updatedScatterplots)
    }
  }, [numericVariables]) // scatterplots 의존성 제거

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

      {/* 기초 통계량 / 데이터 미리보기 탭 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              데이터 요약
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDataInNewWindow}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              전체 데이터 보기 ({data.length}행)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDataTab} onValueChange={setActiveDataTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="statistics">
                <ListOrdered className="h-4 w-4 mr-2" />
                기초 통계량
              </TabsTrigger>
              <TabsTrigger value="preview">
                <BarChart3 className="h-4 w-4 mr-2" />
                데이터 미리보기
                {highlightedRows.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {highlightedRows.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 기초 통계량 탭 */}
            <TabsContent value="statistics" className="mt-0">
              <div className="space-y-4">
                {/* 이상치 요약 배너 */}

                {(() => {

                  const varsWithOutliers = numericDistributions

                    .filter(v => v.outlierCount > 0)

                    .sort((a, b) => b.outlierCount - a.outlierCount)

                  const totalOutliers = numericDistributions.reduce((sum, v) => sum + v.outlierCount, 0)



                  if (totalOutliers === 0) return null



                  return (

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">

                      <div className="flex items-start gap-2">

                        <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>

                        <div className="text-sm leading-5">

                          <div className="font-medium text-yellow-800 dark:text-yellow-200">

                            ⚠️ 이상치 감지: {varsWithOutliers.length}개 변수에서 총 {totalOutliers}개

                          </div>

                          {varsWithOutliers.length > 0 && (

                            <div className="mt-1 text-yellow-700 dark:text-yellow-300 text-xs">

                              {varsWithOutliers.slice(0, 5).map(v => `${v.name}(${v.outlierCount}개)`).join(', ')}

                              {varsWithOutliers.length > 5 && ` 외 ${varsWithOutliers.length - 5}개 변수`}

                            </div>

                          )}

                        </div>

                      </div>

                    </div>

                  )

                })()}

                <div className="overflow-x-auto max-h-[400px] border rounded-lg">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">

                      <tr className="border-b">

                        <th className="text-left p-2 font-semibold whitespace-nowrap">변수명</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">N</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">평균</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">표준편차</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">중앙값</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">최소</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">최대</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">Q1</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">Q3</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">왜도</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">첨도</th>

                        <th className="text-right p-2 font-semibold whitespace-nowrap">이상치</th>

                      </tr>

                    </thead>


                    <tbody>
                      {numericDistributions.map(col => {
                        const skewWarning = col.skewness !== undefined && Math.abs(col.skewness) > 2
                        const kurtWarning = col.kurtosis !== undefined && Math.abs(col.kurtosis) > 7

                        return (
                          <tr key={col.name} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium whitespace-nowrap">{col.name}</td>
                            <td className="p-2 text-right">{col.n}</td>
                            <td className="p-2 text-right">{formatStat(col.mean)}</td>
                            <td className="p-2 text-right">{formatStat(col.std)}</td>
                            <td className="p-2 text-right">{formatStat(col.median)}</td>
                            <td className="p-2 text-right">{formatStat(col.min)}</td>
                            <td className="p-2 text-right">{formatStat(col.max)}</td>
                            <td className="p-2 text-right">{formatStat(col.q1)}</td>
                            <td className="p-2 text-right">{formatStat(col.q3)}</td>
                            <td className={`p-2 text-right ${skewWarning ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}`}>
                              {formatStat(col.skewness)}
                              {skewWarning && ' ⚠'}
                            </td>
                            <td className={`p-2 text-right ${kurtWarning ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}`}>
                              {formatStat(col.kurtosis)}
                              {kurtWarning && ' ⚠'}
                            </td>
                            <td className="p-2 text-right">
                              {col.outlierCount > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                                  onClick={() => handleOpenOutlierModal(col.name)}
                                >
                                  {col.outlierCount}개
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>



                  </table>
                </div>

                {/* 해석 가이드 */}
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-medium mb-1">💡 해석 기준:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><strong>왜도</strong>: |값| &gt; 2 → 심한 비대칭 (⚠ 표시)</div>
                    <div><strong>첨도</strong>: |값| &gt; 7 → 극단값 많음 (⚠ 표시)</div>
                    <div><strong>이상치</strong>: IQR × 1.5 범위 벗어난 값</div>
                    <div><strong>N</strong>: 유효한 값의 개수 (결측 제외)</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 데이터 미리보기 탭 */}
            <TabsContent value="preview" className="mt-0">
              <div className="space-y-4">
                {/* 하이라이트된 행이 있으면 해당 행들만 표시 */}
                {highlightedRows.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-yellow-600 dark:text-yellow-400">●</span>
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                          {highlightedColumn} 변수의 이상치 {highlightedRows.length}개가 강조 표시되었습니다
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHighlightedRows([])
                          setHighlightedColumn(undefined)
                        }}
                      >
                        하이라이트 해제
                      </Button>
                    </div>
                    {highlightedPreview.rowIndices.length > 0 ? (
                      <DataPreviewTable
                        data={highlightedPreview.rows}
                        maxRows={highlightedPreview.rows.length || 1}
                        defaultOpen={true}
                        title=""
                        height="400px"
                        rowIndices={highlightedPreview.rowIndices}
                        highlightRows={highlightedPreview.rowIndices}
                        highlightColumn={highlightedColumn}
                      />
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground border rounded-md bg-muted/30">
                        선택한 행을 찾을 수 없습니다. 데이터가 변경되었는지 확인해주세요.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* 10행 이하: 전체 표시 / 10행 초과: 상위 5 + 생략 + 하위 5 */}
                    {data.length <= 10 ? (
                      <DataPreviewTable
                        data={data}
                        maxRows={10}
                        defaultOpen={true}
                        title=""
                        height="auto"
                      />
                    ) : (
                      (() => {
                        const topRows = data.slice(0, 5)
                        const bottomRows = data.slice(-5)
                        const omittedCount = data.length - 10

                        // 행 번호 배열: 상위 1-5, 하위 (n-4)~n
                        const indices = [1, 2, 3, 4, 5].concat(
                          [...Array(5).keys()].map(i => data.length - 4 + i)
                        )

                        return (
                          <DataPreviewTable
                            data={[...topRows, ...bottomRows]}
                            maxRows={10}
                            defaultOpen={true}
                            title=""
                            height="auto"
                            omittedRows={omittedCount}
                            omitAfterIndex={4}
                            rowIndices={indices}
                          />
                        )
                      })()
                    )}
                  </>
                )}

                {/* 전체 보기 안내 */}
                <div className="text-center text-sm text-muted-foreground py-2">
                  전체 데이터({data.length}행)를 보려면 상단의 &quot;전체 데이터 보기&quot; 버튼을 클릭하세요.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 가정 검정 결과 카드 */}
      {isAssumptionLoading && (
        <Card className="border-highlight-border bg-highlight-bg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              통계적 가정 검증 중...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              정규성, 등분산성 검정을 수행하고 있습니다. 잠시만 기다려주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {!isAssumptionLoading && assumptionResults && (
        <Card className="border-highlight-border bg-highlight-bg">
          <CardHeader>
            <CardTitle className="text-base">🔍 통계적 가정 검증</CardTitle>
            <CardDescription>
              이 결과를 바탕으로 적절한 통계 검정 방법을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* 정규성 검정 결과 */}
              {assumptionResults.normality?.shapiroWilk && (
                <div className="p-3 bg-white dark:bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">📊 정규성 검정 (Shapiro-Wilk)</span>
                    <Badge variant={assumptionResults.normality.shapiroWilk.isNormal ? "default" : "secondary"}>
                      {assumptionResults.normality.shapiroWilk.isNormal ? '정규분포' : '비정규분포'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">통계량: </span>
                      <span className="font-mono">{(assumptionResults.normality.shapiroWilk.statistic ?? 0).toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">p-value: </span>
                      <span className="font-mono">{(assumptionResults.normality.shapiroWilk.pValue ?? 0).toFixed(4)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {assumptionResults.normality.shapiroWilk.isNormal
                      ? '✓ 정규분포 가정을 만족합니다 (p ≥ 0.05). 모수 검정 사용 가능합니다.'
                      : '⚠ 정규분포 가정을 만족하지 않습니다 (p < 0.05). 비모수 검정 고려가 필요합니다.'}
                  </p>
                </div>
              )}

              {/* 등분산성 검정 결과 */}
              {assumptionResults.homogeneity?.levene && (
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 분포 시각화 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            데이터 분포 시각화
          </CardTitle>
          <CardDescription>
            수치형 변수들의 분포를 히스토그램 또는 박스플롯으로 확인합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 차트 타입 선택 (외부 상태로 관리) */}
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'histogram' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('histogram')}
              className="text-xs"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              히스토그램
            </Button>
            <Button
              variant={chartType === 'boxplot' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('boxplot')}
              className="text-xs"
            >
              <GitCommitHorizontal className="h-3 w-3 mr-1" />
              박스플롯
            </Button>
          </div>

          {/* 히스토그램 모드: 단일 변수 선택 */}
          {chartType === 'histogram' && (
            <>
              <div className="flex flex-wrap gap-1">
                {numericVariables.slice(0, 8).map(varName => (
                  <Button
                    key={varName}
                    variant={selectedHistogramVar === varName ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedHistogramVar(varName)}
                    className="text-xs"
                  >
                    {varName}
                  </Button>
                ))}
              </div>
              {selectedHistogramVar && (() => {
                const colData = data
                  .map(row => row[selectedHistogramVar])
                  .filter(v => v !== null && v !== undefined && v !== '')
                  .map(Number)
                  .filter(v => !isNaN(v))

                if (colData.length === 0) return null

                const sortedData = [...colData].sort((a, b) => a - b)
                const q1Index = Math.floor(sortedData.length * 0.25)
                const q3Index = Math.floor(sortedData.length * 0.75)
                const q1 = sortedData[q1Index] || 0
                const q3 = sortedData[q3Index] || 0
                const iqr = q3 - q1
                const lowerBound = q1 - 1.5 * iqr
                const upperBound = q3 + 1.5 * iqr
                const outliers = colData.filter(v => v < lowerBound || v > upperBound)

                return (
                  <div className="space-y-4">
                    <Histogram
                      data={colData}
                      title={`${selectedHistogramVar} 분포`}
                      xAxisLabel={selectedHistogramVar}
                      yAxisLabel="빈도"
                      bins={10}
                      showCard={false}
                    />
                    {outliers.length > 0 && (
                      <div className="text-xs bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 p-3 rounded-lg">
                        <span className="font-medium">이상치:</span> {outliers.length}개 발견 (범위: &lt;{lowerBound.toFixed(2)} 또는 &gt;{upperBound.toFixed(2)})
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}

          {/* 박스플롯 모드: 다중 변수 선택 */}
          {chartType === 'boxplot' && (
            <>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">변수를 클릭하여 비교할 변수를 선택하세요 (최대 8개)</p>
                <div className="flex flex-wrap gap-1">
                  {numericVariables.slice(0, 8).map(varName => (
                    <Button
                      key={varName}
                      variant={selectedBoxplotVars.includes(varName) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleBoxplotVar(varName)}
                      className="text-xs"
                    >
                      {selectedBoxplotVars.includes(varName) && <span className="mr-1">✓</span>}
                      {varName}
                    </Button>
                  ))}
                </div>
              </div>
              {boxplotMultiData.length > 0 && (
                <BoxPlot
                  data={boxplotMultiData as Array<{name: string; min: number; q1: number; median: number; q3: number; max: number; mean: number; std: number; outliers: number[]}>}
                  title={selectedBoxplotVars.length === 1
                    ? `${selectedBoxplotVars[0]} 박스플롯`
                    : `변수 분포 비교 (${selectedBoxplotVars.length}개)`}
                  showMean={true}
                  showOutliers={true}
                  height={350}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ContentTabs: 산점도 vs 상관 히트맵 */}
      <div className="w-full">
        <ContentTabs
          tabs={[
            { id: 'scatterplots', label: '산점도', icon: ChartScatter },
            { id: 'heatmap', label: '상관 히트맵', icon: Flame }
          ]}
          activeTab={explorationTab}
          onTabChange={(id) => setExplorationTab(id as 'scatterplots' | 'heatmap')}
          className="mb-4"
        />

        {/* 산점도 Tab Content */}
        <ContentTabsContent show={explorationTab === 'scatterplots'}>
          <div className="space-y-4">
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
          </div>
        </ContentTabsContent>

        {/* 상관 히트맵 Tab Content */}
        <ContentTabsContent show={explorationTab === 'heatmap'}>
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
                    <p className="font-medium mb-1">상관계수 해석:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div><span className="inline-block w-3 h-3 rounded bg-red-500 mr-1"></span> <strong>r = +1</strong>: 강한 양의 상관</div>
                      <div><span className="inline-block w-3 h-3 rounded bg-blue-500 mr-1"></span> <strong>r = -1</strong>: 강한 음의 상관</div>
                      <div><span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1"></span> <strong>r = 0</strong>: 상관 없음</div>
                      <div><strong>|r| &gt;= 0.7</strong>: 매우 강한 상관</div>
                    </div>
                  </div>

                  {/* 강한 상관관계 목록 */}
                  {correlationMatrix.filter(c => Math.abs(c.r) >= 0.5).length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">주요 상관관계 (|r| &gt;= 0.5)</p>
                      <div className="space-y-1">
                        {correlationMatrix
                          .filter(c => Math.abs(c.r) >= 0.5)
                          .slice(0, 5)
                          .map(({ var1, var2, r }) => (
                            <div key={`${var1}-${var2}`} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                              <span>{var1} - {var2}</span>
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
        </ContentTabsContent>
      </div>

      {/* 이상치 상세 모달 */}
      {selectedOutlierVar && (() => {
        const details = getOutlierDetails(selectedOutlierVar)
        if (!details) return null

        return (
          <OutlierDetailPanel
            open={outlierModalOpen}
            onOpenChange={setOutlierModalOpen}
            variableName={selectedOutlierVar}
            outliers={details.outliers}
            statistics={details.statistics}
            onViewInData={handleViewOutliersInData}
          />
        )
      })()}

    </div>
  )
})

export default DataExplorationStep
