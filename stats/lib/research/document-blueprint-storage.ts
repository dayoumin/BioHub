/**
 * DocumentBlueprint IndexedDB 저장소
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §6
 * 구현 계획: Phase 1
 *
 * Local-only: storage.ts facade 비경유, project-storage.ts 패턴
 * EntityRef 동기화: 저장/삭제 시 upsertProjectEntityRef/removeProjectEntityRef 호출
 */

import {
  buildDocumentAuthoringPlanFromStudySchema,
  getDocumentAuthoringPlan,
  normalizeDocumentMetadata,
  normalizeDocumentBlueprint,
  type DocumentBlueprint,
  type DocumentSourceRef,
} from './document-blueprint-types'
import type { StudySchema } from '@/lib/services/paper-draft/study-schema'
import {
  listProjectEntityRefs,
  upsertProjectEntityRef,
  removeProjectEntityRef,
} from './project-storage'
import type { ProjectEntityRef, ProjectProvenanceEdge } from '@/lib/types/research'
import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'
import {
  emitCrossTabCustomEvent,
  registerCrossTabCustomEventBridge,
} from '@/lib/utils/cross-tab-custom-events'
import { txGet, txGetAll, txGetByIndex, txDelete, txPut } from '@/lib/utils/indexeddb-helpers'
import { deleteDocumentRevisionsForDocument } from './document-blueprint-revisions'
import { deleteDocumentReviewRequestsForDocument } from './document-review-requests'

const STORE_NAME = 'document-blueprints'
export const DOCUMENT_BLUEPRINTS_CHANGED_EVENT = 'document-blueprints-changed'
const DOCUMENT_BLUEPRINTS_CHANGED_CHANNEL = 'document-blueprints'

export interface DocumentBlueprintsChangedDetail {
  projectId: string
  documentId: string
  action: 'saved' | 'deleted'
  updatedAt?: string
}

export interface SaveDocumentBlueprintOptions {
  expectedUpdatedAt?: string
}

export class DocumentBlueprintConflictError extends Error {
  latestDocument: DocumentBlueprint

  constructor(latestDocument: DocumentBlueprint) {
    super('문서가 다른 탭에서 먼저 변경되었습니다.')
    this.name = 'DocumentBlueprintConflictError'
    this.latestDocument = latestDocument
  }
}

function notifyDocumentBlueprintsChanged(detail: DocumentBlueprintsChangedDetail): void {
  emitCrossTabCustomEvent<DocumentBlueprintsChangedDetail>(
    DOCUMENT_BLUEPRINTS_CHANGED_CHANNEL,
    DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
    detail,
  )
}

registerCrossTabCustomEventBridge<DocumentBlueprintsChangedDetail>(
  DOCUMENT_BLUEPRINTS_CHANGED_CHANNEL,
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
)

function buildDraftProvenanceEdges(blueprint: DocumentBlueprint): ProjectProvenanceEdge[] {
  const edges = new Map<string, ProjectProvenanceEdge>()

  const registerEdge = (
    targetKind: ProjectProvenanceEdge['targetKind'] | null,
    targetId: string | undefined,
    label: string | undefined,
  ): void => {
    if (!targetKind || !targetId) {
      return
    }

    const normalizedTargetId = targetId.trim()
    if (normalizedTargetId.length === 0) {
      return
    }

    const key = `${targetKind}:${normalizedTargetId}`
    edges.set(key, {
      role: 'uses',
      targetKind,
      targetId: normalizedTargetId,
      label,
    })
  }

  const registerSourceRef = (sourceRef: DocumentSourceRef): void => {
    const targetKind = sourceRef.kind === 'analysis'
      ? 'analysis'
      : sourceRef.kind === 'figure'
        ? 'figure'
        : null
    if (!targetKind) {
      return
    }

    registerEdge(targetKind, sourceRef.sourceId, sourceRef.label)
  }

  for (const section of blueprint.sections) {
    for (const sourceRef of section.sourceRefs ?? []) {
      registerSourceRef(sourceRef)
    }
    for (const table of section.tables ?? []) {
      registerEdge('analysis', table.sourceAnalysisId, table.sourceAnalysisLabel)
    }
    for (const figure of section.figures ?? []) {
      registerEdge('figure', figure.entityId, figure.label)
      registerEdge('analysis', figure.relatedAnalysisId, figure.relatedAnalysisLabel)
    }
  }

  return Array.from(edges.values())
}

function findDraftEntityRef(projectId: string, documentId: string): ProjectEntityRef | null {
  return listProjectEntityRefs(projectId).find(
    (ref) => ref.entityKind === 'draft' && ref.entityId === documentId,
  ) ?? null
}

function restoreDraftEntityRef(snapshot: ProjectEntityRef | null): void {
  if (!snapshot) {
    return
  }

  upsertProjectEntityRef({
    projectId: snapshot.projectId,
    entityKind: snapshot.entityKind,
    entityId: snapshot.entityId,
    label: snapshot.label,
    order: snapshot.order,
    provenanceEdges: snapshot.provenanceEdges,
  })
}

async function rollbackSavedDocument(
  db: IDBDatabase,
  documentId: string,
  previousDocument: DocumentBlueprint | undefined,
): Promise<void> {
  if (previousDocument) {
    await txPut(db, STORE_NAME, previousDocument)
    return
  }

  await txDelete(db, STORE_NAME, documentId)
}

function saveDocumentBlueprintInTransaction(
  db: IDBDatabase,
  toSave: DocumentBlueprint,
  expectedUpdatedAt: string | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(toSave.id)
    let settled = false

    const rejectOnce = (error: unknown): void => {
      if (!settled) {
        settled = true
        reject(error)
      }
    }

    getRequest.onerror = (): void => rejectOnce(getRequest.error)
    getRequest.onsuccess = (): void => {
      const existing = getRequest.result as DocumentBlueprint | undefined
      if (existing && expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) {
        rejectOnce(new DocumentBlueprintConflictError(normalizeDocumentBlueprint(existing)))
        tx.abort()
        return
      }

      const putRequest = store.put(toSave)
      putRequest.onerror = (): void => rejectOnce(putRequest.error)
    }

    tx.oncomplete = (): void => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    tx.onerror = (): void => rejectOnce(tx.error)
    tx.onabort = (): void => {
      if (!settled) {
        rejectOnce(tx.error ?? new Error('Document blueprint save transaction aborted'))
      }
    }
  })
}

// ── 공개 API ──

/**
 * 문서 저장 + EntityRef 동기화
 *
 * IndexedDB 저장 성공 후 EntityRef 생성. 순차 실행.
 */
export async function saveDocumentBlueprint(
  blueprint: DocumentBlueprint,
  options?: SaveDocumentBlueprintOptions,
): Promise<DocumentBlueprint> {
  const db = await openDB()
  // updatedAt는 호출자가 설정하되, 누락 시 현재 시각으로 fallback
  const toSave = blueprint.updatedAt
    ? blueprint
    : { ...blueprint, updatedAt: new Date().toISOString() }

  const existing = await txGet<DocumentBlueprint>(db, STORE_NAME, blueprint.id)
  const previousDraftRef = findDraftEntityRef(blueprint.projectId, blueprint.id)
  await saveDocumentBlueprintInTransaction(db, toSave, options?.expectedUpdatedAt)

  try {
    upsertProjectEntityRef({
      projectId: blueprint.projectId,
      entityKind: 'draft',
      entityId: blueprint.id,
      label: blueprint.title,
      provenanceEdges: buildDraftProvenanceEdges(toSave),
    })
  } catch (error) {
    try {
      await rollbackSavedDocument(db, blueprint.id, existing)
    } catch (rollbackError) {
      console.error('[document-blueprint-storage] Failed to rollback document save:', rollbackError)
    }

    try {
      if (previousDraftRef) {
        restoreDraftEntityRef(previousDraftRef)
      } else {
        removeProjectEntityRef(blueprint.projectId, 'draft', blueprint.id)
      }
    } catch (rollbackError) {
      console.error('[document-blueprint-storage] Failed to rollback draft entity ref:', rollbackError)
    }

    throw error
  }
  notifyDocumentBlueprintsChanged({
    projectId: blueprint.projectId,
    documentId: blueprint.id,
    action: 'saved',
    updatedAt: toSave.updatedAt,
  })
  return normalizeDocumentBlueprint(toSave)
}

/**
 * 문서 삭제 + EntityRef 동기화
 */
export async function deleteDocumentBlueprint(
  id: string,
  projectId: string,
): Promise<void> {
  const db = await openDB()
  const existing = await txGet<DocumentBlueprint>(db, STORE_NAME, id)
  const previousDraftRef = findDraftEntityRef(projectId, id)
  await txDelete(db, STORE_NAME, id)
  await deleteDocumentRevisionsForDocument(id)
  deleteDocumentReviewRequestsForDocument(id)

  try {
    removeProjectEntityRef(projectId, 'draft', id)
  } catch (error) {
    try {
      if (existing) {
        await txPut(db, STORE_NAME, existing)
      }
    } catch (rollbackError) {
      console.error('[document-blueprint-storage] Failed to rollback document delete:', rollbackError)
    }

    try {
      restoreDraftEntityRef(previousDraftRef)
    } catch (rollbackError) {
      console.error('[document-blueprint-storage] Failed to restore draft entity ref:', rollbackError)
    }

    throw error
  }
  notifyDocumentBlueprintsChanged({
    projectId,
    documentId: id,
    action: 'deleted',
  })
}

/**
 * 프로젝트별 문서 조회 (projectId 인덱스 사용)
 */
export async function loadDocumentBlueprints(
  projectId: string,
): Promise<DocumentBlueprint[]> {
  const db = await openDB()
  const docs = await txGetByIndex<DocumentBlueprint>(db, STORE_NAME, 'projectId', projectId)
  return docs
    .map((doc) => normalizeDocumentBlueprint(doc))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

/**
 * 단건 조회
 */
export async function loadDocumentBlueprint(
  id: string,
): Promise<DocumentBlueprint | undefined> {
  const db = await openDB()
  const document = await txGet<DocumentBlueprint>(db, STORE_NAME, id)
  return document ? normalizeDocumentBlueprint(document) : undefined
}

/**
 * 전체 문서 조회 (entity-loader용, 프로젝트 필터 없음)
 */
export async function loadAllDocumentBlueprints(): Promise<DocumentBlueprint[]> {
  const db = await openDB()
  const documents = await txGetAll<DocumentBlueprint>(db, STORE_NAME)
  return documents.map((document) => normalizeDocumentBlueprint(document))
}

export async function setDocumentStudySchema(
  documentId: string,
  studySchema: StudySchema,
  options?: SaveDocumentBlueprintOptions,
): Promise<DocumentBlueprint | undefined> {
  const document = await loadDocumentBlueprint(documentId)
  if (!document) return undefined
  const metadata = normalizeDocumentMetadata(document.metadata)

  return saveDocumentBlueprint(
    {
      ...document,
      metadata: {
        ...metadata,
        studySchema,
        authoringPlan: buildDocumentAuthoringPlanFromStudySchema(
          studySchema,
          getDocumentAuthoringPlan(metadata),
        ),
      },
      updatedAt: new Date().toISOString(),
    },
    options,
  )
}

/**
 * 전체 문서 수 조회 (진단용)
 */
export async function getDocumentBlueprintCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
