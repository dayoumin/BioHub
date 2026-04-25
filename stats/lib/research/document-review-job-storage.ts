import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'
import { txDelete, txGet, txGetAll, txGetByIndex, txPut } from '@/lib/utils/indexeddb-helpers'
import {
  emitCrossTabCustomEvent,
  registerCrossTabCustomEventBridge,
} from '@/lib/utils/cross-tab-custom-events'

const STORE_NAME = 'document-review-jobs'
export const DOCUMENT_REVIEW_JOBS_CHANGED_EVENT = 'document-review-jobs-changed'
const DOCUMENT_REVIEW_JOBS_CHANGED_CHANNEL = 'document-review-jobs'

export type DocumentReviewJobPhase = 'deterministic' | 'llm'
export type DocumentReviewJobStatus = 'running' | 'completed' | 'partial' | 'failed' | 'discarded'
export type DocumentReviewJobPhaseStatus = 'pending' | DocumentReviewJobStatus

export interface DocumentReviewJobPhaseState {
  status: DocumentReviewJobPhaseStatus
  startedAt?: string
  completedAt?: string
  message?: string
}

export interface DocumentReviewJobState {
  id: string
  documentId: string
  projectId: string
  reportId: string
  status: DocumentReviewJobStatus
  activePhase: DocumentReviewJobPhase | null
  phases: Record<DocumentReviewJobPhase, DocumentReviewJobPhaseState>
  documentUpdatedAt: string
  generatedAt: string
  startedAt: string
  updatedAt: string
  completedAt?: string
  errorMessage?: string
}

export interface DocumentReviewJobsChangedDetail {
  jobId: string
  documentId: string
  projectId: string
  action: 'saved' | 'deleted'
  status?: DocumentReviewJobStatus
  updatedAt?: string
}

export interface CreateDocumentReviewJobStateOptions {
  id: string
  documentId: string
  projectId: string
  reportId: string
  documentUpdatedAt: string
  generatedAt: string
}

function cloneJob(job: DocumentReviewJobState): DocumentReviewJobState {
  return {
    ...job,
    phases: {
      deterministic: { ...job.phases.deterministic },
      llm: { ...job.phases.llm },
    },
  }
}

function notifyDocumentReviewJobsChanged(detail: DocumentReviewJobsChangedDetail): void {
  emitCrossTabCustomEvent<DocumentReviewJobsChangedDetail>(
    DOCUMENT_REVIEW_JOBS_CHANGED_CHANNEL,
    DOCUMENT_REVIEW_JOBS_CHANGED_EVENT,
    detail,
  )
}

function sortJobsByLatest(jobs: DocumentReviewJobState[]): DocumentReviewJobState[] {
  return [...jobs].sort((left, right) => {
    const updatedCompare = right.updatedAt.localeCompare(left.updatedAt)
    if (updatedCompare !== 0) {
      return updatedCompare
    }
    return right.id.localeCompare(left.id)
  })
}

export function createDocumentReviewJobState(
  options: CreateDocumentReviewJobStateOptions,
): DocumentReviewJobState {
  return {
    id: options.id,
    documentId: options.documentId,
    projectId: options.projectId,
    reportId: options.reportId,
    status: 'running',
    activePhase: 'deterministic',
    phases: {
      deterministic: {
        status: 'running',
        startedAt: options.generatedAt,
      },
      llm: {
        status: 'pending',
      },
    },
    documentUpdatedAt: options.documentUpdatedAt,
    generatedAt: options.generatedAt,
    startedAt: options.generatedAt,
    updatedAt: options.generatedAt,
  }
}

export function updateDocumentReviewJobPhase(
  job: DocumentReviewJobState,
  phase: DocumentReviewJobPhase,
  phaseState: DocumentReviewJobPhaseState,
  options: {
    status?: DocumentReviewJobStatus
    activePhase?: DocumentReviewJobPhase | null
    updatedAt: string
    completedAt?: string
    errorMessage?: string
  },
): DocumentReviewJobState {
  const cloned = cloneJob(job)
  return {
    ...cloned,
    status: options.status ?? job.status,
    activePhase: options.activePhase === undefined ? job.activePhase : options.activePhase,
    phases: {
      ...cloned.phases,
      [phase]: {
        ...job.phases[phase],
        ...phaseState,
      },
    },
    updatedAt: options.updatedAt,
    completedAt: options.completedAt ?? job.completedAt,
    errorMessage: options.errorMessage,
  }
}

function validateJob(job: DocumentReviewJobState): void {
  if (!job.id.trim() || !job.documentId.trim() || !job.projectId.trim() || !job.reportId.trim()) {
    throw new Error('[document-review-job-storage] Job identity is incomplete')
  }

  if (job.status !== 'running' && job.activePhase !== null) {
    throw new Error('[document-review-job-storage] Completed job cannot have an active phase')
  }
}

registerCrossTabCustomEventBridge<DocumentReviewJobsChangedDetail>(
  DOCUMENT_REVIEW_JOBS_CHANGED_CHANNEL,
  DOCUMENT_REVIEW_JOBS_CHANGED_EVENT,
)

export async function saveDocumentReviewJobState(
  job: DocumentReviewJobState,
): Promise<DocumentReviewJobState> {
  validateJob(job)
  const db = await openDB()
  const toSave = cloneJob(job)
  await txPut<DocumentReviewJobState>(db, STORE_NAME, toSave)
  notifyDocumentReviewJobsChanged({
    jobId: job.id,
    documentId: job.documentId,
    projectId: job.projectId,
    action: 'saved',
    status: job.status,
    updatedAt: job.updatedAt,
  })
  return cloneJob(toSave)
}

export async function loadDocumentReviewJobState(jobId: string): Promise<DocumentReviewJobState | null> {
  const db = await openDB()
  const job = await txGet<DocumentReviewJobState>(db, STORE_NAME, jobId)
  return job ? cloneJob(job) : null
}

export async function listDocumentReviewJobStates(
  filters: {
    documentId?: string
    projectId?: string
  } = {},
): Promise<DocumentReviewJobState[]> {
  const db = await openDB()
  const jobs = filters.documentId
    ? await txGetByIndex<DocumentReviewJobState>(db, STORE_NAME, 'documentId', filters.documentId)
    : filters.projectId
      ? await txGetByIndex<DocumentReviewJobState>(db, STORE_NAME, 'projectId', filters.projectId)
      : await txGetAll<DocumentReviewJobState>(db, STORE_NAME)

  const filteredJobs = jobs.filter((job) => (
    (!filters.documentId || job.documentId === filters.documentId)
    && (!filters.projectId || job.projectId === filters.projectId)
  ))

  return sortJobsByLatest(filteredJobs).map((job) => cloneJob(job))
}

export async function getLatestDocumentReviewJobState(
  documentId: string,
): Promise<DocumentReviewJobState | null> {
  const jobs = await listDocumentReviewJobStates({ documentId })
  return jobs[0] ? cloneJob(jobs[0]) : null
}

export async function deleteDocumentReviewJobState(jobId: string): Promise<void> {
  const db = await openDB()
  const existing = await txGet<DocumentReviewJobState>(db, STORE_NAME, jobId)
  await txDelete(db, STORE_NAME, jobId)
  if (existing) {
    notifyDocumentReviewJobsChanged({
      jobId,
      documentId: existing.documentId,
      projectId: existing.projectId,
      action: 'deleted',
    })
  }
}
