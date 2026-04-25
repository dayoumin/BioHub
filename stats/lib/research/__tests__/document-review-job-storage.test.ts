import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import {
  createDocumentReviewJobState,
  deleteDocumentReviewJobState,
  getLatestDocumentReviewJobState,
  listDocumentReviewJobStates,
  loadDocumentReviewJobState,
  saveDocumentReviewJobState,
  updateDocumentReviewJobPhase,
  type DocumentReviewJobState,
} from '../document-review-job-storage'

function makeJob(
  id: string,
  overrides: Partial<DocumentReviewJobState> = {},
): DocumentReviewJobState {
  return {
    ...createDocumentReviewJobState({
      id,
      documentId: 'doc-1',
      projectId: 'project-1',
      reportId: `report-${id}`,
      documentUpdatedAt: '2026-04-25T01:00:00.000Z',
      generatedAt: '2026-04-25T02:00:00.000Z',
    }),
    ...overrides,
  }
}

async function clearReviewJobs(): Promise<void> {
  const jobs = await listDocumentReviewJobStates()
  await Promise.all(jobs.map((job) => deleteDocumentReviewJobState(job.id)))
}

describe('document-review-job-storage', () => {
  beforeEach(async () => {
    await clearReviewJobs()
  })

  it('round-trips a review job without sharing nested phase references', async () => {
    const saved = await saveDocumentReviewJobState(makeJob('job-1'))
    saved.phases.deterministic.status = 'failed'

    const loaded = await loadDocumentReviewJobState('job-1')

    expect(loaded?.phases.deterministic.status).toBe('running')
  })

  it('updates phase state and marks a partial llm completion', async () => {
    const started = await saveDocumentReviewJobState(makeJob('job-1'))
    const deterministicDone = updateDocumentReviewJobPhase(started, 'deterministic', {
      status: 'completed',
      completedAt: '2026-04-25T02:00:01.000Z',
    }, {
      activePhase: 'llm',
      updatedAt: '2026-04-25T02:00:01.000Z',
    })
    const partial = updateDocumentReviewJobPhase(deterministicDone, 'llm', {
      status: 'partial',
      startedAt: '2026-04-25T02:00:01.000Z',
      completedAt: '2026-04-25T02:00:05.000Z',
      message: 'LLM fallback used deterministic report.',
    }, {
      status: 'partial',
      activePhase: null,
      updatedAt: '2026-04-25T02:00:05.000Z',
      completedAt: '2026-04-25T02:00:05.000Z',
    })

    await saveDocumentReviewJobState(partial)

    await expect(loadDocumentReviewJobState('job-1')).resolves.toEqual(expect.objectContaining({
      status: 'partial',
      activePhase: null,
      phases: expect.objectContaining({
        deterministic: expect.objectContaining({ status: 'completed' }),
        llm: expect.objectContaining({ status: 'partial' }),
      }),
    }))
  })

  it('lists latest review jobs by updatedAt and filters by document/project', async () => {
    await saveDocumentReviewJobState(makeJob('older', {
      updatedAt: '2026-04-25T02:00:00.000Z',
    }))
    await saveDocumentReviewJobState(makeJob('newer', {
      updatedAt: '2026-04-25T03:00:00.000Z',
    }))
    await saveDocumentReviewJobState(makeJob('other-doc', {
      documentId: 'doc-2',
      updatedAt: '2026-04-25T04:00:00.000Z',
    }))

    await expect(getLatestDocumentReviewJobState('doc-1')).resolves.toEqual(
      expect.objectContaining({ id: 'newer' }),
    )
    await expect(listDocumentReviewJobStates({ projectId: 'project-1' })).resolves.toEqual([
      expect.objectContaining({ id: 'other-doc' }),
      expect.objectContaining({ id: 'newer' }),
      expect.objectContaining({ id: 'older' }),
    ])
  })

  it('rejects completed jobs that still point at an active phase', async () => {
    await expect(saveDocumentReviewJobState(makeJob('job-1', {
      status: 'completed',
      activePhase: 'llm',
    }))).rejects.toThrow('[document-review-job-storage] Completed job cannot have an active phase')
  })
})
