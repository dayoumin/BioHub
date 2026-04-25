import { openRouterRecommender } from '@/lib/services/recommenders/openrouter-recommender'
import type { DocumentBlueprint } from './document-blueprint-types'
import type { DocumentQualityReport } from './document-quality-types'
import { getDocumentTargetJournalProfileSnapshot } from './document-journal-profile'
import { sanitizeDocumentLlmReviewFindings } from './document-llm-review-sanitizer'
import { mergeDocumentLlmReviewFindingsIntoReport } from './document-llm-review-report'

export interface DocumentLlmReviewGenerateOptions {
  temperature: number
  maxTokens: number
}

export type DocumentLlmReviewGenerateText = (
  systemPrompt: string,
  userPrompt: string,
  options: DocumentLlmReviewGenerateOptions,
) => Promise<string | null>

export interface RunDocumentLlmReviewOptions {
  generatedAt: string
  generateText?: DocumentLlmReviewGenerateText
}

function stripJsonFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseRawFindings(rawText: string): readonly unknown[] {
  const parsed = JSON.parse(stripJsonFence(rawText)) as unknown
  if (Array.isArray(parsed)) {
    return parsed
  }
  if (isRecord(parsed) && Array.isArray(parsed.findings)) {
    return parsed.findings
  }
  throw new Error('LLM review returned an invalid findings payload.')
}

function buildReviewSystemPrompt(): string {
  return [
    'You are a cautious scientific manuscript reviewer.',
    'Return strict JSON only: {"findings":[...]}',
    'Allowed categories: flow, style, mechanics, other.',
    'Do not edit citations, references, source-bound statistics, tables, figures, or document structure.',
    'Suggestions must be wording-only and must not include p-values, sample sizes, DOI, citation IDs, table numbers, or figure numbers.',
  ].join('\n')
}

function buildReviewUserPrompt(document: DocumentBlueprint): string {
  const journalProfile = getDocumentTargetJournalProfileSnapshot(document)
  const sections = document.sections.map((section) => [
    `sectionId: ${section.id}`,
    `title: ${section.title}`,
    `content: ${section.content}`,
  ].join('\n')).join('\n\n')

  return [
    `Document title: ${document.title}`,
    `Language: ${document.language}`,
    journalProfile ? `Journal/style profile: ${journalProfile.label} (${journalProfile.stylePreset})` : 'Journal/style profile: none',
    '',
    'Review for whole-flow issues, unclear academic style, overclaiming risk, logic jumps, and mechanics.',
    'For each finding, use: category, severity, title, message, sectionId, suggestion.replacementText when safe.',
    '',
    sections,
  ].join('\n')
}

export async function runDocumentLlmReview(
  document: DocumentBlueprint,
  preflightReport: DocumentQualityReport,
  options: RunDocumentLlmReviewOptions,
): Promise<DocumentQualityReport> {
  const generateText = options.generateText ?? openRouterRecommender.generateRawText.bind(openRouterRecommender)

  try {
    const rawText = await generateText(buildReviewSystemPrompt(), buildReviewUserPrompt(document), {
      temperature: 0.1,
      maxTokens: 1600,
    })
    if (!rawText?.trim()) {
      return mergeDocumentLlmReviewFindingsIntoReport(preflightReport, [], {
        updatedAt: options.generatedAt,
        errorMessage: 'LLM review returned no content.',
      })
    }

    const rawFindings = parseRawFindings(rawText)
    const llmFindings = sanitizeDocumentLlmReviewFindings(document, rawFindings, {
      reportId: preflightReport.id,
      generatedAt: options.generatedAt,
    })
    if (rawFindings.length > 0 && llmFindings.length === 0) {
      return mergeDocumentLlmReviewFindingsIntoReport(preflightReport, [], {
        updatedAt: options.generatedAt,
        errorMessage: 'LLM review findings were rejected by sanitizer.',
      })
    }

    return mergeDocumentLlmReviewFindingsIntoReport(preflightReport, llmFindings, {
      updatedAt: options.generatedAt,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM review failed.'
    return mergeDocumentLlmReviewFindingsIntoReport(preflightReport, [], {
      updatedAt: options.generatedAt,
      errorMessage: message,
    })
  }
}
