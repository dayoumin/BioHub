import { describe, expect, it } from 'vitest'
import {
  createDocumentRevision,
  listDocumentRevisions,
  restoreDocumentRevision,
} from '@/lib/research/document-blueprint-revisions'
import {
  deleteDocumentBlueprint,
  DocumentBlueprintConflictError,
  loadDocumentBlueprint,
  saveDocumentBlueprint,
} from '@/lib/research/document-blueprint-storage'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'

function makeDocument(id: string, content: string, updatedAt: string): DocumentBlueprint {
  return {
    id,
    projectId: `project-${id}`,
    preset: 'paper',
    title: `문서 ${id}`,
    language: 'ko',
    metadata: {},
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt,
    writingState: {
      status: 'idle',
      sectionStates: {},
    },
    sections: [
      {
        id: 'results',
        title: '결과',
        content,
        sourceRefs: [],
        editable: true,
        generatedBy: 'user',
      },
    ],
  }
}

function updateDocumentContent(document: DocumentBlueprint, content: string, updatedAt: string): DocumentBlueprint {
  return {
    ...document,
    updatedAt,
    sections: document.sections.map((section) => (
      section.id === 'results' ? { ...section, content } : section
    )),
  }
}

function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 1)
  })
}

describe('document blueprint revisions', () => {
  it('stores document snapshots and lists the newest revision first', async () => {
    const documentId = 'revision-list-doc'
    const document = makeDocument(documentId, '초기 본문', '2026-04-30T00:00:00.000Z')

    await createDocumentRevision(document, {
      reason: 'manual',
      label: '첫 저장 지점',
    })
    await waitForNextTick()
    await createDocumentRevision(
      updateDocumentContent(document, '수정 본문', '2026-04-30T00:00:02.000Z'),
      {
        reason: 'before-reassemble',
        label: '재조립 전',
      },
    )

    const revisions = await listDocumentRevisions(documentId)

    expect(revisions).toHaveLength(2)
    expect(revisions[0]?.label).toBe('재조립 전')
    expect(revisions[1]?.label).toBe('첫 저장 지점')
    expect(revisions[1]?.snapshot.sections[0]?.content).toBe('초기 본문')
  })

  it('restores a revision as the current document without mutating the stored snapshot', async () => {
    const documentId = 'revision-restore-doc'
    const original = makeDocument(documentId, '복원할 본문', '2026-04-30T00:00:00.000Z')
    const revision = await createDocumentRevision(original, {
      reason: 'manual',
      label: '복원 대상',
    })
    await saveDocumentBlueprint(
      makeDocument(documentId, '현재 본문', '2026-04-30T00:00:10.000Z'),
    )

    const restored = await restoreDocumentRevision(revision.id)
    const loaded = await loadDocumentBlueprint(documentId)
    const revisions = await listDocumentRevisions(documentId)

    expect(restored?.sections[0]?.content).toBe('복원할 본문')
    expect(loaded?.sections[0]?.content).toBe('복원할 본문')
    expect(loaded?.updatedAt).not.toBe(original.updatedAt)
    expect(revisions[0]?.snapshot.sections[0]?.content).toBe('복원할 본문')
  })

  it('rejects stale expectedUpdatedAt saves without overwriting the current document', async () => {
    const documentId = 'revision-conflict-doc'
    await saveDocumentBlueprint(
      makeDocument(documentId, '원본', '2026-04-30T00:00:00.000Z'),
    )
    await saveDocumentBlueprint(
      makeDocument(documentId, '다른 탭 저장', '2026-04-30T00:00:01.000Z'),
      { expectedUpdatedAt: '2026-04-30T00:00:00.000Z' },
    )

    await expect(saveDocumentBlueprint(
      makeDocument(documentId, '늦은 저장', '2026-04-30T00:00:02.000Z'),
      { expectedUpdatedAt: '2026-04-30T00:00:00.000Z' },
    )).rejects.toBeInstanceOf(DocumentBlueprintConflictError)

    const loaded = await loadDocumentBlueprint(documentId)
    expect(loaded?.sections[0]?.content).toBe('다른 탭 저장')
  })

  it('deletes revisions when the document is deleted', async () => {
    const documentId = 'revision-delete-doc'
    const document = makeDocument(documentId, '삭제 대상', '2026-04-30T00:00:00.000Z')

    await saveDocumentBlueprint(document)
    await createDocumentRevision(document, {
      reason: 'manual',
      label: '삭제될 기록',
    })

    expect(await listDocumentRevisions(documentId)).toHaveLength(1)

    await deleteDocumentBlueprint(document.id, document.projectId)

    expect(await listDocumentRevisions(documentId)).toHaveLength(0)
  })

  it('keeps manual rollback points when automatic revisions are pruned', async () => {
    const documentId = 'revision-retention-doc'
    const document = makeDocument(documentId, '수동 기준점', '2026-04-30T00:00:00.000Z')

    await createDocumentRevision(document, {
      reason: 'manual',
      label: '사용자 기준 저장 지점',
    })

    for (let index = 0; index < 25; index += 1) {
      await waitForNextTick()
      await createDocumentRevision(
        updateDocumentContent(document, `자동 저장 ${index}`, `2026-04-30T00:01:${String(index).padStart(2, '0')}.000Z`),
        {
          reason: 'before-export',
          label: `자동 저장 지점 ${index}`,
        },
      )
    }

    const revisions = await listDocumentRevisions(documentId)
    const manualRevisions = revisions.filter((revision) => revision.reason === 'manual')
    const automaticRevisions = revisions.filter((revision) => revision.reason !== 'manual')

    expect(manualRevisions).toHaveLength(1)
    expect(manualRevisions[0]?.label).toBe('사용자 기준 저장 지점')
    expect(automaticRevisions).toHaveLength(20)
    expect(revisions.some((revision) => revision.label === '자동 저장 지점 0')).toBe(false)
    expect(revisions.some((revision) => revision.label === '자동 저장 지점 24')).toBe(true)
  })
})
