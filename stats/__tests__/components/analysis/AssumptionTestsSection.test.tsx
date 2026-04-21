/**
 * AssumptionTestsSection 시뮬레이션 테스트
 *
 * testError 시나리오 중심 — 수정된 버그 검증
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AssumptionTestsSection } from '@/components/analysis/steps/exploration/AssumptionTestsSection'
import type { StatisticalAssumptions } from '@/types/analysis'

let mockLanguage: 'ko' | 'en' = 'ko'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    language: mockLanguage,
    dataExploration: {
      assumptions: {
        title: mockLanguage === 'en' ? 'Assumption Checks' : '가정 검정',
        description: mockLanguage === 'en' ? 'Results of assumption checks.' : '통계적 가정 검정 결과입니다.',
        loading: mockLanguage === 'en' ? 'Checking assumptions...' : '가정 검정 중...',
        loadingDescription: mockLanguage === 'en' ? 'Loading' : '로딩 중',
        badge: mockLanguage === 'en' ? 'Reference' : '참고용',
      },
      normality: {
        title: mockLanguage === 'en' ? 'Normality Test' : '정규성 검정',
        normal: mockLanguage === 'en' ? 'Normal' : '정규 분포',
        nonNormal: mockLanguage === 'en' ? 'Non-normal' : '비정규 분포',
        statLabel: 'W 통계량',
        normalInterpretation: mockLanguage === 'en' ? 'Normality assumption satisfied' : '정규성 가정 충족',
        nonNormalInterpretation: mockLanguage === 'en' ? 'Normality assumption violated' : '정규성 가정 위반',
      },
      homogeneity: {
        title: mockLanguage === 'en' ? 'Homogeneity Test' : '등분산성 검정',
        equal: mockLanguage === 'en' ? 'Equal variance' : '등분산',
        unequal: mockLanguage === 'en' ? 'Unequal variance' : '이분산',
        statLabel: 'F 통계량',
        equalInterpretation: mockLanguage === 'en' ? 'Homogeneity assumption satisfied' : '등분산성 가정 충족',
        unequalInterpretation: mockLanguage === 'en' ? 'Homogeneity assumption violated' : '등분산성 가정 위반',
      },
    },
  }),
}))

describe('AssumptionTestsSection — testError 시뮬레이션', () => {
  beforeEach(() => {
    mockLanguage = 'ko'
  })

  it('[시뮬레이션] testError + 단일 실패: 실패 메시지 표시', () => {
    const singleError: StatisticalAssumptions = {
      normality: { shapiroWilk: { statistic: 0.97, pValue: 0.12, isNormal: true } },
      homogeneity: {},
      summary: {
        canUseParametric: true,
        reasons: ['등분산성 검정 실패 — 결과 신뢰 불가'],
        recommendations: ['검정 실패 — 가정 판정 불가, 전문가 확인 권장'],
        testError: true,
        meetsAssumptions: undefined
      }
    }
    render(
      <AssumptionTestsSection
        assumptionResults={singleError}
        isLoading={false}
        visibility="primary"
      />
    )
    // 실패 메시지 표시
    expect(screen.getByText(/등분산성 검정 실패/)).toBeInTheDocument()
    // 성공한 정규성 결과도 함께 표시
    expect(screen.getByText('정규성 검정')).toBeInTheDocument()
  })

  it('[시뮬레이션] testError + 복수 실패: 두 이유 모두 표시 (첫 번째만 아님)', () => {
    const bothError: StatisticalAssumptions = {
      normality: {},
      homogeneity: {},
      summary: {
        canUseParametric: true,
        reasons: [
          '정규성 검정 실패 — 결과 신뢰 불가',
          '등분산성 검정 실패 — 결과 신뢰 불가'
        ],
        recommendations: ['검정 실패 — 가정 판정 불가, 전문가 확인 권장'],
        testError: true,
        meetsAssumptions: undefined
      }
    }
    render(
      <AssumptionTestsSection
        assumptionResults={bothError}
        isLoading={false}
        visibility="primary"
      />
    )
    // 두 이유가 " / "로 합쳐져야 함 (이전 버그: 첫 번째만 표시)
    expect(screen.getByText(/정규성 검정 실패/)).toBeInTheDocument()
    expect(screen.getByText(/등분산성 검정 실패/)).toBeInTheDocument()
  })

  it('[시뮬레이션] testError 없음: 실패 메시지 미표시', () => {
    const normal: StatisticalAssumptions = {
      normality: { shapiroWilk: { statistic: 0.98, pValue: 0.15, isNormal: true } },
      summary: {
        canUseParametric: true,
        reasons: [],
        recommendations: ['모수 검정 사용 가능'],
        meetsAssumptions: true
      }
    }
    render(
      <AssumptionTestsSection
        assumptionResults={normal}
        isLoading={false}
        visibility="primary"
      />
    )
    expect(screen.queryByText(/검정 실패/)).not.toBeInTheDocument()
    expect(screen.queryByText('일부 가정 검정 실패 — 전문가 확인 권장')).not.toBeInTheDocument()
  })

  it('[시뮬레이션] reasons에 "실패" 없을 때 fallback 메시지 표시', () => {
    const errorNoReason: StatisticalAssumptions = {
      normality: {},
      summary: {
        canUseParametric: true,
        reasons: [],  // 실패 이유 없음
        recommendations: [],
        testError: true,
        meetsAssumptions: undefined
      }
    }
    render(
      <AssumptionTestsSection
        assumptionResults={errorNoReason}
        isLoading={false}
        visibility="primary"
      />
    )
    expect(screen.getByText('일부 가정 검정 실패 — 전문가 확인 권장')).toBeInTheDocument()
  })

  it('[시뮬레이션] testedVariable prop: 변수명이 설명에 포함됨', () => {
    const withVar: StatisticalAssumptions = {
      normality: { shapiroWilk: { statistic: 0.96, pValue: 0.08, isNormal: true } },
      summary: {
        canUseParametric: true,
        reasons: [],
        recommendations: ['모수 검정 사용 가능'],
        meetsAssumptions: true
      }
    }
    render(
      <AssumptionTestsSection
        assumptionResults={withVar}
        isLoading={false}
        visibility="primary"
        testedVariable="score"
      />
    )
    expect(screen.getByText(/변수: score/)).toBeInTheDocument()
  })

  it('[simulation] English UI shows localized fallback and variable label', () => {
    mockLanguage = 'en'

    const errorNoReason: StatisticalAssumptions = {
      normality: {},
      summary: {
        canUseParametric: true,
        reasons: [],
        recommendations: [],
        testError: true,
        meetsAssumptions: undefined,
      },
    }

    render(
      <AssumptionTestsSection
        assumptionResults={errorNoReason}
        isLoading={false}
        visibility="primary"
        testedVariable="score"
      />
    )

    expect(screen.getByText('Some assumption checks failed. Expert review is recommended.')).toBeInTheDocument()
    expect(screen.getByText(/Variable: score/)).toBeInTheDocument()
  })

  it('[simulation] English UI localizes Korean failure reasons from the pipeline', () => {
    mockLanguage = 'en'

    const errorWithKoreanReason: StatisticalAssumptions = {
      normality: {},
      summary: {
        canUseParametric: true,
        reasons: ['정규성 검정 실패 — 결과 신뢰 불가'],
        recommendations: [],
        testError: true,
        meetsAssumptions: undefined,
      },
    }

    render(
      <AssumptionTestsSection
        assumptionResults={errorWithKoreanReason}
        isLoading={false}
        visibility="primary"
      />
    )

    expect(screen.getByText('The normality check failed. Expert review is recommended.')).toBeInTheDocument()
    expect(screen.queryByText(/정규성 검정 실패/)).not.toBeInTheDocument()
  })

  it('[시뮬레이션] visibility="hidden"이면 렌더링 안 됨', () => {
    const { container } = render(
      <AssumptionTestsSection
        assumptionResults={null}
        isLoading={false}
        visibility="hidden"
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
