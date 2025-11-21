/**
 * DataPreviewTable 컴포넌트 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataPreviewTable } from '@/components/common/analysis/DataPreviewTable'
import { DataRow } from '@/types/smart-flow'

describe('DataPreviewTable', () => {
  const sampleData: DataRow[] = [
    { id: 1, name: 'Alice', score: 85 },
    { id: 2, name: 'Bob', score: 72 },
    { id: 3, name: 'Charlie', score: 91 }
  ]

  it('데이터가 없으면 null 반환', () => {
    const { container } = render(<DataPreviewTable data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('기본 제목 표시', () => {
    render(<DataPreviewTable data={sampleData} defaultOpen={true} />)
    expect(screen.getByText('데이터 미리보기')).toBeInTheDocument()
  })

  it('토글 버튼 동작', () => {
    render(<DataPreviewTable data={sampleData} />)

    // 초기: 닫힘
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    // 클릭: 열림
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('데이터 행 표시', () => {
    render(<DataPreviewTable data={sampleData} defaultOpen={true} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('maxRows 제한 동작', () => {
    const largeData: DataRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      value: i * 10
    }))

    render(<DataPreviewTable data={largeData} maxRows={5} defaultOpen={true} />)

    // 5행만 표시되어야 함
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBe(6) // 헤더(1) + 데이터(5)
  })
})
