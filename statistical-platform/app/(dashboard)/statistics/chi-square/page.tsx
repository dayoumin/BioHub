'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Info, CheckCircle2, AlertCircle, Calculator } from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { FisherExactTestResult } from '@/types/pyodide-results'

export default function FisherExactTestPage() {
  const { state, actions } = useStatisticsPage<FisherExactTestResult, null>({
    withUploadedData: false,
    withError: true
  })
  const { results, isAnalyzing, error } = state

  // Pyodide Core Service (singleton - stable across renders)
  const pyodideCore = useMemo(() => PyodideCoreService.getInstance(), [])

  // 2x2 분할표 상태
  const [table, setTable] = useState<number[][]>([
    [10, 5],
    [3, 12]
  ])
  const [alpha, setAlpha] = useState<number>(0.05)
  const [alphaInput, setAlphaInput] = useState<string>('0.05') // UI 입력 상태 (문자열)
  const [alternative, setAlternative] = useState<'two-sided' | 'less' | 'greater'>('two-sided')

  // 셀 값 변경 (useCallback 적용)
  const updateCell = useCallback((row: number, col: number, value: string) => {
    setTable(prevTable =>
      prevTable.map((r, i) =>
        i === row ? r.map((c, j) => (j === col ? parseInt(value, 10) || 0 : c)) : r
      )
    )
  }, [])

  // Alternative 변경 (useCallback 적용)
  const handleAlternativeChange = useCallback((value: string) => {
    if (value === 'two-sided' || value === 'less' || value === 'greater') {
      setAlternative(value)
    }
  }, [])

  // Alpha 입력 핸들러
  const handleAlphaChange = useCallback((value: string) => {
    setAlphaInput(value) // 입력 중 상태 유지 (예: "0.", "0.0", "")

    // 유효한 숫자로 변환 가능한 경우에만 alpha 업데이트
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 0.5) {
      setAlpha(parsed)
    }
    // 빈 문자열이거나 유효하지 않은 경우 기본값으로 복구하지 않음
    // 사용자가 입력을 완료할 때까지 대기
  }, [])

  // Alpha 입력 필드에서 포커스 해제 시 (blur)
  const handleAlphaBlur = useCallback(() => {
    const parsed = parseFloat(alphaInput)
    if (isNaN(parsed) || parsed <= 0 || parsed > 0.5) {
      // 유효하지 않은 값이면 현재 alpha 값으로 복구
      setAlphaInput(alpha.toString())
    }
  }, [alphaInput, alpha])

  // 실제 분석 실행
  const runAnalysis = useCallback(async () => {
    if (!actions.startAnalysis || !actions.setError || !actions.completeAnalysis) {
      console.error('[fisher-exact] Required actions not available')
      return
    }

    try {
      actions.startAnalysis()

      // Validation
      if (table.some(row => row.some(cell => cell < 0))) {
        actions.setError('모든 값은 0 이상이어야 합니다.')
        return
      }

      const total = table.flat().reduce((sum, val) => sum + val, 0)
      if (total === 0) {
        actions.setError('모든 값이 0일 수 없습니다.')
        return
      }

      // Pyodide Worker 호출
      const result = await pyodideCore.callWorkerMethod<FisherExactTestResult>(
        PyodideWorker.Hypothesis,
        'fisher_exact_test',
        {
          table,
          alternative,
          alpha
        }
      )

      actions.completeAnalysis(result, 3)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [table, alternative, alpha, actions, pyodideCore])

  const renderMethodology = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <CardTitle>Fisher 정확 검정</CardTitle>
        </div>
        <CardDescription>작은 표본의 2×2 분할표를 정확하게 검정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">사용 사례</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>표본 크기가 작을 때 (n &lt; 40)</li>
            <li>기대빈도가 5 미만일 때</li>
            <li>정확한 p-value가 필요할 때</li>
            <li>2×2 분할표의 독립성 검정</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">검정 가정</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>2×2 분할표 (2개 행 × 2개 열)</li>
            <li>범주형 변수</li>
            <li>관측치 독립성</li>
            <li>고정된 주변 합</li>
          </ul>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>카이제곱 검정과의 차이</strong>
            <br />
            Fisher 정확 검정은 소표본에서 정확한 p-value를 제공합니다. 카이제곱 검정은 근사값을 사용하므로 표본이 작을 때 부정확할 수 있습니다.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )

  const renderInput = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>2×2 분할표 입력</CardTitle>
        </div>
        <CardDescription>두 범주형 변수의 관측 빈도를 입력하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 분할표 입력 */}
        <div>
          <Label className="mb-2 block">관측 빈도</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24"></TableHead>
                <TableHead className="text-center">변수 2: 범주 1</TableHead>
                <TableHead className="text-center">변수 2: 범주 2</TableHead>
                <TableHead className="text-center">합계</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">변수 1: 범주 1</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={table[0][0]}
                    onChange={(e) => updateCell(0, 0, e.target.value)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={table[0][1]}
                    onChange={(e) => updateCell(0, 1, e.target.value)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {table[0][0] + table[0][1]}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">변수 1: 범주 2</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={table[1][0]}
                    onChange={(e) => updateCell(1, 0, e.target.value)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={table[1][1]}
                    onChange={(e) => updateCell(1, 1, e.target.value)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {table[1][0] + table[1][1]}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">합계</TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {table[0][0] + table[1][0]}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {table[0][1] + table[1][1]}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {table.flat().reduce((sum, val) => sum + val, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* 검정 옵션 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="alpha" className="mb-2 block">유의수준 (α)</Label>
            <Input
              id="alpha"
              type="number"
              min="0.001"
              max="0.5"
              step="0.01"
              value={alphaInput}
              onChange={(e) => handleAlphaChange(e.target.value)}
              onBlur={handleAlphaBlur}
            />
          </div>
          <div>
            <Label htmlFor="alternative" className="mb-2 block">대립가설</Label>
            <select
              id="alternative"
              value={alternative}
              onChange={(e) => handleAlternativeChange(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="two-sided">양측 검정 (Two-sided)</option>
              <option value="less">왼쪽 검정 (Less)</option>
              <option value="greater">오른쪽 검정 (Greater)</option>
            </select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={runAnalysis} disabled={isAnalyzing} className="w-full">
          {isAnalyzing ? '분석 중...' : 'Fisher 정확 검정 실행'}
        </Button>
      </CardContent>
    </Card>
  )

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'input-table',
      number: 1,
      title: '분할표 입력',
      description: '2×2 분할표 데이터 입력',
      status: 'current'
    },
    {
      id: 'view-results',
      number: 2,
      title: '결과 확인',
      description: 'Fisher 정확 검정 결과',
      status: results ? 'completed' : 'pending'
    }
  ]

  const renderResults = () => {
    if (!results) return null

    return (
      <div className="space-y-4">
        {/* 주요 결과 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <CardTitle>Fisher 정확 검정 결과</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Odds Ratio (승산비)</Label>
                <p className="text-2xl font-semibold">
                  {results.oddsRatio !== null ? results.oddsRatio.toFixed(4) : '∞ (Infinity)'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{results.oddsRatioInterpretation}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">p-value</Label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-semibold">{results.pValue.toFixed(6)}</p>
                  <PValueBadge value={results.pValue} alpha={alpha} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">검정 결과</Label>
              <p className="text-lg">
                {results.reject
                  ? `귀무가설을 기각합니다 (p = ${results.pValue.toFixed(6)} < α = ${alpha}). 두 변수 간에 유의한 연관성이 있습니다.`
                  : `귀무가설을 기각할 수 없습니다 (p = ${results.pValue.toFixed(6)} ≥ α = ${alpha}). 두 변수 간에 유의한 연관성이 없습니다.`}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">대립가설</Label>
              <p className="text-sm">
                {alternative === 'two-sided' && '양측 검정: 두 변수 간에 연관성이 있다'}
                {alternative === 'less' && '왼쪽 검정: Odds Ratio < 1'}
                {alternative === 'greater' && '오른쪽 검정: Odds Ratio > 1'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 분할표 */}
        <Card>
          <CardHeader>
            <CardTitle>분할표 (관측 빈도 vs 기대 빈도)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">관측 빈도</Label>
                <Table>
                  <TableBody>
                    {results.observedMatrix.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-center font-medium">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <Label className="mb-2 block">기대 빈도</Label>
                <Table>
                  <TableBody>
                    {results.expectedMatrix.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-center text-muted-foreground">
                            {cell.toFixed(2)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">행 합계</Label>
                <p className="font-medium">{results.rowTotals.join(', ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">열 합계</Label>
                <p className="font-medium">{results.columnTotals.join(', ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">전체 관측치</Label>
                <p className="font-medium">{results.sampleSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 해석 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle>결과 해석 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Odds Ratio (승산비):</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>OR = 1: 두 변수 간 연관성 없음</li>
                <li>OR &gt; 1: 양의 연관성 (첫 번째 그룹이 두 번째 그룹보다 높은 승산)</li>
                <li>OR &lt; 1: 음의 연관성 (첫 번째 그룹이 두 번째 그룹보다 낮은 승산)</li>
              </ul>
            </div>
            <div>
              <strong>p-value 해석:</strong>
              <p className="text-muted-foreground mt-1">
                {results.pValue < 0.001
                  ? '매우 강한 증거 (p < 0.001)'
                  : results.pValue < 0.01
                    ? '강한 증거 (p < 0.01)'
                    : results.pValue < 0.05
                      ? '중간 증거 (p < 0.05)'
                      : '약한 증거 (p ≥ 0.05)'}
              </p>
            </div>
            <div>
              <strong>주의사항:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>Fisher 정확 검정은 2×2 분할표에만 적용 가능</li>
                <li>소표본 (n &lt; 40) 또는 기대빈도 &lt; 5 일 때 권장</li>
                <li>대표본에서는 카이제곱 검정 사용 가능</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <StatisticsPageLayout
      title="Fisher 정확 검정"
      description="작은 표본의 2×2 분할표를 정확하게 검정합니다"
      steps={steps}
      currentStep={1}
    >
      <div className="space-y-6">
        {renderMethodology()}
        {renderInput()}
        {results && renderResults()}
      </div>
    </StatisticsPageLayout>
  )
}
