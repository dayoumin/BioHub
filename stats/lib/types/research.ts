/**
 * Shared research workflow types.
 *
 * These types sit above feature-specific records such as HistoryRecord,
 * GraphProject, and PaperDraft, and define the cross-module project and
 * provenance model.
 *
 * ProjectEntityKind is re-exported from @biohub/types (canonical source).
 */

import type { ProjectEntityKind } from '@biohub/types'
export type { ProjectEntityKind }

export type ResearchDomain =
  | 'general'
  | 'biology'
  | 'marine'
  | 'aquaculture'
  | 'microbiology'

export type ResearchProjectStatus = 'active' | 'archived'

export interface ResearchPaperConfig {
  title?: string
  authors?: string[]
  language?: 'ko' | 'en'
  researchContext?: string
  targetJournal?: string
}

export interface ResearchProject {
  id: string
  name: string
  description?: string
  status: ResearchProjectStatus
  primaryDomain?: ResearchDomain
  tags?: string[]
  presentation?: {
    emoji?: string
    color?: string
  }
  paperConfig?: ResearchPaperConfig
  createdAt: string
  updatedAt: string
}

/**
 * Normalized project-to-entity linkage.
 * Keep payloads in their specialized records and reference them from the
 * project layer instead of duplicating them here.
 */
export interface ProjectEntityRef {
  id: string
  projectId: string
  entityKind: ProjectEntityKind
  entityId: string
  label?: string
  order?: number
  createdAt: string
  updatedAt?: string
}

export type EvidenceOwnerKind =
  | 'analysis'
  | 'figure'
  | 'draft'
  | 'blast-result'
  | 'species-validation'
  | 'legal-status'
  | 'review-report'
  | 'chat-message'

export type EvidenceKind =
  | 'ai-interpretation'
  | 'ai-edit'
  | 'method-rationale'
  | 'rule-decision'
  | 'reproducible-code'
  | 'external-source'
  | 'review-check'

export type EvidenceGeneratorType = 'llm' | 'rule' | 'template' | 'external-api' | 'manual'

export type EvidenceSourceKind =
  | 'dataset'
  | 'analysis'
  | 'figure'
  | 'db-record'
  | 'api'
  | 'paper'
  | 'user-input'

export interface EvidenceGenerator {
  type: EvidenceGeneratorType
  provider?: string
  model?: string
  version?: string
}

export interface EvidenceInputRef {
  kind: EvidenceSourceKind
  id?: string
  label?: string
  details?: Record<string, unknown>
}

export interface EvidenceSourceRef {
  sourceName: string
  sourceType: 'database' | 'api' | 'document' | 'rule' | 'code'
  sourceId?: string
  url?: string
  jurisdiction?: string
  checkedAt?: string
  version?: string
}

export interface EvidenceRecord {
  id: string
  ownerKind: EvidenceOwnerKind
  ownerId: string
  kind: EvidenceKind
  title?: string
  summary?: string
  generator: EvidenceGenerator
  inputs?: EvidenceInputRef[]
  sources?: EvidenceSourceRef[]
  generatedAt: string
  metadata?: Record<string, unknown>
}
