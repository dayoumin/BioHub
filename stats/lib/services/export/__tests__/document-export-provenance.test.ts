import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'
import { Packer } from 'docx'
import { describe, expect, it } from 'vitest'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '@/lib/research/document-blueprint-types'
import { buildDocxDocument } from '@/lib/services/export/document-docx-export'
import { buildHwpxDocument } from '@/lib/services/export/document-hwpx-export'

function makeDocument(): DocumentBlueprint {
  const now = '2026-04-21T00:00:00.000Z'
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: 'Export provenance',
    authors: ['Kim'],
    language: 'ko',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: 'results',
        title: '결과',
        content: '본문',
        sourceRefs: [
          createDocumentSourceRef('analysis', 'analysis-1'),
          createDocumentSourceRef('figure', 'figure-1'),
        ],
        editable: true,
        generatedBy: 'user',
        tables: [
          {
            id: 'table-1',
            caption: 'Table 1',
            headers: ['A'],
            rows: [['1']],
            sourceAnalysisId: 'analysis-1',
            sourceAnalysisLabel: 'T-Test',
          },
        ],
        figures: [
          {
            entityId: 'figure-1',
            label: 'Figure 1',
            caption: 'Graph Caption',
            relatedAnalysisId: 'analysis-1',
            relatedAnalysisLabel: 'T-Test',
            patternSummary: 'B가 A보다 높음',
          },
        ],
      },
    ],
  }
}

describe('document export provenance', () => {
  it('writes table and figure provenance into DOCX output', async () => {
    const doc = await buildDocxDocument(makeDocument())
    const buffer = await Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buffer)
    const xml = await zip.file('word/document.xml')?.async('string')

    expect(xml).toContain('관련 분석: T-Test')
    expect(xml).toContain('패턴 요약: B가 A보다 높음')
  })

  it('writes table and figure provenance into HWPX output', async () => {
    const templatePath = resolve(process.cwd(), 'public', 'templates', 'blank.hwpx')
    const template = new Uint8Array(readFileSync(templatePath))
    const data = await buildHwpxDocument(makeDocument(), undefined, template)
    const zip = await JSZip.loadAsync(data)
    const xml = await zip.file('Contents/section0.xml')?.async('string')

    expect(xml).toContain('관련 분석: T-Test')
    expect(xml).toContain('패턴 요약: B가 A보다 높음')
  })
})
