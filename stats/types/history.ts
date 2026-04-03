/**
 * 통합 히스토리 사이드바 공통 타입
 *
 * 통계 분석, 유전학, Bio-Tools 3개 모듈의
 * 히스토리 데이터를 동일한 UI로 표시하기 위한 정규화 인터페이스.
 */

import type { ReactNode } from 'react'

/** 모듈별 히스토리 항목을 정규화한 공통 인터페이스 */
export interface HistoryItem<T = unknown> {
  /** 고유 ID */
  id: string
  /** 항목 제목 (예: 분석명, 시료명, 파일명) */
  title: string
  /** 부제목 (예: 메서드명, 종명, 도구명) */
  subtitle?: string
  /** 메타데이터 뱃지 배열 (예: p값, 마커, 날짜) */
  badges?: HistoryBadge[]
  /** 핀 고정 여부 */
  pinned: boolean
  /** 생성 시각 (ms timestamp) */
  createdAt: number
  /** 결과 존재 여부 (false면 클릭 비활성) */
  hasResult: boolean
  /** 원본 데이터 — 모듈별 콜백에서 활용 */
  data: T
}

export interface HistoryBadge {
  label: string
  value: string
  /** 뱃지 스타일 힌트 */
  variant?: 'default' | 'primary' | 'muted' | 'mono'
}

/** UnifiedHistorySidebar props */
export interface UnifiedHistorySidebarProps<T = unknown> {
  /** 정규화된 항목 목록 (이미 정렬된 상태) */
  items: HistoryItem<T>[]
  /** 항목 클릭 시 */
  onSelect: (item: HistoryItem<T>) => void
  /** 핀 토글 */
  onPin?: (id: string) => void
  /** 개별 삭제 */
  onDelete?: (id: string) => void
  /** 다중 삭제 */
  onDeleteMultiple?: (ids: Set<string>) => void
  /** 사이드바 제목 (기본: "최근 분석") */
  title?: string
  /** 빈 상태 메시지 */
  emptyMessage?: string
  /** 항목별 커스텀 렌더 (없으면 기본 렌더) */
  renderItem?: (item: HistoryItem<T>) => ReactNode
  /** 헤더 우측 추가 액션 슬롯 (예: 내보내기 버튼) */
  actionSlot?: ReactNode
  /** 헤더 아래, 목록 위에 표시되는 툴바 슬롯 (예: 검색, 필터) */
  toolbarSlot?: ReactNode
  /** 현재 활성 항목 ID */
  activeId?: string | null
  /** 접기/펼치기 초기 상태 */
  defaultOpen?: boolean
}
