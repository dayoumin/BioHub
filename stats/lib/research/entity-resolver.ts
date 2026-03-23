/**
 * 프로젝트 산출물(entity) 해석기
 *
 * ProjectEntityRef를 받아 실제 저장소에서 데이터를 로드하고,
 * UI에서 사용할 수 있는 EntitySummary로 변환한다.
 *
 * 배치 최적화: analysis(IndexedDB), blast-result(localStorage)는
 * 전체 로드 후 Map 캐싱 → 개별 ref를 O(1) resolve. N+1 방지.
 *
 * 새 entityKind 추가 시 resolveEntities()의 switch에 case 추가.
 */

import type { ProjectEntityRef, ProjectEntityKind } from '@/lib/types/research'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { getTabEntry } from '@/lib/research/entity-tab-registry'
import { formatTimeAgo } from '@/lib/utils/format-time'

// ── 공통 타입 ──

export interface EntitySummary {
  title: string
  subtitle?: string
  badge?: { label: string; variant: 'default' | 'success' | 'warning' }
  /** 표시용 상대 시간 ("3일 전") */
  date: string
  /** 정렬/필터용 원시 타임스탬프 (Unix ms) */
  timestamp: number
  /** 원본 이동 URL (deep-link 포함) */
  navigateTo?: string
  /** entityKind 아이콘 (전체 탭에서 종류 구분용) */
  kindIcon?: string
  kindLabel?: string
}

export interface ResolvedEntity {
  ref: ProjectEntityRef
  loaded: boolean
  summary: EntitySummary
}

// ── 외부 데이터 최소 인터페이스 (import 순환 방지) ──

export interface HistoryRecordLike {
  id: string
  timestamp: number
  method: { id: string; name: string; category: string } | null
  dataFileName: string
  results: Record<string, unknown> | null
}

export interface GraphProjectLike {
  id: string
  name: string
  chartSpec?: { chartType?: string }
  updatedAt?: string
  createdAt: string
}

export interface BlastEntryLike {
  id: string
  sampleName: string
  topSpecies: string | null
  marker: string
  topIdentity: number | null
  status: string | null
  createdAt: number
}

// ── 유틸 ──

/**
 * ref.createdAt 정규화.
 * stats/lib/types/research.ts: string(ISO), packages/types: number(Unix ms).
 * 실제 저장은 new Date().toISOString() (string).
 */
function normalizeTimestamp(value: string | number): number {
  if (typeof value === 'number') return value
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function kindMeta(kind: ProjectEntityKind): { kindIcon?: string; kindLabel?: string } {
  const entry = getTabEntry(kind)
  return entry ? { kindIcon: entry.icon, kindLabel: entry.label } : {}
}

/** APA p값 포맷. paper-templates.ts의 fmtP() 재사용 + "p " 접두사. */
function formatP(p: number): string {
  // fmtP()를 직접 import하면 paper-draft 의존성이 생기므로 인라인 유지.
  // 로직은 fmtP()와 동일: p < .001 → "< .001", 그 외 → "= .xxx"
  if (p < 0.001) return 'p < .001'
  return `p = ${p.toFixed(3).replace(/^0\./, '.')}`
}

function extractNumber(obj: Record<string, unknown> | null, key: string): number | undefined {
  if (!obj) return undefined
  const val = obj[key]
  return typeof val === 'number' && isFinite(val) ? val : undefined
}

function fmtDate(ts: number): string {
  return formatTimeAgo(ts, undefined, 7)
}

// ── kind별 해석 ──

function resolveAnalysis(
  ref: ProjectEntityRef,
  dataMap: Map<string, HistoryRecordLike>,
): ResolvedEntity {
  const record = dataMap.get(ref.entityId)
  if (!record) return makeDangling(ref)

  const title = record.method?.name ?? ref.label ?? '통계 분석'
  const parts: string[] = []

  const pValue = extractNumber(record.results, 'pValue')
  const tStat = extractNumber(record.results, 'tStatistic')
  const fStat = extractNumber(record.results, 'fStatistic')

  if (tStat != null) parts.push(`t = ${tStat.toFixed(2)}`)
  else if (fStat != null) parts.push(`F = ${fStat.toFixed(2)}`)

  if (pValue != null) parts.push(formatP(pValue))
  if (record.dataFileName) parts.push(record.dataFileName)

  const ts = record.timestamp

  return {
    ref,
    loaded: true,
    summary: {
      title,
      subtitle: parts.join(' · ') || undefined,
      badge: pValue != null
        ? pValue < 0.05
          ? { label: '유의함', variant: 'success' }
          : { label: '비유의', variant: 'default' }
        : undefined,
      date: fmtDate(ts),
      timestamp: ts,
      navigateTo: '/',
      ...kindMeta(ref.entityKind),
    },
  }
}

function resolveFigure(
  ref: ProjectEntityRef,
  dataMap: Map<string, GraphProjectLike>,
): ResolvedEntity {
  const project = dataMap.get(ref.entityId)
  if (!project) return makeDangling(ref)

  const ts = normalizeTimestamp(project.updatedAt ?? project.createdAt)

  return {
    ref,
    loaded: true,
    summary: {
      title: project.name || ref.label || '차트',
      subtitle: project.chartSpec?.chartType ?? undefined,
      date: fmtDate(ts),
      timestamp: ts,
      navigateTo: `/graph-studio?project=${encodeURIComponent(ref.entityId)}`,
      ...kindMeta(ref.entityKind),
    },
  }
}

function resolveBlast(
  ref: ProjectEntityRef,
  dataMap: Map<string, BlastEntryLike>,
): ResolvedEntity {
  const entry = dataMap.get(ref.entityId)
  if (!entry) return makeDangling(ref)

  const ts = entry.createdAt
  const parts: string[] = []
  // topIdentity: 0~1 범위 → % 변환. 1 초과면 이미 % 형태로 저장된 것으로 간주.
  if (entry.topIdentity != null) {
    const pct = entry.topIdentity > 1 ? entry.topIdentity : entry.topIdentity * 100
    parts.push(`${pct.toFixed(1)}%`)
  }
  if (entry.marker) parts.push(entry.marker)
  if (entry.status) parts.push(entry.status)

  return {
    ref,
    loaded: true,
    summary: {
      title: entry.topSpecies ?? entry.sampleName ?? ref.label ?? 'BLAST 결과',
      subtitle: parts.join(' · ') || undefined,
      badge: entry.status === 'high'
        ? { label: '확정', variant: 'success' }
        : entry.status === 'ambiguous'
          ? { label: '모호', variant: 'warning' }
          : entry.status === 'low'
            ? { label: '저신뢰', variant: 'warning' }
            : undefined,
      date: fmtDate(ts),
      timestamp: ts,
      navigateTo: `/genetics/barcoding?history=${encodeURIComponent(ref.entityId)}`,
      ...kindMeta(ref.entityKind),
    },
  }
}

function makeDangling(ref: ProjectEntityRef): ResolvedEntity {
  const ts = normalizeTimestamp(ref.createdAt)
  return {
    ref,
    loaded: false,
    summary: {
      title: ref.label ?? '삭제된 항목',
      subtitle: '원본이 삭제되었습니다',
      date: fmtDate(ts),
      timestamp: ts,
      ...kindMeta(ref.entityKind),
    },
  }
}

function makeGeneric(ref: ProjectEntityRef): ResolvedEntity {
  const ts = normalizeTimestamp(ref.createdAt)
  return {
    ref,
    loaded: true,
    summary: {
      title: ref.label ?? ref.entityKind,
      date: fmtDate(ts),
      timestamp: ts,
      ...kindMeta(ref.entityKind),
    },
  }
}

// ── 공개 API ──

export interface ResolveOptions {
  analysisHistory?: HistoryRecordLike[]
  graphProjects?: GraphProjectLike[]
  blastHistory?: BlastEntryLike[]
}

/**
 * entity ref 배열을 배치 resolve.
 * 호출부에서 저장소 데이터를 미리 로드해서 options로 전달.
 */
export function resolveEntities(
  refs: ProjectEntityRef[],
  options: ResolveOptions,
): ResolvedEntity[] {
  const analysisMap = new Map(
    (options.analysisHistory ?? []).map(r => [r.id, r])
  )
  const graphMap = new Map(
    (options.graphProjects ?? []).map(p => [p.id, p])
  )
  const blastMap = new Map(
    (options.blastHistory ?? []).map(e => [e.id, e])
  )

  return refs.map(ref => {
    switch (ref.entityKind) {
      case 'analysis':
        return resolveAnalysis(ref, analysisMap)
      case 'figure':
        return resolveFigure(ref, graphMap)
      case 'blast-result':
        return resolveBlast(ref, blastMap)
      default:
        return makeGeneric(ref)
    }
  })
}

/**
 * 특정 프로젝트의 모든 entity를 resolve.
 * refs는 project-storage에서 로드.
 */
export function resolveProjectEntities(
  projectId: string,
  options: ResolveOptions,
): ResolvedEntity[] {
  const refs = listProjectEntityRefs(projectId)
  return resolveEntities(refs, options)
}
