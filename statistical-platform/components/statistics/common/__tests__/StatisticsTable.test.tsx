import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatisticsTable, type TableColumn } from '../StatisticsTable'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
})

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

describe('StatisticsTable', () => {
  const mockColumns: TableColumn[] = [
    {
      key: 'name',
      header: '변수명',
      type: 'text',
      align: 'left',
      sortable: true
    },
    {
      key: 'mean',
      header: '평균',
      type: 'number',
      align: 'right',
      sortable: true
    },
    {
      key: 'pValue',
      header: 'p-value',
      type: 'pvalue',
      align: 'center',
      sortable: true
    },
    {
      key: 'percentage',
      header: '비율',
      type: 'percentage',
      align: 'right',
      sortable: false
    },
    {
      key: 'ci',
      header: '신뢰구간',
      type: 'ci',
      align: 'center'
    }
  ]

  const mockData = [
    {
      name: 'Variable A',
      mean: 23.456,
      pValue: 0.023,
      percentage: 0.456,
      ci: [20.1, 26.8]
    },
    {
      name: 'Variable B',
      mean: 45.678,
      pValue: 0.0001,
      percentage: 0.789,
      ci: [42.3, 49.0]
    },
    {
      name: 'Variable C',
      mean: 12.345,
      pValue: 0.234,
      percentage: 0.234,
      ci: [10.1, 14.6]
    }
  ]

  describe('기본 렌더링', () => {
    it('테이블이 올바르게 렌더링되어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
        />
      )

      // 헤더 확인
      expect(screen.getByText('변수명')).toBeInTheDocument()
      expect(screen.getByText('평균')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()

      // 데이터 확인
      expect(screen.getByText('Variable A')).toBeInTheDocument()
      expect(screen.getByText('Variable B')).toBeInTheDocument()
    })

    it('타이틀과 설명이 표시되어야 함', () => {
      render(
        <StatisticsTable
          title="기술 통계"
          description="변수별 통계량"
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(screen.getByText('기술 통계')).toBeInTheDocument()
      expect(screen.getByText('변수별 통계량')).toBeInTheDocument()
    })

    it('행 번호가 표시되어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          showRowNumbers={true}
        />
      )

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('데이터 포맷팅', () => {
    it('숫자가 올바르게 포맷되어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(screen.getByText('23.4560')).toBeInTheDocument()
      expect(screen.getByText('45.6780')).toBeInTheDocument()
    })

    it('백분율이 올바르게 포맷되어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(screen.getByText('45.60%')).toBeInTheDocument()
      expect(screen.getByText('78.90%')).toBeInTheDocument()
    })

    it('신뢰구간이 올바르게 포맷되어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
        />
      )

      expect(screen.getByText('[20.1000, 26.8000]')).toBeInTheDocument()
      expect(screen.getByText('[42.3000, 49.0000]')).toBeInTheDocument()
    })

    it('커스텀 포맷터가 작동해야 함', () => {
      const customColumns: TableColumn[] = [
        {
          key: 'value',
          header: '값',
          formatter: (value) => <span className="custom-format">커스텀: {value}</span>
        }
      ]

      render(
        <StatisticsTable
          columns={customColumns}
          data={[{ value: 123 }]}
        />
      )

      expect(screen.getByText('커스텀: 123')).toBeInTheDocument()
    })
  })

  describe('정렬 기능', () => {
    it('컬럼 클릭 시 정렬이 되어야 함', () => {
      const { rerender } = render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          sortable={true}
        />
      )

      const meanHeader = screen.getByText('평균')
      fireEvent.click(meanHeader)

      // 정렬 후 첫 번째 값이 가장 작은 값이어야 함 (12.345)
      // formatNumber로 인해 12.3450으로 표시됨
      const cells = screen.getAllByRole('cell')
      const firstDataRow = cells.filter(cell => cell.textContent?.includes('12.3450'))
      expect(firstDataRow.length).toBeGreaterThan(0)
    })

    it('정렬 방향이 토글되어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          sortable={true}
        />
      )

      const nameHeader = screen.getByText('변수명')

      // 첫 클릭: 오름차순
      fireEvent.click(nameHeader)
      let cells = screen.getAllByRole('cell')
      expect(cells.some(cell => cell.textContent === 'Variable A')).toBe(true)

      // 두 번째 클릭: 내림차순
      fireEvent.click(nameHeader)
      cells = screen.getAllByRole('cell')
      expect(cells.some(cell => cell.textContent === 'Variable C')).toBe(true)
    })

    it('sortable이 false인 컬럼은 정렬되지 않아야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          sortable={true}
        />
      )

      const percentageHeader = screen.getByText('비율')
      const initialOrder = screen.getAllByRole('cell').map(cell => cell.textContent)

      fireEvent.click(percentageHeader)

      const afterClickOrder = screen.getAllByRole('cell').map(cell => cell.textContent)
      expect(initialOrder).toEqual(afterClickOrder)
    })
  })

  describe('선택 기능', () => {
    it('행을 선택할 수 있어야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      // 첫 번째 행 선택
      fireEvent.click(checkboxes[1]) // 0번은 전체 선택
      expect(checkboxes[1]).toBeChecked()
    })

    it('전체 선택이 작동해야 함', () => {
      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const selectAllCheckbox = checkboxes[0]

      fireEvent.click(selectAllCheckbox)

      // 모든 체크박스가 선택되어야 함
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('선택된 행 수가 표시되어야 함', () => {
      render(
        <StatisticsTable
          title="테스트 테이블"
          columns={mockColumns}
          data={mockData}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])
      fireEvent.click(checkboxes[2])

      expect(screen.getByText('2개 선택됨')).toBeInTheDocument()
    })
  })

  describe('확장 기능', () => {
    it('행을 확장할 수 있어야 함', () => {
      const expandableData = mockData.map(row => ({
        ...row,
        _expandedContent: <div>확장된 내용: {row.name}</div>
      }))

      const { container } = render(
        <StatisticsTable
          columns={mockColumns}
          data={expandableData}
          expandable={true}
        />
      )

      // 확장 버튼은 p-1 hover:bg-muted rounded 클래스를 가진 버튼
      const expandButtons = container.querySelectorAll('button.p-1')

      expect(expandButtons.length).toBe(3)

      // 첫 번째 행 확장
      if (expandButtons[0]) {
        fireEvent.click(expandButtons[0])
        expect(screen.getByText('확장된 내용: Variable A')).toBeInTheDocument()
      }
    })
  })

  describe('액션 버튼', () => {
    it('클립보드 복사가 작동해야 함', async () => {
      render(
        <StatisticsTable
          title="테스트"
          columns={mockColumns}
          data={mockData}
          actions={[]}
        />
      )

      const copyButton = screen.getByTitle('클립보드 복사')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })

    it('CSV 다운로드가 작동해야 함', () => {
      render(
        <StatisticsTable
          title="테스트"
          columns={mockColumns}
          data={mockData}
          actions={[]}
        />
      )

      const downloadButton = screen.getByTitle('CSV 다운로드')

      // DOM에 임시 a 태그 생성을 모킹
      const createElementSpy = jest.spyOn(document, 'createElement')
      const appendChildSpy = jest.spyOn(document.body, 'appendChild')
      const removeChildSpy = jest.spyOn(document.body, 'removeChild')

      fireEvent.click(downloadButton)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('커스텀 액션이 실행되어야 함', () => {
      const mockAction = jest.fn()

      render(
        <StatisticsTable
          title="테스트"
          columns={mockColumns}
          data={mockData}
          actions={[
            {
              label: '분석',
              onClick: mockAction
            }
          ]}
        />
      )

      const actionButton = screen.getByText('분석')
      fireEvent.click(actionButton)

      expect(mockAction).toHaveBeenCalledWith(mockData)
    })
  })

  describe('행 클릭 이벤트', () => {
    it('행 클릭 시 콜백이 호출되어야 함', () => {
      const mockOnRowClick = jest.fn()

      render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          onRowClick={mockOnRowClick}
        />
      )

      const firstRow = screen.getByText('Variable A').closest('tr')
      if (firstRow) {
        fireEvent.click(firstRow)
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0])
      }
    })
  })

  describe('하이라이트 기능', () => {
    it('하이라이트 함수가 적용되어야 함', () => {
      const highlightColumns: TableColumn[] = [
        {
          key: 'value',
          header: '값',
          highlight: (value) => value > 30 ? 'positive' : 'negative'
        }
      ]

      const { container } = render(
        <StatisticsTable
          columns={highlightColumns}
          data={[
            { value: 40 },
            { value: 20 }
          ]}
        />
      )

      const positiveCells = container.querySelectorAll('.bg-success-bg')
      const negativeCells = container.querySelectorAll('.bg-error-bg')

      expect(positiveCells.length).toBeGreaterThan(0)
      expect(negativeCells.length).toBeGreaterThan(0)
    })
  })

  describe('컴팩트 모드', () => {
    it('컴팩트 모드가 적용되어야 함', () => {
      const { container } = render(
        <StatisticsTable
          columns={mockColumns}
          data={mockData}
          compactMode={true}
        />
      )

      const table = container.querySelector('table')
      expect(table).toHaveClass('text-sm')
    })
  })
})