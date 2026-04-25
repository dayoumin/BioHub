import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DocumentPreflightPanel from '../DocumentPreflightPanel'
import {
  deriveDocumentQualitySummary,
  type DocumentQualityReport,
  type DocumentReviewFinding,
} from '@/lib/research/document-quality-types'

function makeFinding(overrides: Partial<DocumentReviewFinding> = {}): DocumentReviewFinding {
  return {
    id: 'finding-1',
    reportId: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    ruleId: 'table.caption.missing',
    category: 'format',
    severity: 'warning',
    status: 'open',
    title: '표 caption 누락',
    message: '표 caption이 비어 있습니다.',
    sectionId: 'results',
    createdAt: '2026-04-25T02:00:00.000Z',
    updatedAt: '2026-04-25T02:00:00.000Z',
    ...overrides,
  }
}

function makeReport(findings: DocumentReviewFinding[] = []): DocumentQualityReport {
  return {
    id: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    status: 'completed',
    snapshot: {
      documentId: 'doc-1',
      projectId: 'project-1',
      baseDocumentUpdatedAt: '2026-04-25T01:00:00.000Z',
      documentContentHash: 'doc-hash',
      sectionHashes: { results: 'section-hash' },
      sourceSnapshotHashes: {},
      ruleEngineVersion: 'rules-1',
    },
    findings,
    summary: deriveDocumentQualitySummary(findings),
    generatedAt: '2026-04-25T02:00:00.000Z',
    updatedAt: '2026-04-25T02:00:00.000Z',
  }
}

describe('DocumentPreflightPanel', () => {
  it('renders the missing state with an enabled run button', async () => {
    const user = userEvent.setup()
    const onRun = vi.fn()

    render(
      <DocumentPreflightPanel
        report={null}
        freshness="missing"
        pending={false}
        onRun={onRun}
      />,
    )

    expect(screen.getByText('검사 전')).toBeInTheDocument()
    expect(screen.getByText('점검 기록 없음')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '점검 실행' }))
    expect(onRun).toHaveBeenCalledTimes(1)
  })

  it('renders a fresh passing report', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport()}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByText('통과')).toBeInTheDocument()
    expect(screen.getByText('점검 통과')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(3)
  })

  it('renders open findings and stale status without hiding previous results', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding(),
          makeFinding({
            id: 'finding-2',
            ruleId: 'support.source.missing',
            severity: 'error',
            title: '문헌 근거 source 누락',
            message: '포함된 문헌 근거에 source ID가 없습니다.',
          }),
        ])}
        freshness="stale"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByText('오래됨')).toBeInTheDocument()
    expect(screen.getByText('표 caption 누락')).toBeInTheDocument()
    expect(screen.getByText('문헌 근거 source 누락')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 점검' })).toBeEnabled()
  })

  it('selects a section when a section-level finding is clicked', async () => {
    const user = userEvent.setup()
    const onSelectSection = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            title: 'Missing table caption',
            sectionId: 'results',
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onSelectSection={onSelectSection}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Missing table caption 섹션으로 이동' }))

    expect(onSelectSection).toHaveBeenCalledWith('results')
  })

  it('shows document-level findings without selecting a section', async () => {
    const user = userEvent.setup()
    const onSelectSection = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            title: 'No source evidence',
            sectionId: undefined,
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onSelectSection={onSelectSection}
      />,
    )

    expect(screen.getByText('문서 전체')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'No source evidence' }))

    expect(onSelectSection).not.toHaveBeenCalled()
  })

  it('updates finding status without triggering section navigation', async () => {
    const user = userEvent.setup()
    const onSelectSection = vi.fn()
    const onUpdateFindingStatus = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            title: 'Missing table caption',
            sectionId: 'results',
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onSelectSection={onSelectSection}
        onUpdateFindingStatus={onUpdateFindingStatus}
      />,
    )

    await user.click(screen.getByRole('button', { name: '무시' }))

    expect(onUpdateFindingStatus).toHaveBeenCalledWith('finding-1', 'ignored')
    expect(onSelectSection).not.toHaveBeenCalled()
  })

  it('keeps ignored findings visible and allows reopening when fresh', async () => {
    const user = userEvent.setup()
    const onUpdateFindingStatus = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            status: 'ignored',
            ignoredReason: '사용자 예외',
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onUpdateFindingStatus={onUpdateFindingStatus}
      />,
    )

    expect(screen.getAllByText('무시됨').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('사용자 예외')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 열기' }))

    expect(onUpdateFindingStatus).toHaveBeenCalledWith('finding-1', 'open')
  })

  it('disables finding status actions when the report is stale', async () => {
    const user = userEvent.setup()
    const onUpdateFindingStatus = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([makeFinding()])}
        freshness="stale"
        pending={false}
        onRun={vi.fn()}
        onUpdateFindingStatus={onUpdateFindingStatus}
      />,
    )

    const ignoreButton = screen.getByRole('button', { name: '무시' })
    expect(ignoreButton).toBeDisabled()

    await user.click(ignoreButton)
    expect(onUpdateFindingStatus).not.toHaveBeenCalled()
  })

  it('renders compact finding evidence details without selecting the section', async () => {
    const user = userEvent.setup()
    const onSelectSection = vi.fn()
    const onOpenEvidenceSource = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            title: 'Table source check',
            evidence: [
              {
                label: 'table-1',
                sourceKind: 'analysis',
                sourceId: 'analysis-1',
                observedValue: 'missing',
                expectedValue: 'source id',
              },
            ],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onSelectSection={onSelectSection}
        onOpenEvidenceSource={onOpenEvidenceSource}
      />,
    )

    expect(screen.getByText('근거')).toBeInTheDocument()
    expect(screen.getByText('table-1')).toBeInTheDocument()
    expect(screen.getByText('analysis:analysis-1')).toBeInTheDocument()
    expect(screen.getByText('비교')).toBeInTheDocument()
    expect(screen.getByText('불일치')).toBeInTheDocument()
    expect(screen.getByText('관찰')).toBeInTheDocument()
    expect(screen.getByText('missing')).toBeInTheDocument()
    expect(screen.getByText('기대')).toBeInTheDocument()
    expect(screen.getByText('source id')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Table source check 섹션으로 이동' }))
    expect(onSelectSection).toHaveBeenCalledWith('results')

    await user.click(screen.getByRole('button', { name: '원본' }))
    expect(onOpenEvidenceSource).toHaveBeenCalledWith('analysis', 'analysis-1')
  })

  it('marks evidence comparison as matched or incomplete', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            evidence: [
              {
                label: 'matched evidence',
                observedValue: ' p = 0.040 ',
                expectedValue: 'p = 0.040',
              },
              {
                label: 'incomplete evidence',
                observedValue: 'empty caption',
              },
            ],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByText('matched evidence')).toBeInTheDocument()
    expect(screen.getByText('일치')).toBeInTheDocument()
    expect(screen.getByText('incomplete evidence')).toBeInTheDocument()
    expect(screen.getByText('확인 필요')).toBeInTheDocument()
  })

  it('renders read-only suggestion preview for open findings', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            suggestion: {
              replacementText: '표 1에 원본 분석 ID를 연결하세요.',
              canAutoApply: false,
              requiresUserConfirmation: true,
            },
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByText('제안')).toBeInTheDocument()
    expect(screen.getByText('검토 필요')).toBeInTheDocument()
    expect(screen.getByText('표 1에 원본 분석 ID를 연결하세요.')).toBeInTheDocument()
    expect(screen.getByText('사용자 확인 필요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /적용/ })).not.toBeInTheDocument()
  })

  it('hides suggestion preview for ignored findings and absent suggestions', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            id: 'ignored-with-suggestion',
            status: 'ignored',
            suggestion: {
              replacementText: 'ignored suggestion',
              canAutoApply: true,
              requiresUserConfirmation: false,
            },
          }),
          makeFinding({
            id: 'open-without-suggestion',
            title: 'Open without suggestion',
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.queryByText('ignored suggestion')).not.toBeInTheDocument()
    expect(screen.queryByText('제안')).not.toBeInTheDocument()
    expect(screen.getByText('Open without suggestion')).toBeInTheDocument()
  })

  it('shows evidence source navigation only when source fields and callback are available', () => {
    const { rerender } = render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            evidence: [{ label: 'analysis evidence', sourceKind: 'analysis', sourceId: 'analysis-1' }],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: '원본' })).not.toBeInTheDocument()

    rerender(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            evidence: [{ label: 'analysis evidence', sourceKind: 'analysis', sourceId: 'analysis-1' }],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        canOpenEvidenceSource={() => false}
        onOpenEvidenceSource={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: '원본' })).not.toBeInTheDocument()

    rerender(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            evidence: [
              { label: 'missing source kind', sourceId: 'analysis-1' },
              { label: 'missing source id', sourceKind: 'analysis' },
            ],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onOpenEvidenceSource={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: '원본' })).not.toBeInTheDocument()
  })

  it('does not select the section when opening an evidence source', async () => {
    const user = userEvent.setup()
    const onSelectSection = vi.fn()
    const onOpenEvidenceSource = vi.fn()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            title: 'Source finding',
            evidence: [{ label: 'analysis evidence', sourceKind: 'analysis', sourceId: 'analysis-1' }],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
        onSelectSection={onSelectSection}
        onOpenEvidenceSource={onOpenEvidenceSource}
      />,
    )

    await user.click(screen.getByRole('button', { name: '원본' }))

    expect(onOpenEvidenceSource).toHaveBeenCalledWith('analysis', 'analysis-1')
    expect(onSelectSection).not.toHaveBeenCalled()
  })

  it('renders label-only evidence without empty separators and caps visible rows', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            evidence: [
              { label: 'first evidence' },
              { label: 'second evidence' },
              { label: 'third evidence' },
            ],
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByText('first evidence')).toBeInTheDocument()
    expect(screen.getByText('second evidence')).toBeInTheDocument()
    expect(screen.queryByText('third evidence')).not.toBeInTheDocument()
    expect(screen.getByText('외 1개')).toBeInTheDocument()
    expect(screen.queryByText(':')).not.toBeInTheDocument()
  })

  it('keeps evidence visible for stale ignored findings while disabling status actions', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            status: 'ignored',
            evidence: [{ label: 'stale evidence' }],
          }),
        ])}
        freshness="stale"
        pending={false}
        onRun={vi.fn()}
        onUpdateFindingStatus={vi.fn()}
      />,
    )

    expect(screen.getByText('stale evidence')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 열기' })).toBeDisabled()
  })

  it('does not show an evidence block for findings without evidence', () => {
    render(
      <DocumentPreflightPanel
        report={makeReport([makeFinding()])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.queryByText('근거')).not.toBeInTheDocument()
  })

  it('filters findings by status without changing report summary counts', async () => {
    const user = userEvent.setup()

    render(
      <DocumentPreflightPanel
        report={makeReport([
          makeFinding({
            id: 'open-finding',
            title: 'Open finding',
            status: 'open',
          }),
          makeFinding({
            id: 'ignored-finding',
            title: 'Ignored finding',
            status: 'ignored',
          }),
        ])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByText('Open finding')).toBeInTheDocument()
    expect(screen.getByText('Ignored finding')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '열림' }))

    expect(screen.getByText('Open finding')).toBeInTheDocument()
    expect(screen.queryByText('Ignored finding')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '무시됨' }))

    expect(screen.queryByText('Open finding')).not.toBeInTheDocument()
    expect(screen.getByText('Ignored finding')).toBeInTheDocument()
  })

  it('shows an empty filtered state when no finding matches the selected status', async () => {
    const user = userEvent.setup()

    render(
      <DocumentPreflightPanel
        report={makeReport([makeFinding({ status: 'open' })])}
        freshness="fresh"
        pending={false}
        onRun={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '해결됨' }))

    expect(screen.getByText('해당 상태의 항목 없음')).toBeInTheDocument()
    expect(screen.queryByText('표 caption 누락')).not.toBeInTheDocument()
  })

  it('disables the run button while pending or externally disabled', () => {
    const { rerender } = render(
      <DocumentPreflightPanel
        report={null}
        freshness="missing"
        pending
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '점검 중...' })).toBeDisabled()

    rerender(
      <DocumentPreflightPanel
        report={null}
        freshness="missing"
        pending={false}
        disabled
        onRun={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '점검 실행' })).toBeDisabled()
  })
})
