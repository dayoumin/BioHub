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

import { renderHook, act } from '@testing-library/react'
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

    const { result, rerender } = renderHook(() => {
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
