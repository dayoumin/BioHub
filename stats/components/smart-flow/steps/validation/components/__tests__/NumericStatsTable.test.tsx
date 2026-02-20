/**
 * NumericStatsTable - Unit Tests
 *
 * @description
 * 수치형 변수 상세 통계 테이블 컴포넌트 테스트
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { NumericStatsTable } from '../NumericStatsTable'
import type { ColumnStatistics } from '@/types/smart-flow'

// Mock: Terminology
vi.mock('@/hooks/use-terminology', async () => {
  const { aquaculture } = await import('@/lib/terminology/domains/aquaculture')
  return {
    useTerminology: () => aquaculture,
    useTerminologyContext: () => ({
      dictionary: aquaculture,
      setDomain: vi.fn(),
      currentDomain: 'aquaculture',
    }),
  }
})

describe('NumericStatsTable', () => {
  const mockNumericColumns: ColumnStatistics[] = [
    {
      name: 'height',
      type: 'numeric',
      numericCount: 100,
      textCount: 0,
      missingCount: 0,
      uniqueValues: 100,
      mean: 170.5,
      median: 168.3,
      std: 10.2,
      min: 150.0,
      max: 190.0,
      cv: 5.98,
      skewness: 0.3,
      kurtosis: 0.5,
      outliers: [195, 196]
    },
    {
      name: 'weight',
      type: 'numeric',
      numericCount: 100,
      textCount: 0,
      missingCount: 0,
      uniqueValues: 100,
      mean: 70.0,
      median: 68.0,
      std: 8.0,
      min: 50.0,
      max: 90.0,
      cv: 11.4,
      skewness: 1.2,
      kurtosis: 3.5,
      outliers: Array(15).fill(95)
    }
  ]

  const mockCategoricalColumns: ColumnStatistics[] = [
    {
      name: 'gender',
      type: 'categorical',
      numericCount: 0,
      textCount: 100,
      missingCount: 0,
      uniqueValues: 2,
      topCategories: [
        { value: 'M', count: 60 },
        { value: 'F', count: 40 }
      ]
    }
  ]

  describe('렌더링', () => {
    it('수치형 변수가 없으면 아무것도 렌더링하지 않음', () => {
      const { container } = render(
        <NumericStatsTable columnStats={mockCategoricalColumns} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('수치형 변수가 있으면 테이블 헤더 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText('수치형 변수 상세 통계')).toBeInTheDocument()
      expect(screen.getByText('변수명')).toBeInTheDocument()
      expect(screen.getByText('평균')).toBeInTheDocument()
      expect(screen.getByText('중앙값')).toBeInTheDocument()
      expect(screen.getByText('표준편차')).toBeInTheDocument()
      expect(screen.getByText('CV(%)')).toBeInTheDocument()
      // 테이블 자체만 확인 (헤더 텍스트는 설명에도 중복되므로)
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      expect(screen.getByText('최소값')).toBeInTheDocument()
      expect(screen.getByText('최대값')).toBeInTheDocument()
    })

    it('수치형 변수 데이터 정확하게 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText('height')).toBeInTheDocument()
      expect(screen.getByText('weight')).toBeInTheDocument()
      expect(screen.getByText('170.50')).toBeInTheDocument()
      expect(screen.getByText('70.00')).toBeInTheDocument()
    })

    it('범주형 변수는 필터링되어 표시되지 않음', () => {
      const mixedColumns = [...mockNumericColumns, ...mockCategoricalColumns]
      render(<NumericStatsTable columnStats={mixedColumns} />)

      expect(screen.getByText('height')).toBeInTheDocument()
      expect(screen.queryByText('gender')).not.toBeInTheDocument()
    })
  })

  describe('왜도 색상 코딩', () => {
    it('|왜도| < 0.5이면 녹색 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      const skewnessCell = screen.getByText('0.30')
      expect(skewnessCell).toHaveClass('text-success')
    })

    it('0.5 ≤ |왜도| < 1이면 황색 표시', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          skewness: 0.7
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      const skewnessCell = screen.getByText('0.70')
      expect(skewnessCell).toHaveClass('text-warning')
    })

    it('|왜도| ≥ 1이면 빨간색 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      const skewnessCell = screen.getByText('1.20')
      expect(skewnessCell).toHaveClass('text-error')
    })

    it('음수 왜도도 절댓값으로 색상 판정', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          skewness: -0.3
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      const skewnessCell = screen.getByText('-0.30')
      expect(skewnessCell).toHaveClass('text-success')
    })
  })

  describe('첨도 색상 코딩', () => {
    it('|첨도| < 1이면 녹색 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      const kurtosisCell = screen.getByText('0.50')
      expect(kurtosisCell).toHaveClass('text-success')
    })

    it('1 ≤ |첨도| < 3이면 황색 표시', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          kurtosis: 2.0
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      const kurtosisCell = screen.getByText('2.00')
      expect(kurtosisCell).toHaveClass('text-warning')
    })

    it('|첨도| ≥ 3이면 빨간색 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      const kurtosisCell = screen.getByText('3.50')
      expect(kurtosisCell).toHaveClass('text-error')
    })
  })

  describe('이상치 표시', () => {
    it('이상치 개수 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText('2')).toBeInTheDocument() // height: 2개
      expect(screen.getByText('15')).toBeInTheDocument() // weight: 15개
    })

    it('이상치 비율 백분율로 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText(/2\.0%/)).toBeInTheDocument() // height: 2/100 = 2%
      expect(screen.getByText(/15\.0%/)).toBeInTheDocument() // weight: 15/100 = 15%
    })

    it('이상치가 없으면 비율 미표시', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          outliers: []
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      expect(screen.getByText('0')).toBeInTheDocument()
      // 이상치 비율이 없을 때 %가 표시되지 않는지 확인
      const tableText = screen.getByRole('table').textContent || ''
      expect(tableText).not.toMatch(/0\.0%/)
    })
  })

  describe('통계량 설명', () => {
    it('CV, 왜도, 첨도 설명 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText(/CV \(변동계수\)/)).toBeInTheDocument()
      expect(screen.getByText(/15% 이하면 안정적/)).toBeInTheDocument()
      // 설명 섹션에 왜도/첨도 관련 텍스트가 있는지 확인 (중복 텍스트이므로 getAllByText 사용)
      expect(screen.getAllByText(/정규분포/).length).toBeGreaterThan(0)
      expect(screen.getByText(/약간 치우침/)).toBeInTheDocument()
    })
  })

  describe('문제 해결 가이드', () => {
    it('왜도 문제 (|왜도| ≥ 1) 있으면 해결 가이드 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText(/데이터 문제 해결 가이드/)).toBeInTheDocument()
      expect(screen.getByText(/왜도 문제.*해결 방법/)).toBeInTheDocument()
      expect(screen.getByText(/로그 변환/)).toBeInTheDocument()
    })

    it('첨도 문제 (|첨도| ≥ 3) 있으면 해결 가이드 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText(/첨도 문제.*해결 방법/)).toBeInTheDocument()
      // "Winsorization"은 왜도 가이드와 첨도 가이드 둘 다에 나타나므로 getAllByText 사용
      expect(screen.getAllByText(/Winsorization/).length).toBeGreaterThan(0)
    })

    it('이상치 문제 (10% 초과) 있으면 해결 가이드 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText(/이상치 문제.*해결 방법/)).toBeInTheDocument()
      expect(screen.getByText(/원인 파악/)).toBeInTheDocument()
    })

    it('문제 없으면 해결 가이드 미표시', () => {
      const cleanColumns: ColumnStatistics[] = [
        {
          name: 'clean_data',
          type: 'numeric',
          numericCount: 100,
          textCount: 0,
          missingCount: 0,
          uniqueValues: 100,
          mean: 50,
          median: 50,
          std: 5,
          min: 40,
          max: 60,
          cv: 10,
          skewness: 0.1,
          kurtosis: 0.2,
          outliers: []
        }
      ]
      render(<NumericStatsTable columnStats={cleanColumns} />)

      expect(screen.queryByText(/데이터 문제 해결 가이드/)).not.toBeInTheDocument()
    })

    it('일반 권장사항 항상 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText(/일반 권장사항/)).toBeInTheDocument()
      expect(screen.getByText(/중심극한정리/)).toBeInTheDocument()
    })
  })

  describe('CV (변동계수) 표시', () => {
    it('CV 값이 있으면 소수점 1자리로 표시', () => {
      render(<NumericStatsTable columnStats={mockNumericColumns} />)

      expect(screen.getByText('6.0')).toBeInTheDocument() // height CV
      expect(screen.getByText('11.4')).toBeInTheDocument() // weight CV
    })

    it('CV 값이 없으면 "-" 표시', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          cv: undefined
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      const cells = screen.getAllByText('-')
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  describe('에지 케이스', () => {
    it('빈 배열이면 아무것도 렌더링하지 않음', () => {
      const { container } = render(<NumericStatsTable columnStats={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('skewness가 undefined이면 "-" 표시', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          skewness: undefined
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      // CV 컬럼에도 "-"가 있을 수 있으므로, 최소 1개 이상 존재하는지만 확인
      expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    })

    it('kurtosis가 undefined이면 "-" 표시', () => {
      const columns: ColumnStatistics[] = [
        {
          ...mockNumericColumns[0],
          kurtosis: undefined
        }
      ]
      render(<NumericStatsTable columnStats={columns} />)

      expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    })
  })
})
