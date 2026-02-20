/**
 * DataExplorationStep 무한 루프 수정 검증 테스트
 *
 * React Error #185 (Maximum Update Depth Exceeded) 수정 검증
 *
 * 문제:
 * - useEffect 의존성에 selectedHistogramVar, selectedBoxplotVars 포함
 * - 해당 useEffect 내에서 동일 상태 업데이트 → 무한 루프
 *
 * 해결:
 * - useRef로 현재 값 추적
 * - useEffect 의존성에서 상태 변수 제거
 */

import { renderHook } from '@testing-library/react'
import { useState, useRef, useEffect } from 'react'

describe('DataExplorationStep 무한 루프 수정', () => {
  /**
   * 문제가 있던 패턴 재현
   * (실제 실행하면 무한 루프 발생하므로 주석 처리)
   */
  // it('❌ 문제 패턴: 의존성에 상태 포함 시 무한 루프', () => {
  //   const { result } = renderHook(() => {
  //     const [selectedVar, setSelectedVar] = useState('')
  //     const numericVars = ['a', 'b', 'c']
  //
  //     useEffect(() => {
  //       if (selectedVar === '' || !numericVars.includes(selectedVar)) {
  //         setSelectedVar(numericVars[0]) // 상태 변경 → 무한 루프!
  //       }
  //     }, [numericVars, selectedVar]) // ❌ selectedVar가 의존성에 있음
  //
  //     return { selectedVar }
  //   })
  // })

  /**
   * 수정된 패턴: ref를 사용하여 무한 루프 방지
   */
  it('✅ 수정 패턴: ref 사용 시 무한 루프 없음', () => {
    let renderCount = 0

    const { result } = renderHook(() => {
      renderCount++

      const [selectedVar, setSelectedVar] = useState('')
      const [numericVars] = useState(['a', 'b', 'c'])

      // ref로 현재 값 추적
      const selectedVarRef = useRef(selectedVar)

      // ref 동기화
      useEffect(() => {
        selectedVarRef.current = selectedVar
      }, [selectedVar])

      // 초기화 로직 (numericVars 변경 시에만 실행)
      useEffect(() => {
        const currentVar = selectedVarRef.current

        if (currentVar === '' || !numericVars.includes(currentVar)) {
          setSelectedVar(numericVars[0])
        }
      }, [numericVars]) // ✅ selectedVar 의존성 제거

      return { selectedVar, renderCount }
    })

    // 초기 렌더링 + 상태 업데이트로 인한 리렌더링
    // 무한 루프라면 이 테스트는 타임아웃 발생
    expect(renderCount).toBeLessThan(10)
    expect(result.current.selectedVar).toBe('a')
  })

  /**
   * numericVars 변경 시 올바르게 초기화되는지 확인
   */
  it('✅ numericVars 변경 시 올바르게 초기화', () => {
    const { result, rerender } = renderHook(
      ({ numericVars }: { numericVars: string[] }) => {
        const [selectedVar, setSelectedVar] = useState('')
        const selectedVarRef = useRef(selectedVar)

        useEffect(() => {
          selectedVarRef.current = selectedVar
        }, [selectedVar])

        useEffect(() => {
          const currentVar = selectedVarRef.current

          if (currentVar === '' || !numericVars.includes(currentVar)) {
            setSelectedVar(numericVars[0])
          }
        }, [numericVars])

        return { selectedVar }
      },
      { initialProps: { numericVars: ['a', 'b', 'c'] } }
    )

    // 초기값 'a'
    expect(result.current.selectedVar).toBe('a')

    // numericVars 변경 (기존 선택 'a'가 새 목록에 없음)
    rerender({ numericVars: ['x', 'y', 'z'] })
    expect(result.current.selectedVar).toBe('x')
  })

  /**
   * 기존 선택이 새 목록에 있으면 유지
   */
  it('✅ 기존 선택이 새 목록에 있으면 유지', () => {
    const { result, rerender } = renderHook(
      ({ numericVars }: { numericVars: string[] }) => {
        const [selectedVar, setSelectedVar] = useState('b')
        const selectedVarRef = useRef(selectedVar)

        useEffect(() => {
          selectedVarRef.current = selectedVar
        }, [selectedVar])

        useEffect(() => {
          const currentVar = selectedVarRef.current

          if (currentVar === '' || !numericVars.includes(currentVar)) {
            setSelectedVar(numericVars[0])
          }
        }, [numericVars])

        return { selectedVar }
      },
      { initialProps: { numericVars: ['a', 'b', 'c'] } }
    )

    // 기존 선택 'b' 유지
    expect(result.current.selectedVar).toBe('b')

    // numericVars 변경 (기존 선택 'b'가 새 목록에도 있음)
    rerender({ numericVars: ['b', 'c', 'd'] })
    expect(result.current.selectedVar).toBe('b') // 유지됨
  })
})

describe('DataExplorationStep scatterplots 무한 루프 수정', () => {
  interface ScatterplotConfig {
    id: string
    xVariable: string
    yVariable: string
  }

  /**
   * scatterplots 상태가 의존성에 있으면서 setScatterplots 호출 시 무한 루프
   * ref 패턴으로 해결
   */
  it('✅ scatterplots ref 패턴: 무한 루프 없음', () => {
    let renderCount = 0

    const { result } = renderHook(() => {
      renderCount++

      const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([])
      const [numericVars] = useState(['x', 'y', 'z'])

      // ref로 현재 값 추적
      const scatterplotsRef = useRef(scatterplots)
      useEffect(() => {
        scatterplotsRef.current = scatterplots
      }, [scatterplots])

      // 초기화 로직
      useEffect(() => {
        const currentScatterplots = scatterplotsRef.current

        if (numericVars.length >= 2 && currentScatterplots.length === 0) {
          setScatterplots([{
            id: '1',
            xVariable: numericVars[0],
            yVariable: numericVars[1]
          }])
        }
      }, [numericVars]) // ✅ scatterplots 의존성 제거

      return { scatterplots, renderCount }
    })

    // 무한 루프 없이 초기화 완료
    expect(renderCount).toBeLessThan(10)
    expect(result.current.scatterplots).toHaveLength(1)
    expect(result.current.scatterplots[0].xVariable).toBe('x')
    expect(result.current.scatterplots[0].yVariable).toBe('y')
  })

  /**
   * numericVars 변경 시 유효하지 않은 변수 대체
   */
  it('✅ numericVars 변경 시 유효하지 않은 변수 대체', () => {
    const { result, rerender } = renderHook(
      ({ numericVars }: { numericVars: string[] }) => {
        const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([
          { id: '1', xVariable: 'a', yVariable: 'b' }
        ])
        const scatterplotsRef = useRef(scatterplots)

        useEffect(() => {
          scatterplotsRef.current = scatterplots
        }, [scatterplots])

        useEffect(() => {
          const currentScatterplots = scatterplotsRef.current

          if (numericVars.length < 2) {
            if (currentScatterplots.length > 0) setScatterplots([])
            return
          }

          const updatedScatterplots = currentScatterplots.map(sp => {
            const xValid = numericVars.includes(sp.xVariable)
            const yValid = numericVars.includes(sp.yVariable)

            if (xValid && yValid) return sp

            const newX = xValid ? sp.xVariable : numericVars[0]
            const newY = yValid && newX !== sp.yVariable
              ? sp.yVariable
              : numericVars.find(v => v !== newX) || numericVars[1]

            return { ...sp, xVariable: newX, yVariable: newY }
          })

          const hasChanges = updatedScatterplots.some((sp, i) =>
            sp.xVariable !== currentScatterplots[i].xVariable ||
            sp.yVariable !== currentScatterplots[i].yVariable
          )
          if (hasChanges) setScatterplots(updatedScatterplots)
        }, [numericVars])

        return { scatterplots }
      },
      { initialProps: { numericVars: ['a', 'b', 'c'] } }
    )

    // 초기 상태 유지
    expect(result.current.scatterplots[0].xVariable).toBe('a')
    expect(result.current.scatterplots[0].yVariable).toBe('b')

    // numericVars 변경 (기존 변수 'a', 'b'가 없음)
    rerender({ numericVars: ['x', 'y', 'z'] })
    expect(result.current.scatterplots[0].xVariable).toBe('x')
    expect(result.current.scatterplots[0].yVariable).toBe('y')
  })
})

describe('SmartFlowPage Zustand 의존성 수정', () => {
  /**
   * getState() 패턴 검증
   * Zustand store 함수를 의존성에서 제거하고 getState()로 직접 접근
   */
  it('✅ getState() 패턴은 의존성 변경 없이 동작', () => {
    // Zustand getState()는 항상 동일한 참조를 반환
    // 따라서 useEffect 의존성에 넣지 않아도 됨

    let callCount = 0

    const mockStore = {
      getState: () => ({
        loadHistoryFromDB: async () => {
          callCount++
        }
      })
    }

    const { rerender } = renderHook(() => {
      useEffect(() => {
        mockStore.getState().loadHistoryFromDB()
      }, []) // 빈 의존성

      return null
    })

    // 마운트 시 한 번만 호출
    expect(callCount).toBe(1)

    // 리렌더링해도 다시 호출되지 않음
    rerender()
    rerender()
    rerender()

    expect(callCount).toBe(1) // 여전히 1
  })
})

describe('DataExplorationStep assumptionResults 무한 루프 수정', () => {
  /**
   * assumptionResults가 useEffect 의존성에 있으면서
   * setLocalAssumptionResults 호출 시 무한 루프 발생
   *
   * 문제 패턴:
   * useEffect(() => {
   *   ...
   *   setLocalAssumptionResults(assumptions) // 상태 변경
   * }, [..., assumptionResults]) // 무한 루프!
   *
   * 해결: assumptionResults를 의존성 배열에서 제거
   */
  it('✅ assumptionResults 의존성 제거 시 무한 루프 없음', () => {
    let effectRunCount = 0
    let renderCount = 0

    const { rerender } = renderHook(() => {
      renderCount++
      const [assumptionResults, setAssumptionResults] = useState<{ isNormal: boolean } | null>(null)
      const [data] = useState([{ a: 1 }, { a: 2 }])
      const [pyodideLoaded] = useState(true)

      // 가정 검정 자동 실행 (수정된 패턴)
      useEffect(() => {
        effectRunCount++

        if (!data || !pyodideLoaded) {
          if (assumptionResults !== null) {
            setAssumptionResults(null)
          }
          return
        }

        // 비동기 작업 시뮬레이션
        const timer = setTimeout(() => {
          setAssumptionResults({ isNormal: true })
        }, 0)

        return () => clearTimeout(timer)
      }, [data, pyodideLoaded]) // assumptionResults 의존성 제거

      return { assumptionResults, effectRunCount, renderCount }
    })

    // useEffect는 마운트 시 한 번만 실행
    expect(effectRunCount).toBe(1)

    // 리렌더링해도 effect는 다시 실행되지 않음
    rerender()
    rerender()

    // 무한 루프라면 renderCount가 매우 높아짐
    expect(renderCount).toBeLessThan(10)
    expect(effectRunCount).toBe(1)
  })

  /**
   * 문제가 있던 패턴 검증 (의존성에 상태 포함)
   * 실제로 실행하면 무한 루프 발생하므로 패턴만 문서화
   */
  it('문서화: assumptionResults가 의존성에 있으면 무한 루프 발생', () => {
    // 이 패턴은 실행하지 않음 (무한 루프 발생)
    //
    // useEffect(() => {
    //   if (assumptionResults !== null) {
    //     setLocalAssumptionResults(null) // 상태 변경
    //   }
    //   ...
    //   setLocalAssumptionResults(assumptions) // 상태 변경
    // }, [..., assumptionResults]) // 무한 루프!
    //
    // 원인:
    // 1. useEffect 실행 -> setLocalAssumptionResults() 호출
    // 2. assumptionResults 상태 변경
    // 3. 의존성 배열에 assumptionResults 있음 -> useEffect 재실행
    // 4. 1번으로 돌아감 -> 무한 반복

    expect(true).toBe(true) // 패턴 문서화 목적
  })
})
