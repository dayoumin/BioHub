import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaperDraftPanel } from '../PaperDraftPanel'
import type { DiscussionState, PaperDraft } from '@/lib/services/paper-draft/paper-types'
import type { MethodsDraftReadiness } from '@/lib/services/paper-draft/methods-readiness'
import type { ResultsDraftReadiness } from '@/lib/services/paper-draft/results-readiness'
import type { CaptionsDraftReadiness } from '@/lib/services/paper-draft/captions-readiness'

const blockedMethodsReadiness: MethodsDraftReadiness = {
  status: 'blocked',
  title: 'Methods 작성 준비도',
  summary: '필수 Methods source가 부족합니다.',
  canGenerateDraft: false,
  shouldReviewBeforeInsert: true,
  blockingCount: 1,
  warningCount: 0,
  promptCount: 1,
  blockingGateRules: ['missing-data-description'],
  reviewGateRules: [],
  checklist: [
    {
      id: 'sample-description',
      section: 'methods',
      label: '표본 설명',
      status: 'blocked',
      message: '표본 설명이 없어 Methods 초안을 작성하지 않습니다.',
      gateRule: 'missing-data-description',
      action: '표본 수와 모집단 설명을 입력하세요.',
    },
  ],
  prompts: [
    {
      id: 'sample-description',
      field: 'dataDescription',
      priority: 'required',
      label: '표본 설명',
      helperText: 'Methods에 들어갈 표본 정보를 확인합니다.',
      placeholder: '예: 성체 개체 120개',
    },
  ],
  scope: {} as MethodsDraftReadiness['scope'],
}

const reviewResultsReadiness: ResultsDraftReadiness = {
  status: 'needs-review',
  title: 'Results 작성 준비도',
  summary: '효과크기 등 일부 해석 source를 검토해야 합니다.',
  canGenerateDraft: true,
  shouldReviewBeforeInsert: true,
  blockingCount: 0,
  warningCount: 1,
  blockingGateRules: [],
  reviewGateRules: ['missing-effect-size'],
  checklist: [
    {
      id: 'effect-size',
      section: 'results',
      label: '효과크기',
      status: 'warning',
      message: '효과크기가 없어 보수적으로 결과 문장을 검토해야 합니다.',
      gateRule: 'missing-effect-size',
    },
  ],
  scope: {} as ResultsDraftReadiness['scope'],
}

const blockedCaptionsReadiness: CaptionsDraftReadiness = {
  status: 'blocked',
  title: 'Captions 작성 준비도',
  summary: 'caption source provenance가 부족합니다.',
  canGenerateDraft: false,
  shouldReviewBeforeInsert: true,
  blockingCount: 1,
  warningCount: 0,
  blockingGateRules: ['missing-source-provenance'],
  reviewGateRules: [],
  checklist: [
    {
      id: 'source-provenance',
      section: 'captions',
      label: 'source provenance',
      status: 'blocked',
      message: 'source provenance가 없어 caption을 생성하지 않습니다.',
      gateRule: 'missing-source-provenance',
    },
  ],
  scope: {} as CaptionsDraftReadiness['scope'],
}

const draftWithoutGeneratedSections: PaperDraft = {
  methods: null,
  results: null,
  captions: null,
  discussion: null,
  language: 'ko',
  postHocDisplay: 'significant-only',
  generatedAt: '2026-04-29T00:00:00.000Z',
  model: null,
  context: {
    variableLabels: {},
    variableUnits: {},
    groupLabels: {},
  },
  methodsReadiness: blockedMethodsReadiness,
  resultsReadiness: reviewResultsReadiness,
  captionsReadiness: blockedCaptionsReadiness,
}

const idleDiscussion: DiscussionState = { status: 'idle' }

describe('PaperDraftPanel readiness UI', () => {
  it('null draft sections expose readiness state instead of silent missing copy actions', () => {
    render(
      <PaperDraftPanel
        draft={draftWithoutGeneratedSections}
        discussionState={idleDiscussion}
        onGenerateDiscussion={vi.fn()}
        onCancelDiscussion={vi.fn()}
        onLanguageChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('methods-readiness-card')).toBeInTheDocument()
    expect(screen.getByTestId('results-readiness-card')).toBeInTheDocument()
    expect(screen.getByTestId('captions-readiness-card')).toBeInTheDocument()

    expect(screen.getByTestId('draft-anchor-status-methods')).toHaveTextContent('필수')
    expect(screen.getByTestId('draft-anchor-status-results')).toHaveTextContent('검토')
    expect(screen.getByTestId('draft-anchor-status-captions')).toHaveTextContent('필수')

    expect(screen.getAllByText('작성 불가').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('검토 필요').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Results 초안은 검토가 필요한 source/)).toBeInTheDocument()
    expect(screen.queryByTestId('draft-copy-btn-methods')).not.toBeInTheDocument()
    expect(screen.queryByTestId('draft-copy-btn-results')).not.toBeInTheDocument()
    expect(screen.queryByTestId('draft-copy-btn-captions')).not.toBeInTheDocument()
  })

  it('generated sections that need review keep the review affordance in anchors', () => {
    render(
      <PaperDraftPanel
        draft={{
          ...draftWithoutGeneratedSections,
          results: '검정 결과는 통계적으로 유의했다.',
        }}
        discussionState={idleDiscussion}
        onGenerateDiscussion={vi.fn()}
        onCancelDiscussion={vi.fn()}
        onLanguageChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('draft-anchor-status-results')).toHaveTextContent('검토')
    expect(screen.getByTestId('draft-copy-btn-results')).toBeInTheDocument()
  })
})
