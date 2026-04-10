import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildReport, downloadReportAsHtml, reportToMarkdown } from '../report-export'
import type { ResolvedEntity } from '../entity-resolver'
import type { ProjectEntityRef } from '@biohub/types'
import { downloadTextFile } from '@/lib/utils/download-file'
import { saveGeneticsHistoryEntry } from '@/lib/genetics'

vi.mock('@/lib/utils/download-file', () => ({
  downloadTextFile: vi.fn(),
}))

function makeProteinEntity(entityId = 'protein_1'): ResolvedEntity {
  const ref: ProjectEntityRef = {
    id: 'pref_1',
    projectId: 'proj_1',
    entityKind: 'protein-result',
    entityId,
    label: 'HBB protein summary',
    createdAt: '2026-01-01T00:00:00Z',
  }

  return {
    ref,
    loaded: true,
    summary: {
      title: 'HBB protein summary',
      subtitle: '147 aa · 15.87 kDa · pI 6.75',
      date: '1일 전',
      timestamp: 1710000000000,
      navigateTo: '/genetics/protein?history=protein_1',
      kindIcon: '🧫',
      kindLabel: '단백질 해석',
    },
    rawData: {
      kind: 'protein-result',
      analysisName: 'HBB protein summary',
      sequenceLength: 147,
      molecularWeight: 15867.2,
      isoelectricPoint: 6.75,
      isStable: true,
      accession: 'P68871',
    },
  }
}

describe('report-export protein-result', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(downloadTextFile).mockClear()
  })

  it('protein-result를 해석 가능한 markdown 섹션으로 렌더한다', () => {
    const report = buildReport('Project report', 'proj_1', [makeProteinEntity()])
    const markdown = reportToMarkdown(report)

    expect(markdown).toContain('## HBB protein summary')
    expect(markdown).toContain('Sequence length: 147 aa')
    expect(markdown).toContain('Molecular weight: 15.87 kDa')
    expect(markdown).toContain('Stability: stable')
    expect(markdown).toContain('Input accession: P68871')
  })

  it('stored protein snapshot markdown이 있으면 그 내용을 우선 사용한다', () => {
    const reportMarkdown = [
      '# HBB protein summary',
      '',
      '## UniProt Summary',
      '',
      '- Entry: P68871 (HBB_HUMAN)',
      '- Protein: Hemoglobin subunit beta',
      '',
      '## STRING Partners',
      '',
      '| Partner | Combined score |',
      '| --- | ---: |',
      '| HBA1 | 0.999 |',
    ].join('\n')

    const savedEntry = saveGeneticsHistoryEntry({
      type: 'protein',
      analysisName: 'HBB protein summary',
      sequenceLength: 147,
      molecularWeight: 15867.2,
      isoelectricPoint: 6.75,
      isStable: true,
      accession: 'P68871',
      reportMarkdown,
      resultData: {
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        gravy: -0.423,
        aromaticity: 0.081,
        instabilityIndex: 32.1,
        isStable: true,
        extinctionCoeffReduced: 12560,
        extinctionCoeffOxidized: 12685,
        aminoAcidComposition: { A: 10 },
        aminoAcidPercent: { A: 0.1 },
        secondaryStructureFraction: { helix: 0.3, turn: 0.1, sheet: 0.2 },
        hydropathyProfile: [{ position: 1, score: -0.4 }],
        sequenceLength: 147,
        sequence: 'MVHLTPEEKSAVTALW',
      },
    })
    if (!savedEntry) {
      throw new Error('protein history entry expected')
    }

    const entity = makeProteinEntity(savedEntry.id)

    const report = buildReport('Project report', 'proj_1', [entity])
    const markdown = reportToMarkdown(report)

    expect(markdown).toContain('## HBB protein summary')
    expect(markdown).toContain('### UniProt Summary')
    expect(markdown).toContain('| HBA1 | 0.999 |')
    expect(markdown).not.toContain('\n# HBB protein summary\n')
    expect(markdown).not.toContain('Sequence length: 147 aa')
  })

  it('stored protein snapshot tables are preserved in HTML export', () => {
    const reportMarkdown = [
      '# HBB protein summary',
      '',
      '## STRING Partners',
      '',
      '### Functions',
      '',
      '- Oxygen transport',
      '',
      '| Partner | Combined score |',
      '| --- | ---: |',
      '| HBA1 | 0.999 |',
    ].join('\n')

    const savedEntry = saveGeneticsHistoryEntry({
      type: 'protein',
      analysisName: 'HBB protein summary',
      sequenceLength: 147,
      molecularWeight: 15867.2,
      isoelectricPoint: 6.75,
      isStable: true,
      accession: 'P68871',
      reportMarkdown,
      resultData: {
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        gravy: -0.423,
        aromaticity: 0.081,
        instabilityIndex: 32.1,
        isStable: true,
        extinctionCoeffReduced: 12560,
        extinctionCoeffOxidized: 12685,
        aminoAcidComposition: { A: 10 },
        aminoAcidPercent: { A: 0.1 },
        secondaryStructureFraction: { helix: 0.3, turn: 0.1, sheet: 0.2 },
        hydropathyProfile: [{ position: 1, score: -0.4 }],
        sequenceLength: 147,
        sequence: 'MVHLTPEEKSAVTALW',
      },
    })
    if (!savedEntry) {
      throw new Error('protein history entry expected')
    }

    const entity = makeProteinEntity(savedEntry.id)

    const report = buildReport('Project report', 'proj_1', [entity])
    downloadReportAsHtml(report)

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [html] = vi.mocked(downloadTextFile).mock.calls[0]
    expect(typeof html).toBe('string')
    expect(html).toContain('<table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<h4>Functions</h4>')
    expect(html).toContain('<th>Partner</th>')
    expect(html).toContain('<td>HBA1</td>')
    expect(html).toContain('<td>0.999</td>')
  })
})
