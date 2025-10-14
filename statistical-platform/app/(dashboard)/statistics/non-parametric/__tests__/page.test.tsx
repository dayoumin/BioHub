import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import NonParametricTestPage from '../page'

// Mock 컴포넌트들
jest.mock('@/components/statistics/StatisticsPageLayout', () => ({
  StatisticsPageLayout: ({ children, title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  )
}))

jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ title, description, onMappingChange }: any) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button onClick={() => onMappingChange({ test: 'mapping' })}>
        변수 선택 완료
      </button>
    </div>
  )
}))

jest.mock('@/components/statistics/common/StatisticalResultCard', () => ({
  StatisticalResultCard: ({ result }: any) => (
    <div>
      <h3>결과: {result.testName}</h3>
      <p>p-value: {result.pValue}</p>
    </div>
  )
}))

jest.mock('@/components/statistics/common/AssumptionTestCard', () => ({
  AssumptionTestCard: ({ title, tests }: any) => (
    <div>
      <h3>{title}</h3>
      {tests.map((test: any, idx: number) => (
        <div key={idx}>{test.name}: {test.passed ? '통과' : '실패'}</div>
      ))}
    </div>
  )
}))

jest.mock('@/hooks/use-pyodide-service', () => ({
  usePyodideService: () => ({
    pyodideService: null,
    isLoading: false,
    error: null
  })
}))

describe('NonParametricTestPage', () => {
  describe('페이지 렌더링', () => {
    it('페이지가 올바르게 렌더링되어야 함', () => {
      render(<NonParametricTestPage />)

      expect(screen.getByText('비모수 검정')).toBeInTheDocument()
      expect(screen.getByText('정규성 가정이 필요 없는 순위 기반 통계 검정')).toBeInTheDocument()
    })

    it('4가지 검정 방법이 모두 표시되어야 함', () => {
      render(<NonParametricTestPage />)

      expect(screen.getByText('Mann-Whitney U 검정')).toBeInTheDocument()
      expect(screen.getByText('Wilcoxon 부호순위 검정')).toBeInTheDocument()
      expect(screen.getByText('Kruskal-Wallis 검정')).toBeInTheDocument()
      expect(screen.getByText('Friedman 검정')).toBeInTheDocument()
    })

    it('검정 방법 선택 카드에 설명이 포함되어야 함', () => {
      render(<NonParametricTestPage />)

      expect(screen.getByText('두 독립 표본 간 중앙값 차이를 검정합니다.')).toBeInTheDocument()
      expect(screen.getByText('대응 표본 간 중앙값 차이를 검정합니다.')).toBeInTheDocument()
      expect(screen.getByText('세 개 이상 독립 표본 간 중앙값 차이를 검정합니다.')).toBeInTheDocument()
      expect(screen.getByText('반복측정 설계에서 세 개 이상 조건 간 차이를 검정합니다.')).toBeInTheDocument()
    })

    it('탭이 올바르게 표시되어야 함', () => {
      render(<NonParametricTestPage />)

      expect(screen.getByText('분석 설정')).toBeInTheDocument()
      expect(screen.getByText('가정 확인')).toBeInTheDocument()
      expect(screen.getByText('결과')).toBeInTheDocument()
    })
  })

  describe('검정 방법 선택', () => {
    it('Mann-Whitney를 선택할 수 있어야 함', () => {
      render(<NonParametricTestPage />)

      const mannWhitney = screen.getByLabelText('mann-whitney')
      fireEvent.click(mannWhitney)

      expect(mannWhitney).toBeChecked()
    })

    it('Wilcoxon을 선택할 수 있어야 함', () => {
      render(<NonParametricTestPage />)

      const wilcoxon = screen.getByLabelText('wilcoxon')
      fireEvent.click(wilcoxon)

      expect(wilcoxon).toBeChecked()
    })

    it('Kruskal-Wallis를 선택할 수 있어야 함', () => {
      render(<NonParametricTestPage />)

      const kruskalWallis = screen.getByLabelText('kruskal-wallis')
      fireEvent.click(kruskalWallis)

      expect(kruskalWallis).toBeChecked()
    })

    it('Friedman을 선택할 수 있어야 함', () => {
      render(<NonParametricTestPage />)

      const friedman = screen.getByLabelText('friedman')
      fireEvent.click(friedman)

      expect(friedman).toBeChecked()
    })
  })

  describe('분석 옵션', () => {
    it('유의수준을 선택할 수 있어야 함', () => {
      render(<NonParametricTestPage />)

      const alphaSelect = screen.getByText('0.05')
      expect(alphaSelect).toBeInTheDocument()

      // Select 컴포넌트 테스트는 실제 컴포넌트가 있을 때 더 자세히 테스트
    })

    it('대립가설을 선택할 수 있어야 함', () => {
      render(<NonParametricTestPage />)

      const alternativeSelect = screen.getByText('양측검정')
      expect(alternativeSelect).toBeInTheDocument()
    })
  })

  describe('변수 선택', () => {
    it('선택한 검정에 맞는 변수 선택기가 표시되어야 함', () => {
      render(<NonParametricTestPage />)

      // Mann-Whitney가 기본 선택되어 있음
      expect(screen.getByText('변수 선택')).toBeInTheDocument()
      expect(screen.getByText('Mann-Whitney U 검정에 필요한 변수를 선택하세요')).toBeInTheDocument()
    })

    it('검정 방법을 바꾸면 변수 선택 설명이 변경되어야 함', () => {
      render(<NonParametricTestPage />)

      const wilcoxon = screen.getByLabelText('wilcoxon')
      fireEvent.click(wilcoxon)

      expect(screen.getByText('Wilcoxon 부호순위 검정에 필요한 변수를 선택하세요')).toBeInTheDocument()
    })
  })

  describe('분석 실행', () => {
    it('변수를 선택하지 않으면 분석 버튼이 비활성화되어야 함', () => {
      render(<NonParametricTestPage />)

      const analyzeButton = screen.getByRole('button', { name: /분석 실행/i })
      expect(analyzeButton).toBeDisabled()
    })

    it('변수를 선택하면 분석 버튼이 활성화되어야 함', () => {
      render(<NonParametricTestPage />)

      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)

      const analyzeButton = screen.getByRole('button', { name: /분석 실행/i })
      expect(analyzeButton).not.toBeDisabled()
    })

    it('분석 실행 시 로딩 상태가 표시되어야 함', async () => {
      render(<NonParametricTestPage />)

      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)

      const analyzeButton = screen.getByRole('button', { name: /분석 실행/i })
      fireEvent.click(analyzeButton)

      expect(screen.getByText('분석 중...')).toBeInTheDocument()

      // 1.5초 후에 결과가 표시됨 (mock 타이머 사용하면 더 좋음)
      await waitFor(() => {
        expect(screen.getByText(/결과: Mann-Whitney U 검정/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('가정 확인 탭', () => {
    it('가정 확인 탭을 클릭하면 가정 검정이 표시되어야 함', () => {
      render(<NonParametricTestPage />)

      const assumptionsTab = screen.getByText('가정 확인')
      fireEvent.click(assumptionsTab)

      expect(screen.getByText('비모수 검정 가정')).toBeInTheDocument()
      expect(screen.getByText('독립성')).toBeInTheDocument()
      expect(screen.getByText('측정 수준')).toBeInTheDocument()
    })

    it('검정별 고려사항이 표시되어야 함', () => {
      render(<NonParametricTestPage />)

      const assumptionsTab = screen.getByText('가정 확인')
      fireEvent.click(assumptionsTab)

      expect(screen.getByText('Mann-Whitney U 검정 고려사항')).toBeInTheDocument()
      expect(screen.getByText(/두 그룹이 독립적이어야 함/)).toBeInTheDocument()
    })

    it('다른 검정을 선택하면 고려사항이 변경되어야 함', () => {
      render(<NonParametricTestPage />)

      const wilcoxon = screen.getByLabelText('wilcoxon')
      fireEvent.click(wilcoxon)

      const assumptionsTab = screen.getByText('가정 확인')
      fireEvent.click(assumptionsTab)

      expect(screen.getByText('Wilcoxon 부호순위 검정 고려사항')).toBeInTheDocument()
      expect(screen.getByText(/대응 표본이어야 함/)).toBeInTheDocument()
    })
  })

  describe('결과 표시', () => {
    it('분석 후 결과 탭이 활성화되어야 함', async () => {
      render(<NonParametricTestPage />)

      // 변수 선택
      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)

      // 분석 실행
      const analyzeButton = screen.getByRole('button', { name: /분석 실행/i })
      fireEvent.click(analyzeButton)

      // 결과 대기
      await waitFor(() => {
        expect(screen.getByText(/결과: Mann-Whitney U 검정/)).toBeInTheDocument()
      }, { timeout: 2000 })

      // 결과 탭이 활성화되고 내용이 표시됨
      expect(screen.getByText('p-value: 0.023')).toBeInTheDocument()
    })

    it('추가 분석 옵션이 표시되어야 함', async () => {
      render(<NonParametricTestPage />)

      // 변수 선택 및 분석 실행
      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)

      const analyzeButton = screen.getByRole('button', { name: /분석 실행/i })
      fireEvent.click(analyzeButton)

      // 결과 대기
      await waitFor(() => {
        expect(screen.getByText(/결과: Mann-Whitney U 검정/)).toBeInTheDocument()
      }, { timeout: 2000 })

      // 추가 분석 옵션 확인
      expect(screen.getByText('추가 분석 옵션')).toBeInTheDocument()
      expect(screen.getByText('박스플롯 생성')).toBeInTheDocument()
      expect(screen.getByText('순위 플롯 생성')).toBeInTheDocument()
    })

    it('Kruskal-Wallis 선택 시 사후검정 버튼이 표시되어야 함', async () => {
      render(<NonParametricTestPage />)

      // Kruskal-Wallis 선택
      const kruskalWallis = screen.getByLabelText('kruskal-wallis')
      fireEvent.click(kruskalWallis)

      // 변수 선택 및 분석 실행
      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)

      const analyzeButton = screen.getByRole('button', { name: /분석 실행/i })
      fireEvent.click(analyzeButton)

      // 결과 대기
      await waitFor(() => {
        expect(screen.getByText(/결과: Kruskal-Wallis 검정/)).toBeInTheDocument()
      }, { timeout: 2000 })

      // 사후검정 버튼 확인
      expect(screen.getByText('사후검정 수행')).toBeInTheDocument()
    })
  })
})