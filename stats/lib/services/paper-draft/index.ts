export type {
  PaperSection,
  PaperDraftOptions,
  DraftContext,
  CaptionItem,
  PaperDraft,
  PaperTable,
  DiscussionState,
  FlatAssumption,
  FlatAssumptionCategory,
} from './paper-types'

export { generatePaperDraft } from './paper-draft-service'
export { generatePaperTables } from './paper-tables'
export { fmtP, fmt, getTemplate } from './paper-templates'
export type { TemplateInput, CategoryTemplate } from './paper-templates'
export { getMethodDisplayName } from './terminology-utils'
