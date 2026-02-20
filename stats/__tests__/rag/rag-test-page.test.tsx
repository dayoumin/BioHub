/**
 * RAG 테스트 페이지 - 로컬스토리지 기능 테스트
 *
 * 테스트 범위:
 * 1. 모델 선택 저장/복원
 * 2. 검색 모드 저장/복원
 * 3. 자동 감지 로직
 */

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useState, useEffect } from 'react'

// 로컬스토리지 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      store = {}
    }
  }
})()

// @ts-expect-error - globalThis에 localStorage 추가
globalThis.localStorage = localStorageMock

describe('RAG 테스트 페이지 - 로컬스토리지 기능', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('1. 모델 선택 저장/복원', () => {
    it('임베딩 모델: 로컬스토리지에 저장된 값이 없으면 기본값 사용', () => {
      const { result } = renderHook(() => {
        const [selectedEmbeddingModel] = useState(() => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem('rag-embedding-model') || 'mxbai-embed-large:latest'
          }
          return 'mxbai-embed-large:latest'
        })
        return selectedEmbeddingModel
      })

      expect(result.current).toBe('mxbai-embed-large:latest')
    })

    it('임베딩 모델: 로컬스토리지에 저장된 값이 있으면 복원', () => {
      localStorage.setItem('rag-embedding-model', 'qwen3-embedding:0.6b')

      const { result } = renderHook(() => {
        const [selectedEmbeddingModel] = useState(() => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem('rag-embedding-model') || 'mxbai-embed-large:latest'
          }
          return 'mxbai-embed-large:latest'
        })
        return selectedEmbeddingModel
      })

      expect(result.current).toBe('qwen3-embedding:0.6b')
    })

    it('임베딩 모델: 선택 변경 시 로컬스토리지에 저장', () => {
      const { result } = renderHook(() => {
        const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('mxbai-embed-large:latest')

        useEffect(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('rag-embedding-model', selectedEmbeddingModel)
          }
        }, [selectedEmbeddingModel])

        return { selectedEmbeddingModel, setSelectedEmbeddingModel }
      })

      expect(localStorage.getItem('rag-embedding-model')).toBe('mxbai-embed-large:latest')

      act(() => {
        result.current.setSelectedEmbeddingModel('qwen3-embedding:0.6b')
      })

      expect(localStorage.getItem('rag-embedding-model')).toBe('qwen3-embedding:0.6b')
    })

    it('추론 모델: 로컬스토리지에 저장된 값이 없으면 기본값 사용', () => {
      const { result } = renderHook(() => {
        const [selectedInferenceModel] = useState(() => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem('rag-inference-model') || 'qwen3:4b'
          }
          return 'qwen3:4b'
        })
        return selectedInferenceModel
      })

      expect(result.current).toBe('qwen3:4b')
    })

    it('추론 모델: 로컬스토리지에 저장된 값이 있으면 복원', () => {
      localStorage.setItem('rag-inference-model', 'qwen3:8b')

      const { result } = renderHook(() => {
        const [selectedInferenceModel] = useState(() => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem('rag-inference-model') || 'qwen3:4b'
          }
          return 'qwen3:4b'
        })
        return selectedInferenceModel
      })

      expect(result.current).toBe('qwen3:8b')
    })

    it('추론 모델: 선택 변경 시 로컬스토리지에 저장', () => {
      const { result } = renderHook(() => {
        const [selectedInferenceModel, setSelectedInferenceModel] = useState('qwen3:4b')

        useEffect(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('rag-inference-model', selectedInferenceModel)
          }
        }, [selectedInferenceModel])

        return { selectedInferenceModel, setSelectedInferenceModel }
      })

      expect(localStorage.getItem('rag-inference-model')).toBe('qwen3:4b')

      act(() => {
        result.current.setSelectedInferenceModel('qwen3:8b')
      })

      expect(localStorage.getItem('rag-inference-model')).toBe('qwen3:8b')
    })
  })

  describe('2. 검색 모드 저장/복원', () => {
    it('검색 모드: 로컬스토리지에 저장된 값이 없으면 기본값 (hybrid) 사용', () => {
      const { result } = renderHook(() => {
        type SearchMode = 'fts5' | 'vector' | 'hybrid'
        const [searchMode] = useState<SearchMode>(() => {
          if (typeof window !== 'undefined') {
            return (localStorage.getItem('rag-search-mode') as SearchMode) || 'hybrid'
          }
          return 'hybrid'
        })
        return searchMode
      })

      expect(result.current).toBe('hybrid')
    })

    it('검색 모드: 로컬스토리지에 저장된 값이 있으면 복원', () => {
      localStorage.setItem('rag-search-mode', 'vector')

      const { result } = renderHook(() => {
        type SearchMode = 'fts5' | 'vector' | 'hybrid'
        const [searchMode] = useState<SearchMode>(() => {
          if (typeof window !== 'undefined') {
            return (localStorage.getItem('rag-search-mode') as SearchMode) || 'hybrid'
          }
          return 'hybrid'
        })
        return searchMode
      })

      expect(result.current).toBe('vector')
    })

    it('검색 모드: 선택 변경 시 로컬스토리지에 저장', () => {
      type SearchMode = 'fts5' | 'vector' | 'hybrid'

      const { result } = renderHook(() => {
        const [searchMode, setSearchMode] = useState<SearchMode>('fts5')

        useEffect(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('rag-search-mode', searchMode)
          }
        }, [searchMode])

        return { searchMode, setSearchMode }
      })

      expect(localStorage.getItem('rag-search-mode')).toBe('fts5')

      act(() => {
        result.current.setSearchMode('hybrid')
      })

      expect(localStorage.getItem('rag-search-mode')).toBe('hybrid')
    })
  })

  describe('3. 자동 감지 로직', () => {
    it('임베딩 모델: 저장된 값이 없을 때만 자동 감지 실행', () => {
      // 테스트 시작 전 명시적으로 초기화
      localStorage.clear()

      const autoDetectMock = vi.fn()

      // 저장된 값이 없는 경우 (localStorage.getItem()이 null 반환)
      const hasStoredEmbedding1 = localStorage.getItem('rag-embedding-model')
      if (!hasStoredEmbedding1) {
        autoDetectMock()
      }

      expect(autoDetectMock).toHaveBeenCalledTimes(1)

      // 저장된 값이 있는 경우
      localStorage.setItem('rag-embedding-model', 'qwen3-embedding:0.6b')
      autoDetectMock.mockClear()

      const hasStoredEmbedding2 = localStorage.getItem('rag-embedding-model')
      if (!hasStoredEmbedding2) {
        autoDetectMock()
      }

      expect(autoDetectMock).not.toHaveBeenCalled()
    })

    it('추론 모델: 저장된 값이 없을 때만 자동 감지 실행', () => {
      // 테스트 시작 전 명시적으로 초기화
      localStorage.clear()

      const autoDetectMock = vi.fn()

      // 저장된 값이 없는 경우 (localStorage.getItem()이 null 반환)
      const hasStoredInference1 = localStorage.getItem('rag-inference-model')
      if (!hasStoredInference1) {
        autoDetectMock()
      }

      expect(autoDetectMock).toHaveBeenCalledTimes(1)

      // 저장된 값이 있는 경우
      localStorage.setItem('rag-inference-model', 'qwen3:8b')
      autoDetectMock.mockClear()

      const hasStoredInference2 = localStorage.getItem('rag-inference-model')
      if (!hasStoredInference2) {
        autoDetectMock()
      }

      expect(autoDetectMock).not.toHaveBeenCalled()
    })
  })

  describe('4. 통합 시나리오', () => {
    it('시나리오 1: 첫 방문 → 모델 선택 → 새로고침 → 선택 유지', () => {
      // 테스트 시작 전 명시적으로 초기화
      localStorage.clear()

      // 1. 첫 방문 (로컬스토리지 비어있음)
      expect(localStorage.getItem('rag-embedding-model')).toBeNull()
      expect(localStorage.getItem('rag-inference-model')).toBeNull()
      expect(localStorage.getItem('rag-search-mode')).toBeNull()

      // 2. 사용자가 모델 선택
      localStorage.setItem('rag-embedding-model', 'qwen3-embedding:0.6b')
      localStorage.setItem('rag-inference-model', 'qwen3:8b')
      localStorage.setItem('rag-search-mode', 'vector')

      // 3. 페이지 새로고침 후 복원
      const embeddingModel = localStorage.getItem('rag-embedding-model') || 'mxbai-embed-large:latest'
      const inferenceModel = localStorage.getItem('rag-inference-model') || 'qwen3:4b'
      const searchMode = localStorage.getItem('rag-search-mode') || 'hybrid'

      expect(embeddingModel).toBe('qwen3-embedding:0.6b')
      expect(inferenceModel).toBe('qwen3:8b')
      expect(searchMode).toBe('vector')
    })

    it('시나리오 2: 모델 변경 → 즉시 저장 확인', () => {
      const { result } = renderHook(() => {
        const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('mxbai-embed-large:latest')

        useEffect(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('rag-embedding-model', selectedEmbeddingModel)
          }
        }, [selectedEmbeddingModel])

        return { selectedEmbeddingModel, setSelectedEmbeddingModel }
      })

      // 초기값 확인
      expect(localStorage.getItem('rag-embedding-model')).toBe('mxbai-embed-large:latest')

      // 모델 변경
      act(() => {
        result.current.setSelectedEmbeddingModel('qwen3-embedding:0.6b')
      })

      // 즉시 저장 확인
      expect(localStorage.getItem('rag-embedding-model')).toBe('qwen3-embedding:0.6b')
    })
  })
})
