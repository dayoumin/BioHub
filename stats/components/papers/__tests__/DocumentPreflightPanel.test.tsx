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

    expect(screen.getByText('무시됨')).toBeInTheDocument()
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
