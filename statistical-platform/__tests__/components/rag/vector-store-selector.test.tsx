/**
 * VectorStoreSelector Component Tests
 *
 * Tests for Vector Store selection UI component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VectorStoreSelector } from '@/components/rag/vector-store-selector'
import type { VectorStore } from '@/lib/rag/providers/base-provider'

describe('VectorStoreSelector', () => {
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

  const mockOnSelectStore = jest.fn()

  beforeEach(() => {
    mockOnSelectStore.mockClear()
  })

  describe('기본 렌더링', () => {
    it('Vector Store 라벨이 표시되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      expect(screen.getByText('Vector Store')).toBeInTheDocument()
    })

    it('Vector Store가 선택되지 않았을 때 임베딩 필드가 표시되지 않아야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      expect(screen.queryByText('임베딩')).not.toBeInTheDocument()
    })

    it('Vector Store가 선택되었을 때 임베딩 필드가 표시되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId="qwen3-embedding-0.6b"
          onSelectStore={mockOnSelectStore}
        />
      )

      expect(screen.getByText('임베딩')).toBeInTheDocument()
      expect(screen.getByText('qwen3-embedding:0.6b')).toBeInTheDocument()
    })
  })

  describe('Vector Store 선택', () => {
    it('Vector Store 드롭다운을 클릭하면 목록이 표시되어야 함', async () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      // Select 트리거 클릭
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // 드롭다운 항목 확인
      await waitFor(() => {
        expect(screen.getByText('Qwen3 Embedding (0.6B)')).toBeInTheDocument()
        expect(screen.getByText('MixedBread AI Embed Large')).toBeInTheDocument()
      })
    })

    it('Vector Store를 선택하면 콜백이 호출되어야 함', async () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      // Select 트리거 클릭
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // 첫 번째 항목 선택
      await waitFor(() => {
        const option = screen.getByText('Qwen3 Embedding (0.6B)')
        fireEvent.click(option)
      })

      expect(mockOnSelectStore).toHaveBeenCalledWith('qwen3-embedding-0.6b')
    })

    it('선택된 Vector Store의 정보가 표시되어야 함', async () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      // Select 트리거 클릭
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // 드롭다운에서 문서 개수, 파일 크기, 차원 수 확인
      await waitFor(() => {
        expect(screen.getByText(/111개 문서/)).toBeInTheDocument()
        expect(screen.getByText(/5.4 MB/)).toBeInTheDocument()
        expect(screen.getByText(/1024차원/)).toBeInTheDocument()
      })
    })
  })

  describe('임베딩 모델 표시', () => {
    it('선택된 Vector Store의 임베딩 모델이 표시되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId="mxbai-embed-large"
          onSelectStore={mockOnSelectStore}
        />
      )

      expect(screen.getByText('mxbai-embed-large')).toBeInTheDocument()
    })

    it('임베딩 모델이 읽기 전용으로 표시되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId="qwen3-embedding-0.6b"
          onSelectStore={mockOnSelectStore}
        />
      )

      const embeddingDisplay = screen.getByText('qwen3-embedding:0.6b')

      // code 태그로 래핑되어 있는지 확인
      expect(embeddingDisplay.tagName).toBe('CODE')
    })
  })

  describe('Disabled 상태', () => {
    it('disabled prop이 true일 때 선택이 비활성화되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
          disabled={true}
        />
      )

      const selectTrigger = screen.getByRole('combobox')
      expect(selectTrigger).toBeDisabled()
    })

    it('disabled prop이 false일 때 선택이 활성화되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
          disabled={false}
        />
      )

      const selectTrigger = screen.getByRole('combobox')
      expect(selectTrigger).not.toBeDisabled()
    })
  })

  describe('Tooltip', () => {
    it('Vector Store Info 아이콘이 표시되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      // Info 아이콘 확인 (lucide-react Info 컴포넌트)
      const infoIcons = document.querySelectorAll('.lucide-info')
      expect(infoIcons.length).toBeGreaterThan(0)
    })

    it('임베딩 필드에 Info 아이콘이 표시되어야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId="qwen3-embedding-0.6b"
          onSelectStore={mockOnSelectStore}
        />
      )

      // 임베딩 라벨 옆의 Info 아이콘 확인
      expect(screen.getByText('임베딩')).toBeInTheDocument()

      const infoIcons = document.querySelectorAll('.lucide-info')
      expect(infoIcons.length).toBeGreaterThan(0)
    })
  })

  describe('빈 목록 처리', () => {
    it('Vector Store 목록이 비어있을 때 에러가 발생하지 않아야 함', () => {
      render(
        <VectorStoreSelector
          vectorStores={[]}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      expect(screen.getByText('Vector Store')).toBeInTheDocument()
    })
  })

  describe('Fragment 구조', () => {
    it('두 개의 div를 반환해야 함 (Vector Store + 임베딩)', () => {
      const { container } = render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId="qwen3-embedding-0.6b"
          onSelectStore={mockOnSelectStore}
        />
      )

      // Fragment로 감싸진 두 개의 space-y-2 div 확인
      const spaceDivs = container.querySelectorAll('.space-y-2')
      expect(spaceDivs.length).toBe(2) // Vector Store + 임베딩
    })

    it('Vector Store만 선택되지 않았을 때는 하나의 div만 표시', () => {
      const { container } = render(
        <VectorStoreSelector
          vectorStores={mockVectorStores}
          selectedStoreId={null}
          onSelectStore={mockOnSelectStore}
        />
      )

      // Vector Store만 표시
      const spaceDivs = container.querySelectorAll('.space-y-2')
      expect(spaceDivs.length).toBe(1)
    })
  })
})
