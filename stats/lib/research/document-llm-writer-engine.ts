import { useSettingsStore } from '@/lib/stores/settings-store'
import type { DocumentWriterQuality } from '@/lib/stores/settings-store'
import { openRouterRecommender } from '@/lib/services/recommenders/openrouter-recommender'
import { ollamaRecommender } from '@/lib/services/recommenders/ollama-recommender'
import type { SectionWritingContext } from './document-section-writing-context'
import type {
  DocumentWriterEngine,
  DocumentWriterProvider,
  DocumentWriterRequest,
  DocumentWriterResult,
} from './document-writer-engine'
import { templateDocumentWriterEngine } from './document-writer-engine'

interface PromptPair {
  systemPrompt: string
  userPrompt: string
}

function formatList(items: readonly string[]): string {
  return items.length > 0 ? items.join('\n') : '- None'
}

function formatSourceLines(context: SectionWritingContext): string[] {
  return context.sources.map((source) => {
    const summary = source.results ?? source.methods ?? source.summary ?? source.supplementaryMarkdown ?? ''
    return [
      `- sourceId: ${source.sourceId}`,
      `  title: ${source.title}`,
      `  type: ${source.sourceType}`,
      summary ? `  summary: ${summary}` : null,
    ].filter((line): line is string => line !== null).join('\n')
  })
}

function formatSupportLines(context: SectionWritingContext): string[] {
  return context.supportItems.map((item) => {
    const citationIds = item.citationIds.length > 0 ? item.citationIds.join(', ') : item.sourceId
    return [
      `- supportId: ${item.id}`,
      `  role: ${item.role}`,
      `  label: ${item.label}`,
      `  citationIds: ${citationIds}`,
      item.summary ? `  claim: ${item.summary}` : null,
      item.excerpt ? `  excerpt: ${item.excerpt}` : null,
    ].filter((line): line is string => line !== null).join('\n')
  })
}

function buildWriterPrompts(context: SectionWritingContext): PromptPair {
  const systemPrompt = context.language === 'ko'
    ? [
        '당신은 생물통계/연구 논문 작성을 돕는 전문 scientific writing assistant입니다.',
        '제공된 섹션 writing context만 사용하세요.',
        '근거가 부족하면 단정하지 말고 제한적으로 표현하세요.',
        'support note 목록 자체를 그대로 복사하지 말고, 문단형 manuscript body로 작성하세요.',
        '가능한 경우 제공된 citation marker를 문장 끝에 유지하세요. 새로운 참고문헌은 만들지 마세요.',
      ].join('\n')
    : [
        'You are a scientific writing assistant for biostatistics and research manuscripts.',
        'Use only the provided section writing context.',
        'Do not overstate unsupported claims.',
        'Do not copy the support-note list verbatim; write manuscript-ready prose.',
        'Preserve provided citation intent where possible. Do not invent new references.',
      ].join('\n')

  const userPrompt = [
    `Document: ${context.documentTitle}`,
    `Section: ${context.sectionTitle} (${context.sectionKind})`,
    `Language: ${context.language}`,
    `Writing goal: ${context.writingGoal}`,
    '',
    'Journal/style requirements:',
    formatList(context.journalRequirements),
    '',
    'Linked sources:',
    formatList(formatSourceLines(context)),
    '',
    'Literature/support claims:',
    formatList(formatSupportLines(context)),
    '',
    'Existing content:',
    context.existingContent.trim() || '- None',
    '',
    'Task:',
    context.language === 'ko'
      ? '위 자료를 바탕으로 이 섹션에 들어갈 간결한 논문 본문 초안을 작성하세요. Markdown heading은 쓰지 마세요.'
      : 'Draft concise manuscript body text for this section from the context above. Do not include a Markdown heading.',
  ].join('\n')

  return { systemPrompt, userPrompt }
}

function getGenerationOptions(
  quality: DocumentWriterQuality | undefined,
): { temperature: number; maxTokens: number } {
  switch (quality) {
    case 'fast':
      return { temperature: 0.15, maxTokens: 900 }
    case 'careful':
      return { temperature: 0.2, maxTokens: 2600 }
    case 'balanced':
    case undefined:
      return { temperature: 0.2, maxTokens: 1800 }
    default: {
      const _exhaustive: never = quality
      return _exhaustive
    }
  }
}

function normalizeGeneratedContent(content: string): string {
  return content
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

async function generateWithProvider(
  provider: DocumentWriterProvider,
  context: SectionWritingContext,
  quality: DocumentWriterQuality | undefined,
): Promise<string | null> {
  const prompts = buildWriterPrompts(context)
  const options = getGenerationOptions(quality)

  if (provider === 'api') {
    return openRouterRecommender.generateRawText(prompts.systemPrompt, prompts.userPrompt, options)
  }

  if (provider === 'local-model') {
    const isAvailable = await ollamaRecommender.checkHealth()
    if (!isAvailable) {
      return null
    }
    return ollamaRecommender.generateRawText(prompts.systemPrompt, prompts.userPrompt, options)
  }

  return null
}

async function writeWithFallback(request: DocumentWriterRequest): Promise<DocumentWriterResult> {
  const providerChain: DocumentWriterProvider[] = request.provider === 'template'
    ? []
    : request.provider === 'api'
      ? ['api', 'local-model']
      : ['local-model', 'api']

  for (const provider of providerChain) {
    const generated = await generateWithProvider(provider, request.context, request.quality)
    const content = generated ? normalizeGeneratedContent(generated) : ''
    if (content) {
      return {
        content,
        provider,
        citationIds: request.context.citationIds,
      }
    }
  }

  return templateDocumentWriterEngine.writeSection({
    provider: 'template',
    context: request.context,
  })
}

export const apiDocumentWriterEngine: DocumentWriterEngine = {
  id: 'api-document-writer',
  provider: 'api',
  writeSection: writeWithFallback,
}

export const localModelDocumentWriterEngine: DocumentWriterEngine = {
  id: 'local-model-document-writer',
  provider: 'local-model',
  writeSection: writeWithFallback,
}

export function getPreferredDocumentWriterProvider(): DocumentWriterProvider {
  const { useOllamaForRecommendation } = useSettingsStore.getState()
  return useOllamaForRecommendation ? 'local-model' : 'api'
}
