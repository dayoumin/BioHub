import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AutoConfirmSelector } from '@/components/common/variable-selectors'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'generic',
    variables: {
      group: { title: 'Group Variable', description: 'Categorical grouping variable' },
      dependent: { title: 'Dependent Variable (Y)', description: 'Numeric outcome variable' },
      independent: { title: 'Independent Variable (X)', description: 'Predictor variable' },
      factor: { title: 'Factor', description: 'Categorical factor variable' },
      covariate: { title: 'Covariate', description: 'Continuous control variable' },
      time: { title: 'Time Variable', description: 'Time or sequence variable' },
      event: { title: 'Event Variable', description: 'Binary event variable' },
      pairedFirst: { title: 'Time 1 / Before', description: 'First measurement' },
      pairedSecond: { title: 'Time 2 / After', description: 'Second measurement' },
      correlation: { title: 'Numeric Variables', description: 'Select numeric variables to analyze' },
    },
    selectorUI: {
      methodGuidance: {
        title: 'Method Guide',
        dataFormat: 'Data format',
        minSample: 'Min sample',
        variableRoles: 'Variable roles',
        requiredRoles: 'Required roles',
        assumptions: 'Assumptions',
        notes: 'Notes',
        expectedColumns: 'Expected columns',
        defaultSettings: 'Default settings',
        required: 'Required',
        optional: 'Optional',
        noneRequiredRoles: 'This method can run without explicit variable role assignment.',
        noAssumptions: 'No major assumptions are registered for this method.',
        noExampleSchema: 'No example schema is attached to this method yet.',
        noDefaultSettings: 'No default execution settings are registered for this method.',
        translationPending: 'Localized guidance is not available for this section yet.',
        defaultValue: 'Default',
        typeFormatSuffix: 'format',
        singleVariableCount: '1 variable',
        multipleVariableCount: (min: number, max?: number) =>
          max ? `${min}-${max} variables` : `${min}+ variables`,
        yes: 'Yes',
        no: 'No',
        variableTypeLabels: {
          continuous: 'Continuous',
          categorical: 'Categorical',
          binary: 'Binary',
          ordinal: 'Ordinal',
          date: 'Date/Time',
          count: 'Count',
        },
        formatTypeLabels: {
          wide: 'Wide',
          long: 'Long',
          both: 'Wide/Long',
        },
      },
    },
  }),
}))

describe('AutoConfirmSelector', () => {
  it('shows method guidance and allows execution for methods without variable roles', () => {
    const onComplete = vi.fn()

    render(
      <AutoConfirmSelector
        data={[]}
        onComplete={onComplete}
        methodName="사전 검정력 분석"
        methodRequirements={getMethodRequirements('power-analysis')}
        initialSelection={{}}
      />
    )

    expect(screen.getByText('사전 검정력 분석')).toBeInTheDocument()
    expect(screen.getAllByText('연구 설계 전 필요한 표본 크기 추정').length).toBeGreaterThan(0)
    expect(screen.getByTestId('method-guidance-panel')).toHaveTextContent('Default settings')
    expect(screen.getByTestId('method-guidance-panel')).toHaveTextContent('Required roles')
    expect(screen.getByTestId('auto-no-variable-needed')).toHaveTextContent('변수 배정 없이 실행할 수 있습니다')
    expect(screen.getByText('Default 0.8')).toBeInTheDocument()
    expect(screen.getByText('Default 0.5')).toBeInTheDocument()

    const runButton = screen.getByTestId('run-analysis-btn')
    expect(runButton).toBeEnabled()

    fireEvent.click(runButton)
    expect(onComplete).toHaveBeenCalledWith({})
  })

  it('disables execution when a future auto selector requires variables but none are detected', () => {
    const onComplete = vi.fn()

    render(
      <AutoConfirmSelector
        data={[]}
        onComplete={onComplete}
        methodName="가상 자동 메서드"
        methodRequirements={{
          id: 'future-auto',
          name: '가상 자동 메서드',
          category: 'other',
          description: '자동 선택이지만 변수 확인이 필요한 메서드',
          minSampleSize: 10,
          assumptions: [],
          variables: [{
            role: 'dependent',
            label: '결과 변수',
            types: ['continuous'],
            required: true,
            multiple: false,
            description: '결과 변수 1개가 필요합니다.',
          }],
        }}
      />
    )

    const runButton = screen.getByTestId('run-analysis-btn')
    expect(runButton).toBeDisabled()

    fireEvent.click(runButton)
    expect(onComplete).not.toHaveBeenCalled()
  })
})
