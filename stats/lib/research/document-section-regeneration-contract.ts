export const DOCUMENT_SECTION_REGENERATION_SUPPORTED_SECTION_IDS = ['methods', 'results'] as const

export type DocumentSectionRegenerationSectionId =
  (typeof DOCUMENT_SECTION_REGENERATION_SUPPORTED_SECTION_IDS)[number]

export const DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE = 'regenerate'
export const DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE = 'refresh-linked-sources'

export const DOCUMENT_SECTION_REGENERATION_MODES = [
  DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE,
  DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE,
] as const

export type DocumentSectionRegenerationMode = (typeof DOCUMENT_SECTION_REGENERATION_MODES)[number]

export const DOCUMENT_SECTION_REGENERATION_UX_CONTRACT = {
  supportedSectionIds: DOCUMENT_SECTION_REGENERATION_SUPPORTED_SECTION_IDS,
  destructiveMode: DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE,
  bodyPreservingMode: DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE,
  destructiveModeRequiresConfirmation: true,
  bodyPreservingModePreservesBody: true,
  editorDisabledWhilePending: true,
  blocksConcurrentSectionJobs: true,
} as const

export function isDocumentSectionRegenerationSectionId(
  sectionId: string,
): sectionId is DocumentSectionRegenerationSectionId {
  return DOCUMENT_SECTION_REGENERATION_SUPPORTED_SECTION_IDS.includes(
    sectionId as DocumentSectionRegenerationSectionId,
  )
}
