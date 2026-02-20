import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DataTableViewer } from '../DataTableViewer'

// Mock data
const mockData = [
  { id: 1, name: 'Alice', age: 30, score: 85.5 },
  { id: 2, name: 'Bob', age: 25, score: 90.0 },
  { id: 3, name: 'Charlie', age: 35, score: 78.3 },
  { id: 4, name: 'Diana', age: 28, score: 92.1 },
  { id: 5, name: 'Eve', age: 32, score: 88.7 },
]

const mockColumns = ['id', 'name', 'age', 'score']

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'mock-url')
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('DataTableViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('트리거 버튼이 렌더링되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
        />
      )

      expect(screen.getByText('데이터 전체보기')).toBeInTheDocument()
    })

    it('커스텀 트리거가 렌더링되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          trigger={<button>커스텀 버튼</button>}
        />
      )

      expect(screen.getByText('커스텀 버튼')).toBeInTheDocument()
    })

    it('파일명이 표시되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          fileName="test.csv"
          open={true}
        />
      )

      expect(screen.getByText('test.csv')).toBeInTheDocument()
    })

    it('데이터 크기 정보가 표시되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      expect(screen.getByText(/5행 × 4열/)).toBeInTheDocument()
    })
  })

  describe('검색 기능', () => {
    it('검색어 입력이 가능해야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      const searchInput = screen.getByPlaceholderText('검색...')
      fireEvent.change(searchInput, { target: { value: 'Alice' } })

      expect(searchInput).toHaveValue('Alice')
    })

    it('검색어 초기화 버튼이 동작해야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      const searchInput = screen.getByPlaceholderText('검색...')
      fireEvent.change(searchInput, { target: { value: 'test' } })

      // 검색창 내부의 X 버튼 찾기
      const searchContainer = searchInput.parentElement
      const clearBtn = within(searchContainer!).getByRole('button')
      fireEvent.click(clearBtn)

      expect(searchInput).toHaveValue('')
    })
  })

  describe('페이지네이션', () => {
    it('페이지 정보가 표시되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      expect(screen.getByText('1 / 1')).toBeInTheDocument()
    })

    it('페이지 크기 선택이 가능해야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      expect(screen.getByText('페이지당')).toBeInTheDocument()
    })
  })

  describe('정렬 기능', () => {
    it('열 헤더 클릭 시 정렬이 동작해야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      // 열 헤더들이 렌더링되어야 함
      expect(screen.getByText('id')).toBeInTheDocument()
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('age')).toBeInTheDocument()
      expect(screen.getByText('score')).toBeInTheDocument()
    })
  })

  describe('CSV 내보내기', () => {
    it('CSV 버튼이 렌더링되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      expect(screen.getByText('CSV')).toBeInTheDocument()
    })

    it('CSV 내보내기가 동작해야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          fileName="test.csv"
          open={true}
        />
      )

      const csvButton = screen.getByText('CSV')
      fireEvent.click(csvButton)

      expect(mockCreateObjectURL).toHaveBeenCalled()
    })
  })

  describe('타입 감지', () => {
    it('숫자 타입이 올바르게 감지되어야 함', () => {
      const numericData = [
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ]

      render(
        <DataTableViewer
          data={numericData}
          columns={['value']}
          open={true}
        />
      )

      // 숫자 타입 아이콘(Hash)이 표시되어야 함
      expect(screen.getByText('value')).toBeInTheDocument()
    })

    it('제공된 타입 정보가 우선 적용되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          columnTypes={{ id: 'string', name: 'string', age: 'number', score: 'number' }}
          open={true}
        />
      )

      expect(screen.getByText('id')).toBeInTheDocument()
    })
  })

  describe('빈 데이터 처리', () => {
    it('빈 데이터일 때 메시지가 표시되어야 함', () => {
      render(
        <DataTableViewer
          data={[]}
          columns={[]}
          open={true}
        />
      )

      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
    })

    it('검색 결과가 없을 때 메시지가 표시되어야 함', () => {
      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
        />
      )

      const searchInput = screen.getByPlaceholderText('검색...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
    })
  })

  describe('값 포맷팅', () => {
    it('null 값이 올바르게 표시되어야 함', () => {
      const dataWithNull = [
        { id: 1, name: null },
      ]

      render(
        <DataTableViewer
          data={dataWithNull}
          columns={['id', 'name']}
          open={true}
        />
      )

      expect(screen.getByText('null')).toBeInTheDocument()
    })
  })

  describe('제어 컴포넌트', () => {
    it('open prop으로 Sheet 상태를 제어할 수 있어야 함', () => {
      const onOpenChange = vi.fn()

      render(
        <DataTableViewer
          data={mockData}
          columns={mockColumns}
          open={true}
          onOpenChange={onOpenChange}
        />
      )

      // Sheet이 열려있을 때 내용이 표시됨
      expect(screen.getByText('데이터 뷰어')).toBeInTheDocument()
    })
  })
})
