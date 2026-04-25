import type { SectionWritingContext } from './document-section-writing-context'
import type { DocumentWriterQuality } from '@/lib/stores/settings-store'

export type DocumentWriterProvider = 'template' | 'local-model' | 'api'

export interface DocumentWriterRequest {
  provider: DocumentWriterProvider
  quality?: DocumentWriterQuality
  context: SectionWritingContext
}

export interface DocumentWriterResult {
  content: string
  provider: DocumentWriterProvider
  citationIds: string[]
}

export interface DocumentWriterEngine {
  id: string
  provider: DocumentWriterProvider
  writeSection: (request: DocumentWriterRequest) => Promise<DocumentWriterResult> | DocumentWriterResult
}

function listSupportClaims(context: SectionWritingContext): string[] {
  return context.supportItems.map((item) => {
    const details = [
      `${item.roleLabel}: ${item.label}`,
      item.summary ? `claim=${item.summary}` : null,
      item.excerpt ? `excerpt=${item.excerpt}` : null,
    ].filter((value): value is string => value !== null)
    return `- ${details.join(' | ')}`
  })
}

function listSourceSummaries(context: SectionWritingContext): string[] {
  return context.sources.map((source) => {
    const summary = source.results ?? source.methods ?? source.summary ?? source.supplementaryMarkdown
    return summary
      ? `- ${source.title}: ${summary}`
      : `- ${source.title}`
  })
}

function createTemplateDraft(context: SectionWritingContext): string {
  const heading = context.language === 'ko'
    ? `### ${context.sectionTitle} 작성 입력`
    : `### ${context.sectionTitle} Writing Input`
  const goalLabel = context.language === 'ko' ? '작성 목표' : 'Writing goal'
  const sourceLabel = context.language === 'ko' ? '연결 자료' : 'Linked sources'
  const supportLabel = context.language === 'ko' ? '문헌/근거 메모' : 'Literature support'
  const journalLabel = context.language === 'ko' ? '투고/스타일 요구사항' : 'Journal/style requirements'

  const blocks = [
    heading,
    '',
    `- ${goalLabel}: ${context.writingGoal}`,
  ]

  const sourceSummaries = listSourceSummaries(context)
  if (sourceSummaries.length > 0) {
    blocks.push('', `#### ${sourceLabel}`, '', sourceSummaries.join('\n'))
  }

  if (context.journalRequirements.length > 0) {
    blocks.push('', `#### ${journalLabel}`, '', context.journalRequirements.map((item) => `- ${item}`).join('\n'))
  }

  const supportClaims = listSupportClaims(context)
  if (supportClaims.length > 0) {
    blocks.push('', `#### ${supportLabel}`, '', supportClaims.join('\n'))
  }

  return blocks.join('\n')
}

export const templateDocumentWriterEngine: DocumentWriterEngine = {
  id: 'template-document-writer',
  provider: 'template',
  writeSection: (request) => ({
    content: createTemplateDraft(request.context),
    provider: 'template',
    citationIds: request.context.citationIds,
  }),
}

export function isDocumentWriterProvider(value: unknown): value is DocumentWriterProvider {
  return value === 'template' || value === 'local-model' || value === 'api'
}
