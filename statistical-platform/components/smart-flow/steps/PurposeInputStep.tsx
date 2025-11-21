'use client'

import { useState, useMemo, useCallback } from 'react'
import { Check, TrendingUp, GitCompare, PieChart, LineChart, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import { DataProfileSummary } from '@/components/common/analysis/DataProfileSummary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { StatisticalMethod, AnalysisPurpose, AIRecommendation } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

/**
 * Phase 2: PurposeInputStep 완전 재설계
 *
 * 변경 사항:
 * 1. ❌ Textarea 제거
 * 2. ✅ Decision Tree UI (5개 목적 카드)
 * 3. ✅ DataProfile 명시적 표시
 * 4. ✅ isAnalyzing 명시적 표시
 * 5. ✅ "이 방법으로 분석하기" 버튼으로 Step 4 분리
 * 6. ✅ Accordion으로 상세 정보 접기/펼치기
 */

const ANALYSIS_PURPOSES = [
  {
    id: 'compare' as AnalysisPurpose,
    icon: <GitCompare className="w-5 h-5" />,
    title: '그룹 간 차이 비교',
    description: '두 개 이상의 그룹을 비교하여 평균이나 비율의 차이를 검정합니다.',
    examples: '예: 남녀 간 키 차이, 약물 효과 비교, 교육 방법별 성적 비교'
  },
  {
    id: 'relationship' as AnalysisPurpose,
    icon: <TrendingUp className="w-5 h-5" />,
    title: '변수 간 관계 분석',
    description: '두 개 이상의 변수 사이의 상관관계나 연관성을 분석합니다.',
    examples: '예: 키와 몸무게의 관계, 공부시간과 성적의 관계'
  },
  {
    id: 'distribution' as AnalysisPurpose,
    icon: <PieChart className="w-5 h-5" />,
    title: '분포와 빈도 분석',
    description: '데이터의 분포 형태를 파악하고 각 범주의 빈도를 분석합니다.',
    examples: '예: 나이 분포, 성별 비율, 직업별 분포'
  },
  {
    id: 'prediction' as AnalysisPurpose,
    icon: <LineChart className="w-5 h-5" />,
    title: '예측 모델링',
    description: '독립변수를 사용하여 종속변수를 예측하는 모델을 만듭니다.',
    examples: '예: 공부시간으로 성적 예측, 온도로 판매량 예측'
  },
  {
    id: 'timeseries' as AnalysisPurpose,
    icon: <Clock className="w-5 h-5" />,
    title: '시계열 분석',
    description: '시간에 따른 데이터의 변화 패턴을 분석하고 미래를 예측합니다.',
    examples: '예: 월별 매출 추이, 연도별 인구 변화'
  }
]

export function PurposeInputStep({
  onPurposeSubmit,
  validationResults,
  data
}: PurposeInputStepProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)

  // Zustand store - setSelectedMethod만 사용
  const setSelectedMethod = useSmartFlowStore(state => state.setSelectedMethod)

  // DataProfile 계산 (Step 2 결과 요약)
  const dataProfile = useMemo(() => {
    if (!validationResults || !data) return null

    const numericVars = validationResults.columns?.filter(
      (col: { type: string }) => col.type === 'numeric'
    ).length || 0

    const categoricalVars = validationResults.columns?.filter(
      (col: { type: string }) => col.type === 'categorical'
    ).length || 0

    const totalCells = data.length * (validationResults.columnCount || 0)
    const missingValues = validationResults.missingValues || 0

    return {
      sampleSize: data.length,
      numericVars,
      categoricalVars,
      missingValues,
      totalCells,
      recommendedType: data.length >= 30 ? ('parametric' as const) : ('nonparametric' as const)
    }
  }, [validationResults, data])

  // Mock AI 추천 함수 (향후 실제 로직으로 교체)
  const analyzeAndRecommend = useCallback(async (_purpose: AnalysisPurpose): Promise<AIRecommendation | null> => {
    try {
      setIsAnalyzing(true)
      setAiProgress(0)

      // Step 1: 데이터 특성 분석
      await new Promise(resolve => setTimeout(resolve, 500))
      setAiProgress(30)

      // Step 2: 통계 가정 검정
      await new Promise(resolve => setTimeout(resolve, 500))
      setAiProgress(60)

      // Step 3: 최적 방법 추천
      await new Promise(resolve => setTimeout(resolve, 500))
      setAiProgress(100)

      // Mock 추천 결과 (실제로는 SmartRecommender 사용)
      const mockMethod: StatisticalMethod = {
        id: 'independent-t-test',
        name: '독립표본 t-검정',
        description: '두 독립 그룹 간 평균 차이를 검정합니다.',
        category: 't-test',
        requirements: {
          minSampleSize: 30,
          assumptions: ['정규성', '등분산성', '독립성']
        }
      }

      return {
        method: mockMethod,
        confidence: 0.92,
        reasoning: [
          '두 독립 그룹 간 평균 비교가 필요합니다.',
          '표본 크기가 충분합니다 (n=30).',
          '정규성 가정이 충족되었습니다.',
          '등분산성 가정이 충족되었습니다.'
        ],
        assumptions: [
          { name: '정규성', passed: true, pValue: 0.08 },
          { name: '등분산성', passed: true, pValue: 0.15 }
        ],
        alternatives: [
          {
            id: 'mann-whitney',
            name: 'Mann-Whitney U 검정',
            description: '비모수 대안',
            category: 'nonparametric'
          }
        ]
      }
    } catch (error) {
      logger.error('AI 분석 중 오류 발생', { error })
      // 에러 시 null 반환 (UI에서 에러 메시지 표시)
      return null
    } finally {
      // 항상 로딩 상태 초기화
      setIsAnalyzing(false)
      setAiProgress(0)
    }
  }, [])

  // 목적 선택 핸들러
  const handlePurposeSelect = useCallback(async (purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)

    logger.info('Analysis purpose selected', { purpose })

    // AI 분석 시작
    const result = await analyzeAndRecommend(purpose)

    if (result === null) {
      // 에러 발생 시 사용자에게 알림
      logger.error('AI 추천 실패', { purpose })
      // TODO: 에러 메시지 UI 표시 (Alert 컴포넌트 사용)
    } else {
      setRecommendation(result)
    }
  }, [analyzeAndRecommend])

  // "이 방법으로 분석하기" 버튼
  const handleConfirmMethod = useCallback(() => {
    if (!recommendation || !selectedPurpose) return

    // Step 4로 넘어가기 전 스토어에 저장
    setSelectedMethod(recommendation.method)

    // 부모 콜백 호출 (onPurposeSubmit 내부에서 goToNextStep() 호출됨)
    if (onPurposeSubmit) {
      onPurposeSubmit(
        ANALYSIS_PURPOSES.find(p => p.id === selectedPurpose)?.title || '',
        recommendation.method
      )
    }

    // ❌ onNext() 중복 호출 제거:
    // onPurposeSubmit (handlePurposeSubmit)이 이미 goToNextStep()을 호출하므로
    // 여기서 다시 호출하면 Step 4를 건너뛰고 Step 5로 이동하는 버그 발생
  }, [recommendation, selectedPurpose, setSelectedMethod, onPurposeSubmit])

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Step 2 결과 요약 */}
      {dataProfile && (
        <DataProfileSummary
          sampleSize={dataProfile.sampleSize}
          numericVars={dataProfile.numericVars}
          categoricalVars={dataProfile.categoricalVars}
          missingValues={dataProfile.missingValues}
          totalCells={dataProfile.totalCells}
          recommendedType={dataProfile.recommendedType}
          title="데이터 요약 (Step 2 결과)"
        />
      )}

      {/* 분석 목적 선택 (Decision Tree) */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          어떤 분석을 하고 싶으신가요?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ANALYSIS_PURPOSES.map((purpose, index) => (
            <div
              key={purpose.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <PurposeCard
                icon={purpose.icon}
                title={purpose.title}
                description={purpose.description}
                examples={purpose.examples}
                selected={selectedPurpose === purpose.id}
                onClick={() => handlePurposeSelect(purpose.id)}
                disabled={isAnalyzing}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI 분석 진행 상태 */}
      {isAnalyzing && (
        <AIAnalysisProgress
          progress={aiProgress}
          title="AI가 최적의 통계 방법을 찾고 있습니다..."
        />
      )}

      {/* AI 추천 결과 */}
      {recommendation && !isAnalyzing && (
        <Card className="border-2 border-primary bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  추천: {recommendation.method.name}
                </CardTitle>
                <CardDescription>
                  신뢰도: {(recommendation.confidence * 100).toFixed(0)}%
                </CardDescription>
              </div>
              <Button
                onClick={handleConfirmMethod}
                size="lg"
                className="shrink-0"
              >
                이 방법으로 분석하기
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 추천 이유 */}
            <div>
              <h4 className="font-medium mb-2">추천 이유:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {recommendation.reasoning.map((reason, idx) => (
                  <li
                    key={idx}
                    className="animate-in fade-in slide-in-from-left-2"
                    style={{
                      animationDelay: `${idx * 100}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Accordion으로 상세 정보 */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="assumptions">
                <AccordionTrigger>통계적 가정 검정 결과</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {recommendation.assumptions.map((assumption, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-sm">{assumption.name}</span>
                        <div className="flex items-center gap-2">
                          {assumption.pValue && (
                            <span className="text-xs text-muted-foreground">
                              p = {assumption.pValue.toFixed(3)}
                            </span>
                          )}
                          {assumption.passed ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <span className="text-xs text-destructive">불충족</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <AccordionItem value="alternatives">
                  <AccordionTrigger>대안 방법</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {recommendation.alternatives.map((alt, idx) => (
                        <div key={idx} className="p-3 bg-background rounded border">
                          <h5 className="font-medium text-sm">{alt.name}</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alt.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="method-details">
                <AccordionTrigger>방법 상세 정보</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>설명:</strong> {recommendation.method.description}</p>
                    {recommendation.method.requirements && (
                      <>
                        {recommendation.method.requirements.minSampleSize && (
                          <p>
                            <strong>최소 표본 크기:</strong>{' '}
                            {recommendation.method.requirements.minSampleSize}
                          </p>
                        )}
                        {recommendation.method.requirements.assumptions && (
                          <div>
                            <strong>요구사항:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1">
                              {recommendation.method.requirements.assumptions.map((assumption, idx) => (
                                <li key={idx}>{assumption}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* 선택 안내 */}
      {!selectedPurpose && !isAnalyzing && (
        <Alert>
          <AlertDescription>
            위에서 분석 목적을 선택하면 AI가 자동으로 최적의 통계 방법을 추천합니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
