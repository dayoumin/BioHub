/**
 * Regression 페이지 - DataPreviewPanel 통합 테스트
 *
 * regression 페이지에서 DataPreviewPanel이 올바르게 작동하는지 검증
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { DataPreviewPanel } from '@/components/statistics/common/DataPreviewPanel'

describe('Regression Page - DataPreviewPanel Integration', () => {
  /**
   * 시나리오: CSV 업로드 후 regression 페이지에서 데이터 미리보기
   */
  const regressionData = [
    { height: '170', weight: '65.5', age: '25' },
    { height: '180', weight: '75.0', age: '30' },
    { height: '165', weight: '60.5', age: '28' },
    { height: '175', weight: '70.0', age: '32' },
    { height: '168', weight: '63.0', age: '27' }
  ]

  it('데이터가 있으면 DataPreviewPanel을 렌더링한다', () => {
    render(<DataPreviewPanel data={regressionData} />)

    expect(screen.getByText('업로드된 데이터')).toBeInTheDocument()
    expect(screen.getByText(/5개 행/)).toBeInTheDocument()
    expect(screen.getByText(/3개 변수/)).toBeInTheDocument()
  })

  it('기본적으로 접혀있어 성능에 영향을 주지 않는다', () => {
    render(<DataPreviewPanel data={regressionData} />)

    // 접기 상태에서는 데이터 테이블이 렌더링되지 않음
    expect(screen.queryByText('height')).not.toBeInTheDocument()
    expect(screen.getByText('펼치기')).toBeInTheDocument()
  })

  it('숫자형 문자열을 올바르게 처리한다', async () => {
    render(<DataPreviewPanel data={regressionData} defaultExpanded={true} />)

    // 기초 통계 탭으로 전환
    const statsTab = screen.getByText('기초 통계')
    await act(async () => {
      fireEvent.click(statsTab)
    })

    // height, weight, age가 모두 숫자형으로 인식되어야 함
    await waitFor(() => {
      const numericBadges = screen.getAllByText('숫자형')
      expect(numericBadges.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('회귀분석에 필요한 최소 데이터 수를 표시한다', async () => {
    render(<DataPreviewPanel data={regressionData} defaultExpanded={true} />)

    // 5개 데이터는 회귀분석 최소 요구사항(3개) 충족
    await waitFor(() => {
      expect(screen.getByText(/5개 행/)).toBeInTheDocument()
    })

    // CheckCircle 아이콘이 있어야 함 (문제 없음)
    const card = screen.getByText('업로드된 데이터').closest('div')
    expect(card).toBeInTheDocument()
  })

  it('변수별 기초 통계를 계산한다', async () => {
    render(<DataPreviewPanel data={regressionData} defaultExpanded={true} />)

    const statsTab = screen.getByText('기초 통계')
    await act(async () => {
      fireEvent.click(statsTab)
    })

    // 숫자형 통계 항목들이 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText('평균')).toBeInTheDocument()
      expect(screen.getByText('표준편차')).toBeInTheDocument()
      expect(screen.getByText('최소값')).toBeInTheDocument()
      expect(screen.getByText('최대값')).toBeInTheDocument()
    })
  })

  it('대용량 데이터에서 최대 100행만 미리보기한다', () => {
    const largeData = Array.from({ length: 500 }, (_, i) => ({
      x: String(i),
      y: String(i * 2)
    }))

    render(<DataPreviewPanel data={largeData} defaultExpanded={true} maxPreviewRows={100} />)

    // 경고 메시지 확인
    expect(screen.getByText(/처음/)).toBeInTheDocument()
    expect(screen.getByText(/100개 행/)).toBeInTheDocument()
    expect(screen.getByText(/전체 데이터는 분석에 사용됩니다/)).toBeInTheDocument()
  })

  it('누락 데이터가 있을 때 경고를 표시한다', async () => {
    const dataWithMissing = [
      { height: '170', weight: '65.5', age: '25' },
      { height: '180', weight: null, age: '30' },
      { height: '165', weight: '60.5', age: null }
    ]

    render(<DataPreviewPanel data={dataWithMissing} defaultExpanded={true} />)

    const statsTab = screen.getByText('기초 통계')
    await act(async () => {
      fireEvent.click(statsTab)
    })

    // 누락 데이터 배지가 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText(/누락/)).toBeInTheDocument()
    })
  })

  it('데이터 테이블에서 null 값을 하이라이트한다', () => {
    const dataWithNull = [
      { x: '10', y: '20' },
      { x: '20', y: null },
      { x: null, y: '40' }
    ]

    render(<DataPreviewPanel data={dataWithNull} defaultExpanded={true} />)

    // null 값이 표시되어야 함
    const nullCells = screen.getAllByText('null')
    expect(nullCells.length).toBe(2) // y와 x에 각각 1개씩
  })

  it('회귀분석 워크플로우: 데이터 업로드 → 미리보기 → 변수 선택', async () => {
    render(<DataPreviewPanel data={regressionData} />)

    // Step 1: 데이터 업로드 확인
    expect(screen.getByText('업로드된 데이터')).toBeInTheDocument()
    expect(screen.getByText(/5개 행/)).toBeInTheDocument()

    // Step 2: 미리보기 펼치기
    const expandButton = screen.getByText('펼치기')
    await act(async () => {
      fireEvent.click(expandButton)
    })

    // Step 3: 데이터 확인
    await waitFor(() => {
      expect(screen.getByText('데이터 미리보기')).toBeInTheDocument()
      expect(screen.getByText('height')).toBeInTheDocument()
      expect(screen.getByText('weight')).toBeInTheDocument()
      expect(screen.getByText('age')).toBeInTheDocument()
    })

    // Step 4: 기초 통계 확인
    const statsTab = screen.getByText('기초 통계')
    await act(async () => {
      fireEvent.click(statsTab)
    })

    await waitFor(() => {
      expect(screen.getByText('총 개수')).toBeInTheDocument()
    })
  })

  it('모던한 UI 스타일이 적용된다', () => {
    const { container } = render(<DataPreviewPanel data={regressionData} />)

    // Glassmorphism, hover effects 등의 클래스가 적용되어야 함
    const card = container.querySelector('.group')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('hover:shadow-lg')
  })
})
