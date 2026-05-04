/**
 * Local review request tracker for paper writing.
 *
 * Revision history keeps rollback points; review requests explain why a user
 * needs to revisit a section during thesis/journal feedback cycles.
 */

import { generateId } from '@/lib/utils/generate-id'
import { StorageService } from '@/lib/services/storage-service'

const STORAGE_KEY = 'paper_document_review_requests_v1'

export type DocumentReviewRequestStatus = 'pending' | 'in-progress' | 'done' | 'deferred'

export interface DocumentReviewRequest {
  id: string
  documentId: string
  projectId: string
  sectionId: string | null
  sectionTitle: string | null
  note: string
  status: DocumentReviewRequestStatus
  baselineRevisionId?: string
  createdAt: string
  updatedAt: string
}

interface CreateDocumentReviewRequestInput {
  documentId: string
  projectId: string
  sectionId: string | null
  sectionTitle: string | null
  note: string
  baselineRevisionId?: string
}

function readAllRequests(): DocumentReviewRequest[] {
  try {
    const raw = StorageService.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDocumentReviewRequest)
  } catch {
    return []
  }
}

function writeAllRequests(requests: DocumentReviewRequest[]): boolean {
  if (!StorageService.isEnabled()) return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
    return true
  } catch {
    return false
  }
}

function isDocumentReviewRequest(value: unknown): value is DocumentReviewRequest {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string'
    && typeof record.documentId === 'string'
    && typeof record.projectId === 'string'
    && (typeof record.sectionId === 'string' || record.sectionId === null)
    && (typeof record.sectionTitle === 'string' || record.sectionTitle === null)
    && typeof record.note === 'string'
    && isDocumentReviewRequestStatus(record.status)
    && typeof record.createdAt === 'string'
    && typeof record.updatedAt === 'string'
  )
}

function isDocumentReviewRequestStatus(value: unknown): value is DocumentReviewRequestStatus {
  return value === 'pending' || value === 'in-progress' || value === 'done' || value === 'deferred'
}

function sortRequests(requests: DocumentReviewRequest[]): DocumentReviewRequest[] {
  const statusWeight: Record<DocumentReviewRequestStatus, number> = {
    pending: 0,
    'in-progress': 1,
    deferred: 2,
    done: 3,
  }
  return [...requests].sort((a, b) => (
    statusWeight[a.status] - statusWeight[b.status]
    || b.updatedAt.localeCompare(a.updatedAt)
  ))
}

export function listDocumentReviewRequests(documentId: string): DocumentReviewRequest[] {
  return sortRequests(readAllRequests().filter((request) => request.documentId === documentId))
}

export function createDocumentReviewRequest(
  input: CreateDocumentReviewRequestInput,
): DocumentReviewRequest | null {
  const now = new Date().toISOString()
  const request: DocumentReviewRequest = {
    id: generateId('docreq'),
    documentId: input.documentId,
    projectId: input.projectId,
    sectionId: input.sectionId,
    sectionTitle: input.sectionTitle,
    note: input.note.trim(),
    status: 'pending',
    baselineRevisionId: input.baselineRevisionId,
    createdAt: now,
    updatedAt: now,
  }
  return writeAllRequests([...readAllRequests(), request]) ? request : null
}

export function updateDocumentReviewRequestStatus(
  requestId: string,
  status: DocumentReviewRequestStatus,
): DocumentReviewRequest | null {
  let updatedRequest: DocumentReviewRequest | null = null
  const nextRequests = readAllRequests().map((request) => {
    if (request.id !== requestId) return request
    updatedRequest = {
      ...request,
      status,
      updatedAt: new Date().toISOString(),
    }
    return updatedRequest
  })
  return writeAllRequests(nextRequests) ? updatedRequest : null
}

export function attachDocumentReviewRequestBaseline(
  requestId: string,
  baselineRevisionId: string,
): DocumentReviewRequest | null {
  let updatedRequest: DocumentReviewRequest | null = null
  const nextRequests = readAllRequests().map((request) => {
    if (request.id !== requestId) return request
    updatedRequest = {
      ...request,
      baselineRevisionId,
      updatedAt: new Date().toISOString(),
    }
    return updatedRequest
  })
  return writeAllRequests(nextRequests) ? updatedRequest : null
}

export function canPersistDocumentReviewRequests(): boolean {
  return StorageService.isEnabled()
}
