import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataExplorationStep } from '../steps/DataExplorationStep'

const {
  mockUseAnalysisStore,
  mockUseModeStore,
  mockUseTemplateStore,
  mockLoadTemplates,
  mockDataUploadStep,
} = vi.hoisted(() => ({
  mockUseAnalysisStore: vi.fn(),
  mockUseModeStore: vi.fn(),
  mockUseTemplateStore: vi.fn(),
  mockLoadTemplates: vi.fn(),
  mockDataUploadStep: vi.fn(),
}))

vi.mock('@/components/analysis/common', () => ({
  StepHeader: ({
    title,
    action,
  }: {
    title: string
    action?: ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      {action ?? null}
    </div>
  ),
}))

vi.mock('@/components/analysis/TemplateManagePanel', () => ({
  TemplateManagePanel: () => null,
}))

vi.mock('@/components/analysis/TemplateSelector', () => ({
  TemplateSelector: () => null,
}))

vi.mock('@/components/common/analysis/DataPreviewTable', () => ({
  DataPreviewTable: () => null,
}))

vi.mock('@/components/common/analysis/OutlierDetailPanel', () => ({
  OutlierDetailPanel: () => null,
}))

vi.mock('@/components/analysis/steps/DataUploadStep', () => ({
  DataUploadStep: (props: { streamlined?: boolean }) => {
    mockDataUploadStep(props)
    return <div data-testid="data-upload-step" data-streamlined={String(Boolean(props.streamlined))} />
  },
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    analysis: {
      stepTitles: {
        dataPreparation: '데이터 준비',
        dataExploration: '데이터 탐색',
      },
      layout: {
        nextStep: '다음 단계',
      },
    },
    dataExploration: {
      empty: {
        title: '탐색 시작',
        description: '데이터를 업로드해 탐색을 시작합니다.',
      },
      features: {
        descriptiveTitle: '기술 통계',
        descriptiveDesc: '기술 통계를 확인합니다.',
        distributionTitle: '분포 확인',
        distributionDesc: '분포를 확인합니다.',
        correlationTitle: '상관 관계',
        correlationDesc: '변수 관계를 확인합니다.',
      },
      tabs: {
        fullDataView: (count: number) => `전체 데이터 ${count}`,
      },
    },
  }),
}))

vi.mock('@/hooks/use-correlation-data', () => ({
  useCorrelationData: () => ({
    correlationMatrix: [],
    heatmapMatrix: [],
    getPairedData: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-descriptive-stats', () => ({
  useDescriptiveStats: () => ({
    numericVariables: [],
    categoricalVariables: [],
    numericDistributions: [],
    totalOutlierCount: 0,
    recommendedType: null,
    formatStat: vi.fn(),
    getOutlierDetails: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-levene-test', () => ({
  useLeveneTest: () => ({
    result: null,
    results: [],
    isLoading: false,
    groupVariable: null,
    groupCandidates: [],
    setGroupVariable: vi.fn(),
  }),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: (selector?: (state: object) => unknown) => mockUseAnalysisStore(selector),
}))

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: (selector?: (state: object) => unknown) => mockUseModeStore(selector),
}))

vi.mock('@/lib/stores/template-store', () => ({
  useTemplateStore: (selector?: (state: object) => unknown) => mockUseTemplateStore(selector),
}))

describe('DataExplorationStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAnalysisStore.mockImplementation((selector?: (state: object) => unknown) => {
      const state = {
        uploadedFile: null,
        uploadedFileName: null,
        selectedMethod: {
          id: 'independent-samples-t',
          name: 'Independent Samples t-Test',
        },
      }
      return selector ? selector(state) : state
    })

    mockUseTemplateStore.mockImplementation((selector?: (state: object) => unknown) => {
      const state = {
        recentTemplates: [],
        loadTemplates: mockLoadTemplates,
      }
      return selector ? selector(state) : state
    })
  })

  it('빠른 분석의 빈 상태에서는 업로드만 강조하고 간소화 모드를 사용한다', () => {
    mockUseModeStore.mockImplementation((selector?: (state: object) => unknown) => {
      const state = { stepTrack: 'quick' }
      return selector ? selector(state) : state
    })

    render(
      <DataExplorationStep
        validationResults={null}
        data={[]}
        onUploadComplete={vi.fn()}
        onNext={vi.fn()}
        canProceedNext={false}
        nextLabel="변수 선택으로"
      />,
    )

    expect(screen.getByText('데이터 준비')).toBeInTheDocument()
    expect(screen.queryByText('변수 선택으로')).not.toBeInTheDocument()
    expect(screen.getByTestId('data-upload-step')).toHaveAttribute('data-streamlined', 'true')
    expect(mockDataUploadStep).toHaveBeenCalledWith(expect.objectContaining({ streamlined: true }))
  })

  it('일반 분석의 빈 상태에서는 기존 탐색 레이아웃을 유지한다', () => {
    mockUseModeStore.mockImplementation((selector?: (state: object) => unknown) => {
      const state = { stepTrack: 'normal' }
      return selector ? selector(state) : state
    })

    render(
      <DataExplorationStep
        validationResults={null}
        data={[]}
        onUploadComplete={vi.fn()}
        onNext={vi.fn()}
        canProceedNext={false}
        nextLabel="다음 단계"
      />,
    )

    expect(screen.getByText('데이터 탐색')).toBeInTheDocument()
    expect(screen.getByText('다음 단계')).toBeInTheDocument()
    expect(screen.getByTestId('data-upload-step')).toHaveAttribute('data-streamlined', 'false')
    expect(mockDataUploadStep).not.toHaveBeenCalledWith(expect.objectContaining({ streamlined: true }))
  })
})
