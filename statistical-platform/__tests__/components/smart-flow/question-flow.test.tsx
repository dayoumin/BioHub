/**
 * QuestionFlow Component Tests
 *
 * Tests for the new Typeform-style question flow UI
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuestionFlow } from '@/components/smart-flow/steps/purpose/QuestionFlow'
import { ProgressIndicator } from '@/components/smart-flow/steps/purpose/ProgressIndicator'
import { ConversationalQuestion } from '@/components/smart-flow/steps/purpose/ConversationalQuestion'
import type { GuidedQuestion, AutoAnswerResult } from '@/types/smart-flow'

// Mock questions for testing
const mockQuestions: GuidedQuestion[] = [
  {
    id: 'q1',
    question: 'First question?',
    options: [
      { value: 'a', label: 'Option A', hint: 'Hint A' },
      { value: 'b', label: 'Option B', hint: 'Hint B' },
    ],
  },
  {
    id: 'q2',
    question: 'Second question?',
    options: [
      { value: 'x', label: 'Option X' },
      { value: 'y', label: 'Option Y' },
    ],
  },
  {
    id: 'q3',
    question: 'Third question?',
    options: [
      { value: '1', label: 'One' },
      { value: '2', label: 'Two' },
      { value: '3', label: 'Three' },
    ],
  },
]

const mockAutoAnswer: AutoAnswerResult = {
  value: 'a',
  confidence: 'high',
  evidence: 'AI detected this from data',
  requiresConfirmation: false,
  source: 'heuristic',
}

describe('ProgressIndicator', () => {
  it('renders progress percentage correctly', () => {
    render(<ProgressIndicator current={2} total={4} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/\/ 4/)).toBeInTheDocument()
  })

  it('renders 0% at start', () => {
    render(<ProgressIndicator current={0} total={5} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('renders 100% at completion', () => {
    render(<ProgressIndicator current={5} total={5} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

describe('ConversationalQuestion', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  it('renders question text', () => {
    render(
      <ConversationalQuestion
        question={mockQuestions[0]}
        selectedValue={null}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('First question?')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(
      <ConversationalQuestion
        question={mockQuestions[0]}
        selectedValue={null}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Hint A')).toBeInTheDocument()
    expect(screen.getByText('Hint B')).toBeInTheDocument()
  })

  it('calls onSelect when option clicked', () => {
    render(
      <ConversationalQuestion
        question={mockQuestions[0]}
        selectedValue={null}
        onSelect={mockOnSelect}
      />
    )

    fireEvent.click(screen.getByText('Option A'))
    expect(mockOnSelect).toHaveBeenCalledWith('a')
  })

  it('shows selected state', () => {
    render(
      <ConversationalQuestion
        question={mockQuestions[0]}
        selectedValue="a"
        onSelect={mockOnSelect}
      />
    )

    // Selected option should have check icon
    const optionA = screen.getByText('Option A').closest('button')
    expect(optionA).toHaveClass('border-primary')
  })

  it('shows AI recommendation badge', () => {
    render(
      <ConversationalQuestion
        question={mockQuestions[0]}
        selectedValue={null}
        onSelect={mockOnSelect}
        autoAnswer={mockAutoAnswer}
      />
    )

    expect(screen.getByText('AI가 데이터를 분석했습니다')).toBeInTheDocument()
    expect(screen.getByText('AI detected this from data')).toBeInTheDocument()
  })

  it('shows keyboard hint', () => {
    render(
      <ConversationalQuestion
        question={mockQuestions[0]}
        selectedValue={null}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText(/숫자 키.*로 선택하거나 클릭하세요/)).toBeInTheDocument()
  })
})

describe('QuestionFlow', () => {
  const mockOnAnswerQuestion = vi.fn()
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    mockOnAnswerQuestion.mockClear()
    mockOnComplete.mockClear()
    mockOnBack.mockClear()
  })

  it('renders first question initially', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText('First question?')).toBeInTheDocument()
    expect(screen.queryByText('Second question?')).not.toBeInTheDocument()
  })

  it('shows progress indicator', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    // Check for progress indicator text "질문 1 / 3"
    expect(screen.getByText(/질문/)).toBeInTheDocument()
    expect(screen.getByText(/\/ 3/)).toBeInTheDocument()
  })

  it('calls onAnswerQuestion when option selected', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    fireEvent.click(screen.getByText('Option A'))
    expect(mockOnAnswerQuestion).toHaveBeenCalledWith('q1', 'a')
  })

  it('advances to next question after answer', async () => {
    const { rerender } = render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    // Select first answer
    fireEvent.click(screen.getByText('Option A'))

    // Rerender with answer
    rerender(
      <QuestionFlow
        questions={mockQuestions}
        answers={{ q1: 'a' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    // Wait for auto-advance
    await waitFor(() => {
      expect(screen.getByText('Second question?')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('disables next button when no answer selected', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    const nextButton = screen.getByRole('button', { name: /다음/ })
    expect(nextButton).toBeDisabled()
  })

  it('enables next button when answer selected', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{ q1: 'a' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    const nextButton = screen.getByRole('button', { name: /다음/ })
    expect(nextButton).not.toBeDisabled()
  })

  it('calls onBack when back button clicked on first question', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    const backButton = screen.getByRole('button', { name: /목적 선택으로/ })
    fireEvent.click(backButton)
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('shows "결과 확인" on last question', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{ q1: 'a', q2: 'x', q3: '1' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    // Navigate to last question
    const nextButton = screen.getByRole('button', { name: /다음/ })
    fireEvent.click(nextButton) // q1 -> q2
    fireEvent.click(nextButton) // q2 -> q3

    expect(screen.getByRole('button', { name: /결과 확인/ })).toBeInTheDocument()
  })

  it('calls onComplete on last question submission', () => {
    render(
      <QuestionFlow
        questions={[mockQuestions[0]]} // Single question
        answers={{ q1: 'a' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    const completeButton = screen.getByRole('button', { name: /결과 확인/ })
    fireEvent.click(completeButton)
    expect(mockOnComplete).toHaveBeenCalled()
  })

  it('filters questions based on shouldShowQuestion', () => {
    const shouldShowQuestion = (questionId: string) => questionId !== 'q2'

    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{ q1: 'a' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
        shouldShowQuestion={shouldShowQuestion}
      />
    )

    // Should show q1, skip q2, then q3
    expect(screen.getByText(/\/ 2/)).toBeInTheDocument() // Only 2 questions visible
  })

  it('shows "처음부터" button after first question', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{ q1: 'a' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    // Navigate to second question
    const nextButton = screen.getByRole('button', { name: /다음/ })
    fireEvent.click(nextButton)

    expect(screen.getByRole('button', { name: /처음부터/ })).toBeInTheDocument()
  })
})

describe('QuestionFlow keyboard navigation', () => {
  const mockOnAnswerQuestion = vi.fn()
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    mockOnAnswerQuestion.mockClear()
    mockOnComplete.mockClear()
    mockOnBack.mockClear()
  })

  it('selects option with number key', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    // Press '1' to select first option
    fireEvent.keyDown(window, { key: '1' })
    expect(mockOnAnswerQuestion).toHaveBeenCalledWith('q1', 'a')
  })

  it('advances with Enter key when answered', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{ q1: 'a' }}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    fireEvent.keyDown(window, { key: 'Enter' })
    // Should advance to next question (handled internally)
  })

  it('calls onBack with Escape key', () => {
    render(
      <QuestionFlow
        questions={mockQuestions}
        answers={{}}
        autoAnswers={{}}
        onAnswerQuestion={mockOnAnswerQuestion}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnBack).toHaveBeenCalled()
  })
})

// ============================================
// Bug Fix Tests (4 issues)
// ============================================

describe('QuestionFlow Bug Fixes', () => {
  const mockOnAnswerQuestion = vi.fn()
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    mockOnAnswerQuestion.mockClear()
    mockOnComplete.mockClear()
    mockOnBack.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Bug 1: Backspace shortcut never fires because !e.target is always false
  describe('Bug #1: Backspace shortcut fix', () => {
    it('navigates back with Backspace key (not in input field)', () => {
      const { rerender } = render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{ q1: 'a' }}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // Navigate to second question first
      const nextButton = screen.getByRole('button', { name: /다음/ })
      fireEvent.click(nextButton)

      // Now press Backspace - should go back to first question
      fireEvent.keyDown(window, { key: 'Backspace' })

      // Should show first question again (internal navigation)
      expect(screen.getByText('First question?')).toBeInTheDocument()
    })

    it('calls onBack with Backspace on first question', () => {
      render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      fireEvent.keyDown(window, { key: 'Backspace' })
      expect(mockOnBack).toHaveBeenCalled()
    })

    it('does NOT navigate back when Backspace pressed in input field', () => {
      render(
        <div>
          <input type="text" data-testid="test-input" />
          <QuestionFlow
            questions={mockQuestions}
            answers={{}}
            autoAnswers={{}}
            onAnswerQuestion={mockOnAnswerQuestion}
            onComplete={mockOnComplete}
            onBack={mockOnBack}
          />
        </div>
      )

      const input = screen.getByTestId('test-input')
      fireEvent.keyDown(input, { key: 'Backspace', target: input })

      // onBack should NOT be called when typing in input
      expect(mockOnBack).not.toHaveBeenCalled()
    })
  })

  // Bug 2: Numeric shortcuts fire even in input/textarea
  describe('Bug #2: Numeric shortcuts in editable elements', () => {
    it('does NOT select option when number pressed in input field', () => {
      render(
        <div>
          <input type="text" data-testid="test-input" />
          <QuestionFlow
            questions={mockQuestions}
            answers={{}}
            autoAnswers={{}}
            onAnswerQuestion={mockOnAnswerQuestion}
            onComplete={mockOnComplete}
            onBack={mockOnBack}
          />
        </div>
      )

      const input = screen.getByTestId('test-input')
      // Simulate keydown on input element
      fireEvent.keyDown(input, { key: '1', target: input })

      // Should NOT select option when typing in input
      expect(mockOnAnswerQuestion).not.toHaveBeenCalled()
    })

    it('does NOT select option when number pressed in textarea', () => {
      render(
        <div>
          <textarea data-testid="test-textarea" />
          <QuestionFlow
            questions={mockQuestions}
            answers={{}}
            autoAnswers={{}}
            onAnswerQuestion={mockOnAnswerQuestion}
            onComplete={mockOnComplete}
            onBack={mockOnBack}
          />
        </div>
      )

      const textarea = screen.getByTestId('test-textarea')
      fireEvent.keyDown(textarea, { key: '2', target: textarea })

      expect(mockOnAnswerQuestion).not.toHaveBeenCalled()
    })

    it('selects option when number pressed outside input fields', () => {
      render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // Press '1' on window (not in any input)
      fireEvent.keyDown(window, { key: '1' })
      expect(mockOnAnswerQuestion).toHaveBeenCalledWith('q1', 'a')
    })
  })

  // Bug 3: Auto-advance setTimeout cleanup
  describe('Bug #3: setTimeout cleanup on navigation/unmount', () => {
    it('cancels auto-advance when Back is clicked quickly', async () => {
      const { rerender } = render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // Answer first question (triggers 300ms auto-advance)
      fireEvent.click(screen.getByText('Option A'))

      // Immediately click Back button (before 300ms)
      const backButton = screen.getByRole('button', { name: /목적 선택으로/ })
      fireEvent.click(backButton)

      // Fast-forward timers
      vi.advanceTimersByTime(500)

      // onBack should have been called
      expect(mockOnBack).toHaveBeenCalled()

      // Should still show first question (auto-advance was cancelled)
      expect(screen.getByText('First question?')).toBeInTheDocument()
    })

    it('cancels auto-advance when Escape is pressed', () => {
      render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // Answer question
      fireEvent.click(screen.getByText('Option A'))

      // Press Escape immediately
      fireEvent.keyDown(window, { key: 'Escape' })

      // Fast-forward timers
      vi.advanceTimersByTime(500)

      expect(mockOnBack).toHaveBeenCalled()
    })

    it('does not cause state update after unmount', () => {
      const { unmount } = render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // Answer question (triggers setTimeout)
      fireEvent.click(screen.getByText('Option A'))

      // Unmount before timeout fires
      unmount()

      // Fast-forward timers - should not throw or warn
      expect(() => {
        vi.advanceTimersByTime(500)
      }).not.toThrow()
    })
  })

  // Bug 4: Side effect during render (onComplete called in render)
  describe('Bug #4: onComplete called via useEffect, not during render', () => {
    it('calls onComplete via useEffect when no questions', async () => {
      render(
        <QuestionFlow
          questions={[]}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // onComplete should be called after effect runs
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1)
      })
    })

    it('calls onComplete via useEffect when all questions filtered out', async () => {
      const shouldShowQuestion = () => false // Filter out all questions

      render(
        <QuestionFlow
          questions={mockQuestions}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
          shouldShowQuestion={shouldShowQuestion}
        />
      )

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1)
      })
    })

    it('renders null when no questions (does not throw)', () => {
      const { container } = render(
        <QuestionFlow
          questions={[]}
          answers={{}}
          autoAnswers={{}}
          onAnswerQuestion={mockOnAnswerQuestion}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      )

      // Should render empty (null)
      expect(container.firstChild).toBeNull()
    })
  })
})

describe('ConversationalQuestion Bug Fixes', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  // Bug 2 (ConversationalQuestion side): Numeric shortcuts in editable elements
  describe('Bug #2: Numeric shortcuts guard in ConversationalQuestion', () => {
    it('does NOT trigger onSelect when number key pressed in input', () => {
      render(
        <div>
          <input type="text" data-testid="test-input" />
          <ConversationalQuestion
            question={mockQuestions[0]}
            selectedValue={null}
            onSelect={mockOnSelect}
          />
        </div>
      )

      const input = screen.getByTestId('test-input')
      fireEvent.keyDown(input, { key: '1', target: input })

      expect(mockOnSelect).not.toHaveBeenCalled()
    })

    it('triggers onSelect when number key pressed on document body', () => {
      render(
        <ConversationalQuestion
          question={mockQuestions[0]}
          selectedValue={null}
          onSelect={mockOnSelect}
        />
      )

      fireEvent.keyDown(window, { key: '1' })
      expect(mockOnSelect).toHaveBeenCalledWith('a')
    })
  })
})
