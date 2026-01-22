/**
 * DataValidationStep UX 개선 테스트
 *
 * 테스트 범위:
 * 1. 파일명 최상단 sticky 배치
 * 2. "대표본/소표본" 중립 메시지
 * 3. GuidanceCard → 버튼 Card 교체
 * 4. 기술통계 추천 제거
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock useSmartFlowStore
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    uploadedFile: { name: 'test-data.csv' },
    uploadedFileName: 'test-data.csv',
    setDataCharacteristics: vi.fn(),
    setAssumptionResults: vi.fn()
  })
}))

describe('DataValidationStep UX Improvements', () => {

  const mockData: DataRow[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    age: 20 + i,
    score: 50 + Math.random() * 50,
    group: i % 2 === 0 ? 'A' : 'B'
  }))

  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 50,
    columnCount: 4,
    missingValues: 0,
    dataType: 'csv',
    variables: ['age', 'weight', 'score', 'group'],
    errors: [],
    warnings: [],
    columnStats: [
      {
        name: 'age',
        type: 'numeric',
      numericCount: 100,
      textCount: 0,
      uniqueValues: 50,
        missingCount: 0,
        mean: 44.5,
        std: 14.43,
        min: 20,
        max: 69
      },
      {
        name: 'score',
        type: 'numeric',
      numericCount: 100,
      textCount: 0,
      uniqueValues: 50,
        missingCount: 0,
        mean: 75,
        std: 14.43,
        min: 50,
        max: 100
      },
      {
        name: 'group',
        type: 'categorical',
      numericCount: 0,
      textCount: 100,
      uniqueValues: 2,
        missingCount: 0
      }
    ]
  }

  describe('1. 파일명 최상단 Sticky 배치', () => {
    it('파일명이 sticky 위치에 표시되어야 함', () => {
      const { container } = render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      // sticky 컨테이너 확인 (querySelector로 직접 찾기)
      const stickyContainer = container.querySelector('.sticky.top-0.z-10')
      expect(stickyContainer).toBeInTheDocument()
      expect(stickyContainer).toHaveClass('backdrop-blur')
    })

    it('파일명과 행×열 정보가 함께 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('현재 파일')).toBeInTheDocument()
      // getAllByText로 중복 처리 (sticky + 카드에 모두 표시됨)
      expect(screen.getAllByText('test-data.csv')[0]).toBeInTheDocument()
      expect(screen.getAllByText(/50행 × 4열/)[0]).toBeInTheDocument()
    })

    it.skip('파일명이 없으면 sticky 섹션이 표시되지 않아야 함', () => {
      // TODO: Mock override 패턴 필요 (현재는 skip)
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.queryByText('현재 파일')).not.toBeInTheDocument()
    })
  })

  describe('2. 표본 크기 중립 메시지', () => {
    it('30개 이상이면 "대표본"으로 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={{ ...mockValidationResults, totalRows: 50 }}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('대표본')).toBeInTheDocument()
      expect(screen.queryByText('충분')).not.toBeInTheDocument()
    })

    it('30개 미만이면 "소표본"으로 표시되어야 함', () => {
      const smallData = mockData.slice(0, 20)

      render(
        <DataValidationStep
          validationResults={{ ...mockValidationResults, totalRows: 20 }}
          data={smallData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('소표본')).toBeInTheDocument()
      expect(screen.queryByText('충분')).not.toBeInTheDocument()
    })

    it('Badge는 outline variant를 사용해야 함', () => {
      const { container } = render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      const badge = screen.getByText('대표본')
      // shadcn/ui Badge의 outline variant는 border 클래스를 포함
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('3. GuidanceCard → 버튼 Card 교체', () => {
    it('GuidanceCard 대신 간단한 버튼이 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      // 버튼 존재 확인
      const button = screen.getByRole('button', { name: /데이터 탐색하기/ })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('w-full') // 전체 폭

      // GuidanceCard의 특징적인 텍스트가 없어야 함
      expect(screen.queryByText(/분석 준비되었습니다/)).not.toBeInTheDocument()
      expect(screen.queryByText(/1️⃣/)).not.toBeInTheDocument()
    })

    it('경고가 있을 때 경고 메시지가 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={{
            ...mockValidationResults,
            warnings: ['경고 메시지']
          }}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText(/경고 사항이 있지만 분석을 계속할 수 있습니다/)).toBeInTheDocument()
    })

    it('에러가 있으면 버튼이 표시되지 않아야 함', () => {
      render(
        <DataValidationStep
          validationResults={{
            ...mockValidationResults,
            errors: ['에러 메시지']
          }}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.queryByRole('button', { name: /데이터 탐색하기/ })).not.toBeInTheDocument()
    })
  })

  describe('4. 기술통계 추천 제거', () => {
    it('추천 분석 목록에 기술통계가 없어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      // "이 데이터로 할 수 있는 분석" 카드 찾기
      const analysisCard = screen.getByText('💡 이 데이터로 할 수 있는 분석')
      expect(analysisCard).toBeInTheDocument()

      // 기술통계가 목록에 없어야 함
      expect(screen.queryByText(/기술통계/)).not.toBeInTheDocument()
      expect(screen.queryByText(/평균, 표준편차, 분포/)).not.toBeInTheDocument()
    })

    it('다른 분석 추천은 정상 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      // 2집단 비교, 상관분석, 회귀분석은 표시되어야 함
      expect(screen.getByText(/2집단 비교/)).toBeInTheDocument()
      expect(screen.getByText(/상관분석/)).toBeInTheDocument()
      expect(screen.getByText(/회귀분석/)).toBeInTheDocument()
    })
  })

  describe('5. 통합 시나리오', () => {
    it('모든 UX 개선이 함께 동작해야 함', () => {
      const { container } = render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      // 1. Sticky 파일명
      const stickyContainer = container.querySelector('.sticky.top-0.z-10')
      expect(stickyContainer).toBeInTheDocument()
      expect(screen.getByText('현재 파일')).toBeInTheDocument()

      // 2. 중립 메시지
      expect(screen.getByText('대표본')).toBeInTheDocument()

      // 3. 간단한 버튼
      expect(screen.getByRole('button', { name: /데이터 탐색하기/ })).toBeInTheDocument()

      // 4. 기술통계 제거
      expect(screen.queryByText(/기술통계/)).not.toBeInTheDocument()

      // 5. 다른 기능은 유지
      expect(screen.getByText('데이터 준비 완료')).toBeInTheDocument()
      expect(screen.getByText('💡 이 데이터로 할 수 있는 분석')).toBeInTheDocument()
    })
  })
})
