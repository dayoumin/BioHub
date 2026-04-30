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
  upsertProjectEntityRef,
  removeProjectEntityRef,
} from './project-storage'
import type { ProjectProvenanceEdge } from '@/lib/types/research'
import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'
import {
  emitCrossTabCustomEvent,
  registerCrossTabCustomEventBridge,
} from '@/lib/utils/cross-tab-custom-events'
import { txGet, txGetAll, txGetByIndex, txPut, txDelete } from '@/lib/utils/indexeddb-helpers'
import { deleteDocumentRevisionsForDocument } from './document-blueprint-revisions'

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
  if (
    existing &&
    options?.expectedUpdatedAt &&
    existing.updatedAt !== options.expectedUpdatedAt
  ) {
    throw new DocumentBlueprintConflictError(normalizeDocumentBlueprint(existing))
  }

  await txPut(db, STORE_NAME, toSave)

  upsertProjectEntityRef({
    projectId: blueprint.projectId,
    entityKind: 'draft',
    entityId: blueprint.id,
    label: blueprint.title,
    provenanceEdges: buildDraftProvenanceEdges(toSave),
  })
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
  await txDelete(db, STORE_NAME, id)
  await deleteDocumentRevisionsForDocument(id)

  removeProjectEntityRef(projectId, 'draft', id)
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
