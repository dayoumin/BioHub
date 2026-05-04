import { fireEvent, render, screen } from '@testing-library/react'
import DocumentArtifactLists from '../DocumentArtifactLists'

describe('DocumentArtifactLists', () => {
  it('renders tables and figures with preserved source targets and navigation callbacks', () => {
    const onOpenAnalysis = vi.fn()
    const onOpenFigure = vi.fn()

    const { container } = render(
      <DocumentArtifactLists
        tables={[
          {
            id: 'table-1',
            caption: 'Table 1. Summary statistics',
            headers: ['Group', 'Mean'],
            rows: [['A', '1.2']],
            sourceAnalysisId: 'analysis-1',
            sourceAnalysisLabel: 'T-Test',
          },
        ]}
        figures={[
          {
            entityId: 'figure-1',
            label: 'Figure 1',
            caption: 'Length-weight relationship',
            relatedAnalysisId: 'analysis-1',
            relatedAnalysisLabel: 'Regression',
            patternSummary: 'Positive trend',
          },
        ]}
        onOpenAnalysis={onOpenAnalysis}
        onOpenFigure={onOpenFigure}
      />,
    )

    expect(container.querySelector('[data-doc-target="table:table-1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-doc-target="figure:figure-1"]')).toBeInTheDocument()
    expect(screen.getByText('Table 1. Summary statistics')).toBeInTheDocument()
    expect(screen.getByText('Figure 1')).toBeInTheDocument()
    expect(screen.getByText('Length-weight relationship')).toBeInTheDocument()
    expect(screen.getByText('관련 분석: T-Test')).toBeInTheDocument()
    expect(screen.getByText('관련 분석: Regression')).toBeInTheDocument()
    expect(screen.getByText('패턴 요약: Positive trend')).toBeInTheDocument()

    const analysisButtons = screen.getAllByRole('button', { name: '통계 열기' })
    fireEvent.click(analysisButtons[0]!)
    fireEvent.click(analysisButtons[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'Graph Studio' }))

    expect(onOpenAnalysis).toHaveBeenNthCalledWith(1, 'analysis-1')
    expect(onOpenAnalysis).toHaveBeenNthCalledWith(2, 'analysis-1')
    expect(onOpenFigure).toHaveBeenCalledWith('figure-1')
  })

  it('preserves existing html table rendering path', () => {
    const { container } = render(
      <DocumentArtifactLists
        tables={[
          {
            id: 'table-html',
            caption: 'HTML table',
            headers: [],
            rows: [],
            htmlContent: '<table><tbody><tr><td>Rendered HTML</td></tr></tbody></table>',
          },
        ]}
        onOpenAnalysis={vi.fn()}
        onOpenFigure={vi.fn()}
      />,
    )

    expect(screen.getByText('HTML table')).toBeInTheDocument()
    expect(screen.getByText('Rendered HTML')).toBeInTheDocument()
    expect(container.querySelector('[data-doc-target="table:table-html"]')).toBeInTheDocument()
  })

  it('renders nothing when there are no artifacts', () => {
    const { container } = render(
      <DocumentArtifactLists
        onOpenAnalysis={vi.fn()}
        onOpenFigure={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
