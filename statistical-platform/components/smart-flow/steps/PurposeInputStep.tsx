'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, AlertCircle, Check, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MethodSelector } from './purpose/MethodSelector'
import { VariableMappingDisplay } from './purpose/VariableMappingDisplay'
import { RecommendedMethods } from './purpose/RecommendedMethods'
import {
  QUESTION_TYPES,
  STATISTICAL_METHODS,
  getMethodsByQuestionType,
  recommendMethods,
  checkMethodRequirements
} from '@/lib/statistics/method-mapping'
import {
  autoMapVariables,
  validateVariableMapping,
  getVariableSuggestions,
  type VariableMapping,
  type ColumnInfo
} from '@/lib/statistics/variable-mapping'
import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { StatisticalMethod } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { SmartRecommender } from '@/lib/services/smart-recommender'

export function PurposeInputStep({
  onPurposeSubmit,
  validationResults,
  data,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious
}: PurposeInputStepProps) {
  const [purpose, setPurpose] = useState('')
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<StatisticalMethod | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [variableMapping, setVariableMapping] = useState<VariableMapping | null>(null)
  const [showVariableMapping, setShowVariableMapping] = useState(false)

  // 스토어에서 가정 결과와 데이터 특성, 선택 메서드 setter 사용
  const { assumptionResults, dataCharacteristics, setSelectedMethod: setSelectedMethodInStore, setVariableMapping: setVariableMappingInStore } = useSmartFlowStore()

  // 데이터 프로파일 생성 (assumptionResults 병합)
  const dataProfile = useMemo(() => {
    if (!validationResults || !data) return null

    interface ColumnData {
      type: string
      uniqueValues?: number
      name: string
      missing?: number
    }

    const numericVars = validationResults.columns?.filter(
      (col: ColumnData) => col.type === 'numeric'
    ).length || 0

    const categoricalVars = validationResults.columns?.filter(
      (col: ColumnData) => col.type === 'categorical'
    ).length || 0

    const hasTimeVar = validationResults.columns?.some(
      (col: ColumnData) => col.type === 'date'
    ) || false

    const hasGroupVar = categoricalVars > 0
    const groupLevels = validationResults.columns?.find(
      (col: ColumnData) => col.type === 'categorical'
    )?.uniqueValues || 0

    // assumptionResults 우선, validationResults fallback
    const normalityPassed =
      assumptionResults?.normality?.shapiroWilk?.isNormal ??
      assumptionResults?.normality?.kolmogorovSmirnov?.isNormal ??
      validationResults.normalityTest?.isNormal ??
      undefined

    const homogeneityPassed =
      assumptionResults?.homogeneity?.levene?.equalVariance ??
      assumptionResults?.homogeneity?.bartlett?.equalVariance ??
      validationResults.homogeneityTest?.equalVariance ??
      undefined

    return {
      numericVars,
      categoricalVars,
      totalRows: data.length,
      hasTimeVar,
      hasGroupVar,
      groupLevels,
      normalityPassed,
      homogeneityPassed
    }
  }, [validationResults, data, assumptionResults])

  // 규칙 기반 추천
  const recommendedMethods = useMemo(() => {
    if (!dataProfile) return []
    return recommendMethods(dataProfile)
  }, [dataProfile])

  // SmartRecommender 기반 추천 (가정 플래그 반영 + 200ms 디바운스)
  const [smartMethods, setSmartMethods] = useState<StatisticalMethod[]>([])
  useEffect(() => {
    if (!validationResults || !data) return

    const timer = setTimeout(() => {
      try {
        {/* 컬럼 타입/이름 수집 (없으면 안전한 기본값) */}
        const columns: any[] = validationResults.columns || []
        const columnTypes = columns.map((c) => (c.type === 'date' ? 'datetime' : c.type))
        const columnNames = columns.map((c) => c.name)

        {/* 결측/이상치 비율 추정 */}
        const missingRatio = (() => {
          const denom = (validationResults.totalRows || 0) * (validationResults.columnCount || 0)
          if (!denom) return 0
          return Math.max(0, Math.min(1, (validationResults.missingValues || 0) / denom))
        })()

        const outlierRatio = (() => {
          const stats = (validationResults as any).columnStats || []
          const outliers = stats.reduce((sum: number, s: any) => sum + (s.outliers?.length || 0), 0)
          const denom = validationResults.totalRows || 0
          if (!denom) return 0
          return Math.max(0, Math.min(1, outliers / denom))
        })()

        {/* 가정 플래그 */}
        const isNormallyDistributed = (
          assumptionResults?.normality?.shapiroWilk?.isNormal === true ||
          assumptionResults?.normality?.kolmogorovSmirnov?.isNormal === true
        )
        const isHomoscedastic = (
          assumptionResults?.homogeneity?.levene?.equalVariance ??
          assumptionResults?.homogeneity?.bartlett?.equalVariance ?? undefined
        ) as boolean | undefined

        const context = {
          purposeText: purpose || '',
          dataShape: {
            rows: data.length,
            columns: validationResults.columnCount || columns.length || 0,
            columnTypes,
            columnNames
          },
          dataQuality: {
            missingRatio,
            outlierRatio,
            isNormallyDistributed,
            isHomoscedastic
          }
        }

        const result = SmartRecommender.recommend(context as any)
        {/* SmartRecommender가 반환하는 방법을 표준 타입으로 사용 (id/name/description/category 필드 호환) */}
        setSmartMethods(result.methods || [])
      } catch (e) {
        console.error('SmartRecommender failed:', e)
        setSmartMethods([])
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [purpose, validationResults, data, assumptionResults])

  // 두 추천 소스를 병합 (id 기준으로 중복 제거, Smart 우선 노출)
  const mergedRecommendations = useMemo(() => {
    const map = new Map<string, StatisticalMethod>()
    for (const m of smartMethods) map.set(m.id, m)
    for (const m of recommendedMethods) {
      if (!map.has(m.id)) {
        // method-mapping.StatisticalMethod를 smart-flow.StatisticalMethod로 캐스팅
        const smartFlowMethod: StatisticalMethod = {
          ...m,
          category: m.category as 'descriptive' | 't-test' | 'anova' | 'regression' | 'nonparametric' | 'advanced'
        }
        map.set(m.id, smartFlowMethod)
      }
    }
    return Array.from(map.values())
  }, [smartMethods, recommendedMethods])

  // UX 개선: 3단계 진입 시 기본 탭 자동 선택(차이/비교) 및 추천 패널 자동 펼침
  useEffect(() => {
    if (!selectedQuestionType) {
      setSelectedQuestionType('comparison')
    }
    if (mergedRecommendations.length > 0 && !showRecommendations) {
      setShowRecommendations(true)
    }
  }, [selectedQuestionType, mergedRecommendations.length, showRecommendations])

  // 선택된 질문 유형에 따른 방법들
  const filteredMethods = useMemo(() => {
    if (!selectedQuestionType) return []
    const methods = getMethodsByQuestionType(selectedQuestionType)
    // method-mapping.StatisticalMethod를 smart-flow.StatisticalMethod로 변환
    return methods.map((m: any) => ({
      ...m,
      category: m.category as 'descriptive' | 't-test' | 'anova' | 'regression' | 'nonparametric' | 'advanced'
    })) as StatisticalMethod[]
  }, [selectedQuestionType])

  // 방법 선택 시 요구사항 체크
  const methodRequirements = useMemo(() => {
    if (!selectedMethod || !dataProfile) return null
    return checkMethodRequirements(selectedMethod, dataProfile)
  }, [selectedMethod, dataProfile])

  const handleQuestionTypeSelect = (typeId: string) => {
    setSelectedQuestionType(typeId)
    setSelectedMethod(null)
    {/* 질문 유형 변경시 선택된 방법 초기화 */}
  }

  const handleMethodSelect = (method: StatisticalMethod) => {
    if (!dataProfile) return

    const requirements = checkMethodRequirements(method, dataProfile)
    if (!requirements.canUse) {
      {/* 요구사항 미충족시 경고만 표시, 선택은 가능 */}
      logger.warn('Method requirements not met', { warnings: requirements.warnings })
    }

    {/* 로컬 상태와 전역 스토어 모두 업데이트하여 canProceedToNext가 true가 되도록 함 */}
    setSelectedMethod(method)
    setSelectedMethodInStore(method)

    {/* 변수 자동 매핑 */}
    if (validationResults?.columns) {
      const columnInfo: ColumnInfo[] = (validationResults.columns as any[]).map((col: any) => ({
        name: col.name,
        type: col.type,
        uniqueValues: col.uniqueValues,
        missing: col.missing
      }))

      const mapping = autoMapVariables(method, columnInfo)
      setVariableMapping(mapping)
      {/* 로컬 상태 */}
      setVariableMappingInStore(mapping)
      {/* 스토어에도 저장 */}
      setShowVariableMapping(true)
    }
  }

  const handleSubmit = () => {
    if (selectedMethod && onPurposeSubmit) {
      onPurposeSubmit(purpose || '데이터 분석', selectedMethod)
    }
    if (onNext) {
      onNext()
    }
  }

  // 다음 단계 이동 가능 여부 업데이트
  useEffect(() => {
    const canProceed = selectedMethod !== null
    if (canGoNext !== canProceed) {
      {/* 상태 업데이트가 필요한 경우에만 처리 */}
    }
  }, [selectedMethod, canGoNext])

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* 분석 목적 입력 */}
      <div>
            <label className="text-sm font-medium mb-2 block">
              무엇을 알고 싶으신가요? (선택사항)
            </label>
            <textarea
              className="w-full min-h-[80px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="예: 남녀 간 키 차이가 있는지 알고 싶어요..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          {/* AI 추천 방법 */}
          <RecommendedMethods
            methods={mergedRecommendations}
            selectedMethod={selectedMethod}
            showRecommendations={showRecommendations}
            onToggle={() => setShowRecommendations(!showRecommendations)}
            onMethodSelect={handleMethodSelect}
            onQuestionTypeChange={setSelectedQuestionType}
            dataProfile={dataProfile}
            assumptionResults={assumptionResults}
          />

          {/* 2단계 선택 UI */}
          <Tabs value={selectedQuestionType || undefined} onValueChange={handleQuestionTypeSelect}>
            <TabsList className="grid grid-cols-4 w-full">
              {QUESTION_TYPES.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="text-xs">
                  <span className="mr-1">{type.icon}</span>
                  <span className="hidden md:inline">{type.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {QUESTION_TYPES.map((type) => (
              <TabsContent key={type.id} value={type.id} className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">{type.description}</p>

                <MethodSelector
                  methods={filteredMethods}
                  selectedMethod={selectedMethod}
                  dataProfile={dataProfile}
                  assumptionResults={assumptionResults}
                  onMethodSelect={handleMethodSelect}
                  checkMethodRequirements={checkMethodRequirements}
                />
              </TabsContent>
            ))}
          </Tabs>

          {/* 선택된 방법 정보 */}
          {selectedMethod && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
              <Check className="h-4 w-4" />
              <AlertDescription>
                <strong>선택된 방법:</strong> {selectedMethod.name}
                {selectedMethod.requirements && (
                  <div className="mt-2 text-sm">
                    <strong>요구사항:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {selectedMethod.requirements.minSampleSize && (
                        <li>최소 {selectedMethod.requirements.minSampleSize}개 샘플 필요</li>
                      )}
                      {selectedMethod.requirements.assumptions?.map((assumption, idx) => (
                        <li key={idx}>{assumption}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 변수 자동 매핑 결과 */}
          {selectedMethod && variableMapping && showVariableMapping && (
            <VariableMappingDisplay
              mapping={variableMapping}
              onClose={() => setShowVariableMapping(false)}
            />
          )}

          {/* 데이터 정보 없을 때 경고 */}
          {!dataProfile && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                데이터 검증이 완료되지 않았습니다. 일부 추천 기능이 제한될 수 있습니다.
              </AlertDescription>
            </Alert>
          )}
    </div>
  )
}
