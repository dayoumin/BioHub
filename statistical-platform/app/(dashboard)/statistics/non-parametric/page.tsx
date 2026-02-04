'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { NonParametricVariables } from '@/types/statistics'
import { toNonParametricVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Info,
  PlayCircle,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Users,
  Shuffle,
  Upload
} from 'lucide-react'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

type NonParametricTest =
  | 'mann-whitney'
  | 'wilcoxon'
  | 'kruskal-wallis'
  | 'friedman'

interface TestDescription {
  name: string
  description: string
  useCases: string[]
  parametricEquivalent: string
  icon: React.ReactNode
  requiredVariables: {
    independent?: number
    dependent: number
    grouping?: number
    paired?: boolean
  }
}

// Worker 3 결과 타입
interface MannWhitneyResult {
  statistic: number
  pValue: number
}

interface WilcoxonResult {
  statistic: number
  pValue: number
  nobs: number
  zScore: number
  medianDiff: number
  effectSize: {
    value: number
    interpretation: string
  }
  descriptives: {
    before: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    after: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    differences: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
      positive: number
      negative: number
      ties: number
    }
  }
}

interface KruskalWallisResult {
  statistic: number
  pValue: number
  df: number
}

interface FriedmanResult {
  statistic: number
  pValue: number
}

type NonParametricWorkerResult = MannWhitneyResult | WilcoxonResult | KruskalWallisResult | FriedmanResult

const testDescriptions: Record<NonParametricTest, TestDescription> = {
  'mann-whitney': {
    name: 'Mann-Whitney U 검정',
    description: '두 독립 표본 간 중앙값 차이를 검정합니다.',
    useCases: [
      '두 독립 그룹 간 비교',
      '정규성 가정 위반 시',
      '순서형 데이터 분석'
    ],
    parametricEquivalent: '독립표본 t-test',
    icon: <Users className="w-5 h-5" />,
    requiredVariables: {
      dependent: 1,
      grouping: 1
    }
  },
  'wilcoxon': {
    name: 'Wilcoxon 부호순위 검정',
    description: '대응 표본 간 중앙값 차이를 검정합니다.',
    useCases: [
      '대응 표본 비교',
      '사전-사후 측정',
      '짝지어진 데이터'
    ],
    parametricEquivalent: '대응표본 t-test',
    icon: <Shuffle className="w-5 h-5" />,
    requiredVariables: {
      dependent: 2,
      paired: true
    }
  },
  'kruskal-wallis': {
    name: 'Kruskal-Wallis 검정',
    description: '세 개 이상 독립 표본 간 중앙값 차이를 검정합니다.',
    useCases: [
      '다중 그룹 비교',
      '정규성/등분산성 위반',
      '순서형 데이터의 일원분산분석'
    ],
    parametricEquivalent: '일원분산분석 (One-way ANOVA)',
    icon: <BarChart3 className="w-5 h-5" />,
    requiredVariables: {
      dependent: 1,
      grouping: 1
    }
  },
  'friedman': {
    name: 'Friedman 검정',
    description: '반복측정 설계에서 세 개 이상 조건 간 차이를 검정합니다.',
    useCases: [
      '반복측정 설계',
      '시간에 따른 변화',
      '블록 설계'
    ],
    parametricEquivalent: '반복측정 분산분석',
    icon: <TrendingUp className="w-5 h-5" />,
    requiredVariables: {
      dependent: 3,
      paired: true
    }
  }
}

export default function NonParametricTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('non-parametric')
  }, [])

  const { state, actions } = useStatisticsPage<StatisticalResult, NonParametricVariables>({
    withUploadedData: true,
    withError: true
  })
  const { uploadedData, selectedVariables, results: result, isAnalyzing, error, currentStep } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [selectedTest, setSelectedTest] = useState<NonParametricTest>('mann-whitney')
  const [alpha, setAlpha] = useState('0.05')

  const currentTest = testDescriptions[selectedTest]

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '비모수 검정', href: '/statistics/non-parametric' }
  ], [])

  // STEPS 정의 (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개', completed: currentStep > 0 },
    { id: 1, label: '데이터 업로드', completed: currentStep > 1 },
    { id: 2, label: '검정 설정', completed: currentStep > 2 },
    { id: 3, label: '결과 해석', completed: currentStep > 3 }
  ], [currentStep])

  // 데이터 업로드 핸들러 (표준 패턴)
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(1)
    },
    'non-parametric'
  )

  // 변수 선택 핸들러 (표준 패턴)
  const handleVariablesSelected = useCallback((variables: unknown) => {
    if (!variables || typeof variables !== 'object') return

    if (!actions.setSelectedVariables) {
      console.error('[non-parametric] setSelectedVariables not available')
      return
    }

    const typedVars = toNonParametricVariables(variables as VariableAssignment)
    actions.setSelectedVariables(typedVars as unknown as NonParametricVariables)
    actions.setCurrentStep?.(2)
  }, [actions])

  // Worker 결과 → StatisticalResult 변환
  const transformToStatisticalResult = useCallback((
    workerResult: NonParametricWorkerResult,
    testType: NonParametricTest,
    variables: string[],
    sampleSize: number
  ): StatisticalResult => {
    const testInfo = testDescriptions[testType]
    const alphaValue = parseFloat(alpha)

    // 기본 결과 구조
    const baseResult: StatisticalResult = {
      testName: testInfo.name,
      testType: '비모수 검정',
      description: testInfo.description,
      statistic: workerResult.statistic,
      statisticName: testType === 'mann-whitney' ? 'U' :
                     testType === 'wilcoxon' ? 'W' :
                     testType === 'kruskal-wallis' ? 'H' : 'χ²',
      pValue: workerResult.pValue,
      alpha: alphaValue,
      assumptions: [
        {
          name: '독립성',
          description: '관측치가 서로 독립적이어야 합니다',
          pValue: null,
          passed: true,
          recommendation: '연구 설계상 독립성이 보장됨'
        },
        {
          name: '측정 수준',
          description: '최소한 순서형 변수여야 합니다',
          pValue: null,
          passed: true,
          recommendation: '연속형 변수로 조건 충족'
        }
      ],
      sampleSize,
      variables
    }

    // 테스트별 특화 처리
    if (testType === 'wilcoxon' && 'descriptives' in workerResult) {
      const wilcoxonRes = workerResult as WilcoxonResult
      return {
        ...baseResult,
        effectSize: {
          value: wilcoxonRes.effectSize.value,
          type: 'r',
          ci: undefined
        },
        additionalResults: [{
          title: '기술통계량',
          columns: [
            { key: 'measure', header: '측정시점', type: 'text' },
            { key: 'median', header: '중앙값', type: 'number' },
            { key: 'mean', header: '평균', type: 'number' },
            { key: 'iqr', header: 'IQR', type: 'number' },
            { key: 'range', header: '범위', type: 'text' }
          ],
          data: [
            {
              measure: '사전',
              median: wilcoxonRes.descriptives.before.median,
              mean: wilcoxonRes.descriptives.before.mean,
              iqr: wilcoxonRes.descriptives.before.iqr,
              range: `${wilcoxonRes.descriptives.before.min.toFixed(2)} - ${wilcoxonRes.descriptives.before.max.toFixed(2)}`
            },
            {
              measure: '사후',
              median: wilcoxonRes.descriptives.after.median,
              mean: wilcoxonRes.descriptives.after.mean,
              iqr: wilcoxonRes.descriptives.after.iqr,
              range: `${wilcoxonRes.descriptives.after.min.toFixed(2)} - ${wilcoxonRes.descriptives.after.max.toFixed(2)}`
            },
            {
              measure: '차이',
              median: wilcoxonRes.medianDiff,
              mean: wilcoxonRes.descriptives.differences.mean,
              iqr: wilcoxonRes.descriptives.differences.iqr,
              range: `양성: ${wilcoxonRes.descriptives.differences.positive}, 음성: ${wilcoxonRes.descriptives.differences.negative}`
            }
          ]
        }],
        interpretation: `Wilcoxon 부호순위 검정 결과, ${wilcoxonRes.pValue < alphaValue ? '통계적으로 유의한' : '통계적으로 유의하지 않은'} 차이가 발견되었습니다 (W = ${workerResult.statistic.toFixed(2)}, p = ${workerResult.pValue.toFixed(4)}). 효과크기 r = ${wilcoxonRes.effectSize.value.toFixed(3)}로 ${wilcoxonRes.effectSize.interpretation}입니다.`,
        recommendations: [
          '중앙값 차이와 효과크기를 함께 보고하세요',
          '박스플롯으로 분포 변화를 시각화하세요',
          '이상치 존재 여부를 확인하세요'
        ],
        groups: 2
      }
    }

    if (testType === 'kruskal-wallis' && 'df' in workerResult) {
      return {
        ...baseResult,
        df: (workerResult as KruskalWallisResult).df,
        effectSize: {
          value: 0, // 추후 계산 가능
          type: 'etaSquared',
          ci: undefined
        },
        interpretation: `Kruskal-Wallis 검정 결과, ${workerResult.pValue < alphaValue ? '그룹 간 통계적으로 유의한' : '그룹 간 통계적으로 유의하지 않은'} 차이가 발견되었습니다 (H = ${workerResult.statistic.toFixed(2)}, df = ${(workerResult as KruskalWallisResult).df}, p = ${workerResult.pValue.toFixed(4)}).`,
        recommendations: [
          '사후검정으로 Dunn test 수행을 권장합니다',
          '각 그룹의 중앙값과 IQR을 보고하세요',
          '박스플롯으로 그룹별 분포를 시각화하세요'
        ],
        groups: (workerResult as KruskalWallisResult).df + 1
      }
    }

    if (testType === 'mann-whitney') {
      return {
        ...baseResult,
        effectSize: {
          value: 0, // 추후 계산 가능
          type: 'r',
          ci: undefined
        },
        interpretation: `Mann-Whitney U 검정 결과, ${workerResult.pValue < alphaValue ? '두 그룹 간 통계적으로 유의한' : '두 그룹 간 통계적으로 유의하지 않은'} 차이가 발견되었습니다 (U = ${workerResult.statistic.toFixed(2)}, p = ${workerResult.pValue.toFixed(4)}).`,
        recommendations: [
          '중앙값과 IQR을 보고하세요',
          '효과크기를 계산하여 함께 보고하세요',
          '박스플롯으로 분포를 비교하세요'
        ],
        groups: 2
      }
    }

    if (testType === 'friedman') {
      return {
        ...baseResult,
        effectSize: {
          value: 0, // 추후 계산 가능
          type: 'etaSquared',
          ci: undefined
        },
        interpretation: `Friedman 검정 결과, ${workerResult.pValue < alphaValue ? '조건 간 통계적으로 유의한' : '조건 간 통계적으로 유의하지 않은'} 차이가 발견되었습니다 (χ² = ${workerResult.statistic.toFixed(2)}, p = ${workerResult.pValue.toFixed(4)}).`,
        recommendations: [
          '사후검정으로 Nemenyi test 수행을 권장합니다',
          '각 조건의 중앙값을 보고하세요',
          '선 그래프로 변화 추이를 시각화하세요'
        ],
        groups: variables.length  // 실제 반복측정 변수 개수
      }
    }

    return baseResult
  }, [alpha])

  // Call Worker 3: 실제 비모수 검정 수행
  const runAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) {
      actions.setError?.('데이터와 변수를 먼저 선택해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      // PyodideCore 초기화
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 데이터 추출
      const data = uploadedData.data as Array<Record<string, unknown>>
      let workerResult: NonParametricWorkerResult
      let variableNames: string[] = []
      let sampleSize = data.length

      // 테스트별 Worker 호출
      if (selectedTest === 'mann-whitney') {
        // Mann-Whitney: 독립 2그룹
        if (!selectedVariables.dependent) {
          throw new Error('종속 변수를 선택해주세요.')
        }
        if (!selectedVariables.factor || selectedVariables.factor.length === 0) {
          throw new Error('그룹 변수를 선택해주세요.')
        }

        const depVar = selectedVariables.dependent
        const groupVar = selectedVariables.factor[0]
        variableNames = [depVar, groupVar]

        // 그룹별 데이터 분리
        const groups: Record<string, number[]> = {}
        data.forEach(row => {
          const groupValue = String(row[groupVar])
          const value = row[depVar]
          const numValue = typeof value === 'number' ? value : parseFloat(String(value))

          if (!isNaN(numValue)) {
            if (!groups[groupValue]) {
              groups[groupValue] = []
            }
            groups[groupValue].push(numValue)
          }
        })

        const groupKeys = Object.keys(groups)
        if (groupKeys.length !== 2) {
          throw new Error(`Mann-Whitney 검정은 정확히 2개 그룹이 필요합니다 (현재: ${groupKeys.length}개)`)
        }

        workerResult = await pyodideCore.callWorkerMethod<MannWhitneyResult>(
          PyodideWorker.NonparametricAnova,
          'mann_whitney_test',
          {
            group1: groups[groupKeys[0]],
            group2: groups[groupKeys[1]]
          }
        )

      } else if (selectedTest === 'wilcoxon') {
        // Wilcoxon: 대응 2표본
        if (!selectedVariables.factor || selectedVariables.factor.length < 2) {
          throw new Error('2개의 대응 변수를 선택해주세요.')
        }

        const var1 = selectedVariables.factor[0]
        const var2 = selectedVariables.factor[1]
        variableNames = [var1, var2]

        const values1: number[] = []
        const values2: number[] = []

        data.forEach(row => {
          const val1 = row[var1]
          const val2 = row[var2]
          const num1 = typeof val1 === 'number' ? val1 : parseFloat(String(val1))
          const num2 = typeof val2 === 'number' ? val2 : parseFloat(String(val2))

          if (!isNaN(num1) && !isNaN(num2)) {
            values1.push(num1)
            values2.push(num2)
          }
        })

        sampleSize = values1.length

        workerResult = await pyodideCore.callWorkerMethod<WilcoxonResult>(
          PyodideWorker.NonparametricAnova,
          'wilcoxon_test',
          {
            values1,
            values2
          }
        )

      } else if (selectedTest === 'kruskal-wallis') {
        // Kruskal-Wallis: 독립 3개 이상 그룹
        if (!selectedVariables.dependent) {
          throw new Error('종속 변수를 선택해주세요.')
        }
        if (!selectedVariables.factor || selectedVariables.factor.length === 0) {
          throw new Error('그룹 변수를 선택해주세요.')
        }

        const depVar = selectedVariables.dependent
        const groupVar = selectedVariables.factor[0]
        variableNames = [depVar, groupVar]

        // 그룹별 데이터 분리
        const groups: Record<string, number[]> = {}
        data.forEach(row => {
          const groupValue = String(row[groupVar])
          const value = row[depVar]
          const numValue = typeof value === 'number' ? value : parseFloat(String(value))

          if (!isNaN(numValue)) {
            if (!groups[groupValue]) {
              groups[groupValue] = []
            }
            groups[groupValue].push(numValue)
          }
        })

        const groupArrays = Object.values(groups)
        if (groupArrays.length < 3) {
          throw new Error(`Kruskal-Wallis 검정은 최소 3개 그룹이 필요합니다 (현재: ${groupArrays.length}개)`)
        }

        workerResult = await pyodideCore.callWorkerMethod<KruskalWallisResult>(
          PyodideWorker.NonparametricAnova,
          'kruskal_wallis_test',
          {
            groups: groupArrays
          }
        )

      } else if (selectedTest === 'friedman') {
        // Friedman: 반복측정 3개 이상
        if (!selectedVariables.factor || selectedVariables.factor.length < 3) {
          throw new Error('3개 이상의 반복측정 변수를 선택해주세요.')
        }

        variableNames = selectedVariables.factor
        const groups: number[][] = []

        // 각 변수별 데이터 수집
        selectedVariables.factor.forEach((varName: string) => {
          const values: number[] = []
          data.forEach(row => {
            const val = row[varName]
            const numVal = typeof val === 'number' ? val : parseFloat(String(val))
            if (!isNaN(numVal)) {
              values.push(numVal)
            }
          })
          groups.push(values)
        })

        workerResult = await pyodideCore.callWorkerMethod<FriedmanResult>(
          PyodideWorker.NonparametricAnova,
          'friedman_test',
          {
            groups
          }
        )

      } else {
        throw new Error(`지원하지 않는 테스트 유형입니다: ${selectedTest}`)
      }

      // Worker 결과를 StatisticalResult로 변환
      const statisticalResult = transformToStatisticalResult(
        workerResult,
        selectedTest,
        variableNames,
        sampleSize
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(statisticalResult, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      console.error('[non-parametric] Analysis error:', errorMessage)
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, selectedTest, currentTest, alpha, actions, transformToStatisticalResult])

  // Step 0: renderMethodIntroduction
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            비모수 검정 방법 선택
          </CardTitle>
          <CardDescription>
            데이터 특성과 연구 설계에 맞는 검정 방법을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedTest}
            onValueChange={(value) => setSelectedTest(value as NonParametricTest)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(testDescriptions).map(([key, desc]) => (
                <label
                  key={key}
                  htmlFor={key}
                  className={`
                    flex items-start p-4 rounded-lg border cursor-pointer
                    transition-all duration-200
                    ${selectedTest === key
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <RadioGroupItem value={key} id={key} className="mt-1" />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {desc.icon}
                      <span className="font-semibold">{desc.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {desc.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        모수 대응: {desc.parametricEquivalent}
                      </Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>

          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>선택된 검정: {currentTest.name}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {currentTest.useCases.map((useCase, idx) => (
                  <li key={idx}>{useCase}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 비모수 검정 가정 */}
      <Card>
        <CardHeader>
          <CardTitle>비모수 검정 가정</CardTitle>
          <CardDescription>
            비모수 검정은 모수 검정보다 가정이 적지만 여전히 확인이 필요합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AssumptionTestCard
            title="기본 가정"
            tests={[
              {
                name: '독립성',
                description: '관측치가 서로 독립적이어야 합니다',
                pValue: null,
                passed: true,
                details: '연구 설계를 통해 확인'
              },
              {
                name: '측정 수준',
                description: '최소한 순서형 변수여야 합니다',
                pValue: null,
                passed: true,
                details: '변수 타입 확인 필요'
              },
              {
                name: '동일 분포 형태',
                description: '그룹 간 분포 형태가 유사해야 합니다 (위치만 다름)',
                pValue: null,
                passed: null,
                details: '박스플롯으로 시각적 확인 권장'
              }
            ]}
            showRecommendations={true}
          />

          {/* 검정별 특별 고려사항 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{currentTest.name} 고려사항</AlertTitle>
            <AlertDescription>
              {selectedTest === 'mann-whitney' && (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>두 그룹이 독립적이어야 함</li>
                  <li>동순위(tie)가 많으면 정확한 p-value 계산 필요</li>
                  <li>표본 크기가 매우 작으면 정확검정 고려</li>
                </ul>
              )}
              {selectedTest === 'wilcoxon' && (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>대응 표본이어야 함</li>
                  <li>차이값이 대칭 분포를 가정</li>
                  <li>영가설 하에서 차이의 중앙값이 0</li>
                </ul>
              )}
              {selectedTest === 'kruskal-wallis' && (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>세 개 이상의 독립 그룹</li>
                  <li>유의한 결과 시 사후검정 필요 (Dunn test)</li>
                  <li>그룹 간 분산이 매우 다르면 해석 주의</li>
                </ul>
              )}
              {selectedTest === 'friedman' && (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>블록 내 순위 매김</li>
                  <li>완전 블록 설계 필요</li>
                  <li>유의한 결과 시 Nemenyi 사후검정</li>
                </ul>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  ), [selectedTest, currentTest])

  // Step 1: renderDataUpload
  const renderDataUpload = useCallback(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          데이터 업로드
        </CardTitle>
        <CardDescription>
          비모수 검정을 수행할 데이터를 업로드하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataUploadStep onUploadComplete={handleDataUpload} />
      </CardContent>
    </Card>
  ), [handleDataUpload])

  // Step 2: renderVariableSelection
  const renderVariableSelection = useCallback(() => (
    <div className="space-y-6">
      {/* 변수 선택 */}
      <VariableSelectorModern
        methodId="non-parametric"
        data={uploadedData?.data || []}
        onVariablesSelected={handleVariablesSelected}
      />

      {/* 분석 옵션 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 옵션</CardTitle>
          <CardDescription>
            검정 설정을 조정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alpha">유의수준 (α)</Label>
              <Select value={alpha} onValueChange={setAlpha}>
                <SelectTrigger id="alpha">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">0.01</SelectItem>
                  <SelectItem value="0.05">0.05</SelectItem>
                  <SelectItem value="0.10">0.10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 추가 옵션 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>비모수 검정 특징</AlertTitle>
            <AlertDescription>
              • 정규성 가정이 필요 없음<br />
              • 순위 기반 분석으로 이상치에 강건함<br />
              • 순서형 데이터 분석 가능<br />
              • 일반적으로 모수 검정보다 검정력이 낮음
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 실행 버튼 */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={runAnalysis}
          disabled={isAnalyzing || !selectedVariables || Object.keys(selectedVariables).length === 0}
          className="px-8"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              분석 중...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              분석 실행
            </>
          )}
        </Button>
      </div>
    </div>
  ), [uploadedData, selectedVariables, isAnalyzing, alpha, runAnalysis, handleVariablesSelected])

  // Step 3: renderResults
  const renderResults = useCallback(() => (
    <div className="space-y-6">
      {result ? (
        <>
          <ResultContextHeader
            analysisType="비모수 검정"
            analysisSubtitle="Non-Parametric Tests"
            fileName={uploadedData?.fileName}
            variables={selectedVariables?.factor || []}
            sampleSize={uploadedData?.data?.length}
            timestamp={analysisTimestamp ?? undefined}
          />
          <StatisticalResultCard
            result={result}
            showAssumptions={true}
            showEffectSize={true}
            showInterpretation={true}
            showActions={true}
          />

          {/* 추가 시각화 및 사후검정 옵션 */}
          <Card>
            <CardHeader>
              <CardTitle>추가 분석 옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  박스플롯 생성
                </Button>
                <Button variant="outline" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  순위 플롯 생성
                </Button>
                {(selectedTest === 'kruskal-wallis' || selectedTest === 'friedman') && (
                  <Button variant="outline" className="w-full">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    사후검정 수행
                  </Button>
                )}
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  보고서 생성
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>결과 없음</AlertTitle>
          <AlertDescription>
            아직 분석을 실행하지 않았습니다. 이전 단계로 돌아가 분석을 실행해주세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  ), [result, selectedTest])

  return (
    <TwoPanelLayout
      analysisTitle="비모수 검정"
      analysisSubtitle="Non-Parametric Tests"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 5
      } : undefined}
    >
      {/* Step 0: 방법 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && renderDataUpload()}

      {/* Step 2: 검정 설정 */}
      {currentStep === 2 && renderVariableSelection()}

      {/* Step 3: 결과 해석 */}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
