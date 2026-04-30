/**
 * 프로젝트 상세 페이지 탭 레지스트리
 *
 * 새 entityKind 추가 시 ENTITY_TAB_REGISTRY에 한 줄만 추가하면
 * 탭 자동 생성 + "전체" 탭 표시 + 검색/필터 동작.
 *
 * 완전 지원(요약/액션/보고서)은 entity-resolver.ts + report-export.ts 추가 필요.
 */

import type { ProjectEntityKind } from '@/lib/types/research'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

// ── 탭 정의 ──

export interface EntityTabEntry {
  readonly id: ProjectEntityKind
  readonly label: string
  readonly icon: string
  readonly defaultVisible: boolean
  /** 빈 상태에서 보여줄 안내 메시지 */
  readonly emptyMessage: string
  /** 빈 상태에서 연결할 도구 경로 (선택) */
  readonly emptyActionPath?: string
  /** 빈 상태 액션 라벨 */
  readonly emptyActionLabel?: string
}

export const ENTITY_TAB_REGISTRY: readonly EntityTabEntry[] = [
  {
    id: 'analysis',
    label: '통계 분석',
    icon: '📈',
    defaultVisible: true,
    emptyMessage: '아직 통계 분석이 없습니다.',
    emptyActionPath: '/',
    emptyActionLabel: '분석 시작하기',
  },
  {
    id: 'figure',
    label: '그래프',
    icon: '📊',
    defaultVisible: true,
    emptyMessage: '아직 그래프가 없습니다.',
    emptyActionPath: '/graph-studio',
    emptyActionLabel: 'Graph Studio 열기',
  },
  {
    id: 'bio-tool-result',
    label: 'Bio-Tools',
    icon: '🧪',
    defaultVisible: true,
    emptyMessage: '아직 Bio-Tools 분석 결과가 없습니다.',
    emptyActionPath: '/bio-tools',
    emptyActionLabel: 'Bio-Tools 열기',
  },
  {
    id: 'blast-result',
    label: '종 동정 · BLAST',
    icon: '🧬',
    defaultVisible: true,
    emptyMessage: '아직 종 동정/BLAST 분석이 없습니다.',
    emptyActionPath: '/genetics/barcoding',
    emptyActionLabel: '종 동정 시작하기',
  },
  {
    id: 'seq-stats-result',
    label: '서열 통계',
    icon: '📊',
    defaultVisible: true,
    emptyMessage: '아직 서열 통계 분석이 없습니다.',
    emptyActionPath: '/genetics/seq-stats',
    emptyActionLabel: '서열 통계 시작하기',
  },
  {
    id: 'similarity-result',
    label: '유사도 행렬',
    icon: '📈',
    defaultVisible: true,
    emptyMessage: '아직 유사도 분석이 없습니다.',
    emptyActionPath: '/genetics/similarity',
    emptyActionLabel: '유사도 분석 시작하기',
  },
  {
    id: 'phylogeny-result',
    label: '계통수',
    icon: '🌳',
    defaultVisible: true,
    emptyMessage: '아직 계통수 분석이 없습니다.',
    emptyActionPath: '/genetics/phylogeny',
    emptyActionLabel: '계통수 분석 시작하기',
  },
  {
    id: 'bold-result',
    label: 'BOLD 종 동정',
    icon: '🔍',
    defaultVisible: true,
    emptyMessage: '아직 BOLD 종 동정이 없습니다.',
    emptyActionPath: '/genetics/bold-id',
    emptyActionLabel: 'BOLD 분석 시작하기',
  },
  {
    id: 'protein-result',
    label: '단백질 해석',
    icon: '🧫',
    defaultVisible: true,
    emptyMessage: '아직 단백질 해석 결과가 없습니다.',
    emptyActionPath: '/genetics/protein',
    emptyActionLabel: '단백질 분석 시작하기',
  },
  {
    id: 'translation-result',
    label: '번역/ORF',
    icon: '🧬',
    defaultVisible: true,
    emptyMessage: '아직 번역/ORF 분석 결과가 없습니다.',
    emptyActionPath: '/genetics/translation',
    emptyActionLabel: '번역 분석 시작하기',
  },
  {
    id: 'chat-session',
    label: '대화',
    icon: '💬',
    defaultVisible: false,
    emptyMessage: '아직 저장된 대화가 없습니다.',
  },
  {
    id: 'species-validation',
    label: '종 검증',
    icon: '📝',
    defaultVisible: false,
    emptyMessage: '아직 종 검증이 없습니다.',
  },
  {
    id: 'legal-status',
    label: '법적 지위',
    icon: '⚖️',
    defaultVisible: false,
    emptyMessage: '아직 법적 지위 확인이 없습니다.',
  },
  {
    id: 'draft',
    label: '문서',
    icon: '📄',
    defaultVisible: true,
    emptyMessage: '아직 문서가 없습니다.',
    emptyActionPath: '/papers',
    emptyActionLabel: '문서 만들기',
  },
  {
    id: 'review-report',
    label: '리뷰 보고서',
    icon: '📋',
    defaultVisible: false,
    emptyMessage: '아직 리뷰 보고서가 없습니다.',
  },
  {
    id: 'data-asset',
    label: '데이터',
    icon: '📁',
    defaultVisible: false,
    emptyMessage: '아직 데이터가 없습니다.',
  },
  {
    id: 'sequence-data',
    label: '서열 데이터',
    icon: '🧪',
    defaultVisible: false,
    emptyMessage: '아직 서열 데이터가 없습니다.',
  },
]

// ── 탭 설정 (표시/숨김) ──

const TAB_SETTINGS_KEY = STORAGE_KEYS.research.tabSettings
const { readJson, writeJson } = createLocalStorageIO('[entity-tab-registry]')

export type TabVisibilityMap = Partial<Record<ProjectEntityKind, boolean>>

/** 저장된 탭 설정 로드. 없으면 defaultVisible 기반 초기값 반환. */
export function loadTabSettings(): TabVisibilityMap {
  const defaults = getDefaultTabSettings()
  const saved = readJson<unknown>(TAB_SETTINGS_KEY, null)
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) {
    return defaults
  }
  const map = saved as TabVisibilityMap

  // 레지스트리에 새로 추가된 kind가 있으면 defaultVisible로 보충
  const result: TabVisibilityMap = {}
  for (const entry of ENTITY_TAB_REGISTRY) {
    result[entry.id] = map[entry.id] ?? entry.defaultVisible
  }
  return result
}

/** 탭 설정 저장 */
export function saveTabSettings(settings: TabVisibilityMap): void {
  try {
    writeJson(TAB_SETTINGS_KEY, settings)
  } catch {
    // SSR 또는 quota 초과 — 무시 (기존 동작 유지)
  }
}

/** 기본 탭 설정 (defaultVisible 기반) */
export function getDefaultTabSettings(): TabVisibilityMap {
  const result: TabVisibilityMap = {}
  for (const entry of ENTITY_TAB_REGISTRY) {
    result[entry.id] = entry.defaultVisible
  }
  return result
}

/** 현재 설정에서 보이는 탭만 필터 */
export function getVisibleTabs(settings: TabVisibilityMap): EntityTabEntry[] {
  return ENTITY_TAB_REGISTRY.filter(entry => settings[entry.id] === true)
}

/** entityKind로 레지스트리 항목 조회 */
export function getTabEntry(kind: ProjectEntityKind): EntityTabEntry | undefined {
  return ENTITY_TAB_REGISTRY.find(entry => entry.id === kind)
}
