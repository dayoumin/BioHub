import { render, screen } from '@testing-library/react'
import { SimpleBoxPlot } from '@/components/charts/simple-boxplot'

describe('SimpleBoxPlot Component', () => {
  describe('빈 데이터 처리', () => {
    it('빈 배열에 대해 "데이터가 없습니다" 메시지 표시', () => {
      render(<SimpleBoxPlot data={[]} />)
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
    })
  })

  describe('통계 계산', () => {
    it('Q1, Q3, Median 계산이 정확함 (10개 데이터)', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      render(<SimpleBoxPlot data={data} />)

      // Q1 = 3, Median = 5.5, Q3 = 8
      expect(screen.getByText(/3\.000/)).toBeInTheDocument() // Q1
      expect(screen.getByText(/5\.50/)).toBeInTheDocument() // Median
      expect(screen.getByText(/8\.000/)).toBeInTheDocument() // Q3
    })

    it('홀수 개 데이터의 중앙값 계산', () => {
      const data = [1, 2, 3, 4, 5]
      render(<SimpleBoxPlot data={data} />)

      // Median = 3 (중간값)
      expect(screen.getByText(/중앙값: 3\.00/)).toBeInTheDocument()
    })

    it('짝수 개 데이터의 중앙값 계산', () => {
      const data = [1, 2, 3, 4]
      render(<SimpleBoxPlot data={data} />)

      // Median = (2 + 3) / 2 = 2.5
      expect(screen.getByText(/중앙값: 2\.50/)).toBeInTheDocument()
    })
  })

  describe('IQR 계산', () => {
    it('IQR = Q3 - Q1 계산이 정확함', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      render(<SimpleBoxPlot data={data} />)

      // IQR = Q3 - Q1 = 8 - 3 = 5
      expect(screen.getByText(/IQR: 5\.00/)).toBeInTheDocument() // 소수점 2자리
    })
  })

  describe('이상치 감지', () => {
    it('이상치가 있을 때 빨간 점으로 표시', () => {
      const dataWithOutliers = [1, 2, 3, 4, 5, 100] // 100은 이상치
      const { container } = render(<SimpleBoxPlot data={dataWithOutliers} />)

      // 빨간 점 (이상치) 존재 확인
      const outlierCircles = container.querySelectorAll('circle')
      expect(outlierCircles.length).toBeGreaterThan(0)
    })

    it('이상치 개수를 텍스트로 표시', () => {
      const dataWithOutliers = [1, 1, 1, 1, 1, 1, 1, 1, 100, 200] // 100, 200이 명확한 이상치
      render(<SimpleBoxPlot data={dataWithOutliers} />)

      expect(screen.getByText(/이상치 \d+개/)).toBeInTheDocument() // 1개 이상
    })

    it('이상치가 없을 때 메시지 표시 안 함', () => {
      const data = [1, 2, 3, 4, 5]
      render(<SimpleBoxPlot data={data} />)

      expect(screen.queryByText(/이상치/)).not.toBeInTheDocument()
    })
  })

  describe('Props 처리', () => {
    it('title prop이 정상 작동', () => {
      render(<SimpleBoxPlot data={[1, 2, 3]} title="커스텀 제목" />)
      expect(screen.getByText('커스텀 제목')).toBeInTheDocument()
    })

    it('variable prop이 정상 작동', () => {
      const { container } = render(<SimpleBoxPlot data={[1, 2, 3]} variable="나이" />)
      expect(container.textContent).toContain('나이')
    })

    it('기본값 사용 (title, variable)', () => {
      render(<SimpleBoxPlot data={[1, 2, 3]} />)
      expect(screen.getByText('Box Plot')).toBeInTheDocument()
      expect(screen.getByText('변수')).toBeInTheDocument()
    })
  })

  describe('SVG 렌더링', () => {
    it('SVG 요소가 렌더링됨', () => {
      const { container } = render(<SimpleBoxPlot data={[1, 2, 3, 4, 5]} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('Box (rect) 요소 존재', () => {
      const { container } = render(<SimpleBoxPlot data={[1, 2, 3, 4, 5]} />)
      const rect = container.querySelector('rect')
      expect(rect).toBeInTheDocument()
    })

    it('Median line 존재', () => {
      const { container } = render(<SimpleBoxPlot data={[1, 2, 3, 4, 5]} />)
      const lines = container.querySelectorAll('line')
      expect(lines.length).toBeGreaterThan(0) // Whisker + Median 라인
    })
  })

  describe('통계 요약 테이블', () => {
    it('최소값, 최대값 표시', () => {
      const data = [1, 2, 3, 4, 5]
      render(<SimpleBoxPlot data={data} />)

      // 실제 텍스트: "최소값: 1.000" (span + 공백 + text)
      expect(screen.getByText('최소값:')).toBeInTheDocument()
      expect(screen.getByText('최대값:')).toBeInTheDocument()
    })

    it('Q1, Q3 표시', () => {
      const data = [1, 2, 3, 4, 5]
      render(<SimpleBoxPlot data={data} />)

      expect(screen.getByText(/Q1 \(25%\):/)).toBeInTheDocument()
      expect(screen.getByText(/Q3 \(75%\):/)).toBeInTheDocument()
    })
  })
})
