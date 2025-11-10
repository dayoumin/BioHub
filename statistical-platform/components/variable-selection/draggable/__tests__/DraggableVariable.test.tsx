import { render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { DraggableVariable, DraggableVariableOverlay } from '../DraggableVariable'
import type { ColumnAnalysis } from '@/lib/services/variable-type-detector'

// Mock 데이터
const mockColumn: ColumnAnalysis = {
  name: '시험점수',
  type: 'continuous',
  dataType: 'number',
  uniqueCount: 24,
  missingCount: 0,
  totalCount: 24,
  missingRate: 0,
  samples: [],
  metadata: {
    possibleTypes: ['continuous'],
    confidence: 0.95,
    reason: 'test data'
  },
  statistics: {
    min: 72.0,
    max: 95.0,
    mean: 83.5,
    median: 84.0,
    std: 6.8
  }
}

describe('DraggableVariable', () => {
  it('변수 이름과 타입을 표시해야 함', () => {
    render(
      <DndContext>
        <DraggableVariable column={mockColumn} />
      </DndContext>
    )

    expect(screen.getByText('시험점수')).toBeInTheDocument()
    expect(screen.getByText('continuous')).toBeInTheDocument()
  })

  it('showStats=true 시 통계 정보를 표시해야 함', () => {
    render(
      <DndContext>
        <DraggableVariable column={mockColumn} showStats={true} />
      </DndContext>
    )

    expect(screen.getByText(/범위: 72\.00 ~ 95\.00/)).toBeInTheDocument()
  })

  it('showStats=false 시 통계 정보를 숨겨야 함', () => {
    render(
      <DndContext>
        <DraggableVariable column={mockColumn} showStats={false} />
      </DndContext>
    )

    expect(screen.queryByText(/범위:/)).not.toBeInTheDocument()
  })

  it('isDisabled=true 시 드래그 불가능해야 함', () => {
    const { container } = render(
      <DndContext>
        <DraggableVariable column={mockColumn} isDisabled={true} />
      </DndContext>
    )

    const element = container.querySelector('.cursor-not-allowed')
    expect(element).toBeInTheDocument()
  })

  it('범주형 변수는 고유값 개수를 표시해야 함', () => {
    const categoricalColumn: ColumnAnalysis = {
      ...mockColumn,
      type: 'categorical',
      dataType: 'string',
      uniqueCount: 3,
      statistics: undefined
    }

    render(
      <DndContext>
        <DraggableVariable column={categoricalColumn} showStats={true} />
      </DndContext>
    )

    expect(screen.getByText(/고유값: 3개/)).toBeInTheDocument()
  })
})

describe('DraggableVariableOverlay', () => {
  it('드래그 오버레이를 올바르게 렌더링해야 함', () => {
    render(<DraggableVariableOverlay column={mockColumn} />)

    expect(screen.getByText('시험점수')).toBeInTheDocument()
    expect(screen.getByText('continuous')).toBeInTheDocument()
  })

  it('오버레이는 통계 정보를 표시하지 않아야 함', () => {
    render(<DraggableVariableOverlay column={mockColumn} />)

    expect(screen.queryByText(/범위:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/고유값:/)).not.toBeInTheDocument()
  })
})
