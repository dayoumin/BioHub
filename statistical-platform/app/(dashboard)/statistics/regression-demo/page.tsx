'use client'

/**
 * 회귀분석 페이지 - ThreePanelLayout 데모
 *
 * 기존 regression 페이지를 3-Panel 레이아웃으로 리팩토링한 파일럿 버전
 * 실제 적용 전 UI/UX 검증용
 */

import { useState, useCallback, useEffect } from 'react'
import { ThreePanelLayout } from '@/components/statistics/layouts/ThreePanelLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Play, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { DataPreviewPanel } from '@/components/statistics/common/DataPreviewPanel'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { RegressionVariables } from '@/types/statistics'

type RegressionResults = {
  rSquared: number
  adjustedRSquared: number
  fStatistic: number
  fPValue: number
  coefficients: Array<{
    name: string
    estimate: number
    stdError: number
    tValue: number
    pValue: number
  }>
}

const DEMO_STEPS = [
  { id: 1, label: '회귀 유형 선택' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '분석 결과' }
]

export default function RegressionDemoPage() {
  const { state, actions } = useStatisticsPage<RegressionResults, RegressionVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, error, isAnalyzing } = state

  const [regressionType, setRegressionType] = useState<'simple' | 'multiple'>('simple')

  // Step 핸들러
  const handleTypeSelect = useCallback((type: 'simple' | 'multiple') => {
    setRegressionType(type)
    actions.setCurrentStep(2) // 다음 단계로
  }, [actions])

  const handleDataUpload = useCallback((data: Array<Record<string, unknown>>) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    if (actions.setUploadedData) {
      actions.setUploadedData({ data, fileName: 'sample.csv', columns })
    }
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((vars: Partial<RegressionVariables>) => {
    if (actions.setSelectedVariables) {
      actions.setSelectedVariables(vars as RegressionVariables)
    }
  }, [actions])

  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) return

    actions.startAnalysis()

    try {
      // 데모용 가짜 결과
      await new Promise(resolve => setTimeout(resolve, 1500))

      const demoResults: RegressionResults = {
        rSquared: 0.89,
        adjustedRSquared: 0.87,
        fStatistic: 42.5,
        fPValue: 0.001,
        coefficients: [
          { name: '절편', estimate: 12.34, stdError: 2.15, tValue: 5.74, pValue: 0.001 },
          { name: selectedVariables.independent?.[0] || 'X', estimate: 1.56, stdError: 0.34, tValue: 4.59, pValue: 0.003 }
        ]
      }

      actions.completeAnalysis(demoResults, 4)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 실패')
    }
  }, [uploadedData, selectedVariables, actions])

  // 우측 패널 설정
  const rightPanelConfig = {
    mode: currentStep < 4 ? 'preview' as const : 'results' as const,
    previewData: uploadedData?.data,
    results: results
  }

  return (
    <ThreePanelLayout
      currentStep={currentStep}
      steps={DEMO_STEPS}
      onStepChange={actions.setCurrentStep}
      rightPanel={rightPanelConfig}
      renderPreview={(data) => <DataPreviewPanel data={data} defaultExpanded={true} />}
      renderResults={(res) => <ResultsPanel results={res as RegressionResults} />}
    >
      {/* Step 1: 회귀 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">회귀 유형 선택</h2>
            <p className="text-sm text-muted-foreground">
              분석 목적에 맞는 회귀 방법을 선택하세요
            </p>
          </div>

          <RadioGroup value={regressionType} onValueChange={(v) => setRegressionType(v as 'simple' | 'multiple')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 단순 선형 회귀 */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  regressionType === 'simple' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setRegressionType('simple')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">단순 선형 회귀</CardTitle>
                    </div>
                    <RadioGroupItem value="simple" />
                  </div>
                  <CardDescription>
                    1개의 독립변수와 1개의 종속변수 간의 관계 분석
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Y = a + bX 모형</li>
                    <li>• 선형 관계 가정</li>
                    <li>• R², p-value 제공</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 다중 선형 회귀 */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  regressionType === 'multiple' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setRegressionType('multiple')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">다중 선형 회귀</CardTitle>
                    </div>
                    <RadioGroupItem value="multiple" />
                  </div>
                  <CardDescription>
                    2개 이상의 독립변수와 1개의 종속변수 간의 관계 분석
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Y = a + b₁X₁ + b₂X₂ + ... 모형</li>
                    <li>• 다중공선성 진단 (VIF)</li>
                    <li>• Adjusted R² 제공</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </RadioGroup>

          <Button
            onClick={() => handleTypeSelect(regressionType)}
            size="lg"
            className="w-full md:w-auto"
          >
            다음 단계
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              CSV 파일을 업로드하거나 샘플 데이터를 사용하세요
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>CSV 파일 업로드</CardTitle>
              <CardDescription>
                첫 번째 행이 헤더(변수명)여야 합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // 데모용 샘플 데이터
                    const sampleData = [
                      { height: '170', weight: '65.5', age: '25' },
                      { height: '180', weight: '75.0', age: '30' },
                      { height: '165', weight: '60.5', age: '28' },
                      { height: '175', weight: '70.0', age: '32' },
                      { height: '168', weight: '63.0', age: '27' }
                    ]
                    handleDataUpload(sampleData)
                  }}
                >
                  샘플 데이터 사용
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 3 && uploadedData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
            <p className="text-sm text-muted-foreground">
              {regressionType === 'simple'
                ? '독립변수(X) 1개, 종속변수(Y) 1개를 선택하세요'
                : '독립변수(X) 2개 이상, 종속변수(Y) 1개를 선택하세요'
              }
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">변수 할당</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 독립변수 선택 */}
              <div className="space-y-2">
                <Label>독립변수 (X)</Label>
                <div className="flex flex-wrap gap-2">
                  {uploadedData.columns.map((header: string) => (
                    <Badge
                      key={header}
                      variant={selectedVariables?.independent?.includes(header) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = selectedVariables?.independent || []
                        const updated = current.includes(header)
                          ? current.filter(h => h !== header)
                          : [...current, header]
                        handleVariableSelect({ ...selectedVariables, independent: updated })
                      }}
                    >
                      {header}
                      {selectedVariables?.independent?.includes(header) && (
                        <CheckCircle className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 종속변수 선택 */}
              <div className="space-y-2">
                <Label>종속변수 (Y)</Label>
                <div className="flex flex-wrap gap-2">
                  {uploadedData.columns.map((header: string) => (
                    <Badge
                      key={header}
                      variant={selectedVariables?.dependent === header ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        handleVariableSelect({ ...selectedVariables, dependent: header })
                      }}
                    >
                      {header}
                      {selectedVariables?.dependent === header && (
                        <CheckCircle className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 분석하기 버튼 */}
          <Button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !selectedVariables?.independent || !selectedVariables?.dependent}
            size="lg"
            className="w-full md:w-auto shadow-lg"
          >
            {isAnalyzing ? '분석 중...' : '분석하기'}
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 4: 분석 결과 */}
      {currentStep === 4 && results && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">분석 완료</h2>
            <p className="text-sm text-muted-foreground">
              회귀분석 결과가 우측 패널에 표시됩니다
            </p>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              분석이 성공적으로 완료되었습니다. 우측 결과 패널을 확인하세요.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </ThreePanelLayout>
  )
}

/**
 * 결과 패널 (우측)
 */
function ResultsPanel({ results }: { results: RegressionResults }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>주요 통계량</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">R²</p>
              <p className="text-2xl font-bold font-mono">{results.rSquared.toFixed(3)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Adjusted R²</p>
              <p className="text-2xl font-bold font-mono">{results.adjustedRSquared.toFixed(3)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">F-statistic</p>
              <p className="text-2xl font-bold font-mono">{results.fStatistic.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">p-value</p>
              <p className={`text-2xl font-bold font-mono ${
                results.fPValue < 0.05 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {results.fPValue.toFixed(3)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>회귀계수</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-3 py-2 text-left">변수</th>
                  <th className="px-3 py-2 text-right">Estimate</th>
                  <th className="px-3 py-2 text-right">Std Error</th>
                  <th className="px-3 py-2 text-right">t-value</th>
                  <th className="px-3 py-2 text-right">p-value</th>
                </tr>
              </thead>
              <tbody>
                {results.coefficients.map((coef) => (
                  <tr key={coef.name} className="border-b last:border-0">
                    <td className="px-3 py-2">{coef.name}</td>
                    <td className="px-3 py-2 text-right font-mono">{coef.estimate.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right font-mono">{coef.stdError.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right font-mono">{coef.tValue.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${
                      coef.pValue < 0.05 ? 'text-green-600 font-semibold' : ''
                    }`}>
                      {coef.pValue.toFixed(3)}
                      {coef.pValue < 0.05 && ' *'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
