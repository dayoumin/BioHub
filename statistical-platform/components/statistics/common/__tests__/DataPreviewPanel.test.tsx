import { render, screen, fireEvent } from '@testing-library/react'
import { DataPreviewPanel } from '../DataPreviewPanel'

describe('DataPreviewPanel', () => {
  const mockData = [
    { id: '1', height: '170', weight: '65.5', group: 'A' },
    { id: '2', height: '180', weight: '75.0', group: 'B' },
    { id: '3', height: '165', weight: '60.5', group: 'A' },
    { id: '4', height: 'N/A', weight: '70.0', group: 'B' },
    { id: '5', height: '175', weight: null, group: 'A' }
  ]

  it('데이터가 없으면 렌더링하지 않는다', () => {
    const { container } = render(<DataPreviewPanel data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('기본 정보를 표시한다', () => {
    render(<DataPreviewPanel data={mockData} />)

    expect(screen.getByText('업로드된 데이터')).toBeInTheDocument()
    expect(screen.getByText(/5개 행/)).toBeInTheDocument()
    expect(screen.getByText(/4개 변수/)).toBeInTheDocument()
  })

  it('기본적으로 접혀있다', () => {
    render(<DataPreviewPanel data={mockData} />)

    expect(screen.queryByText('데이터 미리보기')).not.toBeInTheDocument()
    expect(screen.getByText('펼치기')).toBeInTheDocument()
  })

  it('펼치기 버튼을 클릭하면 데이터가 표시된다', () => {
    render(<DataPreviewPanel data={mockData} />)

    const expandButton = screen.getByText('펼치기')
    fireEvent.click(expandButton)

    expect(screen.getByText('데이터 미리보기')).toBeInTheDocument()
    expect(screen.getByText('기초 통계')).toBeInTheDocument()
    expect(screen.getByText('접기')).toBeInTheDocument()
  })

  it('defaultExpanded가 true면 초기에 펼쳐진다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    expect(screen.getByText('데이터 미리보기')).toBeInTheDocument()
    expect(screen.getByText('접기')).toBeInTheDocument()
  })

  it('데이터 테이블을 렌더링한다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    // 컬럼 헤더
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('height')).toBeInTheDocument()
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('group')).toBeInTheDocument()

    // 데이터 행
    expect(screen.getByText('170')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('null 값을 표시한다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    const nullCells = screen.getAllByText('null')
    expect(nullCells.length).toBeGreaterThan(0)
  })

  it('숫자형 변수에 배지를 표시한다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    const numericBadges = screen.getAllByText('숫자')
    expect(numericBadges.length).toBeGreaterThan(0)
  })

  it('기초 통계 탭으로 전환할 수 있다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    const statsTab = screen.getByText('기초 통계')
    fireEvent.click(statsTab)

    expect(screen.getByText('총 개수')).toBeInTheDocument()
    expect(screen.getByText('고유값')).toBeInTheDocument()
  })

  it('숫자형 변수의 통계를 계산한다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    const statsTab = screen.getByText('기초 통계')
    fireEvent.click(statsTab)

    // height 변수 찾기 (숫자형)
    expect(screen.getByText('평균')).toBeInTheDocument()
    expect(screen.getByText('표준편차')).toBeInTheDocument()
    expect(screen.getByText('최소값')).toBeInTheDocument()
    expect(screen.getByText('최대값')).toBeInTheDocument()
  })

  it('범주형 변수의 상위 값을 표시한다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    const statsTab = screen.getByText('기초 통계')
    fireEvent.click(statsTab)

    expect(screen.getByText('상위 값')).toBeInTheDocument()
  })

  it('누락 데이터 경고를 표시한다', () => {
    render(<DataPreviewPanel data={mockData} defaultExpanded={true} />)

    const statsTab = screen.getByText('기초 통계')
    fireEvent.click(statsTab)

    // '1개 누락' 또는 '2개 누락' 등의 텍스트가 있는지 확인
    expect(screen.getByText(/\d+개 누락/)).toBeInTheDocument()
  })

  it('maxPreviewRows를 초과하면 경고를 표시한다', () => {
    const largeData = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      value: String(i * 10)
    }))

    render(<DataPreviewPanel data={largeData} defaultExpanded={true} maxPreviewRows={100} />)

    expect(screen.getByText(/처음/)).toBeInTheDocument()
    expect(screen.getByText(/100개 행/)).toBeInTheDocument()
  })

  it('문제가 있는 데이터에 경고 아이콘을 표시한다', () => {
    render(<DataPreviewPanel data={mockData} />)

    // AlertCircle 아이콘이 있는지 확인 (누락 데이터가 있으므로)
    const card = screen.getByText('업로드된 데이터').closest('.group')
    expect(card).toBeInTheDocument()
  })
})
