/**
 * DocumentBlueprint revision history storage.
 *
 * Autosave protects the latest draft, but paper writing often needs a human
 * rollback point. Revisions are whole-document snapshots kept local-only.
 */

import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'
import { generateId } from '@/lib/utils/generate-id'
import { txDelete, txGet, txGetByIndex, txPut } from '@/lib/utils/indexeddb-helpers'
import {
  normalizeDocumentBlueprint,
  type DocumentBlueprint,
} from './document-blueprint-types'
import type { SaveDocumentBlueprintOptions } from './document-blueprint-storage'

const STORE_NAME = 'document-blueprint-revisions'
const MAX_AUTOMATIC_REVISIONS_PER_DOCUMENT = 20

export type DocumentRevisionReason =
  | 'manual'
  | 'before-reassemble'
  | 'before-section-regeneration'
  | 'before-export'
  | 'before-restore'

export interface DocumentBlueprintRevision {
  id: string
  documentId: string
  projectId: string
  title: string
  reason: DocumentRevisionReason
  label?: string
  createdAt: string
  documentUpdatedAt?: string
  snapshot: DocumentBlueprint
}

interface CreateDocumentRevisionOptions {
  reason: DocumentRevisionReason
  label?: string
}

function cloneDocumentBlueprint(document: DocumentBlueprint): DocumentBlueprint {
  return normalizeDocumentBlueprint(JSON.parse(JSON.stringify(document)) as DocumentBlueprint)
}

function sortRevisionsDescending(
  revisions: DocumentBlueprintRevision[],
): DocumentBlueprintRevision[] {
  return [...revisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function isProtectedRevision(revision: DocumentBlueprintRevision): boolean {
  return revision.reason === 'manual'
}

async function pruneDocumentRevisions(documentId: string): Promise<void> {
  const revisions = sortRevisionsDescending(
    await listDocumentRevisions(documentId),
  )
  const automaticRevisions = revisions.filter((revision) => !isProtectedRevision(revision))
  const staleRevisions = automaticRevisions.slice(MAX_AUTOMATIC_REVISIONS_PER_DOCUMENT)
  await Promise.all(staleRevisions.map((revision) => deleteDocumentRevision(revision.id)))
}

export async function createDocumentRevision(
  document: DocumentBlueprint,
  options: CreateDocumentRevisionOptions,
): Promise<DocumentBlueprintRevision> {
  const db = await openDB()
  const now = new Date().toISOString()
  const revision: DocumentBlueprintRevision = {
    id: generateId('docrev'),
    documentId: document.id,
    projectId: document.projectId,
    title: document.title,
    reason: options.reason,
    label: options.label,
    createdAt: now,
    documentUpdatedAt: document.updatedAt,
    snapshot: cloneDocumentBlueprint(document),
  }

  await txPut(db, STORE_NAME, revision)
  await pruneDocumentRevisions(document.id)
  return revision
}

export async function listDocumentRevisions(
  documentId: string,
): Promise<DocumentBlueprintRevision[]> {
  const db = await openDB()
  const revisions = await txGetByIndex<DocumentBlueprintRevision>(
    db,
    STORE_NAME,
    'documentId',
    documentId,
  )
  return sortRevisionsDescending(revisions)
}

export async function loadDocumentRevision(
  revisionId: string,
): Promise<DocumentBlueprintRevision | undefined> {
  const db = await openDB()
  return txGet<DocumentBlueprintRevision>(db, STORE_NAME, revisionId)
}

export async function deleteDocumentRevision(revisionId: string): Promise<void> {
  const db = await openDB()
  await txDelete(db, STORE_NAME, revisionId)
}

export async function deleteDocumentRevisionsForDocument(
  documentId: string,
): Promise<void> {
  const revisions = await listDocumentRevisions(documentId)
  await Promise.all(revisions.map((revision) => deleteDocumentRevision(revision.id)))
}

export async function restoreDocumentRevision(
  revisionId: string,
  options?: SaveDocumentBlueprintOptions,
): Promise<DocumentBlueprint | undefined> {
  const revision = await loadDocumentRevision(revisionId)
  if (!revision) return undefined
  const { saveDocumentBlueprint } = await import('./document-blueprint-storage')

  return saveDocumentBlueprint(
    {
      ...cloneDocumentBlueprint(revision.snapshot),
      updatedAt: new Date().toISOString(),
    },
    options,
  )
}
