'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { CrossTabulationVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  GitBranch,
  Calculator,
  PieChart,
  Info,
  BarChart3,
  Grid3X3,
  Percent,
  AlertCircle
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { FisherExactTestResult } from '@/types/pyodide-results'

function computeOddsRatioCI95(table2x2: number[][]) {
  const a0 = table2x2[0]?.[0] ?? 0
  const b0 = table2x2[0]?.[1] ?? 0
  const c0 = table2x2[1]?.[0] ?? 0
  const d0 = table2x2[1]?.[1] ?? 0

  // Haldane–Anscombe correction for zero cells
  const hasZero = [a0, b0, c0, d0].some(v => v === 0)
  const a = hasZero ? a0 + 0.5 : a0
  const b = hasZero ? b0 + 0.5 : b0
  const c = hasZero ? c0 + 0.5 : c0
  const d = hasZero ? d0 + 0.5 : d0

  const oddsRatio = (a * d) / (b * c)
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
  const z975 = 1.959963984540054 // 95% CI
  const logOr = Math.log(oddsRatio)
  const ciLower = Math.exp(logOr - z975 * se)
  const ciUpper = Math.exp(logOr + z975 * se)

  return { oddsRatio, ciLower, ciUpper }
}

interface CrossTabCell {
  rowCategory: string
  colCategory: string
  observed: number
  expected?: number
  rowPercent: number
  colPercent: number
  totalPercent: number
  standardizedResidual?: number
}

interface CrossTabResults {
  rowVariable: string
  colVariable: string
  data: CrossTabCell[]
  rowTotals: Array<{
    category: string
    count: number
    percent: number
  }>
  colTotals: Array<{
    category: string
    count: number
    percent: number
  }>
  grandTotal: number
  chiSquareTest?: {
    statistic: number
    pValue: number
    df: number
    criticalValue: number
    isSignificant: boolean
    cramersV: number
  }
  fishersExactTest?: {
    pValue: number
    oddsRatio: number
    ciLower: number
    ciUpper: number
  }
}

// interface SelectedVariables {
//   dependent: string
//   independent: string
// }
// → types/statistics.ts의 CrossTabulationVariables 사용

export default function CrossTabulationPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('cross-tabulation')
  }, [])

  const { state, actions } = useStatisticsPage<CrossTabResults, CrossTabulationVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
  const [activeTab, setActiveTab] = useState('summary')

  // 입력 모드 (원시데이터 vs 빈도표 직접 입력)
  const [inputMode, setInputMode] = useState<'raw' | 'matrix'>('raw')
  const [manualRowVariable, setManualRowVariable] = useState('행')
  const [manualColVariable, setManualColVariable] = useState('열')
  const [manualRowLabels, setManualRowLabels] = useState<string[]>(['A', 'B'])
  const [manualColLabels, setManualColLabels] = useState<string[]>(['X', 'Y'])
  const [manualObservedMatrix, setManualObservedMatrix] = useState<number[][]>([
    [10, 5],
    [3, 12]
  ])

  // 분석 옵션
  const [showExpected, setShowExpected] = useState(true)
  const [showResiduals, setShowResiduals] = useState(false)
  const [includeChiSquare, setIncludeChiSquare] = useState(true)
  const [includeFisher, setIncludeFisher] = useState(false)
  const [percentageType, setPercentageType] = useState('total')

  // Matrix 모드에서는 2x2가 아닐 때 Fisher 옵션 자동 해제
  useEffect(() => {
    if (inputMode !== 'matrix') return
    const is2x2 = manualRowLabels.length === 2 && manualColLabels.length === 2
    if (!is2x2 && includeFisher) setIncludeFisher(false)
  }, [inputMode, manualRowLabels.length, manualColLabels.length, includeFisher])

  // 단계 정의
  const steps: StatisticsStep[] = inputMode === 'raw'
    ? [
      {
        id: 'upload',
        number: 1,
        title: '데이터 업로드',
        description: 'CSV 파일 업로드',
        status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
      },
      {
        id: 'select-variables',
        number: 2,
        title: '변수 선택',
        description: '두 범주형 변수 선택',
        status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
      },
      {
        id: 'configure-options',
        number: 3,
        title: '분석 옵션',
        description: '교차표 형식 및 검정 설정',
        status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
      },
      {
        id: 'view-results',
        number: 4,
        title: '결과 확인',
        description: '교차표 및 통계 검정 결과',
        status: currentStep === 3 ? 'current' : 'pending'
      }
    ]
    : [
      {
        id: 'input-matrix',
        number: 1,
        title: '빈도표 입력',
        description: 'RxC 관측도수 행렬 입력',
        status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
      },
      {
        id: 'configure-options',
        number: 2,
        title: '분석 옵션',
        description: '교차표 형식 및 검정 설정',
        status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
      },
      {
        id: 'view-results',
        number: 3,
        title: '결과 확인',
        description: '교차표 및 통계 검정 결과',
        status: currentStep === 2 ? 'current' : 'pending'
      }
    ]

  // 분석 실행
  const handleAnalysis = useCallback(async () => {
    actions.startAnalysis()

    try {
      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      let rowVar = ''
      let colVar = ''
      let rowCategories: string[] = []
      let colCategories: string[] = []
      let observedMatrix: number[][] = []

      if (inputMode === 'raw') {
        if (!uploadedData || !selectedVariables) {
          actions.setError('데이터 업로드 및 변수 선택을 먼저 완료해주세요.')
          return
        }

        // 변수 추출
        rowVar = typeof selectedVariables.dependent === 'string'
          ? selectedVariables.dependent
          : Array.isArray(selectedVariables.dependent)
            ? selectedVariables.dependent[0]
            : ''

        colVar = typeof selectedVariables.independent === 'string'
          ? selectedVariables.independent
          : Array.isArray(selectedVariables.independent)
            ? selectedVariables.independent[0]
            : ''

        if (!rowVar || !colVar) {
          actions.setError('행 변수와 열 변수를 모두 선택해주세요.')
          return
        }

        const isMissing = (v: unknown) => v === null || v === undefined || v === ''

        // 교차표 생성 (결측은 제외)
        const crosstab = new Map<string, Map<string, number>>()
        for (const row of uploadedData.data) {
          const rowValue = (row as Record<string, unknown>)[rowVar]
          const colValue = (row as Record<string, unknown>)[colVar]
          if (isMissing(rowValue) || isMissing(colValue)) continue

          const rowCat = String(rowValue)
          const colCat = String(colValue)
          if (!crosstab.has(rowCat)) crosstab.set(rowCat, new Map())
          const inner = crosstab.get(rowCat)!
          inner.set(colCat, (inner.get(colCat) ?? 0) + 1)
        }

        rowCategories = [...crosstab.keys()]
        const colSet = new Set<string>()
        for (const inner of crosstab.values()) {
          for (const colKey of inner.keys()) colSet.add(colKey)
        }
        colCategories = [...colSet]
        observedMatrix = rowCategories.map(rowCat =>
          colCategories.map(colCat => crosstab.get(rowCat)?.get(colCat) ?? 0)
        )
      } else {
        rowVar = manualRowVariable.trim() || '행'
        colVar = manualColVariable.trim() || '열'
        rowCategories = manualRowLabels.map(v => v.trim())
        colCategories = manualColLabels.map(v => v.trim())
        observedMatrix = manualObservedMatrix.map(row => row.map(v => (Number.isFinite(v) ? v : 0)))
      }

      // 기본 검증
      if (rowCategories.some(v => !v) || colCategories.some(v => !v)) {
        actions.setError('행/열 범주 라벨은 비어있을 수 없습니다.')
        return
      }
      if (new Set(rowCategories).size !== rowCategories.length || new Set(colCategories).size !== colCategories.length) {
        actions.setError('행/열 범주 라벨에 중복이 있습니다.')
        return
      }
      if (rowCategories.length < 2 || colCategories.length < 2) {
        actions.setError('행/열 범주는 각각 최소 2개 이상이어야 합니다.')
        return
      }
      if (observedMatrix.length !== rowCategories.length) {
        actions.setError('행 범주 수와 행렬 행 수가 일치하지 않습니다.')
        return
      }
      if (observedMatrix.some(r => r.length !== colCategories.length)) {
        actions.setError('열 범주 수와 행렬 열 수가 일치하지 않습니다.')
        return
      }
      if (observedMatrix.some(r => r.some(v => !Number.isFinite(v) || v < 0))) {
        actions.setError('관측도수는 0 이상의 숫자여야 합니다.')
        return
      }

      const grandTotal = observedMatrix.flat().reduce((sum, v) => sum + v, 0)
      if (grandTotal <= 0) {
        actions.setError('총 사례 수가 0입니다. 관측도수를 입력해주세요.')
        return
      }
      const rowTotals = observedMatrix.map(row => row.reduce((sum, v) => sum + v, 0))
      const colTotals = colCategories.map((_, colIdx) =>
        observedMatrix.reduce((sum, row) => sum + row[colIdx], 0)
      )

      // Expected matrix (JS 계산; chi-square 결과가 있으면 worker expected로 덮어씀)
      const jsExpectedMatrix = observedMatrix.map((row, rowIdx) =>
        row.map((_, colIdx) => (rowTotals[rowIdx] * colTotals[colIdx]) / grandTotal)
      )

      let chiSquareTest: CrossTabResults['chiSquareTest'] | undefined
      let expectedMatrixForCells: number[][] = jsExpectedMatrix

      if (includeChiSquare) {
        const chiResult = await pyodideCore.callWorkerMethod<{
          chiSquare: number
          pValue: number
          degreesOfFreedom: number
          criticalValue: number
          reject: boolean
          cramersV: number
          observedMatrix: number[][]
          expectedMatrix: number[][]
        }>(
          PyodideWorker.Hypothesis,
          'chi_square_independence_test',
          { observedMatrix, yatesCorrection: false, alpha: 0.05 }
        )

        expectedMatrixForCells = chiResult.expectedMatrix
        chiSquareTest = {
          statistic: chiResult.chiSquare,
          pValue: chiResult.pValue,
          df: chiResult.degreesOfFreedom,
          criticalValue: chiResult.criticalValue,
          isSignificant: chiResult.reject,
          cramersV: chiResult.cramersV
        }
      }

      let fishersExactTest: CrossTabResults['fishersExactTest'] | undefined
      const is2x2Table = rowCategories.length === 2 && colCategories.length === 2
      if (includeFisher && is2x2Table) {
        const fisherResult = await pyodideCore.callWorkerMethod<FisherExactTestResult>(
          PyodideWorker.Hypothesis,
          'fisher_exact_test',
          { table: observedMatrix, alternative: 'two-sided', alpha: 0.05 }
        )

        const { oddsRatio, ciLower, ciUpper } = computeOddsRatioCI95(observedMatrix)
        fishersExactTest = {
          pValue: fisherResult.pValue,
          oddsRatio: fisherResult.oddsRatio ?? oddsRatio,
          ciLower,
          ciUpper
        }
      }

      const data: CrossTabCell[] = []
      rowCategories.forEach((rowCat, rowIdx) => {
        colCategories.forEach((colCat, colIdx) => {
          const observed = observedMatrix[rowIdx][colIdx]
          const expected = expectedMatrixForCells[rowIdx]?.[colIdx] ?? jsExpectedMatrix[rowIdx][colIdx]
          const residual = expected > 0 ? observed - expected : 0
          const stdResidual = expected > 0 ? residual / Math.sqrt(expected) : 0

          data.push({
            rowCategory: rowCat,
            colCategory: colCat,
            observed,
            expected,
            rowPercent: rowTotals[rowIdx] > 0 ? (observed / rowTotals[rowIdx]) * 100 : 0,
            colPercent: colTotals[colIdx] > 0 ? (observed / colTotals[colIdx]) * 100 : 0,
            totalPercent: (observed / grandTotal) * 100,
            standardizedResidual: stdResidual
          })
        })
      })

      const analysisResult: CrossTabResults = {
        rowVariable: rowVar,
        colVariable: colVar,
        data,
        rowTotals: rowCategories.map((cat, idx) => ({
          category: cat,
          count: rowTotals[idx],
          percent: (rowTotals[idx] / grandTotal) * 100
        })),
        colTotals: colCategories.map((cat, idx) => ({
          category: cat,
          count: colTotals[idx],
          percent: (colTotals[idx] / grandTotal) * 100
        })),
        grandTotal,
        chiSquareTest,
        fishersExactTest
      }

      actions.completeAnalysis(analysisResult, inputMode === 'raw' ? 3 : 2)
      setActiveTab('summary')
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    }
  }, [
    actions,
    includeChiSquare,
    includeFisher,
    inputMode,
    manualColLabels,
    manualColVariable,
    manualObservedMatrix,
    manualRowLabels,
    manualRowVariable,
    selectedVariables,
    uploadedData
  ])

  // 단계 변경 처리
  const handleStepChange = (step: number) => {
    if (step <= currentStep + 1) {
      actions.setCurrentStep(step)
    }
  }

  // 초기화
  const handleReset = () => {
    actions.reset()
    setActiveTab('summary')
  }

  // 데이터 업로드 핸들러
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(1)
    },
    'cross-tabulation'
  )

  // 변수 선택 핸들러
  const handleVariablesSelected = createVariableSelectionHandler<CrossTabulationVariables>(
    actions.setSelectedVariables,
    () => {
      actions.setCurrentStep(2)
    },
    'cross-tabulation'
  )

  const handleInputModeChange = useCallback((mode: 'raw' | 'matrix') => {
    setInputMode(mode)
    actions.reset()
    setActiveTab('summary')
    setShowExpected(true)
    setShowResiduals(false)
    setIncludeChiSquare(true)
    setIncludeFisher(false)
    setPercentageType('total')
  }, [actions])

  const updateManualCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    const parsed = Math.max(0, parseInt(value, 10) || 0)
    setManualObservedMatrix(prev =>
      prev.map((row, r) =>
        r === rowIdx
          ? row.map((cell, c) => (c === colIdx ? parsed : cell))
          : row
      )
    )
  }, [])

  const addManualRow = useCallback(() => {
    setManualRowLabels(prev => [...prev, `R${prev.length + 1}`])
    setManualObservedMatrix(prev => [...prev, Array.from({ length: manualColLabels.length }, () => 0)])
  }, [manualColLabels.length])

  const removeManualRow = useCallback(() => {
    setManualRowLabels(prev => (prev.length > 2 ? prev.slice(0, -1) : prev))
    setManualObservedMatrix(prev => (prev.length > 2 ? prev.slice(0, -1) : prev))
  }, [])

  const addManualCol = useCallback(() => {
    setManualColLabels(prev => [...prev, `C${prev.length + 1}`])
    setManualObservedMatrix(prev => prev.map(row => [...row, 0]))
  }, [])

  const removeManualCol = useCallback(() => {
    setManualColLabels(prev => (prev.length > 2 ? prev.slice(0, -1) : prev))
    setManualObservedMatrix(prev => prev.map(row => (row.length > 2 ? row.slice(0, -1) : row)))
  }, [])

  const renderManualMatrixInput = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5" />
          빈도표(RxC) 직접 입력
        </CardTitle>
        <CardDescription>논문/보고서의 교차표(관측도수)를 그대로 입력할 수 있습니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>행 변수명</Label>
            <Input value={manualRowVariable} onChange={(e) => setManualRowVariable(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>열 변수명</Label>
            <Input value={manualColVariable} onChange={(e) => setManualColVariable(e.target.value)} />
          </div>
        </div>

        <div className="overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">행 \\ 열</TableHead>
                {manualColLabels.map((label, colIdx) => (
                  <TableHead key={colIdx} className="min-w-32">
                    <Input
                      value={label}
                      onChange={(e) => setManualColLabels(prev => prev.map((v, i) => (i === colIdx ? e.target.value : v)))}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {manualRowLabels.map((rowLabel, rowIdx) => (
                <TableRow key={rowIdx}>
                  <TableCell className="min-w-48">
                    <Input
                      value={rowLabel}
                      onChange={(e) => setManualRowLabels(prev => prev.map((v, i) => (i === rowIdx ? e.target.value : v)))}
                    />
                  </TableCell>
                  {manualColLabels.map((_, colIdx) => (
                    <TableCell key={colIdx} className="min-w-32">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={manualObservedMatrix[rowIdx]?.[colIdx] ?? 0}
                        onChange={(e) => updateManualCell(rowIdx, colIdx, e.target.value)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={addManualRow}>행 추가</Button>
          <Button type="button" variant="outline" onClick={removeManualRow} disabled={manualRowLabels.length <= 2}>행 삭제</Button>
          <Button type="button" variant="outline" onClick={addManualCol}>열 추가</Button>
          <Button type="button" variant="outline" onClick={removeManualCol} disabled={manualColLabels.length <= 2}>열 삭제</Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => actions.setCurrentStep(1)}>
            다음
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // 교차표 렌더링
  const renderCrossTable = () => {
    if (!results) return null

    // 행과 열 카테고리 추출
    const rowCategories = [...new Set(results.data.map(d => d.rowCategory))]
    const colCategories = [...new Set(results.data.map(d => d.colCategory))]

    // 비율 표시 헬퍼 함수
    const getPercentDisplay = (cell: CrossTabCell): string => {
      switch (percentageType) {
        case 'row':
          return `${cell.rowPercent.toFixed(1)}%`
        case 'column':
          return `${cell.colPercent.toFixed(1)}%`
        case 'total':
        default:
          return `${cell.totalPercent.toFixed(1)}%`
      }
    }

    const tableData: Record<string, string | number>[] = rowCategories.map(rowCat => {
      const rowData: Record<string, string | number> = { category: rowCat }

      colCategories.forEach(colCat => {
        const cell = results.data.find(d => d.rowCategory === rowCat && d.colCategory === colCat)
        if (cell) {
          let cellValue = `${cell.observed} (${getPercentDisplay(cell)})`
          if (showExpected) {
            cellValue += `\n기대: ${cell.expected?.toFixed(1)}`
          }
          if (showResiduals) {
            cellValue += `\n잔차: ${cell.standardizedResidual?.toFixed(2)}`
          }
          rowData[colCat] = cellValue
        }
      })

      // 행 합계
      const rowTotal = results.rowTotals.find(r => r.category === rowCat)
      rowData.total = `${rowTotal?.count} (${rowTotal?.percent.toFixed(1)}%)`

      return rowData
    })

    // 열 합계 행 추가
    const colTotalRow: Record<string, string | number> = { category: '합계' }
    colCategories.forEach(colCat => {
      const colTotal = results.colTotals.find(c => c.category === colCat)
      colTotalRow[colCat] = `${colTotal?.count} (${colTotal?.percent.toFixed(1)}%)`
    })
    colTotalRow.total = `${results.grandTotal} (100.0%)`
    tableData.push(colTotalRow)

    const percentLabel = percentageType === 'row' ? '행%' : percentageType === 'column' ? '열%' : '전체%'
    const columns = [
      { key: 'category', header: `${results.rowVariable} \\ ${results.colVariable}`, type: 'text' as const },
      ...colCategories.map(col => ({ key: col, header: col, type: 'text' as const })),
      { key: 'total', header: '합계', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={tableData}
        title={`교차표: ${results.rowVariable} × ${results.colVariable} (${percentLabel})`}
      />
    )
  }

  // 카이제곱 검정 결과 테이블
  const renderChiSquareTable = () => {
    if (!results?.chiSquareTest) return null

    const data = [{
      statistic: 'Pearson 카이제곱',
      value: results.chiSquareTest.statistic.toFixed(3),
      df: results.chiSquareTest.df,
      pValue: results.chiSquareTest.pValue < 0.001 ? '< 0.001' : results.chiSquareTest.pValue.toFixed(3),
      significance: results.chiSquareTest.isSignificant ? '유의함' : '유의하지 않음'
    }, {
      statistic: 'Cramer\'s V',
      value: results.chiSquareTest.cramersV.toFixed(3),
      df: '-',
      pValue: '-',
      significance: results.chiSquareTest.cramersV < 0.1 ? '작은 연관성' :
                   results.chiSquareTest.cramersV < 0.3 ? '중간 연관성' :
                   results.chiSquareTest.cramersV < 0.5 ? '큰 연관성' : '매우 큰 연관성'
    }]

    const columns = [
      { key: 'statistic', header: '검정통계량', type: 'text' as const },
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'df', header: '자유도', type: 'text' as const },
      { key: 'pValue', header: 'p-값', type: 'text' as const },
      { key: 'significance', header: '결과', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="독립성 검정 결과"
      />
    )
  }

  // 요약 카드들
  const renderSummaryCards = () => {
    if (!results) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 사례 수</p>
                <p className="text-2xl font-bold">{results.grandTotal}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">행 범주 수</p>
                <p className="text-2xl font-bold">{results.rowTotals.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">열 범주 수</p>
                <p className="text-2xl font-bold">{results.colTotals.length}</p>
              </div>
              <PieChart className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">카이제곱 값</p>
                <p className="text-2xl font-bold">
                  {results.chiSquareTest?.statistic.toFixed(2) || 'N/A'}
                </p>
              </div>
              <GitBranch className={`w-8 h-8 ${results.chiSquareTest?.isSignificant ? 'text-green-500/50' : 'text-red-500/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 연관성 해석
  const renderAssociationInterpretation = () => {
    if (!results?.chiSquareTest) return null

    const { isSignificant, cramersV, pValue } = results.chiSquareTest

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            연관성 분석 결과
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg ${isSignificant ? 'bg-muted dark:bg-green-950/20' : 'bg-gray-50 dark:bg-gray-950/20'}`}>
            <h4 className="font-semibold mb-2">독립성 검정</h4>
            <p className="text-sm">
              {isSignificant ? (
                <>두 변수 간에 통계적으로 유의한 연관성이 있습니다 (p = {pValue.toFixed(3)})</>
              ) : (
                <>두 변수는 독립적입니다 (p = {pValue.toFixed(3)})</>
              )}
            </p>
          </div>

          <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">연관성 강도 (Cramer&apos;s V)</h4>
            <p className="text-sm">
              V = {cramersV.toFixed(3)} ({
                cramersV < 0.1 ? '매우 약한 연관성' :
                cramersV < 0.3 ? '약한 연관성' :
                cramersV < 0.5 ? '중간 연관성' : '강한 연관성'
              })
            </p>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-muted0 h-2 rounded-full"
                  style={{ width: `${Math.min(cramersV * 200, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {results.fishersExactTest && (
            <div className="p-4 bg-muted dark:bg-orange-950/20 rounded-lg">
              <h4 className="font-semibold mb-2">Fisher 정확검정</h4>
              <p className="text-sm">
                p = {results.fishersExactTest.pValue.toFixed(3)}<br />
                승산비 = {results.fishersExactTest.oddsRatio.toFixed(2)}
                (95% CI: {results.fishersExactTest.ciLower.toFixed(2)} - {results.fishersExactTest.ciUpper.toFixed(2)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="교차표"
      subtitle="두 범주형 변수 간의 교차 빈도 분석"
      icon={<GitBranch className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "χ² = Σ(O-E)²/E, Cramer's V = √(χ²/n×min(r-1,c-1))",
        assumptions: ["범주형 데이터", "독립적 관측값", "기대빈도 ≥ 5"],
        sampleSize: "각 셀 기대빈도 5개 이상",
        usage: "두 범주형 변수의 독립성 검정"
      }}
    >
      <div className="space-y-6">
        {/* 에러 표시 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              입력 방식
            </CardTitle>
            <CardDescription>원시데이터 업로드 또는 빈도표(RxC) 직접 입력을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={inputMode}
              onValueChange={(value) => handleInputModeChange(value as 'raw' | 'matrix')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="raw">원시데이터</TabsTrigger>
                <TabsTrigger value="matrix">빈도표 직접 입력</TabsTrigger>
              </TabsList>
              <TabsContent value="raw" className="mt-3 text-sm text-muted-foreground">
                CSV 업로드 → 변수 선택 → 교차표/검정 결과를 계산합니다.
              </TabsContent>
              <TabsContent value="matrix" className="mt-3 text-sm text-muted-foreground">
                논문/보고서에 있는 관측도수(RxC) 행렬을 그대로 입력해 검정을 수행합니다.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 0단계: 데이터 업로드 */}
        {inputMode === 'raw' && currentStep === 0 && uploadedData === null && (
          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onNext={() => actions.setCurrentStep(1)}
            canGoNext={false}
            currentStep={1}
            totalSteps={4}
          />
        )}

        {/* 0단계(Matrix): 빈도표 직접 입력 */}
        {inputMode === 'matrix' && currentStep === 0 && renderManualMatrixInput()}

        {/* 1단계: 변수 선택 */}
        {inputMode === 'raw' && currentStep === 1 && uploadedData && (
          <VariableSelectorModern
            methodId="cross-tabulation"
            data={uploadedData.data}
            onVariablesSelected={handleVariablesSelected as (variables: unknown) => void}
            onBack={() => actions.setCurrentStep(0)}
          />
        )}

        {/* 2단계: 분석 옵션 설정 */}
        {(
          (inputMode === 'raw' && currentStep === 2 && selectedVariables) ||
          (inputMode === 'matrix' && currentStep === 1)
        ) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                분석 옵션 설정
              </CardTitle>
              <CardDescription>
                교차표 표시 형식과 검정 방법을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="expected"
                      checked={showExpected}
                      onCheckedChange={setShowExpected}
                    />
                    <Label htmlFor="expected">기대빈도 표시</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="residuals"
                      checked={showResiduals}
                      onCheckedChange={setShowResiduals}
                    />
                    <Label htmlFor="residuals">표준화 잔차 표시</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="chi-square"
                      checked={includeChiSquare}
                      onCheckedChange={setIncludeChiSquare}
                    />
                    <Label htmlFor="chi-square">카이제곱 검정</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="fisher"
                      checked={includeFisher}
                      onCheckedChange={setIncludeFisher}
                      disabled={inputMode === 'matrix' && (manualRowLabels.length !== 2 || manualColLabels.length !== 2)}
                    />
                    <Label htmlFor="fisher">Fisher 정확검정 (2×2만)</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>비율 계산 기준</Label>
                <Select value={percentageType} onValueChange={setPercentageType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">전체 기준</SelectItem>
                    <SelectItem value="row">행 기준</SelectItem>
                    <SelectItem value="column">열 기준</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">분석 설정 요약</h4>
                <ul className="text-sm space-y-1">
                  <li>• 교차표 형식: 관측빈도{showExpected && ' + 기대빈도'}{showResiduals && ' + 잔차'}</li>
                  <li>• 비율 계산: {percentageType === 'total' ? '전체 기준' : percentageType === 'row' ? '행 기준' : '열 기준'}</li>
                  <li>• 독립성 검정: {includeChiSquare && 'χ² 검정'}{includeChiSquare && includeFisher && ', '}
                      {includeFisher && 'Fisher 정확검정'}</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => actions.setCurrentStep(inputMode === 'raw' ? 1 : 0)}
                >
                  이전
                </Button>
                <Button
                  onClick={handleAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? '분석 중...' : '분석 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3단계: 결과 확인 */}
        {(
          (inputMode === 'raw' && currentStep === 3) ||
          (inputMode === 'matrix' && currentStep === 2)
        ) && results && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="crosstab">교차표</TabsTrigger>
              <TabsTrigger value="tests">검정결과</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">분석 요약</h3>
                {renderSummaryCards()}
              </div>
              {renderAssociationInterpretation()}
            </TabsContent>

            <TabsContent value="crosstab" className="space-y-6">
              {renderCrossTable()}
            </TabsContent>

            <TabsContent value="tests" className="space-y-6">
              {includeChiSquare && renderChiSquareTable()}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StatisticsPageLayout>
  )
}
