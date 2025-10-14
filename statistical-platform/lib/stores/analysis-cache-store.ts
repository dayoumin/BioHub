import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateSecureHash } from '@/lib/services/pyodide-helper'

interface CachedAnalysis {
  methodId: string
  data: any[]
  parameters: Record<string, any>
  result: any
  timestamp: number
}

interface AnalysisCacheStore {
  cache: Map<string, CachedAnalysis>
  getCachedResult: (methodId: string, data: any[], parameters: Record<string, any>) => Promise<CachedAnalysis | null>
  setCachedResult: (methodId: string, data: any[], parameters: Record<string, any>, result: any) => Promise<void>
  clearCache: () => void
  clearOldCache: (maxAge: number) => void
}

// 캐시 키 생성 함수 (안전한 해시 사용)
async function generateCacheKey(methodId: string, data: any[], parameters: Record<string, any>): Promise<string> {
  const dataStr = JSON.stringify(data)
  const paramsStr = JSON.stringify(parameters)
  const combinedStr = `${methodId}-${dataStr}-${paramsStr}`

  // 해시 생성 (SHA-256 또는 폴백)
  const hash = await generateSecureHash(combinedStr)
  return `${methodId}-${hash}`
}

export const useAnalysisCacheStore = create<AnalysisCacheStore>()(
  persist(
    (set, get) => ({
      cache: new Map(),

      getCachedResult: async (methodId, data, parameters) => {
        const key = await generateCacheKey(methodId, data, parameters)
        const cached = get().cache.get(key)

        if (cached) {
          // 캐시가 1시간 이내인 경우에만 반환
          const oneHour = 60 * 60 * 1000
          if (Date.now() - cached.timestamp < oneHour) {
            console.log(`[AnalysisCache] 캐시 히트: ${methodId}`)
            return cached
          }
        }

        return null
      },

      setCachedResult: async (methodId, data, parameters, result) => {
        const key = await generateCacheKey(methodId, data, parameters)
        const cached: CachedAnalysis = {
          methodId,
          data,
          parameters,
          result,
          timestamp: Date.now()
        }

        set((state) => {
          const newCache = new Map(state.cache)
          newCache.set(key, cached)

          // 캐시 크기 제한 (최대 10개)
          if (newCache.size > 10) {
            const firstKey = newCache.keys().next().value
            if (firstKey !== undefined) {
              newCache.delete(firstKey)
            }
          }

          console.log(`[AnalysisCache] 결과 캐싱: ${methodId}`)
          return { cache: newCache }
        })
      },

      clearCache: () => {
        set({ cache: new Map() })
        console.log('[AnalysisCache] 캐시 초기화')
      },

      clearOldCache: (maxAge) => {
        set((state) => {
          const newCache = new Map()
          const now = Date.now()

          state.cache.forEach((value, key) => {
            if (now - value.timestamp < maxAge) {
              newCache.set(key, value)
            }
          })

          console.log(`[AnalysisCache] 오래된 캐시 제거: ${state.cache.size - newCache.size}개`)
          return { cache: newCache }
        })
      }
    }),
    {
      name: 'analysis-cache',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          if (!str) return null
          const { state } = JSON.parse(str)
          return {
            state: {
              ...state,
              cache: new Map(Object.entries(state.cache || {}))
            }
          }
        },
        setItem: (name, value) => {
          const { state } = value as any
          const serialized = {
            state: {
              ...state,
              cache: Object.fromEntries(state.cache || new Map())
            }
          }
          sessionStorage.setItem(name, JSON.stringify(serialized))
        },
        removeItem: (name) => sessionStorage.removeItem(name)
      }
    }
  )
)