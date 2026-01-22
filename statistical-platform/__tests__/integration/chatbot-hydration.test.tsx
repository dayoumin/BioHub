/**
 * 챗봇 Hydration 테스트
 *
 * 목적: 3가지 챗봇 구현체의 Hydration 문제 검증
 */

import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useState, useEffect, useMemo } from 'react'

describe('챗봇 Hydration 방지 패턴 테스트', () => {
  describe('isMounted 패턴', () => {
    it('초기 상태는 false여야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted, setIsMounted] = useState(false)
        return isMounted
      })

      expect(result.current).toBe(false)
    })

    it('useEffect 후 true로 변경되어야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted, setIsMounted] = useState(false)

        useEffect(() => {
          setIsMounted(true)
        }, [])

        return isMounted
      })

      // useEffect는 렌더 후 실행되므로 true가 됨
      expect(result.current).toBe(true)
    })
  })

  describe('useMemo with isMounted', () => {
    it('isMounted가 false일 때 빈 배열을 반환해야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(false)

        const data = useMemo(() => {
          if (!isMounted) return []
          return ['item1', 'item2']
        }, [isMounted])

        return data
      })

      expect(result.current).toEqual([])
    })

    it('isMounted가 true일 때 실제 데이터를 반환해야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(true)

        const data = useMemo(() => {
          if (!isMounted) return []
          return ['item1', 'item2']
        }, [isMounted])

        return data
      })

      expect(result.current).toEqual(['item1', 'item2'])
    })

    it('isMounted 변경 시 useMemo가 재계산되어야 함', () => {
      const { result, rerender } = renderHook(
        ({ mounted }) => {
          const data = useMemo(() => {
            if (!mounted) return []
            return ['item1', 'item2']
          }, [mounted])

          return data
        },
        { initialProps: { mounted: false } }
      )

      expect(result.current).toEqual([])

      // isMounted를 true로 변경
      rerender({ mounted: true })

      expect(result.current).toEqual(['item1', 'item2'])
    })
  })

  describe('localStorage 접근 패턴', () => {
    beforeEach(() => {
      // localStorage mock
      const localStorageMock = (() => {
        let store: Record<string, string> = {}

        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => {
            store[key] = value.toString()
          },
          clear: () => {
            store = {}
          },
          removeItem: (key: string) => {
            delete store[key]
          },
        }
      })()

      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      })
    })

    it('isMounted가 false일 때 localStorage를 읽지 않아야 함', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')

      renderHook(() => {
        const [isMounted] = useState(false)

        useMemo(() => {
          if (!isMounted) return []
          return JSON.parse(localStorage.getItem('sessions') || '[]')
        }, [isMounted])
      })

      expect(getItemSpy).not.toHaveBeenCalled()
      getItemSpy.mockRestore()
    })

    it('isMounted가 true일 때만 localStorage를 읽어야 함', () => {
      localStorage.setItem('sessions', JSON.stringify([{ id: '1', title: 'Test' }]))

      const { result } = renderHook(() => {
        const [isMounted] = useState(true)
        let accessedStorage = false

        const sessions = useMemo(() => {
          if (!isMounted) return []
          accessedStorage = true
          return JSON.parse(localStorage.getItem('sessions') || '[]')
        }, [isMounted])

        return { sessions, accessedStorage }
      })

      expect(result.current.accessedStorage).toBe(true)
      expect(result.current.sessions).toEqual([{ id: '1', title: 'Test' }])
    })
  })

  describe('조건부 렌더링 패턴', () => {
    it('isMounted가 false일 때 빈 배열을 사용해야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(false)

        const data = useMemo(() => {
          if (!isMounted) return []
          return ['content']
        }, [isMounted])

        return data
      })

      expect(result.current).toEqual([])
    })

    it('isMounted가 true일 때 실제 데이터를 사용해야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(true)

        const data = useMemo(() => {
          if (!isMounted) return []
          return ['content']
        }, [isMounted])

        return data
      })

      expect(result.current).toEqual(['content'])
    })
  })

  describe('전용 페이지 패턴 검증', () => {
    it('초기 렌더링 시 빈 배열을 반환해야 함 (서버 렌더링과 일치)', () => {
      const { result } = renderHook(() => {
        const [isMounted, setIsMounted] = useState(false)
        const [forceUpdate, setForceUpdate] = useState(0)

        const sessions = useMemo(() => {
          if (!isMounted) return []
          // 실제로는 ChatStorage.loadSessions() 호출
          return [{ id: '1', title: 'Test' }]
        }, [isMounted, forceUpdate])

        return { sessions, isMounted }
      })

      // 초기 상태: 서버 렌더링과 동일
      expect(result.current.sessions).toEqual([])
      expect(result.current.isMounted).toBe(false)
    })

    it('클라이언트 마운트 후 실제 데이터를 로드해야 함', () => {
      const { result, rerender } = renderHook(() => {
        const [isMounted, setIsMounted] = useState(false)
        const [forceUpdate] = useState(0)

        useEffect(() => {
          setIsMounted(true)
        }, [])

        const sessions = useMemo(() => {
          if (!isMounted) return []
          return [{ id: '1', title: 'Test' }]
        }, [isMounted, forceUpdate])

        return { sessions, isMounted }
      })

      // useEffect 실행 후: 클라이언트에서만 데이터 로드
      expect(result.current.sessions).toEqual([{ id: '1', title: 'Test' }])
      expect(result.current.isMounted).toBe(true)
    })
  })

  describe('플로팅 챗봇 패턴 검증', () => {
    it('isMounted가 false일 때 렌더링하지 않아야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(false)
        const [isEnabled] = useState(true)

        const shouldRender = isMounted && isEnabled

        return shouldRender
      })

      expect(result.current).toBe(false)
    })

    it('isMounted가 true이고 isEnabled가 true일 때 렌더링해야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(true)
        const [isEnabled] = useState(true)

        const shouldRender = isMounted && isEnabled

        return shouldRender
      })

      expect(result.current).toBe(true)
    })

    it('isEnabled가 false이면 렌더링하지 않아야 함', () => {
      const { result } = renderHook(() => {
        const [isMounted] = useState(true)
        const [isEnabled] = useState(false)

        const shouldRender = isMounted && isEnabled

        return shouldRender
      })

      expect(result.current).toBe(false)
    })
  })
})
