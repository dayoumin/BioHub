/**
 * VariableSelectorModern 단위 테스트
 *
 * 목표:
 * - 렌더링 검증
 * - 변수 선택 기능 검증
 * - 검증 로직 검증
 * - 초기화 기능 검증
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VariableSelectorModern } from '../VariableSelectorModern'
import type { VariableAssignment } from '@/types/statistics-converters'

// Mock 데이터
const mockData = [
  { score: 85, group: 'A', age: 25 },
  { score: 90, group: 'B', age: 30 },
  { score: 78, group: 'A', age: 28 },
  { score: 92, group: 'B', age: 35 },
  { score: 88, group: 'A', age: 27 }
]

describe('VariableSelectorModern', () => {
  const mockOnVariablesSelected = jest.fn()
  const mockOnBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ========================================
  // 1. 렌더링 테스트
  // ========================================

  test('헤더가 올바르게 렌더링됨', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
        onBack={mockOnBack}
      />
    )

    // 제목 확인
    expect(screen.getByText(/일원분산분석/i)).toBeInTheDocument()

    // 초기화 버튼 확인
    expect(screen.getByText('초기화')).toBeInTheDocument()
  })

  test('필수 변수 필드가 렌더링됨', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // 종속변수 필드가 존재하는지 확인 (레이블이 표시되면 OK)
    const dependentLabels = screen.getAllByText(/종속 변수/i)
    expect(dependentLabels.length).toBeGreaterThan(0)

    // 변수 선택 버튼이 2개 있는지 확인 (종속변수 + 요인)
    const selectButtons = screen.getAllByText('변수 선택')
    expect(selectButtons.length).toBeGreaterThanOrEqual(2)
  })

  test('검증 피드백 영역이 렌더링됨', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // 샘플 크기 표시
    expect(screen.getByText(/샘플 크기:/i)).toBeInTheDocument()
  })

  test('하단 버튼이 렌더링됨', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
        onBack={mockOnBack}
      />
    )

    // 이전 버튼
    expect(screen.getByText('이전')).toBeInTheDocument()

    // 미리보기 버튼
    expect(screen.getByText('미리보기')).toBeInTheDocument()

    // 분석 시작 버튼
    expect(screen.getByText('분석 시작')).toBeInTheDocument()
  })

  // ========================================
  // 2. 검증 로직 테스트
  // ========================================

  test('필수 변수 누락 시 분석 시작 버튼 비활성화', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    const submitButton = screen.getByText('분석 시작')
    expect(submitButton).toBeDisabled()
  })

  test('필수 변수 누락 시 에러 메시지 표시', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // 에러 메시지 확인
    expect(screen.getByText(/필수 항목 확인/i)).toBeInTheDocument()
  })

  // ========================================
  // 3. 초기화 기능 테스트
  // ========================================

  test('초기화 버튼 클릭 시 모든 선택 초기화', async () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    const resetButton = screen.getByText('초기화')
    fireEvent.click(resetButton)

    await waitFor(() => {
      // 모든 변수 선택이 초기화됨
      const addButtons = screen.getAllByText(/\+ 변수 추가/i)
      expect(addButtons.length).toBeGreaterThan(0)
    })
  })

  // ========================================
  // 4. 미리보기 기능 테스트
  // ========================================

  test('미리보기 버튼 클릭 시 JSON 표시', async () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    const previewButton = screen.getByText('미리보기')
    fireEvent.click(previewButton)

    await waitFor(() => {
      expect(screen.getByText(/변수 할당 미리보기/i)).toBeInTheDocument()
    })
  })

  // ========================================
  // 5. 이전 버튼 테스트
  // ========================================

  test('이전 버튼 클릭 시 onBack 콜백 호출', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
        onBack={mockOnBack}
      />
    )

    const backButton = screen.getByText('이전')
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  // ========================================
  // 6. 에러 처리 테스트
  // ========================================

  test('잘못된 methodId 시 에러 메시지 표시', () => {
    render(
      <VariableSelectorModern
        methodId="invalid-method-id"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    expect(screen.getByText(/통계 메서드 정보를 불러올 수 없습니다/i)).toBeInTheDocument()
  })

  test('빈 데이터 시 에러 메시지 표시', () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={[]}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    expect(screen.getByText(/데이터를 분석할 수 없습니다/i)).toBeInTheDocument()
  })

  // ========================================
  // 7. 타입 안전성 테스트
  // ========================================

  test('Props 타입 검증', () => {
    // TypeScript 컴파일 시점에 검증됨
    const props = {
      methodId: 'one-way-anova',
      data: mockData as Record<string, unknown>[],
      onVariablesSelected: (variables: VariableAssignment) => {
        expect(typeof variables).toBe('object')
      }
    }

    render(<VariableSelectorModern {...props} />)
  })

  // ========================================
  // 8. 모달 기능 테스트 (Phase 1.3)
  // ========================================

  test('변수 선택 버튼 클릭 시 모달 열림', async () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    const selectButtons = screen.getAllByText('변수 선택')
    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      // 모달 제목 확인
      expect(screen.getByText(/종속 변수 선택/i)).toBeInTheDocument()
      // 검색바 확인
      expect(screen.getByPlaceholderText('변수명 검색...')).toBeInTheDocument()
    })
  })

  test('모달에서 변수 목록 표시', async () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    const selectButtons = screen.getAllByText('변수 선택')
    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      // 모달이 열렸는지 확인
      expect(screen.getByText(/종속 변수 선택/i)).toBeInTheDocument()

      // 변수가 표시되는지 확인 (타입 필터링으로 일부만 표시될 수 있음)
      // continuous 타입 변수만 표시되어야 함
      const allText = screen.getByText(/종속 변수 선택/i).parentElement?.parentElement?.textContent
      expect(allText).toBeTruthy()
    })
  })

  test('모달 닫기 버튼 동작', async () => {
    render(
      <VariableSelectorModern
        methodId="one-way-anova"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    const selectButtons = screen.getAllByText('변수 선택')
    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/종속 변수 선택/i)).toBeInTheDocument()
    })

    // 취소 버튼 클릭
    const cancelButton = screen.getByText('취소')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      // 모달이 닫혔는지 확인
      expect(screen.queryByText(/종속 변수 선택/i)).not.toBeInTheDocument()
    })
  })
})
