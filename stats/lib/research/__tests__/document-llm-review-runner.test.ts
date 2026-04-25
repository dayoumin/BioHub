import { describe, expect, it, vi } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import type { DocumentQualityReport } from '../document-quality-types'
import { runDocumentPreflightRules } from '../document-preflight-rules'
import { runDocumentLlmReview } from '../document-llm-review-runner'

vi.mock('@/lib/services/recommenders/openrouter-recommender', () => ({
  openRouterRecommender: {
    generateRawText: vi.fn(),
  },
}))

function makeDocument(): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: 'Draft',
    language: 'en',
    sections: [{
      id: 'discussion',
      title: 'Discussion',
      content: 'The intervention clearly proves clinical benefit.',
      sourceRefs: [],
      editable: true,
      generatedBy: 'llm',
    }],
    metadata: {},
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

function makeReport(document: DocumentBlueprint): DocumentQualityReport {
  return runDocumentPreflightRules(document, {
    reportId: 'report-1',
    generatedAt: '2026-04-25T01:00:00.000Z',
  })
}

describe('runDocumentLlmReview', () => {
  it('calls the review generator and merges sanitized findings', async () => {
    const document = makeDocument()
    const generateText = vi.fn().mockResolvedValue(JSON.stringify({
      findings: [{
        category: 'style',
        severity: 'warning',
        title: 'Avoid overclaiming',
        message: 'The claim is too strong for the available evidence.',
        sectionId: 'discussion',
        suggestion: {
          replacementText: 'The intervention may be associated with clinical benefit.',
        },
      }],
    }))

    const report = await runDocumentLlmReview(document, makeReport(document), {
      generatedAt: '2026-04-25T02:00:00.000Z',
      generateText,
    })

    expect(generateText).toHaveBeenCalledTimes(1)
    expect(report.status).toBe('completed')
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'document-llm-review-sanitizer:v1:style',
        category: 'style',
        sectionId: 'discussion',
      }),
    ]))
  })

  it('preserves deterministic findings as partial when review generation fails', async () => {
    const document = makeDocument()
    const generateText = vi.fn().mockRejectedValue(new Error('network failed'))

    const report = await runDocumentLlmReview(document, makeReport(document), {
      generatedAt: '2026-04-25T02:00:00.000Z',
      generateText,
    })

    expect(report.status).toBe('partial')
    expect(report.errorMessage).toBe('network failed')
    expect(report.findings.some((finding) => finding.ruleId === 'document.sources.none')).toBe(true)
  })

  it('treats invalid payloads and fully rejected findings as partial review failures', async () => {
    const document = makeDocument()

    await expect(runDocumentLlmReview(document, makeReport(document), {
      generatedAt: '2026-04-25T02:00:00.000Z',
      generateText: vi.fn().mockResolvedValue(JSON.stringify({ items: [] })),
    })).resolves.toEqual(expect.objectContaining({
      status: 'partial',
      errorMessage: 'LLM review returned an invalid findings payload.',
    }))

    await expect(runDocumentLlmReview(document, makeReport(document), {
      generatedAt: '2026-04-25T02:00:00.000Z',
      generateText: vi.fn().mockResolvedValue(JSON.stringify({
        findings: [{
          category: 'style',
          severity: 'warning',
          title: 'Unsafe patch',
          message: 'Patch content.',
          content: 'Unsafe replacement.',
        }],
      })),
    })).resolves.toEqual(expect.objectContaining({
      status: 'partial',
      errorMessage: 'LLM review findings were rejected by sanitizer.',
    }))
  })
})
