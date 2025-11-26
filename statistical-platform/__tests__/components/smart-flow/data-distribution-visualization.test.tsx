/**
 * DataExplorationStep - 데이터 분포 시각화 테스트
 *
 * 테스트 대상:
 * 1. 차트 타입 상태 관리 (histogram/boxplot)
 * 2. 히스토그램 단일 변수 선택
 * 3. 박스플롯 다중 변수 선택 (토글)
 * 4. 박스플롯 다중 데이터 계산
 */

import { renderHook, act } from '@testing-library/react'
import { useState, useCallback, useMemo, useEffect } from 'react'

// ============================================
// 1. 차트 타입 상태 관리 테스트
// ============================================
describe('Chart Type State Management', () => {
  it('차트 타입 기본값은 histogram이어야 함', () => {
    const { result } = renderHook(() => {
      const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram')
      return { chartType, setChartType }
    })

    expect(result.current.chartType).toBe('histogram')
  })

  it('차트 타입을 boxplot으로 변경할 수 있어야 함', () => {
    const { result } = renderHook(() => {
      const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram')
      return { chartType, setChartType }
    })

    act(() => {
      result.current.setChartType('boxplot')
    })

    expect(result.current.chartType).toBe('boxplot')
  })

  it('변수 변경 시에도 차트 타입이 유지되어야 함', () => {
    const { result } = renderHook(() => {
      const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram')
      const [selectedVar, setSelectedVar] = useState('var1')
      return { chartType, setChartType, selectedVar, setSelectedVar }
    })

    // boxplot으로 변경
    act(() => {
      result.current.setChartType('boxplot')
    })
    expect(result.current.chartType).toBe('boxplot')

    // 변수 변경
    act(() => {
      result.current.setSelectedVar('var2')
    })

    // 차트 타입은 여전히 boxplot
    expect(result.current.chartType).toBe('boxplot')
    expect(result.current.selectedVar).toBe('var2')
  })
})

// ============================================
// 2. 히스토그램 단일 변수 선택 테스트
// ============================================
describe('Histogram Variable Selection', () => {
  it('초기 히스토그램 변수는 빈 문자열이어야 함', () => {
    const { result } = renderHook(() => {
      const [selectedHistogramVar, setSelectedHistogramVar] = useState<string>('')
      return { selectedHistogramVar, setSelectedHistogramVar }
    })

    expect(result.current.selectedHistogramVar).toBe('')
  })

  it('히스토그램 변수를 선택할 수 있어야 함', () => {
    const { result } = renderHook(() => {
      const [selectedHistogramVar, setSelectedHistogramVar] = useState<string>('')
      return { selectedHistogramVar, setSelectedHistogramVar }
    })

    act(() => {
      result.current.setSelectedHistogramVar('score')
    })

    expect(result.current.selectedHistogramVar).toBe('score')
  })

  it('numericVariables가 있으면 첫 번째 변수가 자동 선택되어야 함', () => {
    const numericVariables = ['score', 'age', 'income']

    const { result } = renderHook(() => {
      const [selectedHistogramVar, setSelectedHistogramVar] = useState<string>('')

      // useEffect로 초기화 시뮬레이션
      if (numericVariables.length > 0 && selectedHistogramVar === '') {
        setSelectedHistogramVar(numericVariables[0])
      }

      return { selectedHistogramVar, setSelectedHistogramVar }
    })

    expect(result.current.selectedHistogramVar).toBe('score')
  })
})

// ============================================
// 3. 박스플롯 다중 변수 선택 (토글) 테스트
// ============================================
describe('Boxplot Multi-Variable Toggle', () => {
  const useBoxplotToggle = () => {
    const [selectedBoxplotVars, setSelectedBoxplotVars] = useState<string[]>([])

    const toggleBoxplotVar = useCallback((varName: string) => {
      setSelectedBoxplotVars(prev => {
        if (prev.includes(varName)) {
          // 최소 1개는 유지
          if (prev.length <= 1) return prev
          return prev.filter(v => v !== varName)
        } else {
          // 최대 8개까지만 선택 가능
          if (prev.length >= 8) return prev
          return [...prev, varName]
        }
      })
    }, [])

    return { selectedBoxplotVars, setSelectedBoxplotVars, toggleBoxplotVar }
  }

  it('초기 박스플롯 변수 목록은 빈 배열이어야 함', () => {
    const { result } = renderHook(() => useBoxplotToggle())
    expect(result.current.selectedBoxplotVars).toEqual([])
  })

  it('변수를 토글하여 추가할 수 있어야 함', () => {
    const { result } = renderHook(() => useBoxplotToggle())

    act(() => {
      result.current.toggleBoxplotVar('score')
    })

    expect(result.current.selectedBoxplotVars).toContain('score')
    expect(result.current.selectedBoxplotVars).toHaveLength(1)
  })

  it('이미 선택된 변수를 토글하면 제거되어야 함 (2개 이상일 때)', () => {
    const { result } = renderHook(() => useBoxplotToggle())

    // 2개 추가
    act(() => {
      result.current.setSelectedBoxplotVars(['score', 'age'])
    })

    // score 제거
    act(() => {
      result.current.toggleBoxplotVar('score')
    })

    expect(result.current.selectedBoxplotVars).not.toContain('score')
    expect(result.current.selectedBoxplotVars).toContain('age')
    expect(result.current.selectedBoxplotVars).toHaveLength(1)
  })

  it('최소 1개는 유지되어야 함 (마지막 변수 제거 시도 시)', () => {
    const { result } = renderHook(() => useBoxplotToggle())

    // 1개만 추가
    act(() => {
      result.current.setSelectedBoxplotVars(['score'])
    })

    // 제거 시도
    act(() => {
      result.current.toggleBoxplotVar('score')
    })

    // 여전히 1개 유지
    expect(result.current.selectedBoxplotVars).toContain('score')
    expect(result.current.selectedBoxplotVars).toHaveLength(1)
  })

  it('최대 8개까지만 선택 가능해야 함', () => {
    const { result } = renderHook(() => useBoxplotToggle())

    // 8개 추가
    act(() => {
      result.current.setSelectedBoxplotVars(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'])
    })

    // 9번째 추가 시도
    act(() => {
      result.current.toggleBoxplotVar('v9')
    })

    // 여전히 8개
    expect(result.current.selectedBoxplotVars).toHaveLength(8)
    expect(result.current.selectedBoxplotVars).not.toContain('v9')
  })

  it('numericVariables가 있으면 최대 3개까지 자동 선택되어야 함', () => {
    const numericVariables = ['score', 'age', 'income', 'height', 'weight']

    const { result } = renderHook(() => {
      const [selectedBoxplotVars, setSelectedBoxplotVars] = useState<string[]>([])

      // useEffect로 초기화 시뮬레이션
      if (numericVariables.length > 0 && selectedBoxplotVars.length === 0) {
        setSelectedBoxplotVars(numericVariables.slice(0, Math.min(3, numericVariables.length)))
      }

      return { selectedBoxplotVars }
    })

    expect(result.current.selectedBoxplotVars).toHaveLength(3)
    expect(result.current.selectedBoxplotVars).toEqual(['score', 'age', 'income'])
  })

  it('numericVariables가 3개 미만이면 전체 선택되어야 함', () => {
    const numericVariables = ['score', 'age']

    const { result } = renderHook(() => {
      const [selectedBoxplotVars, setSelectedBoxplotVars] = useState<string[]>([])

      if (numericVariables.length > 0 && selectedBoxplotVars.length === 0) {
        setSelectedBoxplotVars(numericVariables.slice(0, Math.min(3, numericVariables.length)))
      }

      return { selectedBoxplotVars }
    })

    expect(result.current.selectedBoxplotVars).toHaveLength(2)
    expect(result.current.selectedBoxplotVars).toEqual(['score', 'age'])
  })
})

// ============================================
// 4. 박스플롯 다중 데이터 계산 테스트
// ============================================
describe('Boxplot Multi-Data Calculation', () => {
  const mockData = [
    { score: 85, age: 25, income: 50000 },
    { score: 90, age: 30, income: 60000 },
    { score: 78, age: 22, income: 45000 },
    { score: 92, age: 28, income: 55000 },
    { score: 88, age: 35, income: 70000 },
    { score: 75, age: 40, income: 80000 },
    { score: 95, age: 32, income: 65000 },
    { score: 82, age: 27, income: 52000 },
  ]

  const useBoxplotMultiData = (data: Record<string, unknown>[], selectedVars: string[]) => {
    return useMemo(() => {
      return selectedVars.map(varName => {
        const colData = data
          .map(row => row[varName])
          .filter(v => v !== null && v !== undefined && v !== '')
          .map(Number)
          .filter(v => !isNaN(v))

        if (colData.length === 0) return null

        const sortedData = [...colData].sort((a, b) => a - b)
        const q1Index = Math.floor(sortedData.length * 0.25)
        const q3Index = Math.floor(sortedData.length * 0.75)
        const medianIndex = Math.floor(sortedData.length * 0.5)
        const q1 = sortedData[q1Index] || 0
        const q3 = sortedData[q3Index] || 0
        const median = sortedData[medianIndex] || 0
        const iqr = q3 - q1
        const mean = colData.reduce((a, b) => a + b, 0) / colData.length
        const std = Math.sqrt(colData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / colData.length)

        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr
        const outliers = colData.filter(v => v < lowerBound || v > upperBound)

        return {
          name: varName,
          min: Math.min(...colData),
          q1,
          median,
          q3,
          max: Math.max(...colData),
          mean,
          std,
          outliers
        }
      }).filter(Boolean)
    }, [data, selectedVars])
  }

  it('선택된 변수들의 통계 데이터를 계산해야 함', () => {
    const { result } = renderHook(() =>
      useBoxplotMultiData(mockData, ['score', 'age'])
    )

    expect(result.current).toHaveLength(2)
    expect(result.current[0]?.name).toBe('score')
    expect(result.current[1]?.name).toBe('age')
  })

  it('각 변수의 통계값이 올바르게 계산되어야 함', () => {
    const { result } = renderHook(() =>
      useBoxplotMultiData(mockData, ['score'])
    )

    const scoreStats = result.current[0]
    expect(scoreStats).not.toBeNull()
    expect(scoreStats?.name).toBe('score')
    expect(scoreStats?.min).toBe(75)
    expect(scoreStats?.max).toBe(95)
    expect(typeof scoreStats?.mean).toBe('number')
    expect(typeof scoreStats?.median).toBe('number')
    expect(typeof scoreStats?.q1).toBe('number')
    expect(typeof scoreStats?.q3).toBe('number')
    expect(typeof scoreStats?.std).toBe('number')
    expect(Array.isArray(scoreStats?.outliers)).toBe(true)
  })

  it('빈 데이터는 null로 필터링되어야 함', () => {
    const dataWithEmpty = [
      { score: 85, empty: null },
      { score: 90, empty: undefined },
      { score: 78, empty: '' },
    ]

    const { result } = renderHook(() =>
      useBoxplotMultiData(dataWithEmpty, ['score', 'empty'])
    )

    // empty 변수는 null로 필터링됨
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.name).toBe('score')
  })

  it('선택된 변수가 없으면 빈 배열을 반환해야 함', () => {
    const { result } = renderHook(() =>
      useBoxplotMultiData(mockData, [])
    )

    expect(result.current).toHaveLength(0)
  })

  it('이상치가 올바르게 계산되어야 함', () => {
    // 이상치를 포함한 데이터
    const dataWithOutliers = [
      { value: 10 },
      { value: 12 },
      { value: 11 },
      { value: 13 },
      { value: 12 },
      { value: 11 },
      { value: 100 },  // 이상치
      { value: 1 },    // 이상치
    ]

    const { result } = renderHook(() =>
      useBoxplotMultiData(dataWithOutliers, ['value'])
    )

    const stats = result.current[0]
    expect(stats?.outliers).toBeDefined()
    // 100과 1은 IQR 범위를 벗어나므로 이상치
    expect(stats?.outliers.length).toBeGreaterThan(0)
  })
})

// ============================================
// 5. 통합 시나리오 테스트
// ============================================
describe('Integration Scenarios', () => {
  it('히스토그램에서 박스플롯으로 전환 후 변수 선택이 유지되어야 함', () => {
    const { result } = renderHook(() => {
      const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram')
      const [selectedHistogramVar, setSelectedHistogramVar] = useState('score')
      const [selectedBoxplotVars, setSelectedBoxplotVars] = useState(['score', 'age'])

      return {
        chartType, setChartType,
        selectedHistogramVar, setSelectedHistogramVar,
        selectedBoxplotVars, setSelectedBoxplotVars
      }
    })

    // 히스토그램 상태 확인
    expect(result.current.chartType).toBe('histogram')
    expect(result.current.selectedHistogramVar).toBe('score')

    // 박스플롯으로 전환
    act(() => {
      result.current.setChartType('boxplot')
    })

    // 박스플롯 상태 확인
    expect(result.current.chartType).toBe('boxplot')
    expect(result.current.selectedBoxplotVars).toEqual(['score', 'age'])

    // 다시 히스토그램으로 전환
    act(() => {
      result.current.setChartType('histogram')
    })

    // 히스토그램 선택이 유지됨
    expect(result.current.chartType).toBe('histogram')
    expect(result.current.selectedHistogramVar).toBe('score')
  })

  it('박스플롯에서 변수 토글 후 차트 타입 변경해도 선택이 유지되어야 함', () => {
    const { result } = renderHook(() => {
      const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('boxplot')
      const [selectedBoxplotVars, setSelectedBoxplotVars] = useState<string[]>(['v1', 'v2'])

      const toggleBoxplotVar = useCallback((varName: string) => {
        setSelectedBoxplotVars(prev => {
          if (prev.includes(varName)) {
            if (prev.length <= 1) return prev
            return prev.filter(v => v !== varName)
          } else {
            if (prev.length >= 8) return prev
            return [...prev, varName]
          }
        })
      }, [])

      return { chartType, setChartType, selectedBoxplotVars, toggleBoxplotVar }
    })

    // 변수 추가
    act(() => {
      result.current.toggleBoxplotVar('v3')
    })
    expect(result.current.selectedBoxplotVars).toEqual(['v1', 'v2', 'v3'])

    // 히스토그램으로 전환
    act(() => {
      result.current.setChartType('histogram')
    })

    // 다시 박스플롯으로 전환
    act(() => {
      result.current.setChartType('boxplot')
    })

    // 선택이 유지됨
    expect(result.current.selectedBoxplotVars).toEqual(['v1', 'v2', 'v3'])
  })
})
