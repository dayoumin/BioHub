'use client'

import { useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, List } from 'lucide-react'
import { QuestionCard } from './QuestionCard'
import { getQuestionsForPurpose } from './guided-flow-questions'
import { getAutoAnswer } from './auto-answer'
import type {
  AnalysisPurpose,
  AutoAnswerResult,
  ValidationResults,
  StatisticalAssumptions
} from '@/types/smart-flow'

// 목적별 한글 이름
const PURPOSE_NAMES: Record<AnalysisPurpose, string> = {
  compare: '그룹 간 차이 비교',
  relationship: '변수 간 관계 분석',
  distribution: '분포와 빈도 분석',
  prediction: '예측 모델링',
  timeseries: '시계열 분석',
  survival: '생존 분석'
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

  // 모든 질문에 응답했는지 확인
  const allAnswered = questions.every(q => q.id in answers)

  // Auto-answer 생성 (mount 시 한 번)
  useEffect(() => {
    questions.forEach(q => {
      if (q.autoAnswer && !(q.id in autoAnswers)) {
        const result = getAutoAnswer(q.id, {
          validationResults,
          assumptionResults
        })
        if (result) {
          onSetAutoAnswer(q.id, result)

          // High confidence면 자동으로 답변 설정
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
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

        <div className="text-sm text-muted-foreground">
          {PURPOSE_NAMES[purpose]}
        </div>
      </div>

      {/* 질문 카드 */}
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
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              questionNumber={index + 1}
              selectedValue={answers[question.id] ?? null}
              onSelect={(value) => onAnswerQuestion(question.id, value)}
              autoAnswer={autoAnswers[question.id]}
            />
          ))}
        </CardContent>
      </Card>

      {/* 하단 버튼 */}
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
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
