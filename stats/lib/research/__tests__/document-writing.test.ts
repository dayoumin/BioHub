import { describe, expect, it } from 'vitest'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '../document-blueprint-types'
import {
  mergeDocumentSectionPatch,
  shouldSkipDocumentSectionBodyPatch,
  updateDocumentSectionWritingState,
  updateDocumentWritingState,
} from '../document-writing'

function makeDocument(): DocumentBlueprint {
  const now = '2026-04-24T00:00:00.000Z'
  return {
    id: 'doc_1',
    projectId: 'proj_1',
    preset: 'paper',
    title: '자료 작성 문서',
    language: 'ko',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    writingState: {
      status: 'idle',
      sectionStates: {},
    },
    sections: [
      {
        id: 'methods',
        title: '방법',
        content: '',
        sourceRefs: [createDocumentSourceRef('analysis', 'hist_1')],
        editable: true,
        generatedBy: 'template',
      },
      {
        id: 'discussion',
        title: '고찰',
        content: '사용자가 정리한 내용',
        sourceRefs: [],
        editable: true,
        generatedBy: 'user',
      },
    ],
  }
}

describe('document-writing helpers', () => {
  it('updates document-level writing state without touching sections', () => {
    const updated = updateDocumentWritingState(makeDocument(), 'drafting', {
      jobId: 'job_1',
      startedAt: '2026-04-24T01:00:00.000Z',
      updatedAt: '2026-04-24T01:00:05.000Z',
    })

    expect(updated.writingState?.status).toBe('drafting')
    expect(updated.writingState?.jobId).toBe('job_1')
    expect(updated.writingState?.startedAt).toBe('2026-04-24T01:00:00.000Z')
    expect(updated.writingState?.updatedAt).toBe('2026-04-24T01:00:05.000Z')
    expect(updated.writingState?.sectionStates).toEqual({})
  })

  it('updates section-level writing state and inherits document job id', () => {
    const drafting = updateDocumentWritingState(makeDocument(), 'patching', {
      jobId: 'job_2',
      updatedAt: '2026-04-24T02:00:00.000Z',
    })

    const updated = updateDocumentSectionWritingState(drafting, 'methods', 'patched', {
      updatedAt: '2026-04-24T02:00:10.000Z',
      message: 'Methods patched',
    })

    expect(updated.writingState?.sectionStates.methods).toEqual({
      status: 'patched',
      jobId: 'job_2',
      updatedAt: '2026-04-24T02:00:10.000Z',
      message: 'Methods patched',
    })
  })

  it('skips body patch for user-generated sections only', () => {
    const document = makeDocument()

    expect(shouldSkipDocumentSectionBodyPatch(document.sections[0]!)).toBe(false)
    expect(shouldSkipDocumentSectionBodyPatch(document.sections[1]!)).toBe(true)
  })

  it('preserves user-owned body while merging source refs, tables, and figures', () => {
    const discussion = makeDocument().sections[1]!

    const merged = mergeDocumentSectionPatch(discussion, {
      content: '자동 생성된 고찰',
      plateValue: [{ type: 'p', children: [{ text: 'generated' }] }],
      sourceRefs: [
        createDocumentSourceRef('analysis', 'hist_2', { label: '추가 분석' }),
      ],
      tables: [
        {
          caption: '표 1',
          headers: ['A'],
          rows: [['1']],
          sourceAnalysisId: 'hist_2',
        },
      ],
      figures: [
        {
          entityId: 'figure_1',
          label: 'Figure 1',
          caption: '결과 도식',
        },
      ],
      generatedBy: 'llm',
    })

    expect(merged.content).toBe('사용자가 정리한 내용')
    expect(merged.plateValue).toBeUndefined()
    expect(merged.generatedBy).toBe('user')
    expect(merged.sourceRefs).toEqual([
      createDocumentSourceRef('analysis', 'hist_2', { label: '추가 분석' }),
    ])
    expect(merged.tables).toEqual([
      {
        id: expect.any(String),
        caption: '표 1',
        headers: ['A'],
        rows: [['1']],
        sourceAnalysisId: 'hist_2',
      },
    ])
    expect(merged.figures).toEqual([
      {
        entityId: 'figure_1',
        label: 'Figure 1',
        caption: '결과 도식',
      },
    ])
  })

  it('replaces generated body and upserts tables/figures for template sections', () => {
    const methods = {
      ...makeDocument().sections[0]!,
      content: '기존 방법',
      plateValue: [{ type: 'p', children: [{ text: 'old' }] }],
      tables: [
        {
          id: 'table_existing',
          caption: '기존 표',
          headers: ['A'],
          rows: [['1']],
        },
      ],
      figures: [
        {
          entityId: 'figure_1',
          label: 'Figure 1',
          caption: '기존 캡션',
        },
      ],
    }

    const merged = mergeDocumentSectionPatch(methods, {
      content: '새 방법',
      plateValue: [{ type: 'p', children: [{ text: 'new' }] }],
      sourceRefs: [
        createDocumentSourceRef('analysis', 'hist_1'),
        createDocumentSourceRef('figure', 'figure_2', { label: '새 그림' }),
      ],
      tables: [
        {
          id: 'table_existing',
          caption: '업데이트된 표',
          headers: ['A', 'B'],
          rows: [['1', '2']],
        },
      ],
      figures: [
        {
          entityId: 'figure_1',
          label: 'Figure 1',
          caption: '업데이트된 캡션',
        },
        {
          entityId: 'figure_2',
          label: 'Figure 2',
          caption: '새 그림',
        },
      ],
      generatedBy: 'llm',
    })

    expect(merged.content).toBe('새 방법')
    expect(merged.plateValue).toEqual([{ type: 'p', children: [{ text: 'new' }] }])
    expect(merged.sourceRefs).toEqual([
      createDocumentSourceRef('analysis', 'hist_1'),
      createDocumentSourceRef('figure', 'figure_2', { label: '새 그림' }),
    ])
    expect(merged.tables).toEqual([
      {
        id: 'table_existing',
        caption: '업데이트된 표',
        headers: ['A', 'B'],
        rows: [['1', '2']],
      },
    ])
    expect(merged.figures).toEqual([
      {
        entityId: 'figure_1',
        label: 'Figure 1',
        caption: '업데이트된 캡션',
      },
      {
        entityId: 'figure_2',
        label: 'Figure 2',
        caption: '새 그림',
      },
    ])
    expect(merged.generatedBy).toBe('llm')
  })
})
