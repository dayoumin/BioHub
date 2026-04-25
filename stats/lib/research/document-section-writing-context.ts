import type {
  DocumentBlueprint,
  DocumentSection,
  DocumentSourceRef,
} from './document-blueprint-types'
import {
  DOCUMENT_SECTION_SUPPORT_ROLE_LABELS,
  type DocumentSectionSupportBinding,
} from './document-support-asset-types'
import { renderSectionSupportMarkdown } from './document-support-renderer'
import {
  formatTargetJournalProfileForWriting,
  getDocumentTargetJournalProfileSnapshot,
} from './document-journal-profile'
import type { NormalizedWritingSource } from './document-writing-source-types'

export type DocumentWritingSectionKind =
  | 'introduction'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'summary'
  | 'background'
  | 'appendix'
  | 'custom'

export interface SectionWritingSupportItem {
  id: string
  sourceKind: DocumentSectionSupportBinding['sourceKind']
  sourceId: string
  role: DocumentSectionSupportBinding['role']
  roleLabel: string
  label: string
  summary?: string
  excerpt?: string
  citationIds: string[]
}

export interface SectionWritingSourceItem {
  sourceId: string
  sourceType: NormalizedWritingSource['sourceType']
  title: string
  summary?: string
  methods?: string
  results?: string
  supplementaryMarkdown?: string
}

export interface SectionWritingContext {
  documentId: string
  projectId: string
  documentTitle: string
  language: 'ko' | 'en'
  sectionId: string
  sectionTitle: string
  sectionKind: DocumentWritingSectionKind
  existingContent: string
  sourceRefs: DocumentSourceRef[]
  sources: SectionWritingSourceItem[]
  supportItems: SectionWritingSupportItem[]
  supportMarkdown: string
  citationIds: string[]
  writingGoal: string
  journalRequirements: string[]
}

interface BuildSectionWritingContextOptions {
  document: DocumentBlueprint
  section: DocumentSection
  sources?: readonly NormalizedWritingSource[]
}

function classifySectionKind(sectionId: string): DocumentWritingSectionKind {
  switch (sectionId) {
    case 'introduction':
    case 'methods':
    case 'results':
    case 'discussion':
    case 'conclusion':
    case 'summary':
    case 'background':
    case 'appendix':
      return sectionId
    default:
      return 'custom'
  }
}

function getWritingGoal(
  sectionKind: DocumentWritingSectionKind,
  language: 'ko' | 'en',
): string {
  if (language === 'en') {
    switch (sectionKind) {
      case 'introduction':
      case 'background':
        return 'Establish the research background, gap, and purpose using the attached literature support.'
      case 'methods':
        return 'Describe the data, analysis methods, and method references clearly enough to support reproducibility.'
      case 'results':
        return 'Report the linked analysis, figure, and supplementary results without over-interpreting them.'
      case 'discussion':
        return 'Interpret the findings against the attached literature, including comparisons, limitations, and implications.'
      case 'conclusion':
      case 'summary':
        return 'Summarize the main takeaway and practical implication without introducing unsupported claims.'
      case 'appendix':
      case 'custom':
        return 'Draft concise section content grounded in the attached sources and support notes.'
      default: {
        const _exhaustive: never = sectionKind
        return _exhaustive
      }
    }
  }

  switch (sectionKind) {
    case 'introduction':
    case 'background':
      return '첨부된 문헌 근거를 바탕으로 연구 배경, 공백, 목적을 정리합니다.'
    case 'methods':
      return '재현 가능하도록 데이터, 분석 방법, 방법 문헌 근거를 정리합니다.'
    case 'results':
      return '연결된 분석, 그림, 보조 결과를 과도한 해석 없이 보고합니다.'
    case 'discussion':
      return '결과를 문헌과 비교하고 해석, 한계, 시사점을 정리합니다.'
    case 'conclusion':
    case 'summary':
      return '새로운 근거를 추가하지 않고 핵심 결론과 활용 시사점을 요약합니다.'
    case 'appendix':
    case 'custom':
      return '첨부된 자료와 근거 메모를 바탕으로 간결한 섹션 초안을 작성합니다.'
    default: {
      const _exhaustive: never = sectionKind
      return _exhaustive
    }
  }
}

function toSupportItem(binding: DocumentSectionSupportBinding): SectionWritingSupportItem {
  return {
    id: binding.id,
    sourceKind: binding.sourceKind,
    sourceId: binding.sourceId,
    role: binding.role,
    roleLabel: DOCUMENT_SECTION_SUPPORT_ROLE_LABELS[binding.role],
    label: binding.label ?? binding.sourceId,
    summary: binding.summary,
    excerpt: binding.excerpt,
    citationIds: binding.citationIds ?? [],
  }
}

function toSourceItem(source: NormalizedWritingSource): SectionWritingSourceItem {
  return {
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    title: source.title,
    summary: source.artifacts.summary,
    methods: source.artifacts.methods,
    results: source.artifacts.results,
    supplementaryMarkdown: source.artifacts.supplementaryMarkdown,
  }
}

function collectCitationIds(supportItems: readonly SectionWritingSupportItem[]): string[] {
  const citationIds = new Set<string>()
  for (const item of supportItems) {
    for (const citationId of item.citationIds) {
      citationIds.add(citationId)
    }
  }
  return Array.from(citationIds)
}

export function buildSectionWritingContext(
  options: BuildSectionWritingContextOptions,
): SectionWritingContext {
  const { document, section } = options
  const sectionKind = classifySectionKind(section.id)
  const supportItems = (section.sectionSupportBindings ?? [])
    .filter((binding) => binding.included !== false)
    .map(toSupportItem)

  return {
    documentId: document.id,
    projectId: document.projectId,
    documentTitle: document.title,
    language: document.language,
    sectionId: section.id,
    sectionTitle: section.title,
    sectionKind,
    existingContent: section.content,
    sourceRefs: [...section.sourceRefs],
    sources: (options.sources ?? []).map(toSourceItem),
    supportItems,
    supportMarkdown: renderSectionSupportMarkdown(section, document.language),
    citationIds: collectCitationIds(supportItems),
    writingGoal: getWritingGoal(sectionKind, document.language),
    journalRequirements: formatTargetJournalProfileForWriting(
      getDocumentTargetJournalProfileSnapshot(document),
    ),
  }
}
