import type { DocumentBlueprint, DocumentSection } from './document-blueprint-types'
import {
  DOCUMENT_SECTION_SUPPORT_ROLE_LABELS,
  type DocumentSectionSupportBinding,
} from './document-support-asset-types'

function getIncludedSupportBindings(
  section: DocumentSection,
): DocumentSectionSupportBinding[] {
  return (section.sectionSupportBindings ?? []).filter((binding) => binding.included !== false)
}

export function hasRenderableSectionSupportContent(section: DocumentSection): boolean {
  return getIncludedSupportBindings(section).length > 0
}

export function renderSectionSupportMarkdown(
  section: DocumentSection,
  language: 'ko' | 'en',
): string {
  const bindings = getIncludedSupportBindings(section)
  if (bindings.length === 0) {
    return ''
  }

  const heading = language === 'ko' ? '### 서술 근거 메모' : '### Narrative Support Notes'
  const summaryLabel = language === 'ko' ? '핵심 메모' : 'Claim note'
  const excerptLabel = language === 'ko' ? '발췌 메모' : 'Excerpt note'

  const lines: string[] = [heading, '']
  for (const binding of bindings) {
    const label = binding.label ?? binding.sourceId
    lines.push(`- ${DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[binding.role]}: ${label}`)
    if (binding.summary) {
      lines.push(`  - ${summaryLabel}: ${binding.summary}`)
    }
    if (binding.excerpt) {
      lines.push(`  - ${excerptLabel}: ${binding.excerpt}`)
    }
  }
  return lines.join('\n')
}

function getFirstMarkdownLine(markdown: string): string | null {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? null
}

export function stripRenderedSectionSupportMarkdown(
  content: string,
  supportMarkdown?: string,
): string {
  const supportHeading = supportMarkdown ? getFirstMarkdownLine(supportMarkdown) : null
  const headingCandidates = [
    supportHeading,
    '### Narrative Support Notes',
    '### 서술 근거 메모',
    '### 서술 근거 메모',
    '### ?쒖닠 洹쇨굅 硫붾え',
  ].filter((value): value is string => value !== null)

  const startIndexes = headingCandidates
    .map((heading) => content.indexOf(heading))
    .filter((index) => index >= 0)
  const startIndex = startIndexes.length > 0 ? Math.min(...startIndexes) : -1
  if (startIndex < 0) {
    return content
  }

  const before = content.slice(0, startIndex).trimEnd()
  return before
}

export function buildRenderableSectionContent(
  section: DocumentSection,
  language: 'ko' | 'en',
): string {
  const supportMarkdown = renderSectionSupportMarkdown(section, language)
  return stripRenderedSectionSupportMarkdown(section.content, supportMarkdown)
}

export function buildRenderableDocument(
  document: DocumentBlueprint,
): DocumentBlueprint {
  return {
    ...document,
    sections: document.sections.map((section) => (
      section.id === 'references'
        ? section
        : {
            ...section,
            content: buildRenderableSectionContent(section, document.language),
          }
    )),
  }
}
