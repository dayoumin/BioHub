/**
 * ModelSettings Component Tests
 *
 * Tests for model configuration UI component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModelSettings } from '@/components/rag/model-settings'
import type { OllamaModel } from '@/components/rag/model-settings'
import type { VectorStore, SearchMode } from '@/lib/rag/providers/base-provider'

describe('ModelSettings', () => {
  const mockVectorStores: VectorStore[] = [
    {
      id: 'qwen3-embedding-0.6b',
      name: 'Qwen3 Embedding (0.6B)',
      dbPath: '/rag-data/rag-qwen3-embedding-0.6b.db',
      embeddingModel: 'qwen3-embedding:0.6b',
      dimensions: 1024,
      docCount: 111,
      fileSize: '5.4 MB'
    },
    {
      id: 'mxbai-embed-large',
      name: 'MixedBread AI Embed Large',
      dbPath: '/rag-data/rag-mxbai-embed-large.db',
      embeddingModel: 'mxbai-embed-large',
      dimensions: 1024,
      docCount: 111,
      fileSize: '8.2 MB'
    }
  ]

  const mockAvailableModels: OllamaModel[] = [
    { name: 'qwen3:4b', size: 4000000000, modified_at: '2024-01-01' },
    { name: 'llama3:8b', size: 8000000000, modified_at: '2024-01-01' },
    { name: 'mxbai-embed-large', size: 1000000000, modified_at: '2024-01-01' }
  ]

  const defaultProps = {
    availableVectorStores: mockVectorStores,
    selectedVectorStoreId: null,
    onVectorStoreSelect: jest.fn(),
    availableModels: mockAvailableModels,
    isLoadingModels: false,
    onRefreshModels: jest.fn(),
    selectedEmbeddingModel: 'mxbai-embed-large',
    onEmbeddingModelChange: jest.fn(),
    selectedInferenceModel: 'qwen3:4b',
    onInferenceModelChange: jest.fn(),
    searchMode: 'vector' as SearchMode,
    onSearchModeChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('모델 설정 카드가 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      expect(screen.getByText('모델 설정')).toBeInTheDocument()
    })

    it('Vector Store, 추론 모델, 검색 모드가 모두 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      expect(screen.getByText('Vector Store')).toBeInTheDocument()
      expect(screen.getByText('추론 모델 (LLM)')).toBeInTheDocument()
      expect(screen.getByText('검색 모드')).toBeInTheDocument()
    })

    it('grid-cols-3 레이아웃이 적용되어야 함', () => {
      const { container } = render(<ModelSettings {...defaultProps} />)

      const gridContainer = container.querySelector('.grid-cols-3')
      expect(gridContainer).toBeInTheDocument()
    })
  })

  describe('Vector Store 선택', () => {
    it('VectorStoreSelector 컴포넌트가 렌더링되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      expect(screen.getByText('Vector Store')).toBeInTheDocument()
    })

    it('Vector Store 선택 시 콜백이 호출되어야 함', async () => {
      const onVectorStoreSelect = jest.fn()
      render(
        <ModelSettings
          {...defaultProps}
          onVectorStoreSelect={onVectorStoreSelect}
        />
      )

      // Vector Store 드롭다운 클릭
      const selectTrigger = screen.getAllByRole('combobox')[0]
      fireEvent.click(selectTrigger)

      // 첫 번째 항목 선택
      await waitFor(() => {
        const option = screen.getByText('Qwen3 Embedding (0.6B)')
        fireEvent.click(option)
      })

      expect(onVectorStoreSelect).toHaveBeenCalledWith('qwen3-embedding-0.6b')
    })

    it('선택된 Vector Store의 임베딩 모델이 표시되어야 함', () => {
      render(
        <ModelSettings
          {...defaultProps}
          selectedVectorStoreId="qwen3-embedding-0.6b"
        />
      )

      expect(screen.getByText('임베딩')).toBeInTheDocument()
      expect(screen.getByText('qwen3-embedding:0.6b')).toBeInTheDocument()
    })
  })

  describe('추론 모델 선택', () => {
    it('추론 모델 드롭다운이 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      expect(screen.getByText('추론 모델 (LLM)')).toBeInTheDocument()
    })

    it('추론 모델 목록이 표시되어야 함', async () => {
      render(<ModelSettings {...defaultProps} />)

      // 추론 모델 드롭다운 클릭 (두 번째 combobox)
      const selectTriggers = screen.getAllByRole('combobox')
      const inferenceSelect = selectTriggers[selectTriggers.length - 1]
      fireEvent.click(inferenceSelect)

      // embed 모델 제외한 추론 모델만 표시
      await waitFor(() => {
        expect(screen.getByText('qwen3:4b')).toBeInTheDocument()
        expect(screen.getByText('llama3:8b')).toBeInTheDocument()
        expect(screen.queryByText('mxbai-embed-large')).not.toBeInTheDocument() // 임베딩 모델은 제외
      })
    })

    it('추론 모델 선택 시 콜백이 호출되어야 함', async () => {
      const onInferenceModelChange = jest.fn()
      render(
        <ModelSettings
          {...defaultProps}
          onInferenceModelChange={onInferenceModelChange}
        />
      )

      // 추론 모델 드롭다운 클릭
      const selectTriggers = screen.getAllByRole('combobox')
      const inferenceSelect = selectTriggers[selectTriggers.length - 1]
      fireEvent.click(inferenceSelect)

      // 모델 선택
      await waitFor(() => {
        const option = screen.getByText('llama3:8b')
        fireEvent.click(option)
      })

      expect(onInferenceModelChange).toHaveBeenCalledWith('llama3:8b')
    })

    it('모델 새로고침 버튼이 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      // RefreshCw 아이콘 버튼 확인
      const refreshButton = screen.getByTitle('모델 목록 새로고침')
      expect(refreshButton).toBeInTheDocument()
    })

    it('새로고침 버튼 클릭 시 콜백이 호출되어야 함', () => {
      const onRefreshModels = jest.fn()
      render(
        <ModelSettings
          {...defaultProps}
          onRefreshModels={onRefreshModels}
        />
      )

      const refreshButton = screen.getByTitle('모델 목록 새로고침')
      fireEvent.click(refreshButton)

      expect(onRefreshModels).toHaveBeenCalled()
    })

    it('모델 로딩 중일 때 스피너가 표시되어야 함', () => {
      render(
        <ModelSettings
          {...defaultProps}
          isLoadingModels={true}
        />
      )

      // Loader2 컴포넌트 확인 (animate-spin 클래스)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('검색 모드 선택', () => {
    it('세 가지 검색 모드가 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      expect(screen.getByText('FTS5')).toBeInTheDocument()
      expect(screen.getByText('Vector DB')).toBeInTheDocument()
      expect(screen.getByText('Hybrid')).toBeInTheDocument()
    })

    it('검색 모드 설명이 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      expect(screen.getByText(/키워드.*빠름/)).toBeInTheDocument()
      expect(screen.getByText(/의미.*느림/)).toBeInTheDocument()
      expect(screen.getByText(/결합.*가장 정확/)).toBeInTheDocument()
    })

    it('FTS5 모드 선택 시 콜백이 호출되어야 함', () => {
      const onSearchModeChange = jest.fn()
      render(
        <ModelSettings
          {...defaultProps}
          onSearchModeChange={onSearchModeChange}
        />
      )

      const fts5Radio = screen.getByLabelText('FTS5')
      fireEvent.click(fts5Radio)

      expect(onSearchModeChange).toHaveBeenCalledWith('fts5')
    })

    it('Vector 모드 선택 시 콜백이 호출되어야 함', () => {
      const onSearchModeChange = jest.fn()
      render(
        <ModelSettings
          {...defaultProps}
          onSearchModeChange={onSearchModeChange}
        />
      )

      const vectorRadio = screen.getByLabelText('Vector DB')
      fireEvent.click(vectorRadio)

      expect(onSearchModeChange).toHaveBeenCalledWith('vector')
    })

    it('Hybrid 모드 선택 시 콜백이 호출되어야 함', () => {
      const onSearchModeChange = jest.fn()
      render(
        <ModelSettings
          {...defaultProps}
          onSearchModeChange={onSearchModeChange}
        />
      )

      const hybridRadio = screen.getByLabelText('Hybrid')
      fireEvent.click(hybridRadio)

      expect(onSearchModeChange).toHaveBeenCalledWith('hybrid')
    })

    it('선택된 검색 모드가 체크되어야 함', () => {
      render(
        <ModelSettings
          {...defaultProps}
          searchMode="hybrid"
        />
      )

      const hybridRadio = screen.getByLabelText('Hybrid') as HTMLInputElement
      expect(hybridRadio.checked).toBe(true)
    })
  })

  describe('Disabled 상태', () => {
    it('disabled prop이 true일 때 모든 선택이 비활성화되어야 함', () => {
      render(
        <ModelSettings
          {...defaultProps}
          disabled={true}
        />
      )

      const comboboxes = screen.getAllByRole('combobox')
      comboboxes.forEach((combobox) => {
        expect(combobox).toBeDisabled()
      })
    })

    it('disabled prop이 false일 때 선택이 활성화되어야 함', () => {
      render(
        <ModelSettings
          {...defaultProps}
          disabled={false}
        />
      )

      const comboboxes = screen.getAllByRole('combobox')
      comboboxes.forEach((combobox) => {
        expect(combobox).not.toBeDisabled()
      })
    })
  })

  describe('빈 모델 목록 처리', () => {
    it('모델 목록이 비어있을 때 기본값이 표시되어야 함', async () => {
      render(
        <ModelSettings
          {...defaultProps}
          availableModels={[]}
        />
      )

      // 추론 모델 드롭다운 클릭
      const selectTriggers = screen.getAllByRole('combobox')
      const inferenceSelect = selectTriggers[selectTriggers.length - 1]
      fireEvent.click(inferenceSelect)

      // 기본값 qwen3:4b 확인
      await waitFor(() => {
        expect(screen.getByText('qwen3:4b (기본값)')).toBeInTheDocument()
      })
    })
  })

  describe('현재 선택된 모델 유지', () => {
    it('선택된 추론 모델이 목록에 없을 경우에도 표시되어야 함', async () => {
      render(
        <ModelSettings
          {...defaultProps}
          selectedInferenceModel="custom-model:latest"
          availableModels={mockAvailableModels}
        />
      )

      // 추론 모델 드롭다운 클릭
      const selectTriggers = screen.getAllByRole('combobox')
      const inferenceSelect = selectTriggers[selectTriggers.length - 1]
      fireEvent.click(inferenceSelect)

      // 현재 선택된 모델이 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('custom-model:latest (현재 선택)')).toBeInTheDocument()
      })
    })
  })

  describe('레이아웃 검증', () => {
    it('Vector Store, 임베딩, 추론 모델이 한 줄에 배치되어야 함', () => {
      const { container } = render(
        <ModelSettings
          {...defaultProps}
          selectedVectorStoreId="qwen3-embedding-0.6b"
        />
      )

      // grid-cols-3 컨테이너 확인
      const gridContainer = container.querySelector('.grid-cols-3')
      expect(gridContainer).toBeInTheDocument()

      // gap-4 클래스 확인 (16px 간격)
      expect(gridContainer?.classList.contains('gap-4')).toBe(true)
    })

    it('검색 모드가 별도 섹션에 표시되어야 함', () => {
      const { container } = render(<ModelSettings {...defaultProps} />)

      // space-y-3 RadioGroup 확인
      const radioGroup = container.querySelector('.grid-cols-3.gap-3')
      expect(radioGroup).toBeInTheDocument()
    })
  })

  describe('Tooltip', () => {
    it('검색 모드 Tooltip이 표시되어야 함', () => {
      render(<ModelSettings {...defaultProps} />)

      // TooltipTrigger로 감싸진 RadioGroup 확인
      const tooltipTriggers = document.querySelectorAll('[data-radix-tooltip-trigger]')
      expect(tooltipTriggers.length).toBeGreaterThan(0)
    })
  })
})
