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
    const largeData: DataRow[] = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      value: i * 10
    }))

    render(<DataPreviewTable data={largeData} maxRows={50} defaultOpen={true} />)

    // tbody의 행만 카운트
    const table = screen.getByRole('table')
    const tbody = table.querySelector('tbody')
    const dataRows = tbody?.querySelectorAll('tr')

    expect(dataRows?.length).toBe(50) // 정확히 50개 데이터 행

    // 경고 메시지 확인
    expect(screen.getByText(/전체 150행 중 50행만 표시됩니다/)).toBeInTheDocument()
  })

  it('결측값 표시 (—)', () => {
    const dataWithNull: DataRow[] = [
      { id: 1, name: 'Alice', score: null },
      { id: 2, name: '', score: 85 },
      { id: 3, name: 'Charlie', score: undefined }
    ]

    render(<DataPreviewTable data={dataWithNull} defaultOpen={true} />)

    // "—" 기호가 3개 이상 있어야 함 (null, '', undefined)
    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThanOrEqual(3)
  })

  it('모든 행의 컬럼 합집합 추출', () => {
    // 첫 번째 행에 없는 필드가 두 번째 행에 있는 경우
    const sparseData: DataRow[] = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob', score: 85 }, // score는 첫 행에 없음
      { id: 3, name: 'Charlie', grade: 'A' } // grade는 첫/두 번째 행에 없음
    ]

    render(<DataPreviewTable data={sparseData} defaultOpen={true} />)

    // 모든 컬럼 헤더가 표시되어야 함
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('score')).toBeInTheDocument()
    expect(screen.getByText('grade')).toBeInTheDocument()
  })
})
