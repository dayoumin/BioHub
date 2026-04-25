/**
 * DocumentBlueprint 프리셋 레지스트리
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §2.3
 * 구현 계획: Phase 1
 */

import type {
  DocumentPreset,
  DocumentSection,
  DocumentSectionBlueprintDefinition,
} from './document-blueprint-types'

// ── 섹션 정의 타입 ──

interface SectionTemplate {
  id: string
  title: { ko: string; en: string }
  editable: boolean
  generatedBy: DocumentSection['generatedBy']
}

// ── 프리셋별 섹션 구조 ──

const PAPER_SECTIONS: SectionTemplate[] = [
  { id: 'introduction', title: { ko: '서론', en: 'Introduction' }, editable: true, generatedBy: 'user' },
  { id: 'methods', title: { ko: '연구 방법', en: 'Methods' }, editable: true, generatedBy: 'template' },
  { id: 'results', title: { ko: '결과', en: 'Results' }, editable: true, generatedBy: 'template' },
  { id: 'discussion', title: { ko: '고찰', en: 'Discussion' }, editable: true, generatedBy: 'user' },
  { id: 'references', title: { ko: '참고문헌', en: 'References' }, editable: true, generatedBy: 'template' },
]

const REPORT_SECTIONS: SectionTemplate[] = [
  { id: 'summary', title: { ko: '요약', en: 'Summary' }, editable: true, generatedBy: 'user' },
  { id: 'background', title: { ko: '연구 배경 및 목적', en: 'Background and Objectives' }, editable: true, generatedBy: 'user' },
  { id: 'methods', title: { ko: '분석 방법', en: 'Methods' }, editable: true, generatedBy: 'template' },
  { id: 'results', title: { ko: '분석 결과', en: 'Results' }, editable: true, generatedBy: 'template' },
  { id: 'conclusion', title: { ko: '결론 및 제언', en: 'Conclusion' }, editable: true, generatedBy: 'user' },
  { id: 'appendix', title: { ko: '부록', en: 'Appendix' }, editable: true, generatedBy: 'user' },
]

const CUSTOM_SECTIONS: SectionTemplate[] = [
  { id: 'section-1', title: { ko: '섹션 1', en: 'Section 1' }, editable: true, generatedBy: 'user' },
]

const PRESET_SECTIONS: Record<DocumentPreset, SectionTemplate[]> = {
  paper: PAPER_SECTIONS,
  report: REPORT_SECTIONS,
  custom: CUSTOM_SECTIONS,
}

// ── 프리셋 메타정보 ──

export interface PresetInfo {
  id: DocumentPreset
  label: { ko: string; en: string }
  description: { ko: string; en: string }
  sectionCount: number
}

export const PRESET_REGISTRY: PresetInfo[] = [
  {
    id: 'paper',
    label: { ko: '학술 논문', en: 'Academic Paper' },
    description: { ko: 'Introduction → Methods → Results → Discussion → References', en: 'Introduction → Methods → Results → Discussion → References' },
    sectionCount: PAPER_SECTIONS.length,
  },
  {
    id: 'report',
    label: { ko: '연구 보고서', en: 'Research Report' },
    description: { ko: '요약 → 배경 → 방법 → 결과 → 결론 → 부록', en: 'Summary → Background → Methods → Results → Conclusion → Appendix' },
    sectionCount: REPORT_SECTIONS.length,
  },
  {
    id: 'custom',
    label: { ko: '자유 형식', en: 'Custom' },
    description: { ko: '빈 섹션에서 자유롭게 구성', en: 'Start with an empty section and build freely' },
    sectionCount: CUSTOM_SECTIONS.length,
  },
]

// ── 공개 API ──

function buildFallbackSectionId(index: number): string {
  return `section-${index + 1}`
}

function normalizeSectionId(input: string, index: number): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || buildFallbackSectionId(index)
}

export function createSectionBlueprints(
  preset: DocumentPreset,
  language: 'ko' | 'en',
  customBlueprints?: readonly DocumentSectionBlueprintDefinition[],
): DocumentSectionBlueprintDefinition[] {
  if (!customBlueprints || customBlueprints.length === 0) {
    return PRESET_SECTIONS[preset].map((template) => ({
      id: template.id,
      title: template.title[language],
      editable: template.editable,
      generatedBy: template.generatedBy,
    }))
  }

  const usedIds = new Set<string>()

  return customBlueprints.map((blueprint, index) => {
    const title = blueprint.title.trim() || `섹션 ${index + 1}`
    const requestedId = blueprint.id && blueprint.id.trim().length > 0
      ? blueprint.id.trim()
      : title

    let id = normalizeSectionId(requestedId, index)
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${normalizeSectionId(requestedId, index)}-${suffix}`
      suffix += 1
    }
    usedIds.add(id)

    return {
      id,
      title,
      editable: blueprint.editable ?? true,
      generatedBy: blueprint.generatedBy,
    }
  })
}

/**
 * 프리셋과 언어에 따른 빈 섹션 구조 생성
 */
export function createEmptySections(
  preset: DocumentPreset,
  language: 'ko' | 'en',
  options?: {
    sectionBlueprints?: readonly DocumentSectionBlueprintDefinition[]
  },
): DocumentSection[] {
  const templates = createSectionBlueprints(preset, language, options?.sectionBlueprints)
  return templates.map((template) => ({
    id: template.id ?? buildFallbackSectionId(0),
    title: template.title,
    content: '',
    sourceRefs: [],
    tables: undefined,
    figures: undefined,
    editable: template.editable ?? true,
    generatedBy: template.generatedBy,
  }))
}

/**
 * 프리셋 목록 조회
 */
export function getPresetRegistry(): readonly PresetInfo[] {
  return PRESET_REGISTRY
}
