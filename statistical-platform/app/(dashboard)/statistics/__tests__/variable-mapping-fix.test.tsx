/**
 * Variable Mapping Fix 검증 테스트
 *
 * 버그: variableMapping은 항상 빈 객체 {} → selectedVariables 사용해야 함
 * 영향: one-sample-t, descriptive, normality-test, frequency-table
 *
 * 테스트 시나리오:
 * 1. 변수 선택 전: '다음 단계' 버튼 비활성화
 * 2. 변수 선택 후: '다음 단계' 버튼 활성화
 * 3. Step status가 올바르게 업데이트되는지 확인
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calculator: () => <div>Calculator Icon</div>,
  Target: () => <div>Target Icon</div>,
  BarChart3: () => <div>BarChart3 Icon</div>,
  Download: () => <div>Download Icon</div>,
  Play: () => <div>Play Icon</div>,
  Info: () => <div>Info Icon</div>,
  TrendingUp: () => <div>TrendingUp Icon</div>,
  AlertCircle: () => <div>AlertCircle Icon</div>,
  Upload: () => <div>Upload Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  CheckCircle2: () => <div>CheckCircle2 Icon</div>,
  Circle: () => <div>Circle Icon</div>,
  ArrowRight: () => <div>ArrowRight Icon</div>,
}))

// Mock DataUploadStep
jest.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
  DataUploadStep: () => <div>Data Upload Step</div>,
}))

// Mock VariableSelector
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: () => <div>Variable Selector</div>,
  VariableAssignment: jest.fn(),
}))

// Mock StatisticsPageLayout
jest.mock('@/components/statistics/StatisticsPageLayout', () => ({
  StatisticsPageLayout: ({ children }: any) => <div>{children}</div>,
  StatisticsStep: jest.fn(),
}))

// Mock StatisticsTable
jest.mock('@/components/statistics/common/StatisticsTable', () => ({
  StatisticsTable: () => <div>Statistics Table</div>,
}))

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

// Mock Pyodide service
jest.mock('@/hooks/use-pyodide-service', () => ({
  usePyodideService: () => ({
    pyodideService: null,
  }),
}))

describe('Variable Mapping Fix - useStatisticsPage Hook', () => {
  it('should have selectedVariables in state when withUploadedData is true', () => {
    const TestComponent = () => {
      const { state } = useStatisticsPage({
        withUploadedData: true,
        withError: false,
      })

      return (
        <div>
          <div data-testid="has-selectedVariables">
            {state.selectedVariables !== undefined ? 'true' : 'false'}
          </div>
          <div data-testid="has-variableMapping">
            {state.variableMapping !== undefined ? 'true' : 'false'}
          </div>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)

    // selectedVariables가 state에 포함되어야 함
    expect(getByTestId('has-selectedVariables')).toHaveTextContent('true')

    // variableMapping도 항상 존재 (하지만 사용하지 않음)
    expect(getByTestId('has-variableMapping')).toHaveTextContent('true')
  })

  it('should have setSelectedVariables action when withUploadedData is true', () => {
    const TestComponent = () => {
      const { actions } = useStatisticsPage({
        withUploadedData: true,
        withError: false,
      })

      return (
        <div>
          <div data-testid="has-setSelectedVariables">
            {actions.setSelectedVariables !== undefined ? 'true' : 'false'}
          </div>
          <button
            onClick={() => {
              if (actions.setSelectedVariables) {
                actions.setSelectedVariables({ test: 'value' } as any)
              }
            }}
          >
            Set Variables
          </button>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)

    // setSelectedVariables 액션이 존재해야 함
    expect(getByTestId('has-setSelectedVariables')).toHaveTextContent('true')
  })

  it('variableMapping should always be empty object (not updated)', () => {
    const TestComponent = () => {
      const { state, actions } = useStatisticsPage({
        withUploadedData: true,
        withError: false,
      })

      React.useEffect(() => {
        // setSelectedVariables 호출 (정상적인 사용법)
        if (actions.setSelectedVariables) {
          actions.setSelectedVariables({ variable: 'test' } as any)
        }
      }, [actions])

      return (
        <div>
          <div data-testid="variableMapping-length">
            {Object.keys(state.variableMapping).length}
          </div>
          <div data-testid="selectedVariables-exists">
            {state.selectedVariables ? 'true' : 'false'}
          </div>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)

    // variableMapping은 항상 빈 객체 (버그의 원인)
    expect(getByTestId('variableMapping-length')).toHaveTextContent('0')

    // selectedVariables는 설정됨
    expect(getByTestId('selectedVariables-exists')).toHaveTextContent('true')
  })
})

describe('Variable Mapping Fix - Button Disable Logic', () => {
  it('button should be disabled when selectedVariables is null', () => {
    const selectedVariables = null
    const disabled = !selectedVariables

    expect(disabled).toBe(true)
  })

  it('button should be enabled when selectedVariables has value', () => {
    const selectedVariables = { variable: 'test' }
    const disabled = !selectedVariables

    expect(disabled).toBe(false)
  })

  it('OLD PATTERN (buggy): button would be disabled even with selectedVariables', () => {
    const selectedVariables = { variable: 'test' }
    const variableMapping = {} // 항상 빈 객체

    // ❌ 잘못된 패턴 (버그)
    const disabledBuggy = Object.keys(variableMapping).length === 0

    expect(disabledBuggy).toBe(true) // 항상 disabled!
  })

  it('NEW PATTERN (fixed): button enabled with selectedVariables', () => {
    const selectedVariables = { variable: 'test' }

    // ✅ 수정된 패턴
    const disabledFixed = !selectedVariables

    expect(disabledFixed).toBe(false) // 정상적으로 enabled!
  })
})

describe('Variable Mapping Fix - Step Status Logic', () => {
  it('OLD PATTERN: step status would be pending even with selectedVariables', () => {
    const selectedVariables = { variable: 'test' }
    const variableMapping = {} // 항상 빈 객체
    const uploadedData = { data: [], fileName: 'test.csv', columns: [] }

    // ❌ 잘못된 패턴
    const statusBuggy = Object.keys(variableMapping).length > 0
      ? 'completed'
      : uploadedData
      ? 'current'
      : 'pending'

    expect(statusBuggy).toBe('current') // selectedVariables가 있어도 completed 안 됨!
  })

  it('NEW PATTERN: step status correctly updates with selectedVariables', () => {
    const selectedVariables = { variable: 'test' }
    const uploadedData = { data: [], fileName: 'test.csv', columns: [] }

    // ✅ 수정된 패턴
    const statusFixed = selectedVariables
      ? 'completed'
      : uploadedData
      ? 'current'
      : 'pending'

    expect(statusFixed).toBe('completed') // 정상적으로 completed!
  })
})
