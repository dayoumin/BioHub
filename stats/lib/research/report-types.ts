/**
 * 프로젝트 보고서 취합 관련 타입
 */

import type { ProjectEntityRef } from '@/lib/types/research'

/** 보고서에 포함될 단일 섹션 */
export interface ReportSection {
  /** 원본 entity ref */
  ref: ProjectEntityRef
  /** 보고서 내 순서 (0-based) */
  order: number
  /** 포함 여부 */
  include: boolean
  /** 렌더된 콘텐츠 (entity-resolver에서 데이터 로드 후 생성) */
  rendered?: RenderedContent
}

/** 렌더된 섹션 콘텐츠 */
export interface RenderedContent {
  /** 섹션 제목 (예: "독립표본 t-검정") */
  heading: string
  /** 본문 마크다운 */
  body: string
  /** 통계 결과표 (선택) */
  tables?: ReportTable[]
}

/** 보고서 내 표 */
export interface ReportTable {
  caption: string
  headers: string[]
  rows: string[][]
}

/** 보고서 전체 */
export interface ProjectReport {
  /** 보고서 제목 */
  title: string
  /** 소속 프로젝트 ID */
  projectId: string
  /** 언어 */
  language: 'ko' | 'en'
  /** 포함 섹션 (순서 정렬됨) */
  sections: ReportSection[]
  /** 생성 시각 (ISO) */
  generatedAt: string
}
