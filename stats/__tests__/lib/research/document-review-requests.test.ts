import { beforeEach, describe, expect, it } from 'vitest'
import {
  createDocumentReviewRequest,
  deleteDocumentReviewRequestsForDocument,
  listDocumentReviewRequests,
  updateDocumentReviewRequestStatus,
} from '@/lib/research/document-review-requests'

describe('document review requests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores document-scoped review requests and sorts active work before completed work', () => {
    const first = createDocumentReviewRequest({
      documentId: 'doc-review-store',
      projectId: 'project-review-store',
      sectionId: 'results',
      sectionTitle: '결과',
      note: '결과 해석 보완',
      baselineRevisionId: 'docrev-1',
    })
    const second = createDocumentReviewRequest({
      documentId: 'doc-review-store',
      projectId: 'project-review-store',
      sectionId: null,
      sectionTitle: null,
      note: '전체 문체 점검',
    })
    createDocumentReviewRequest({
      documentId: 'other-doc',
      projectId: 'project-review-store',
      sectionId: null,
      sectionTitle: null,
      note: '다른 문서 요청',
    })
    if (!first || !second) {
      throw new Error('Expected review requests to be created')
    }

    updateDocumentReviewRequestStatus(first.id, 'done')
    updateDocumentReviewRequestStatus(second.id, 'in-progress')

    const requests = listDocumentReviewRequests('doc-review-store')

    expect(requests).toHaveLength(2)
    expect(requests[0]?.note).toBe('전체 문체 점검')
    expect(requests[0]?.status).toBe('in-progress')
    expect(requests[1]?.note).toBe('결과 해석 보완')
    expect(requests[1]?.baselineRevisionId).toBe('docrev-1')
  })

  it('ignores corrupted localStorage payloads instead of crashing the editor', () => {
    localStorage.setItem('paper_document_review_requests_v1', '{broken')

    expect(listDocumentReviewRequests('doc-review-store')).toEqual([])
  })

  it('respects the user localStorage opt-out setting', () => {
    localStorage.setItem('statPlatform_localStorageEnabled', 'false')

    const request = createDocumentReviewRequest({
      documentId: 'doc-review-store',
      projectId: 'project-review-store',
      sectionId: 'results',
      sectionTitle: '결과',
      note: '저장되면 안 되는 요청',
    })

    expect(request).toBeNull()
    expect(localStorage.getItem('paper_document_review_requests_v1')).toBeNull()
  })

  it('deletes all requests for a document without touching other documents', () => {
    createDocumentReviewRequest({
      documentId: 'doc-review-delete',
      projectId: 'project-review-store',
      sectionId: 'results',
      sectionTitle: '결과',
      note: '삭제 대상 요청',
    })
    createDocumentReviewRequest({
      documentId: 'other-doc',
      projectId: 'project-review-store',
      sectionId: null,
      sectionTitle: null,
      note: '보존 대상 요청',
    })

    expect(deleteDocumentReviewRequestsForDocument('doc-review-delete')).toBe(true)

    expect(listDocumentReviewRequests('doc-review-delete')).toEqual([])
    expect(listDocumentReviewRequests('other-doc')).toHaveLength(1)
  })

  it('cleans up stored requests even when localStorage reads are disabled', () => {
    createDocumentReviewRequest({
      documentId: 'doc-review-delete-disabled',
      projectId: 'project-review-store',
      sectionId: 'results',
      sectionTitle: '결과',
      note: '삭제 대상 요청',
    })
    localStorage.setItem('statPlatform_localStorageEnabled', 'false')

    expect(deleteDocumentReviewRequestsForDocument('doc-review-delete-disabled')).toBe(true)
    localStorage.setItem('statPlatform_localStorageEnabled', 'true')

    expect(listDocumentReviewRequests('doc-review-delete-disabled')).toEqual([])
  })
})
