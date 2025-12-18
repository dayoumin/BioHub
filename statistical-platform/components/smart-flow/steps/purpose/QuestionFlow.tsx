'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { ProgressIndicator } from './ProgressIndicator'
import { ConversationalQuestion } from './ConversationalQuestion'
import type { GuidedQuestion, AutoAnswerResult } from '@/types/smart-flow'

interface QuestionFlowProps {
  questions: GuidedQuestion[]
  answers: Record<string, string>
  autoAnswers: Record<string, AutoAnswerResult>
  onAnswerQuestion: (questionId: string, value: string) => void
  onComplete: () => void
  onBack: () => void
  /** 조건부 질문 필터 (질문 ID -> 표시 여부) */
  shouldShowQuestion?: (questionId: string, currentAnswers: Record<string, string>) => boolean
}

export function QuestionFlow({
  questions,
  answers,
  autoAnswers,
  onAnswerQuestion,
  onComplete,
  onBack,
  shouldShowQuestion
}: QuestionFlowProps) {
  // 현재 질문 인덱스 (필터된 질문 기준)
  const [currentIndex, setCurrentIndex] = useState(0)
  // 애니메이션 방향
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  // Auto-advance timeout ref (클린업용)
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInteractedRef = useRef(false)

  // 조건에 맞는 질문만 필터링
  const filteredQuestions = useMemo(() => {
    if (!shouldShowQuestion) return questions
    return questions.filter(q => shouldShowQuestion(q.id, answers))
  }, [questions, answers, shouldShowQuestion])

  const filteredQuestionsRef = useRef(filteredQuestions)
  filteredQuestionsRef.current = filteredQuestions

  // 현재 질문
  const currentQuestion = filteredQuestions[currentIndex]

  // 현재 질문의 답변 여부
  const hasCurrentAnswer = currentQuestion && answers[currentQuestion.id] !== undefined

  // 모든 질문 답변 완료 여부
  const allAnswered = filteredQuestions.every(q => q.id in answers)

  // 마지막 질문 여부
  const isLastQuestion = currentIndex === filteredQuestions.length - 1

  // 이전 질문으로
  const handlePrev = useCallback(() => {
    hasInteractedRef.current = true
    if (currentIndex > 0) {
      setDirection('backward')
      setCurrentIndex(prev => prev - 1)
    } else {
      onBack()
    }
  }, [currentIndex, onBack])

  // 다음 질문으로
  const handleNext = useCallback(() => {
    hasInteractedRef.current = true
    if (!hasCurrentAnswer) return

    if (isLastQuestion) {
      onComplete()
    } else {
      setDirection('forward')
      setCurrentIndex(prev => prev + 1)
    }
  }, [hasCurrentAnswer, isLastQuestion, onComplete])

  // Auto-advance timeout 클린업
  const clearAutoAdvanceTimeout = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = null
    }
  }, [])

  // 질문에 답변하면 자동으로 다음으로 이동 (딜레이 포함)
  const handleAnswer = useCallback((questionId: string, value: string) => {
    hasInteractedRef.current = true
    onAnswerQuestion(questionId, value)

    // 기존 timeout 클린업
    clearAutoAdvanceTimeout()

    // 답변 후 0.3초 뒤 자동 진행
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      // 현재 상태 기준으로 마지막 질문인지 확인 (stale closure 방지)
      setCurrentIndex(prev => {
        // filteredQuestions.length는 클로저이므로 여기서 재계산 필요
        // prev + 1이 마지막 인덱스보다 크면 진행하지 않음
        if (prev < filteredQuestionsRef.current.length - 1) {
          setDirection('forward')
          return prev + 1
        }
        return prev
      })
    }, 300)
  }, [onAnswerQuestion, clearAutoAdvanceTimeout])

  useEffect(() => {
    if (hasInteractedRef.current) return
    if (filteredQuestions.length === 0) return

    const firstUnansweredIndex = filteredQuestions.findIndex(q => answers[q.id] === undefined)
    const targetIndex = firstUnansweredIndex === -1
      ? Math.max(0, filteredQuestions.length - 1)
      : firstUnansweredIndex

    if (targetIndex !== currentIndex) {
      setCurrentIndex(targetIndex)
    }
  }, [answers, filteredQuestions, currentIndex])

  // 입력 필드에서 이벤트가 발생했는지 확인하는 헬퍼
  const isEditableElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false
    const tagName = target.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
    if (target.isContentEditable) return true
    return false
  }, [])

  // 키보드 단축키 (Enter: 다음, Backspace: 이전)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 Enter만 동작 (폼 제출용)
      const isEditable = isEditableElement(e.target)

      if (e.key === 'Enter' && hasCurrentAnswer && !isEditable) {
        handleNext()
      } else if (e.key === 'Backspace' && !isEditable) {
        // 입력 필드가 아닐 때만 이전으로 이동
        e.preventDefault()
        clearAutoAdvanceTimeout() // 진행 중인 auto-advance 취소
        handlePrev()
      } else if (e.key === 'Escape') {
        clearAutoAdvanceTimeout()
        onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasCurrentAnswer, handleNext, handlePrev, onBack, isEditableElement, clearAutoAdvanceTimeout])

  // 질문이 변경되면 (필터링으로 인해) 인덱스 조정
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
      setCurrentIndex(Math.max(0, filteredQuestions.length - 1))
    }
  }, [filteredQuestions.length, currentIndex])

  // 질문이 없으면 바로 완료 (렌더 중 사이드 이펙트 방지)
  useEffect(() => {
    if (filteredQuestions.length === 0) {
      onComplete()
    }
  }, [filteredQuestions.length, onComplete])

  // 언마운트 시 timeout 클린업
  useEffect(() => {
    return () => {
      clearAutoAdvanceTimeout()
    }
  }, [clearAutoAdvanceTimeout])

  // 질문이 없으면 빈 화면 렌더 (onComplete는 useEffect에서 처리)
  if (filteredQuestions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentIndex === 0 ? '목적 선택으로' : '이전'}
        </Button>

        {/* 처음부터 다시 */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDirection('backward')
              setCurrentIndex(0)
            }}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            처음부터
          </Button>
        )}
      </div>

      {/* 프로그레스 */}
      <ProgressIndicator
        current={currentIndex + 1}
        total={filteredQuestions.length}
        className="mb-8"
      />

      {/* 질문 영역 (중앙) */}
      <div className="flex-1 flex flex-col justify-center">
        {currentQuestion && (
          <ConversationalQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            selectedValue={answers[currentQuestion.id] ?? null}
            onSelect={(value) => handleAnswer(currentQuestion.id, value)}
            autoAnswer={autoAnswers[currentQuestion.id]}
            direction={direction}
          />
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between pt-6 mt-auto border-t">
        <p className="text-xs text-muted-foreground">
          Enter로 진행 · Esc로 취소
        </p>

        <Button
          onClick={handleNext}
          disabled={!hasCurrentAnswer}
          className="gap-2"
          size="lg"
        >
          {isLastQuestion ? '결과 확인' : '다음'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
