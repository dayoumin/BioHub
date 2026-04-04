/**
 * 프로젝트 시스템 공유 타입
 *
 * 모든 앱(stats, genetics, graph-studio)이 공유하는 프로젝트 데이터 모델.
 * 기존 stats/lib/types/research.ts의 ResearchProject를 기반으로 확장.
 */

export type ProjectStatus = 'active' | 'archived'

export type ProjectDomain =
  | 'general'
  | 'biology'
  | 'marine'
  | 'aquaculture'
  | 'microbiology'

export type ProjectEntityKind =
  | 'analysis'
  | 'figure'
  | 'bio-tool-result'
  | 'draft'
  | 'chat-session'
  | 'species-validation'
  | 'legal-status'
  | 'review-report'
  | 'data-asset'
  | 'blast-result'
  | 'sequence-data'
  | 'seq-stats-result'
  | 'similarity-result'
  | 'phylogeny-result'
  | 'bold-result'

export interface ProjectPaperConfig {
  title?: string
  authors?: string[]
  language?: 'ko' | 'en'
  researchContext?: string
  targetJournal?: string
}

export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  status: ProjectStatus
  primaryDomain?: ProjectDomain
  tags?: string[]
  paperConfig?: ProjectPaperConfig
  presentation?: {
    emoji?: string
    color?: string
  }
  /** ISO 8601 문자열. DB/localStorage 모두 string 저장. */
  createdAt: string
  updatedAt: string
}

export interface ProjectEntityRef {
  id: string
  projectId: string
  entityKind: ProjectEntityKind
  entityId: string
  label?: string
  order?: number
  /** ISO 8601 문자열. */
  createdAt: string
  updatedAt?: string
}
