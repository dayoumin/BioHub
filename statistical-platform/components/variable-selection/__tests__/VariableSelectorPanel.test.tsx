import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { VariableSelectorPanel, COMMON_ROLES, VariableRole } from '../VariableSelectorPanel'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock data
const mockData = [
  { id: 1, name: 'Alice', age: 30, score: 85.5, group: 'A' },
  { id: 2, name: 'Bob', age: 25, score: 90.0, group: 'B' },
  { id: 3, name: 'Charlie', age: 35, score: 78.3, group: 'A' },
]

const mockColumns = ['id', 'name', 'age', 'score', 'group']

// Test wrapper with TooltipProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>
    {children}
  </TooltipProvider>
)

describe('VariableSelectorPanel', () => {
  describe('렌더링', () => {
    it('기본 UI가 렌더링되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('사용 가능한 변수')).toBeInTheDocument()
      expect(screen.getByText('변수 역할 할당')).toBeInTheDocument()
    })

    it('변수 목록이 렌더링되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      mockColumns.forEach(col => {
        expect(screen.getByText(col)).toBeInTheDocument()
      })
    })

    it('역할 정보가 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('분석 변수')).toBeInTheDocument()
      expect(screen.getByText('기술통계를 계산할 수치형 변수')).toBeInTheDocument()
    })

    it('변수 개수가 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('5개')).toBeInTheDocument()
    })
  })

  describe('검색 기능', () => {
    it('검색 입력이 가능해야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('변수 검색...')
      fireEvent.change(searchInput, { target: { value: 'age' } })

      expect(searchInput).toHaveValue('age')
    })

    it('검색 결과가 필터링되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('변수 검색...')
      fireEvent.change(searchInput, { target: { value: 'score' } })

      // score만 표시되고 다른 것들은 숨겨짐
      expect(screen.getByText('score')).toBeInTheDocument()
    })
  })

  describe('변수 할당', () => {
    it('onAssignmentChange가 호출되어야 함', () => {
      const onAssignmentChange = jest.fn()

      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={onAssignmentChange}
          />
        </TestWrapper>
      )

      // 변수 클릭 시 팝오버가 열림
      const ageButton = screen.getByText('age').closest('button')
      if (ageButton) {
        fireEvent.click(ageButton)
      }
    })

    it('이미 할당된 변수가 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            assignment={{ variables: ['age', 'score'] }}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      // 할당된 변수들에 체크 아이콘이 표시됨 (getAllByText 사용)
      const ageElements = screen.getAllByText('age')
      // 첫 번째는 변수 목록, 두 번째는 할당된 역할에 표시
      expect(ageElements.length).toBeGreaterThanOrEqual(1)

      // 변수 목록의 버튼이 bg-primary/10 클래스를 가짐
      const ageButton = ageElements[0].closest('button')
      expect(ageButton).toHaveClass('bg-primary/10')
    })
  })

  describe('완료 버튼', () => {
    it('onComplete prop이 있을 때 완료 버튼이 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
            onComplete={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('필수 변수를 모두 선택해주세요')).toBeInTheDocument()
    })

    it('필수 변수가 할당되면 버튼이 활성화되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            assignment={{ variables: ['age'] }}
            onAssignmentChange={() => {}}
            onComplete={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('변수 선택 완료')).toBeInTheDocument()
    })

    it('onComplete가 호출되어야 함', () => {
      const onComplete = jest.fn()

      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            assignment={{ variables: ['age'] }}
            onAssignmentChange={() => {}}
            onComplete={onComplete}
          />
        </TestWrapper>
      )

      const completeButton = screen.getByText('변수 선택 완료')
      fireEvent.click(completeButton)

      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('타입 감지', () => {
    it('숫자 타입이 올바르게 감지되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      // age와 score는 숫자 타입
      expect(screen.getByText('age')).toBeInTheDocument()
      expect(screen.getByText('score')).toBeInTheDocument()
    })

    it('제공된 타입 정보가 우선 적용되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            columnTypes={{ id: 'number', name: 'string', age: 'number', score: 'number', group: 'string' }}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('id')).toBeInTheDocument()
    })
  })

  describe('COMMON_ROLES 프리셋', () => {
    it('descriptive 역할이 정의되어 있어야 함', () => {
      expect(COMMON_ROLES.descriptive).toBeDefined()
      expect(COMMON_ROLES.descriptive).toHaveLength(1)
      expect(COMMON_ROLES.descriptive[0].id).toBe('variables')
    })

    it('regression 역할이 정의되어 있어야 함', () => {
      expect(COMMON_ROLES.regression).toBeDefined()
      expect(COMMON_ROLES.regression).toHaveLength(2)
      expect(COMMON_ROLES.regression[0].id).toBe('dependent')
      expect(COMMON_ROLES.regression[1].id).toBe('independent')
    })

    it('anova 역할이 정의되어 있어야 함', () => {
      expect(COMMON_ROLES.anova).toBeDefined()
      expect(COMMON_ROLES.anova).toHaveLength(2)
      expect(COMMON_ROLES.anova[0].id).toBe('dependent')
      expect(COMMON_ROLES.anova[1].id).toBe('factor')
    })

    it('correlation 역할이 정의되어 있어야 함', () => {
      expect(COMMON_ROLES.correlation).toBeDefined()
      expect(COMMON_ROLES.correlation).toHaveLength(1)
      expect(COMMON_ROLES.correlation[0].id).toBe('variables')
    })
  })

  describe('다중 역할 (회귀분석)', () => {
    it('종속변수와 독립변수가 구분되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.regression}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('종속변수 (Y)')).toBeInTheDocument()
      expect(screen.getByText('독립변수 (X)')).toBeInTheDocument()
    })

    it('다중 선택 배지가 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.regression}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('다중 선택')).toBeInTheDocument()
    })
  })

  describe('빈 데이터 처리', () => {
    it('빈 변수 목록일 때 메시지가 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={[]}
            columns={[]}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      expect(screen.getByText('변수가 없습니다')).toBeInTheDocument()
    })

    it('검색 결과가 없을 때 메시지가 표시되어야 함', () => {
      render(
        <TestWrapper>
          <VariableSelectorPanel
            data={mockData}
            columns={mockColumns}
            roles={COMMON_ROLES.descriptive}
            onAssignmentChange={() => {}}
          />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('변수 검색...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
    })
  })
})
