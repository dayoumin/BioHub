/**
 * DataPrepGuide 컴포넌트 렌더링 테스트
 *
 * L2 전략: data-testid 기반 (텍스트 변경에 강건)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { DataPrepGuide } from '@/components/statistics/common/DataPrepGuide'
import type { DataFormatGuideInfo } from '@/lib/constants/data-format-guides'

// ================================================================
// 테스트 데이터
// ================================================================

const CUSTOM_GUIDE: DataFormatGuideInfo = {
  methodId: 'test-method',
  summary: 'Test summary',
  instructions: ['Step 1', 'Step 2'],
  example: {
    headers: ['Col A', 'Col B'],
    rows: [
      ['a1', 'b1'],
      ['a2', 'b2'],
    ],
  },
  exampleFile: 'test.csv',
  spssMenu: 'Test > Menu',
  warnings: ['Warning message'],
}

/** 적합한 데이터 (숫자 1열, 행 10개) */
const GOOD_ONE_SAMPLE_DATA = Array.from({ length: 10 }, (_, i) => ({
  score: 70 + i * 3,
}))

/** 부적합한 데이터 (행 부족) */
const BAD_ONE_SAMPLE_DATA = [{ score: 85 }, { score: 90 }]

describe('DataPrepGuide', () => {
  // ================================================================
  // 1. 렌더링 기본
  // ================================================================
  describe('렌더링', () => {
    it('methodId로 가이드를 렌더링한다', () => {
      render(<DataPrepGuide methodId="t-test" />)
      expect(screen.getByTestId('data-prep-guide')).toBeInTheDocument()
    })

    it('methodId 없이 범용 가이드를 렌더링한다', () => {
      render(<DataPrepGuide />)
      expect(screen.getByTestId('data-prep-guide')).toBeInTheDocument()
    })

    it('guide prop으로 직접 가이드를 전달할 수 있다', () => {
      render(<DataPrepGuide guide={CUSTOM_GUIDE} />)
      expect(screen.getByTestId('data-prep-guide')).toBeInTheDocument()
    })

    it('미등록 methodId + guide 없으면 렌더링하지 않는다', () => {
      const { container } = render(<DataPrepGuide methodId="xxx-nonexistent" />)
      expect(container.innerHTML).toBe('')
    })
  })

  // ================================================================
  // 2. 접기/펼치기
  // ================================================================
  describe('접기/펼치기', () => {
    it('기본 상태: 펼침 (defaultCollapsed=false)', () => {
      render(<DataPrepGuide guide={CUSTOM_GUIDE} />)
      expect(screen.getByTestId('data-prep-guide-content')).toBeInTheDocument()
    })

    it('defaultCollapsed=true: 접힌 상태로 시작', () => {
      render(<DataPrepGuide guide={CUSTOM_GUIDE} defaultCollapsed />)
      expect(screen.queryByTestId('data-prep-guide-content')).not.toBeInTheDocument()
    })

    it('토글 버튼 클릭으로 접기/펼치기', () => {
      render(<DataPrepGuide guide={CUSTOM_GUIDE} defaultCollapsed />)

      // 초기: 접힘
      expect(screen.queryByTestId('data-prep-guide-content')).not.toBeInTheDocument()

      // 클릭 → 펼침
      fireEvent.click(screen.getByTestId('data-prep-guide-toggle'))
      expect(screen.getByTestId('data-prep-guide-content')).toBeInTheDocument()

      // 다시 클릭 → 접힘
      fireEvent.click(screen.getByTestId('data-prep-guide-toggle'))
      expect(screen.queryByTestId('data-prep-guide-content')).not.toBeInTheDocument()
    })
  })

  // ================================================================
  // 3. 예시 테이블
  // ================================================================
  describe('예시 테이블', () => {
    it('펼쳤을 때 테이블이 렌더링된다', () => {
      render(<DataPrepGuide guide={CUSTOM_GUIDE} />)
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('헤더 수만큼 th가 렌더링된다', () => {
      render(<DataPrepGuide guide={CUSTOM_GUIDE} />)
      const headers = screen.getAllByRole('columnheader')
      expect(headers).toHaveLength(CUSTOM_GUIDE.example.headers.length)
    })
  })

  // ================================================================
  // 4. 검증 결과 표시
  // ================================================================
  describe('검증 결과', () => {
    it('methodId 없으면 검증하지 않는다', () => {
      render(<DataPrepGuide uploadedData={GOOD_ONE_SAMPLE_DATA} />)
      expect(screen.queryByTestId('data-prep-validation-ok')).not.toBeInTheDocument()
      expect(screen.queryByTestId('data-prep-validation-warn')).not.toBeInTheDocument()
    })

    it('uploadedData 없으면 검증하지 않는다', () => {
      render(<DataPrepGuide methodId="one-sample-t" />)
      expect(screen.queryByTestId('data-prep-validation-ok')).not.toBeInTheDocument()
    })

    it('적합한 데이터 → 초록색 검증 결과', () => {
      render(
        <DataPrepGuide
          methodId="one-sample-t"
          uploadedData={GOOD_ONE_SAMPLE_DATA}
        />
      )
      expect(screen.getByTestId('data-prep-validation-ok')).toBeInTheDocument()
      expect(screen.queryByTestId('data-prep-validation-warn')).not.toBeInTheDocument()
    })

    it('부적합한 데이터 → 빨간색 경고', () => {
      render(
        <DataPrepGuide
          methodId="one-sample-t"
          uploadedData={BAD_ONE_SAMPLE_DATA}
        />
      )
      expect(screen.getByTestId('data-prep-validation-warn')).toBeInTheDocument()
      expect(screen.queryByTestId('data-prep-validation-ok')).not.toBeInTheDocument()
    })

    it('접힌 상태에서도 검증 결과는 표시된다', () => {
      render(
        <DataPrepGuide
          methodId="one-sample-t"
          uploadedData={GOOD_ONE_SAMPLE_DATA}
          defaultCollapsed
        />
      )
      // 가이드 내용은 안 보임
      expect(screen.queryByTestId('data-prep-guide-content')).not.toBeInTheDocument()
      // 검증 결과는 보임
      expect(screen.getByTestId('data-prep-validation-ok')).toBeInTheDocument()
    })
  })

  // ================================================================
  // 5. 모드 분기 시뮬레이션 (Smart Flow 흐름)
  // ================================================================
  describe('Smart Flow 흐름 시뮬레이션', () => {
    it('빠른 분석: methodId 있을 때 방법별 가이드 표시', () => {
      render(<DataPrepGuide methodId="t-test" defaultCollapsed />)
      expect(screen.getByTestId('data-prep-guide')).toBeInTheDocument()
    })

    it('AI 추천: methodId 없을 때 범용 가이드 표시', () => {
      render(<DataPrepGuide defaultCollapsed />)
      expect(screen.getByTestId('data-prep-guide')).toBeInTheDocument()
    })

    it('빠른 분석 + 업로드 후: 검증 결과 즉시 표시', () => {
      const tTestData = Array.from({ length: 10 }, (_, i) => ({
        group: i < 5 ? 'A' : 'B',
        score: 70 + i * 3,
      }))
      render(
        <DataPrepGuide
          methodId="t-test"
          uploadedData={tTestData}
          defaultCollapsed
        />
      )
      expect(screen.getByTestId('data-prep-validation-ok')).toBeInTheDocument()
    })

    it('AI 추천 + 업로드 후: 검증 없음 (methodId 모름)', () => {
      render(
        <DataPrepGuide
          uploadedData={GOOD_ONE_SAMPLE_DATA}
          defaultCollapsed
        />
      )
      expect(screen.queryByTestId('data-prep-validation-ok')).not.toBeInTheDocument()
      expect(screen.queryByTestId('data-prep-validation-warn')).not.toBeInTheDocument()
    })
  })
})
