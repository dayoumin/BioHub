/**
 * 프로젝트 산출물(entity) 해석기
 *
 * ProjectEntityRef를 받아 실제 저장소에서 데이터를 로드하고,
 * UI에서 사용할 수 있는 EntitySummary로 변환한다.
 *
 * 배치 최적화: analysis(IndexedDB), blast-result(localStorage)는
 * 전체 로드 후 Map 캐싱 → 개별 ref를 O(1) resolve. N+1 방지.
 *
 * === 새 entityKind 추가 시 ===
 * Full support: EntityKindDescriptors + switch case + entity-loader.ts ENTITY_LOADERS
 * Generic-only: _GENERIC_ONLY_KINDS에 등록
 * → 누락 시 컴파일 에러 발생
 */

import type { ProjectEntityRef, ProjectEntityKind } from '@/lib/types/research'
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

export interface AnalysisRawData {
  kind: 'analysis'
  apaFormat?: string | null
  results: Record<string, unknown> | null
  methodId?: string
  methodCategory?: string
}

export interface BlastRawData {
  kind: 'blast-result'
  status: string
  description: string
  topHits: Array<{ species: string; identity: number; accession: string }>
}

export type EntityRawData = AnalysisRawData | BlastRawData

export interface ResolvedEntity {
  ref: ProjectEntityRef
  loaded: boolean
  summary: EntitySummary
  rawData?: EntityRawData
}

// ── 외부 데이터 최소 인터페이스 (import 순환 방지) ──

export interface HistoryRecordLike {
  id: string
  timestamp: number
  method: { id: string; name: string; category: string } | null
  dataFileName: string
  results: Record<string, unknown> | null
  apaFormat?: string | null
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
  resultData?: {
    status: string
    description: string
    topHits: Array<{ species: string; identity: number; accession: string }>
  }
}

// ── 유틸 ──

/**
 * ref.createdAt 정규화.
 * 모든 계층에서 string(ISO 8601)로 통일됨.
 * number 입력은 하위호환용 (기존 localStorage 데이터).
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

export function extractNumber(obj: Record<string, unknown> | null, key: string): number | undefined {
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
    rawData: {
      kind: 'analysis',
      apaFormat: record.apaFormat ?? null,
      results: record.results,
      methodId: record.method?.id,
      methodCategory: record.method?.category,
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
    rawData: entry.resultData ? {
      kind: 'blast-result',
      status: entry.resultData.status,
      description: entry.resultData.description,
      topHits: entry.resultData.topHits,
    } : undefined,
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

function resolveBioTool(ref: ProjectEntityRef, map: Map<string, BioToolEntryLike>): ResolvedEntity {
  const entry = map.get(ref.entityId)
  if (!entry) return makeGeneric(ref)
  const ts = normalizeTimestamp(entry.createdAt)
  return {
    ref,
    loaded: true,
    summary: {
      title: entry.toolNameEn,
      subtitle: entry.csvFileName,
      date: fmtDate(ts),
      timestamp: ts,
      navigateTo: `/bio-tools?tool=${entry.toolId}&history=${entry.id}`,
      ...kindMeta(ref.entityKind),
    },
  }
}

function resolveDraft(ref: ProjectEntityRef, map: Map<string, DraftEntryLike>): ResolvedEntity {
  const doc = map.get(ref.entityId)
  if (!doc) return makeGeneric(ref)
  const ts = normalizeTimestamp(doc.updatedAt)
  return {
    ref,
    loaded: true,
    summary: {
      title: doc.title,
      subtitle: doc.preset,
      date: fmtDate(ts),
      timestamp: ts,
      navigateTo: `/papers?doc=${doc.id}`,
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

export interface BioToolEntryLike {
  id: string
  toolId: string
  toolNameEn: string
  csvFileName: string
  createdAt: number
}

export interface DraftEntryLike {
  id: string
  title: string
  preset: string
  language: string
  updatedAt: string
}

// ── Kind 분류 (컴파일 타임 안전망) ──

/**
 * 전용 resolver가 있는 kind → option key + 데이터 타입 매핑.
 * full support 추가 시 여기에 엔트리 추가 → switch case + ENTITY_LOADERS도 추가.
 */
interface EntityKindDescriptors {
  analysis: { optionKey: 'analysisHistory'; data: HistoryRecordLike }
  figure: { optionKey: 'graphProjects'; data: GraphProjectLike }
  'blast-result': { optionKey: 'blastHistory'; data: BlastEntryLike }
  'bio-tool-result': { optionKey: 'bioToolHistory'; data: BioToolEntryLike }
  draft: { optionKey: 'draftDocuments'; data: DraftEntryLike }
}

export type SupportedEntityKind = keyof EntityKindDescriptors

/**
 * generic 표시만 하는 kind.
 * ProjectEntityKind에 새 kind 추가 시 EntityKindDescriptors에 넣거나
 * 이 record에 등록해야 컴파일 통과.
 */
type GenericOnlyEntityKind = Exclude<ProjectEntityKind, SupportedEntityKind>

 
const _GENERIC_ONLY_KINDS: Record<GenericOnlyEntityKind, true> = {
  'chat-session': true,
  'species-validation': true,
  'legal-status': true,
  'review-report': true,
  'data-asset': true,
  'sequence-data': true,
  'seq-stats-result': true,
  'similarity-result': true,
  'phylogeny-result': true,
}

/** entity-loader.ts 전용. kind·optionKey·load 반환 타입을 묶는 discriminated union. */
export type EntityLoaderEntry = {
  [K in SupportedEntityKind]: {
    kind: K
    optionKey: EntityKindDescriptors[K]['optionKey']
    load: () => Promise<EntityKindDescriptors[K]['data'][]> | EntityKindDescriptors[K]['data'][]
  }
}[SupportedEntityKind]

export type ResolveOptions = {
  [K in SupportedEntityKind as EntityKindDescriptors[K]['optionKey']]?: EntityKindDescriptors[K]['data'][]
}

/**
 * entity ref 배열을 배치 resolve.
 * 로딩은 entity-loader.ts의 loadEntityHistories()로 중앙 처리.
 *
 * 새 entityKind 추가 시: ResolveOptions 필드 + switch case + entity-loader.ts ENTITY_LOADERS
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
  const bioToolMap = new Map(
    (options.bioToolHistory ?? []).map(e => [e.id, e])
  )
  const draftMap = new Map(
    (options.draftDocuments ?? []).map(d => [d.id, d])
  )

  return refs.map(ref => {
    switch (ref.entityKind) {
      case 'analysis':
        return resolveAnalysis(ref, analysisMap)
      case 'figure':
        return resolveFigure(ref, graphMap)
      case 'blast-result':
        return resolveBlast(ref, blastMap)
      case 'bio-tool-result':
        return resolveBioTool(ref, bioToolMap)
      case 'draft':
        return resolveDraft(ref, draftMap)
      default: {
        // exhaustive check: SupportedEntityKind 누락 시 컴파일 에러
        const _kind: GenericOnlyEntityKind = ref.entityKind
        void _kind
        return makeGeneric(ref)
      }
    }
  })
}

