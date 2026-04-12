import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BarChart3, Play, Settings, Target } from 'lucide-react'
import { FloatingStepIndicator } from '../FloatingStepIndicator'

describe('FloatingStepIndicator', () => {
  it('연속 진행 바와 현재 단계 강조를 렌더링한다', () => {
    render(
      <FloatingStepIndicator
        currentStep={3}
        onStepChange={vi.fn()}
        steps={[
          { id: 1, label: '데이터 탐색', icon: BarChart3, completed: true },
          { id: 2, label: '방법 선택', icon: Target, completed: true },
          { id: 3, label: '변수 설정', icon: Settings },
          { id: 4, label: '결과 확인', icon: Play },
        ]}
      />,
    )

    expect(screen.getByTestId('stepper-progress-fill')).toHaveStyle({ width: '66.67%' })
    expect(screen.getByTestId('stepper-step-3')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByTestId('stepper-step-3')).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('stepper-step-1')).toHaveAttribute('data-state', 'completed')
  })
})
