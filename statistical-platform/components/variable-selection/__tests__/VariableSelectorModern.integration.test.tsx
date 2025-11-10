import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VariableSelectorModern } from '../VariableSelectorModern'

// Mock variable-requirements
jest.mock('@/lib/statistics/variable-requirements', () => ({
  getMethodRequirements: jest.fn((methodId: string) => {
    const requirements = {
      'anova-one-way': {
        id: 'anova-one-way',
        name: '일원 분산분석 (One-Way ANOVA)',
        description: '하나의 요인에 대한 여러 그룹 간 평균 차이 검정',
        category: 'compare-groups',
        minSampleSize: 3,
        assumptions: ['정규성', '등분산성', '독립성'],
        variables: [
          {
            role: 'dependent',
            label: '종속변수',
            description: '비교할 연속형 변수',
            required: true,
            multiple: false,
            types: ['continuous'],
            example: '시험점수'
          },
          {
            role: 'factor',
            label: '요인',
            description: '그룹을 구분하는 범주형 변수',
            required: true,
            multiple: false,
            types: ['categorical', 'binary'],
            example: '그룹'
          }
        ]
      },
      'two-sample-t': {
        id: 'two-sample-t',
        name: '독립 2표본 t검정',
        description: '두 독립 그룹 간 평균 차이 검정',
        category: 'compare-groups',
        minSampleSize: 2,
        assumptions: ['정규성', '등분산성', '독립성'],
        variables: [
          {
            role: 'dependent',
            label: '종속변수',
            description: '비교할 연속형 변수',
            required: true,
            multiple: false,
            types: ['continuous']
          },
          {
            role: 'independent',
            label: '그룹변수',
            description: '두 그룹을 구분하는 변수',
            required: true,
            multiple: false,
            types: ['binary']
          }
        ]
      },
      'regression-linear': {
        id: 'regression-linear',
        name: '선형 회귀분석',
        description: '연속형 종속변수와 독립변수 간의 선형 관계 분석',
        category: 'regression',
        minSampleSize: 10,
        assumptions: ['선형성', '정규성', '등분산성', '독립성'],
        variables: [
          {
            role: 'dependent',
            label: '종속변수',
            description: '예측하려는 연속형 변수',
            required: true,
            multiple: false,
            types: ['continuous']
          },
          {
            role: 'independent',
            label: '독립변수',
            description: '예측에 사용할 변수',
            required: true,
            multiple: true,
            minCount: 1,
            types: ['continuous', 'categorical', 'binary']
          }
        ]
      },
      'correlation-pearson': {
        id: 'correlation-pearson',
        name: '피어슨 상관분석',
        description: '두 연속형 변수 간의 선형 상관관계 분석',
        category: 'correlation',
        minSampleSize: 3,
        assumptions: ['선형성', '정규성'],
        variables: [
          {
            role: 'variables',
            label: '변수',
            description: '상관분석할 변수 (2개 이상)',
            required: true,
            multiple: true,
            minCount: 2,
            types: ['continuous']
          }
        ]
      },
      'chi-square-independence': {
        id: 'chi-square-independence',
        name: '카이제곱 독립성 검정',
        description: '두 범주형 변수 간의 독립성 검정',
        category: 'categorical',
        minSampleSize: 5,
        assumptions: ['기대빈도 5 이상'],
        variables: [
          {
            role: 'row',
            label: '행 변수',
            description: '교차표의 행',
            required: true,
            multiple: false,
            types: ['categorical', 'binary']
          },
          {
            role: 'column',
            label: '열 변수',
            description: '교차표의 열',
            required: true,
            multiple: false,
            types: ['categorical', 'binary']
          }
        ]
      }
    }
    return requirements[methodId] || null
  })
}))

// Mock 데이터
const mockData = [
  { 시험점수: 85, 그룹: 'A', 성별: '남', 연령: 20 },
  { 시험점수: 90, 그룹: 'B', 성별: '여', 연령: 21 },
  { 시험점수: 78, 그룹: 'A', 성별: '남', 연령: 22 },
  { 시험점수: 92, 그룹: 'B', 성별: '여', 연령: 23 },
]

describe('VariableSelectorModern 통합 테스트', () => {
  it('ANOVA 페이지와 동일하게 렌더링되어야 함', () => {
    const mockOnVariablesSelected = jest.fn()

    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // 제목 확인
    expect(screen.getByText(/일원 분산분석/)).toBeInTheDocument()

    // 변수 목록 카드 확인
    expect(screen.getByText('변수 목록')).toBeInTheDocument()

    // 변수 역할 할당 카드 확인
    expect(screen.getByText('변수 역할 할당')).toBeInTheDocument()
  })

  it('4개 변수가 모두 표시되어야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    expect(screen.getByText('시험점수')).toBeInTheDocument()
    expect(screen.getByText('그룹')).toBeInTheDocument()
    expect(screen.getByText('성별')).toBeInTheDocument()
    expect(screen.getByText('연령')).toBeInTheDocument()
  })

  it('역할별 드롭존이 표시되어야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    // ANOVA는 종속변수와 요인 필요
    expect(screen.getByText(/종속변수/)).toBeInTheDocument()
    expect(screen.getByText(/요인/)).toBeInTheDocument()
  })

  it('드롭존 빈 상태 메시지를 표시해야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    // 빈 드롭존 메시지
    const emptyMessages = screen.getAllByText(/변수를 드래그하여 추가/)
    expect(emptyMessages.length).toBeGreaterThan(0)
  })

  it('초기화 버튼이 표시되어야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    expect(screen.getByText('초기화')).toBeInTheDocument()
  })

  it('분석 시작 버튼이 표시되어야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    // 초기에는 validation 실패로 "변수 선택 필요" 표시
    expect(screen.getByText(/변수 선택 필요/)).toBeInTheDocument()
  })

  it('T-test 메서드에 맞는 변수 요구사항을 표시해야 함', () => {
    render(
      <VariableSelectorModern
        methodId="two-sample-t"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    // T-test는 종속변수와 그룹변수 필요
    expect(screen.getByText(/독립 2표본 t검정/)).toBeInTheDocument()
  })

  it('회귀분석 메서드에 맞는 변수 요구사항을 표시해야 함', () => {
    render(
      <VariableSelectorModern
        methodId="regression-linear"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    expect(screen.getByText(/선형 회귀분석/)).toBeInTheDocument()
  })

  it('연속형 변수는 범위를 표시해야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    // 시험점수는 연속형이므로 범위 표시
    expect(screen.getByText(/범위:/)).toBeInTheDocument()
  })

  it('범주형 변수는 고유값 개수를 표시해야 함', () => {
    render(
      <VariableSelectorModern
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={jest.fn()}
      />
    )

    // 그룹, 성별은 범주형이므로 고유값 개수 표시
    const uniqueValueTexts = screen.getAllByText(/고유값:/)
    expect(uniqueValueTexts.length).toBeGreaterThan(0)
  })
})

describe('39개 페이지 마이그레이션 검증', () => {
  const statisticsMethods = [
    'anova-one-way',
    'two-sample-t',
    'regression-linear',
    'correlation-pearson',
    'chi-square-independence',
  ]

  statisticsMethods.forEach(methodId => {
    it(`${methodId} 메서드가 정상적으로 로드되어야 함`, () => {
      expect(() => {
        render(
          <VariableSelectorModern
            methodId={methodId}
            data={mockData}
            onVariablesSelected={jest.fn()}
          />
        )
      }).not.toThrow()
    })
  })
})
