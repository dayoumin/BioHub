import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'

import {
  deleteDocumentBlueprint,
  loadAllDocumentBlueprints,
  loadDocumentBlueprint,
  saveDocumentBlueprint,
} from '../document-blueprint-storage'
import type { DocumentBlueprint } from '../document-blueprint-types'
import { listProjectEntityRefs } from '../project-storage'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

function makeDocument(overrides: Partial<DocumentBlueprint> = {}): DocumentBlueprint {
  return {
    id: 'doc-storage-test',
    projectId: 'proj-storage-test',
    preset: 'paper',
    title: 'Original draft',
    language: 'ko',
    metadata: {},
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    sections: [
      {
        id: 'results',
        title: 'Results',
        content: 'Initial content',
        sourceRefs: [],
        editable: true,
        generatedBy: 'user',
      },
    ],
    ...overrides,
  }
}

describe('document-blueprint-storage rollback', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    localStorage.clear()

    const existing = await loadAllDocumentBlueprints()
    await Promise.all(existing.map((document) => deleteDocumentBlueprint(document.id, document.projectId).catch(() => undefined)))
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rolls back an updated blueprint when the draft ref write fails', async () => {
    const initial = makeDocument()
    await saveDocumentBlueprint(initial)

    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function mockSetItem(
      this: Storage,
      key: string,
      value: string,
    ): void {
      if (key === STORAGE_KEYS.research.projectEntityRefs) {
        throw new Error('simulated ref save failure')
      }
      return originalSetItem.call(this, key, value)
    })

    await expect(saveDocumentBlueprint({
      ...initial,
      title: 'Updated draft',
      updatedAt: '2026-04-24T01:00:00.000Z',
    })).rejects.toThrow('[research-project-storage] Failed to write research_project_entity_refs')

    await expect(loadDocumentBlueprint(initial.id)).resolves.toEqual(
      expect.objectContaining({
        id: initial.id,
        title: 'Original draft',
        updatedAt: initial.updatedAt,
      }),
    )
    expect(listProjectEntityRefs(initial.projectId)).toEqual([
      expect.objectContaining({
        entityKind: 'draft',
        entityId: initial.id,
        label: 'Original draft',
      }),
    ])
  })

  it('restores the deleted blueprint when draft ref removal fails', async () => {
    const initial = makeDocument()
    await saveDocumentBlueprint(initial)

    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function mockSetItem(
      this: Storage,
      key: string,
      value: string,
    ): void {
      if (key === STORAGE_KEYS.research.projectEntityRefs) {
        throw new Error('simulated ref delete failure')
      }
      return originalSetItem.call(this, key, value)
    })

    await expect(deleteDocumentBlueprint(initial.id, initial.projectId)).rejects.toThrow(
      '[research-project-storage] Failed to write research_project_entity_refs',
    )

    await expect(loadDocumentBlueprint(initial.id)).resolves.toEqual(
      expect.objectContaining({
        id: initial.id,
        title: 'Original draft',
      }),
    )
    expect(listProjectEntityRefs(initial.projectId)).toEqual([
      expect.objectContaining({
        entityKind: 'draft',
        entityId: initial.id,
        label: 'Original draft',
      }),
    ])
  })
})
