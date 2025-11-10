import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { DroppableRoleZone } from '../DroppableRoleZone'

describe('DroppableRoleZone', () => {
  it('라벨과 설명을 표시해야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          description="분석할 종속변수를 선택하세요"
          assignedVariables={[]}
        />
      </DndContext>
    )

    expect(screen.getByText('종속변수')).toBeInTheDocument()
    expect(screen.getByText('분석할 종속변수를 선택하세요')).toBeInTheDocument()
  })

  it('required=true 시 빨간 별표를 표시해야 함', () => {
    const { container } = render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          required={true}
          assignedVariables={[]}
        />
      </DndContext>
    )

    const asterisk = container.querySelector('.text-red-500')
    expect(asterisk).toBeInTheDocument()
    expect(asterisk).toHaveTextContent('*')
  })

  it('변수가 없을 때 빈 상태 메시지를 표시해야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          assignedVariables={[]}
        />
      </DndContext>
    )

    expect(screen.getByText('+ 변수를 드래그하여 추가')).toBeInTheDocument()
  })

  it('할당된 변수를 Badge로 표시해야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          assignedVariables={['시험점수', '이론점수']}
        />
      </DndContext>
    )

    expect(screen.getByText('시험점수')).toBeInTheDocument()
    expect(screen.getByText('이론점수')).toBeInTheDocument()
  })

  it('변수 제거 버튼을 클릭하면 onRemoveVariable 호출되어야 함', () => {
    const mockRemove = jest.fn()

    render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          assignedVariables={['시험점수']}
          onRemoveVariable={mockRemove}
        />
      </DndContext>
    )

    const removeButton = screen.getByLabelText('시험점수 제거')
    fireEvent.click(removeButton)

    expect(mockRemove).toHaveBeenCalledWith('시험점수')
  })

  it('onRemoveVariable이 없으면 제거 버튼을 표시하지 않아야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          assignedVariables={['시험점수']}
        />
      </DndContext>
    )

    expect(screen.queryByLabelText('시험점수 제거')).not.toBeInTheDocument()
  })

  it('여러 변수가 할당되었을 때 모두 표시해야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹', '처리', '조건']}
        />
      </DndContext>
    )

    expect(screen.getByText('그룹')).toBeInTheDocument()
    expect(screen.getByText('처리')).toBeInTheDocument()
    expect(screen.getByText('조건')).toBeInTheDocument()
  })
})
