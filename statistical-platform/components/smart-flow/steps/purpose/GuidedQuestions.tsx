'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, List, LayoutGrid, MessageSquare } from 'lucide-react'
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
  'sample_type': (answers) => answers.group_count !== '1',

  // normality/homogeneity: skip for proportion comparison
  'normality': (answers) => answers.comparison_target !== 'proportion',
  'homogeneity': (answers) => answers.comparison_target !== 'proportion' && answers.group_count !== '1',

  // has_covariate: only for 3+ groups
  'has_covariate': (answers) => answers.group_count === '3+',

  // outcome_count: only for 3+ groups
  'outcome_count': (answers) => answers.group_count === '3+',

  // design_type: only for 3+ groups
  'design_type': (answers) => answers.group_count === '3+',

  // variable_selection: only for multiple predictors
  'variable_selection': (answers) => answers.predictor_count === '2+',

  // model_type: only for continuous outcome
  'model_type': (answers) => answers.outcome_type === 'continuous',

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

  // Check if question should be shown
  const shouldShowQuestion = useCallback((questionId: string, currentAnswers: Record<string, string>) => {
    const condition = CONDITIONAL_QUESTIONS[questionId]
    if (!condition) return true
    return condition(currentAnswers)
  }, [])

  // Filter visible questions
  const visibleQuestions = questions.filter(q => shouldShowQuestion(q.id, answers))

  // Check if all visible questions are answered
  const allAnswered = visibleQuestions.every(q => q.id in answers)

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

          // Auto-fill for high confidence
          if (result.confidence === 'high' && !result.requiresConfirmation) {
            onAnswerQuestion(q.id, result.value)
          }
        }
      }
    })
  }, [questions, autoAnswers, validationResults, assumptionResults, onSetAutoAnswer, onAnswerQuestion])

  const handleComplete = useCallback(() => {
    if (allAnswered) {
      onComplete()
    }
  }, [allAnswered, onComplete])

  // Conversational mode (Typeform style)
  if (uiMode === 'conversational') {
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
            <QuestionFlow
              questions={questions}
              answers={answers}
              autoAnswers={autoAnswers}
              onAnswerQuestion={onAnswerQuestion}
              onComplete={onComplete}
              onBack={onBack}
              shouldShowQuestion={shouldShowQuestion}
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
          {questions.map((question, index) => {
            const isVisible = shouldShowQuestion(question.id, answers)

            return (
              <div
                key={question.id}
                className={cn(
                  'transition-all duration-300',
                  !isVisible && 'hidden'
                )}
              >
                <QuestionCard
                  question={question}
                  questionNumber={index + 1}
                  selectedValue={answers[question.id] ?? null}
                  onSelect={(value) => onAnswerQuestion(question.id, value)}
                  autoAnswer={autoAnswers[question.id]}
                />
              </div>
            )
          })}
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
          disabled={!allAnswered}
          className="gap-1.5"
        >
          다음
        </Button>
      </div>
    </div>
  )
}
