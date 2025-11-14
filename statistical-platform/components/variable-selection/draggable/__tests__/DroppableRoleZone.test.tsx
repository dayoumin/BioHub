import { render, screen, fireEvent, act } from '@testing-library/react'
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

  it('할당된 변수 개수를 표시해야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹', '처리', '조건']}
        />
      </DndContext>
    )

    expect(screen.getByText('3개 선택됨')).toBeInTheDocument()
  })

  it('변수가 없을 때는 개수를 표시하지 않아야 함', () => {
    render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={[]}
        />
      </DndContext>
    )

    expect(screen.queryByText(/개 선택됨/)).not.toBeInTheDocument()
  })

  it('새로 추가된 변수에 하이라이트 클래스가 적용되어야 함', () => {
    const { rerender } = render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={[]}
        />
      </DndContext>
    )

    // 변수 추가
    rerender(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹']}
        />
      </DndContext>
    )

    // 하이라이트 클래스가 적용되었는지 확인
    const badge = screen.getByText('그룹').parentElement
    expect(badge?.className).toContain('bg-primary/10')
    expect(badge?.className).toContain('border-primary/50')
  })

  it('여러 변수 중 최근에 추가된 변수만 하이라이트되어야 함', () => {
    const { rerender } = render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹']}
        />
      </DndContext>
    )

    // 두 번째 변수 추가
    rerender(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹', '처리']}
        />
      </DndContext>
    )

    // "처리"만 하이라이트되어야 함
    const badge처리 = screen.getByText('처리').parentElement
    expect(badge처리?.className).toContain('bg-primary/10')

    // "그룹"은 하이라이트되지 않아야 함
    const badge그룹 = screen.getByText('그룹').parentElement
    expect(badge그룹?.className).not.toContain('bg-primary/10')
  })

  it('하이라이트는 1초 후 제거되어야 함', () => {
    jest.useFakeTimers()

    const { rerender } = render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={[]}
        />
      </DndContext>
    )

    rerender(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹']}
        />
      </DndContext>
    )

    const badge = screen.getByText('그룹').parentElement
    expect(badge?.className).toContain('bg-primary/10')

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    const badgeAfter = screen.getByText('그룹').parentElement
    expect(badgeAfter?.className).not.toContain('bg-primary/10')

    jest.useRealTimers()
  })

  it('연속 추가 시 마지막 변수만 1초 동안 하이라이트되어야 함', () => {
    jest.useFakeTimers()

    const { rerender } = render(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={[]}
        />
      </DndContext>
    )

    rerender(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹']}
        />
      </DndContext>
    )

    act(() => {
      jest.advanceTimersByTime(500)
    })

    rerender(
      <DndContext>
        <DroppableRoleZone
          role="factor"
          label="요인"
          assignedVariables={['그룹', '처리']}
        />
      </DndContext>
    )

    const badge처리 = screen.getByText('처리').parentElement
    const badge그룹 = screen.getByText('그룹').parentElement
    expect(badge처리?.className).toContain('bg-primary/10')
    expect(badge그룹?.className).not.toContain('bg-primary/10')

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(screen.getByText('처리').parentElement?.className).toContain('bg-primary/10')

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(screen.getByText('처리').parentElement?.className).not.toContain('bg-primary/10')

    jest.useRealTimers()
  })
})
