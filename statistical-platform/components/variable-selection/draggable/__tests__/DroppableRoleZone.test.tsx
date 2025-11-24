import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    render(
      <DndContext>
        <DroppableRoleZone
          role="dependent"
          label="종속변수"
          required={true}
          assignedVariables={[]}
        />
      </DndContext>
    )

    const asterisk = screen.getByText('*')
    expect(asterisk).toBeInTheDocument()
    expect(asterisk).toHaveClass('text-error')
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

  // Tooltip 기능 테스트 (2025-11-24 추가)
  describe('Tooltip Functionality', () => {
    it('dependent role에 Info 아이콘이 표시되어야 함', () => {
      const { container } = render(
        <DndContext>
          <DroppableRoleZone
            role="dependent"
            label="종속변수"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const infoIcon = container.querySelector('.lucide-info')
      expect(infoIcon).toBeInTheDocument()
    })

    it('Info 아이콘 호버 시 tooltip이 표시되어야 함 (dependent)', async () => {
      const user = userEvent.setup()
      render(
        <DndContext>
          <DroppableRoleZone
            role="dependent"
            label="종속변수"
            assignedVariables={[]}
          />
        </DndContext>
      )

      // Info 버튼 찾기 (type="button"이고 아이콘만 있음)
      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      expect(infoButton).toBeDefined()

      if (infoButton) {
        await user.hover(infoButton)

        await waitFor(() => {
          const tooltips = screen.getAllByText(/설명하려는 대상 \(결과, Y\)/)
          expect(tooltips.length).toBeGreaterThanOrEqual(1)
        }, { timeout: 1000 })
      }
    })

    it('Info 아이콘 호버 시 tooltip이 표시되어야 함 (independent)', async () => {
      const user = userEvent.setup()
      render(
        <DndContext>
          <DroppableRoleZone
            role="independent"
            label="독립변수"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      if (infoButton) {
        await user.hover(infoButton)

        await waitFor(() => {
          const tooltips = screen.getAllByText(/설명에 사용하는 변수 \(원인, X\)/)
          expect(tooltips.length).toBeGreaterThanOrEqual(1)
        }, { timeout: 1000 })
      }
    })

    it('Info 아이콘 호버 시 tooltip이 표시되어야 함 (factor)', async () => {
      const user = userEvent.setup()
      render(
        <DndContext>
          <DroppableRoleZone
            role="factor"
            label="요인"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      if (infoButton) {
        await user.hover(infoButton)

        await waitFor(() => {
          const tooltips = screen.getAllByText(/그룹을 구분하는 범주형 변수/)
          expect(tooltips.length).toBeGreaterThanOrEqual(1)
        }, { timeout: 1000 })
      }
    })

    it('Info 아이콘 호버 시 tooltip이 표시되어야 함 (covariate)', async () => {
      const user = userEvent.setup()
      render(
        <DndContext>
          <DroppableRoleZone
            role="covariate"
            label="공변량"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      if (infoButton) {
        await user.hover(infoButton)

        await waitFor(() => {
          const tooltips = screen.getAllByText(/통제하려는 공변량/)
          expect(tooltips.length).toBeGreaterThanOrEqual(1)
        }, { timeout: 1000 })
      }
    })

    it('Info 아이콘 호버 시 tooltip이 표시되어야 함 (within)', async () => {
      const user = userEvent.setup()
      render(
        <DndContext>
          <DroppableRoleZone
            role="within"
            label="개체내 요인"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      if (infoButton) {
        await user.hover(infoButton)

        await waitFor(() => {
          const tooltips = screen.getAllByText(/개체 내 반복 측정 요인/)
          expect(tooltips.length).toBeGreaterThanOrEqual(1)
        }, { timeout: 1000 })
      }
    })

    it('Info 아이콘 호버 시 tooltip이 표시되어야 함 (blocking)', async () => {
      const user = userEvent.setup()
      render(
        <DndContext>
          <DroppableRoleZone
            role="blocking"
            label="블록 변수"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      if (infoButton) {
        await user.hover(infoButton)

        await waitFor(() => {
          const tooltips = screen.getAllByText(/블록 변수 \(무선 효과\)/)
          expect(tooltips.length).toBeGreaterThanOrEqual(1)
        }, { timeout: 1000 })
      }
    })

    it('알 수 없는 role의 경우 Info 아이콘이 표시되지 않아야 함', () => {
      const { container } = render(
        <DndContext>
          <DroppableRoleZone
            role="unknown_role"
            label="알 수 없는 역할"
            assignedVariables={[]}
          />
        </DndContext>
      )

      const infoIcon = container.querySelector('.lucide-info')
      expect(infoIcon).not.toBeInTheDocument()
    })

    it('Info 버튼 클릭 시 이벤트 전파가 중단되어야 함', () => {
      const onClick = jest.fn()
      render(
        <DndContext>
          <DroppableRoleZone
            role="dependent"
            label="종속변수"
            assignedVariables={[]}
            onClick={onClick}
          />
        </DndContext>
      )

      const buttons = screen.getAllByRole('button')
      const infoButton = buttons.find(btn => {
        const svg = btn.querySelector('.lucide-info')
        return svg !== null
      })

      if (infoButton) {
        fireEvent.click(infoButton)
        // onClick 핸들러가 호출되지 않아야 함 (stopPropagation)
        expect(onClick).not.toHaveBeenCalled()
      }
    })
  })
})
