'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ArrowLeft, ChevronDown, List, LayoutGrid, MessageSquare } from 'lucide-react'
import { QuestionCard } from './QuestionCard'
import { QuestionFlow } from './QuestionFlow'
import { getQuestionsForPurpose } from './guided-flow-questions'
import { getAutoAnswer } from './auto-answer'
import { cn } from '@/lib/utils'
import type {
  AnalysisPurpose,
  AutoAnswerResult,
  ValidationResults,
  StatisticalAssumptions
} from '@/types/smart-flow'

// UI mode
type UIMode = 'conversational' | 'classic'

const ASSUMPTION_QUESTION_IDS = ['normality', 'homogeneity'] as const
type AssumptionQuestionId = typeof ASSUMPTION_QUESTION_IDS[number]

// Purpose display names
const PURPOSE_NAMES: Record<AnalysisPurpose, string> = {
  compare: '그룹 간 차이 비교',
  relationship: '변수 간 관계 분석',
  distribution: '분포와 빈도 분석',
  prediction: '예측 모델링',
  timeseries: '시계열 분석',
  survival: '생존 분석',
  multivariate: '다변량 분석',
  utility: '연구 설계 도구'
}

// Conditional question logic
const CONDITIONAL_QUESTIONS: Record<string, (answers: Record<string, string>) => boolean> = {
  // sample_type: skip if comparing to population (group_count = 1)
  'sample_type': (answers) => !!answers.group_count && answers.group_count !== '1',

  // normality/homogeneity: skip for proportion comparison
  'normality': (answers) => !!answers.comparison_target && answers.comparison_target !== 'proportion',
  'homogeneity': (answers) => (
    !!answers.comparison_target &&
    answers.comparison_target !== 'proportion' &&
    !!answers.group_count &&
    answers.group_count !== '1'
  ),

  // has_covariate: only for 3+ groups
  'has_covariate': (answers) => answers.group_count === '3+',

  // outcome_count: only for 3+ groups
  'outcome_count': (answers) => answers.group_count === '3+',

  // design_type: only for 3+ groups
  'design_type': (answers) => answers.group_count === '3+',

  // variable_selection: only for multiple predictors
  'variable_selection': (answers) => answers.predictor_count === '2+',

  // modelType: only for continuous outcome
  'modelType': (answers) => answers.outcome_type === 'continuous',

  // distribution_goal: only for frequency analysis
  'distribution_goal': (answers) => answers.analysis_type === 'frequency' || answers.analysis_type === 'explore',
}

interface GuidedQuestionsProps {
  purpose: AnalysisPurpose
  answers: Record<string, string>
  autoAnswers: Record<string, AutoAnswerResult>
  onAnswerQuestion: (questionId: string, value: string) => void
  onSetAutoAnswer: (questionId: string, result: AutoAnswerResult) => void
  onComplete: () => void
  onBrowseAll: () => void
  onBack: () => void
  validationResults?: ValidationResults | null
  assumptionResults?: StatisticalAssumptions | null
}

export function GuidedQuestions({
  purpose,
  answers,
  autoAnswers,
  onAnswerQuestion,
  onSetAutoAnswer,
  onComplete,
  onBrowseAll,
  onBack,
  validationResults,
  assumptionResults
}: GuidedQuestionsProps) {
  const questions = getQuestionsForPurpose(purpose)
  const [uiMode, setUIMode] = useState<UIMode>('conversational')
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Check if question should be shown
  const shouldShowQuestion = useCallback((questionId: string, currentAnswers: Record<string, string>) => {
    const condition = CONDITIONAL_QUESTIONS[questionId]
    if (!condition) return true
    return condition(currentAnswers)
  }, [])

  const autoAnswerContext = useMemo(() => ({
    validationResults,
    assumptionResults
  }), [validationResults, assumptionResults])

  const assumptionAutoAnswers = useMemo(() => {
    const result: Partial<Record<AssumptionQuestionId, AutoAnswerResult>> = {}
    for (const id of ASSUMPTION_QUESTION_IDS) {
      const auto = getAutoAnswer(id, autoAnswerContext)
      if (auto) result[id] = auto
    }
    return result
  }, [autoAnswerContext])

  const shouldReplaceAssumptionQuestionWithBadge = useCallback((
    questionId: string,
    currentAnswers: Record<string, string>
  ) => {
    if (!ASSUMPTION_QUESTION_IDS.includes(questionId as AssumptionQuestionId)) return false
    if (!shouldShowQuestion(questionId, currentAnswers)) return false
    if (openOverrides[questionId]) return false

    const auto = assumptionAutoAnswers[questionId as AssumptionQuestionId]
    if (!auto || auto.source !== 'assumptionResults' || auto.confidence === 'unknown') return false

    const currentValue = currentAnswers[questionId]
    if (currentValue !== undefined && currentValue !== auto.value) return false // manual override

    return true
  }, [assumptionAutoAnswers, openOverrides, shouldShowQuestion])

  const requiredQuestions = useMemo(
    () => questions.filter(q => q.required !== false),
    [questions]
  )

  const optionalQuestions = useMemo(
    () => questions.filter(q => q.required === false),
    [questions]
  )

  const questionNumberById = useMemo(() => {
    const map: Record<string, number> = {}
    questions.forEach((q, idx) => {
      map[q.id] = idx + 1
    })
    return map
  }, [questions])

  const visibleRequiredQuestions = useMemo(
    () => requiredQuestions.filter(q => shouldShowQuestion(q.id, answers)),
    [requiredQuestions, shouldShowQuestion, answers]
  )

  const allRequiredAnswered = visibleRequiredQuestions.every(q => q.id in answers)

  // Auto-answer generation (on mount)
  useEffect(() => {
    questions.forEach(q => {
      if (q.autoAnswer && !(q.id in autoAnswers)) {
        const result = getAutoAnswer(q.id, {
          validationResults,
          assumptionResults
        })
        if (result) {
          onSetAutoAnswer(q.id, result)

          // Auto-fill: high confidence 또는 medium confidence (requiresConfirmation 포함)
          // requiresConfirmation이 true여도 초기 값을 설정하여 UI 진행이 가능하도록 함
          if ((result.confidence === 'high' || result.confidence === 'medium') && !(q.id in answers)) {
            onAnswerQuestion(q.id, result.value)
          }
        }
      }
    })
  }, [questions, autoAnswers, validationResults, assumptionResults, answers, onSetAutoAnswer, onAnswerQuestion])

  useEffect(() => {
    for (const id of ASSUMPTION_QUESTION_IDS) {
      const auto = assumptionAutoAnswers[id]
      if (!auto || auto.source !== 'assumptionResults' || auto.confidence === 'unknown') continue

      if (shouldReplaceAssumptionQuestionWithBadge(id, answers) && !(id in answers)) {
        onAnswerQuestion(id, auto.value)
      }
    }
  }, [answers, assumptionAutoAnswers, onAnswerQuestion, shouldReplaceAssumptionQuestionWithBadge])

  const handleComplete = useCallback(() => {
    if (allRequiredAnswered) {
      onComplete()
    }
  }, [allRequiredAnswered, onComplete])

  const renderAssumptionBadges = useCallback(() => {
    const items = ASSUMPTION_QUESTION_IDS
      .filter((id) => shouldShowQuestion(id, answers))
      .map((id) => {
        const auto = assumptionAutoAnswers[id]
        if (!auto || auto.source !== 'assumptionResults' || auto.confidence === 'unknown') return null

        const isOverridden = answers[id] !== undefined && answers[id] !== auto.value
        const title = id === 'normality' ? '정규성' : '등분산성'
        const statusText =
          auto.value === 'yes' ? '충족' : auto.value === 'no' ? '위반' : '확인 필요'

        return (
          <div key={id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-background">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0',
                    statusText === '충족' && 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10',
                    statusText === '위반' && 'border-rose-500/30 text-rose-700 bg-rose-500/10',
                    statusText === '확인 필요' && 'border-amber-500/30 text-amber-700 bg-amber-500/10'
                  )}
                >
                  {title}: {statusText}
                </Badge>
                {isOverridden && (
                  <Badge variant="secondary" className="shrink-0">
                    수동 설정
                  </Badge>
                )}
              </div>
              {auto.evidence && (
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {auto.evidence}
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpenOverrides(prev => ({ ...prev, [id]: true }))
                  setAdvancedOpen(true)
                  setUIMode('classic')
                }}
              >
                수정하기
              </Button>

              {openOverrides[id] && !isOverridden && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onAnswerQuestion(id, auto.value)
                    setOpenOverrides(prev => ({ ...prev, [id]: false }))
                  }}
                >
                  자동 적용
                </Button>
              )}
            </div>
          </div>
        )
      })
      .filter(Boolean)

    if (items.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">가정 검정 결과</div>
        <div className="space-y-2">{items}</div>
      </div>
    )
  }, [answers, assumptionAutoAnswers, onAnswerQuestion, openOverrides, shouldShowQuestion])

  // Conversational mode (Typeform style)
  if (uiMode === 'conversational') {
    const shouldShowQuestionInConversation = (questionId: string, currentAnswers: Record<string, string>) => {
      if (!shouldShowQuestion(questionId, currentAnswers)) return false
      if (shouldReplaceAssumptionQuestionWithBadge(questionId, currentAnswers)) return false
      return true
    }

    return (
      <div className="space-y-4">
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1.5">
            {PURPOSE_NAMES[purpose]}
          </Badge>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBrowseAll}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <List className="h-4 w-4" />
              직접 선택
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setUIMode('classic')}
              className="text-muted-foreground hover:text-foreground"
              title="클래식 모드로 전환"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Question Flow */}
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            {renderAssumptionBadges()}
            <QuestionFlow
              questions={requiredQuestions}
              answers={answers}
              autoAnswers={autoAnswers}
              onAnswerQuestion={onAnswerQuestion}
              onComplete={onComplete}
              onBack={onBack}
              shouldShowQuestion={shouldShowQuestionInConversation}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Classic mode (all questions visible)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {PURPOSE_NAMES[purpose]}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUIMode('conversational')}
            className="text-muted-foreground hover:text-foreground"
            title="대화형 모드로 전환"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Questions Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            데이터 조건을 알려주세요
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            정확한 분석 방법 추천을 위해 몇 가지 질문에 답해주세요
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderAssumptionBadges()}

          {requiredQuestions.map((question) => {
            const isVisible = shouldShowQuestion(question.id, answers)
            const isReplacedByBadge = shouldReplaceAssumptionQuestionWithBadge(question.id, answers)
            const isAssumptionQuestion = ASSUMPTION_QUESTION_IDS.includes(question.id as AssumptionQuestionId)

            return (
              <div
                key={question.id}
                className={cn(
                  'transition-all duration-300',
                  (!isVisible || isReplacedByBadge) && 'hidden'
                )}
              >
                <QuestionCard
                  question={question}
                  questionNumber={questionNumberById[question.id] ?? 0}
                  selectedValue={answers[question.id] ?? null}
                  onSelect={(value) => onAnswerQuestion(question.id, value)}
                  autoAnswer={autoAnswers[question.id]}
                />

                {isAssumptionQuestion && openOverrides[question.id] && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenOverrides(prev => ({ ...prev, [question.id]: false }))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      닫기
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {optionalQuestions.length > 0 && (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">고급 옵션</div>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    {advancedOpen ? '숨기기' : '펴기'}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="mt-4 space-y-6">
                {optionalQuestions.map((question) => {
                  const isVisible = shouldShowQuestion(question.id, answers)
                  const isReplacedByBadge = shouldReplaceAssumptionQuestionWithBadge(question.id, answers)
                  const isAssumptionQuestion = ASSUMPTION_QUESTION_IDS.includes(question.id as AssumptionQuestionId)

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        'transition-all duration-300',
                        (!isVisible || isReplacedByBadge) && 'hidden'
                      )}
                    >
                      <QuestionCard
                        question={question}
                        questionNumber={questionNumberById[question.id] ?? 0}
                        selectedValue={answers[question.id] ?? null}
                        onSelect={(value) => onAnswerQuestion(question.id, value)}
                        autoAnswer={autoAnswers[question.id]}
                      />

                      {isAssumptionQuestion && openOverrides[question.id] && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenOverrides(prev => ({ ...prev, [question.id]: false }))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            닫기
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBrowseAll}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <List className="h-4 w-4" />
          전체 방법에서 직접 선택
        </Button>

        <Button
          onClick={handleComplete}
          disabled={!allRequiredAnswered}
          className="gap-1.5"
        >
          다음
        </Button>
      </div>
    </div>
  )
}
