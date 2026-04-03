import type { BlastMarker, BlastResultStatus, BlastProgram, BlastDatabase } from '@biohub/types'
import type { ProjectEntityKind } from '@biohub/types'
import type { DecisionResult } from '@/lib/genetics/decision-engine'
import {
  upsertProjectEntityRef,
  removeProjectEntityRefs,
} from '@/lib/research/project-storage'
import {
  loadCloudGeneticsHistoryRaw,
  upsertCloudGeneticsHistory,
  deleteCloudGeneticsHistory,
  setCloudGeneticsHistoryPin,
} from '@/lib/genetics/genetics-history-cloud'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'

// ═══════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════

export type GeneticsToolType = 'barcoding' | 'blast' | 'genbank'

/** 바코딩 히스토리 (기존 필드 유지) */
export interface BarcodingHistoryEntry {
  id: string
  type: 'barcoding'
  sampleName: string
  marker: BlastMarker
  sequencePreview: string
  topSpecies: string | null
  topIdentity: number | null
  status: BlastResultStatus | null
  pinned?: boolean
  resultData?: DecisionResult
  projectId?: string
  createdAt: number
}

/** BLAST 검색 히스토리 (요약만, hits 미저장) */
export interface BlastSearchHistoryEntry {
  id: string
  type: 'blast'
  program: BlastProgram
  database: BlastDatabase
  /** 전체 서열 (복원 시 재검색 가능). 기존 엔트리에 없으면 빈 문자열. */
  sequence: string
  /** 표시용 미리보기 (50자) */
  sequencePreview: string
  hitCount: number
  topHitAccession: string | null
  topHitSpecies: string | null
  topHitIdentity: number | null
  elapsed: number
  pinned?: boolean
  projectId?: string
  createdAt: number
}

/** GenBank 서열 다운로드 히스토리 */
export interface GenBankHistoryEntry {
  id: string
  type: 'genbank'
  query: string
  db: 'nuccore' | 'protein'
  accession: string
  organism: string | null
  sequenceLength: number
  pinned?: boolean
  projectId?: string
  createdAt: number
}

export type GeneticsHistoryEntry =
  | BarcodingHistoryEntry
  | BlastSearchHistoryEntry
  | GenBankHistoryEntry

/** @deprecated GeneticsHistoryEntry 사용 */
export type AnalysisHistoryEntry = BarcodingHistoryEntry

// ═══════════════════════════════════════════════════════════════
// 상수 + 유틸
// ═══════════════════════════════════════════════════════════════

export const HISTORY_KEY = 'biohub:genetics:history'
export const HISTORY_CHANGE_EVENT = 'genetics-history-changed'

const MAX_PER_TYPE: Record<GeneticsToolType, number> = {
  barcoding: 20,
  blast: 15,
  genbank: 15,
}

/** 히스토리에 저장할 서열 최대 길이 — localStorage quota 보호 (15개 × 2000 = 30KB) */
const MAX_STORED_SEQUENCE_LENGTH = 2000

const { readJson, writeJson } = createLocalStorageIO('[analysis-history]')
let hydratePromise: Promise<GeneticsHistoryEntry[]> | null = null

function entityKindForType(type: GeneticsToolType): ProjectEntityKind {
  return type === 'genbank' ? 'sequence-data' : 'blast-result'
}

// ═══════════════════════════════════════════════════════════════
// 정규화 (하위 호환)
// ═══════════════════════════════════════════════════════════════

/** localStorage에서 읽은 raw 객체를 GeneticsHistoryEntry로 정규화 */
function normalizeEntry(item: unknown): GeneticsHistoryEntry | null {
  if (typeof item !== 'object' || item === null) return null
  const obj = item as Record<string, unknown>
  if (typeof obj.id !== 'string' || typeof obj.createdAt !== 'number') return null

  const type = (obj.type as string) || 'barcoding'

  switch (type) {
    case 'barcoding':
      if (typeof obj.marker !== 'string') return null
      return {
        id: obj.id as string,
        type: 'barcoding',
        sampleName: (obj.sampleName ?? '') as string,
        marker: obj.marker as BlastMarker,
        sequencePreview: (obj.sequencePreview ?? '') as string,
        topSpecies: (obj.topSpecies ?? null) as string | null,
        topIdentity: (obj.topIdentity ?? null) as number | null,
        status: (obj.status ?? null) as BlastResultStatus | null,
        resultData: obj.resultData as DecisionResult | undefined,
        pinned: obj.pinned as boolean | undefined,
        projectId: obj.projectId as string | undefined,
        createdAt: obj.createdAt as number,
      }

    case 'blast':
      if (typeof obj.program !== 'string') return null
      return {
        id: obj.id as string,
        type: 'blast',
        program: obj.program as BlastProgram,
        database: (obj.database ?? 'nt') as BlastDatabase,
        sequence: (obj.sequence ?? '') as string,
        sequencePreview: (obj.sequencePreview ?? '') as string,
        hitCount: (obj.hitCount ?? 0) as number,
        topHitAccession: (obj.topHitAccession ?? null) as string | null,
        topHitSpecies: (obj.topHitSpecies ?? null) as string | null,
        topHitIdentity: (obj.topHitIdentity ?? null) as number | null,
        elapsed: (obj.elapsed ?? 0) as number,
        pinned: obj.pinned as boolean | undefined,
        projectId: obj.projectId as string | undefined,
        createdAt: obj.createdAt as number,
      }

    case 'genbank':
      if (typeof obj.accession !== 'string') return null
      return {
        id: obj.id as string,
        type: 'genbank',
        query: (obj.query ?? '') as string,
        db: (obj.db === 'protein' ? 'protein' : 'nuccore') as 'nuccore' | 'protein',
        accession: obj.accession as string,
        organism: (obj.organism ?? null) as string | null,
        sequenceLength: (obj.sequenceLength ?? 0) as number,
        pinned: obj.pinned as boolean | undefined,
        projectId: obj.projectId as string | undefined,
        createdAt: obj.createdAt as number,
      }

    default:
      return null
  }
}

function parseAll(raw?: string | null): GeneticsHistoryEntry[] {
  try {
    if (raw !== undefined) {
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.map(normalizeEntry).filter((e): e is GeneticsHistoryEntry => e !== null)
    }
    const all = readJson<unknown[]>(HISTORY_KEY, [])
    return all.map(normalizeEntry).filter((e): e is GeneticsHistoryEntry => e !== null)
  } catch {
    return []
  }
}

function sortEntries<T extends { pinned?: boolean; createdAt: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt - a.createdAt
  })
}

/** 타입별 MAX_PER_TYPE cap 적용 — pinned 우선, 최신 순 유지 */
function applyCaps(entries: GeneticsHistoryEntry[]): GeneticsHistoryEntry[] {
  const byType = new Map<GeneticsToolType, GeneticsHistoryEntry[]>()
  for (const e of entries) {
    const arr = byType.get(e.type) ?? []
    arr.push(e)
    byType.set(e.type, arr)
  }

  const result: GeneticsHistoryEntry[] = []
  for (const [type, items] of byType) {
    const sorted = sortEntries(items)
    result.push(...sorted.slice(0, MAX_PER_TYPE[type]))
  }
  return sortEntries(result)
}

function saveToStorage(entries: GeneticsHistoryEntry[]): void {
  writeJson(HISTORY_KEY, entries)
}

function saveToStorageIfChanged(entries: GeneticsHistoryEntry[]): boolean {
  if (typeof window === 'undefined') return false

  const nextJson = JSON.stringify(entries)
  if (localStorage.getItem(HISTORY_KEY) === nextJson) return false
  localStorage.setItem(HISTORY_KEY, nextJson)
  return true
}

function notifyChange(): void {
  window.dispatchEvent(new Event(HISTORY_CHANGE_EVENT))
}

/** 프로젝트에 연결된 entry의 ref를 일괄 정리 — type별 올바른 entityKind 사용 */
function removeRefsForEntries(entries: GeneticsHistoryEntry[]): void {
  const targets = entries
    .filter(e => e.projectId)
    .map(e => ({ projectId: e.projectId!, entityKind: entityKindForType(e.type), entityId: e.id }))
  if (targets.length === 0) return
  try {
    removeProjectEntityRefs(targets)
  } catch {
    // ref 정리 실패는 무시 — dangling ref는 /projects에서 graceful 처리
  }
}

function syncSaveToCloud(entry: GeneticsHistoryEntry): void {
  // Fix: projectId는 로컬 ref 전용 — D1 projects 테이블에 없으므로 cloud에는 null로 전송
  const cloudEntry = entry.projectId
    ? { ...entry, projectId: undefined }
    : entry
  void upsertCloudGeneticsHistory(cloudEntry).catch((error) => {
    console.warn('[genetics-history] cloud save failed:', error)
  })
}

function syncDeleteToCloud(ids: Iterable<string>): void {
  void Promise.all([...ids].map((id) => deleteCloudGeneticsHistory(id))).catch((error) => {
    console.warn('[genetics-history] cloud delete failed:', error)
  })
}

function syncPinToCloud(id: string, pinned: boolean): void {
  void setCloudGeneticsHistoryPin(id, pinned).catch((error) => {
    console.warn('[genetics-history] cloud pin sync failed:', error)
  })
}

function mergeEntries(local: GeneticsHistoryEntry[], remote: GeneticsHistoryEntry[]): GeneticsHistoryEntry[] {
  const merged = new Map<string, GeneticsHistoryEntry>()

  for (const entry of remote) merged.set(entry.id, entry)
  for (const entry of local) merged.set(entry.id, entry)

  return sortEntries([...merged.values()])
}

// ═══════════════════════════════════════════════════════════════
// 공개 API — 신규 (GeneticsHistoryEntry)
// ═══════════════════════════════════════════════════════════════

/** 전체 히스토리 로드. filter로 특정 도구만 조회 가능. */
export function loadGeneticsHistory(filter?: GeneticsToolType, preloadedRaw?: string | null): GeneticsHistoryEntry[] {
  const all = parseAll(preloadedRaw)
  const filtered = filter ? all.filter(e => e.type === filter) : all
  return sortEntries(filtered)
}

let lastHydrateTime = 0
const HYDRATE_TTL_MS = 30_000

/** D1 genetics history를 읽어 로컬 캐시에 병합한다. 로컬 엔트리가 우선한다. */
export async function hydrateGeneticsHistoryFromCloud(): Promise<GeneticsHistoryEntry[]> {
  if (typeof window === 'undefined') return []

  if (hydratePromise) return hydratePromise

  // TTL 내 재호출 시 네트워크 스킵
  if (Date.now() - lastHydrateTime < HYDRATE_TTL_MS) {
    return loadGeneticsHistory()
  }

  hydratePromise = (async () => {
    try {
      const remoteRaw = await loadCloudGeneticsHistoryRaw()
      const remote = remoteRaw
        .map(normalizeEntry)
        .filter((entry): entry is GeneticsHistoryEntry => entry !== null)

      const local = parseAll()
      const merged = mergeEntries(local, remote)

      // Fix: hydration 결과에도 타입별 cap 적용 — D1에 200개까지 내려올 수 있음
      const capped = applyCaps(merged)

      if (saveToStorageIfChanged(capped)) {
        notifyChange()
      }

      lastHydrateTime = Date.now()
      return merged
    } catch (error) {
      console.warn('[genetics-history] cloud hydration failed:', error)
      return loadGeneticsHistory()
    } finally {
      hydratePromise = null
    }
  })()

  return hydratePromise
}

/** 히스토리 저장 입력 타입 — discriminated union의 각 멤버에서 id/createdAt 제외 */
export type SaveGeneticsHistoryInput =
  | Omit<BarcodingHistoryEntry, 'id' | 'createdAt'>
  | Omit<BlastSearchHistoryEntry, 'id' | 'createdAt'>
  | Omit<GenBankHistoryEntry, 'id' | 'createdAt'>

/** 범용 히스토리 저장 — type별 MAX 적용 */
export function saveGeneticsHistory(entry: SaveGeneticsHistoryInput): void {
  const newEntry: GeneticsHistoryEntry = {
    ...entry,
    // BLAST 서열 길이 cap — localStorage quota 보호 (15개 × 2KB = 30KB)
    ...(entry.type === 'blast' && entry.sequence.length > MAX_STORED_SEQUENCE_LENGTH
      ? { sequence: entry.sequence.slice(0, MAX_STORED_SEQUENCE_LENGTH) }
      : {}),
    id: `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  } as GeneticsHistoryEntry

  let overflow: GeneticsHistoryEntry[] = []
  try {
    const all = parseAll()
    const sameType = all.filter(e => e.type === newEntry.type)
    const otherType = all.filter(e => e.type !== newEntry.type)

    const limit = MAX_PER_TYPE[newEntry.type]
    const sorted = sortEntries([newEntry, ...sameType])
    const kept = sorted.slice(0, limit)
    overflow = sorted.slice(limit)

    saveToStorage(sortEntries([...kept, ...otherType]))
  } catch (err) {
    console.warn('[genetics-history] localStorage save failed — quota may be exceeded:', err)
    return
  }

  removeRefsForEntries(overflow)

  // Fix: overflow 엔트리를 D1에서도 삭제 — 안 하면 hydration 시 좀비 부활
  if (overflow.length > 0) {
    syncDeleteToCloud(overflow.map(e => e.id))
  }

  if (newEntry.projectId) {
    const label = newEntry.type === 'barcoding' ? newEntry.sampleName
      : newEntry.type === 'blast' ? `${newEntry.program} · ${newEntry.database}`
      : newEntry.accession
    try {
      upsertProjectEntityRef({
        projectId: newEntry.projectId,
        entityKind: entityKindForType(newEntry.type),
        entityId: newEntry.id,
        label,
      })
    } catch {
      // ref 생성 실패는 무시
    }
  }

  notifyChange()
  syncSaveToCloud(newEntry)
}

/** 전체 히스토리에서 다중 삭제 */
export function deleteGeneticsEntries(ids: Set<string>): GeneticsHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const all = parseAll()
  const toDelete = all.filter(e => ids.has(e.id))
  const remaining = all.filter(e => !ids.has(e.id))

  removeRefsForEntries(toDelete)
  saveToStorage(remaining)
  notifyChange()
  syncDeleteToCloud(ids)
  return sortEntries(remaining)
}

/** 핀 토글 */
export function toggleGeneticsPin(id: string): GeneticsHistoryEntry[] {
  try {
    const entries = parseAll()
    const toggled = entries.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e)
    saveToStorage(toggled)
    notifyChange()
    const updated = toggled.find(e => e.id === id)
    if (updated) {
      syncPinToCloud(id, Boolean(updated.pinned))
    }
    return sortEntries(toggled)
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// 하위 호환 API — 바코딩 전용 (entity-loader, BarcodingContent)
// ═══════════════════════════════════════════════════════════════

/** @deprecated loadGeneticsHistory('barcoding') 사용 */
export function loadAnalysisHistory(preloadedRaw?: string | null): BarcodingHistoryEntry[] {
  return loadGeneticsHistory('barcoding', preloadedRaw) as BarcodingHistoryEntry[]
}

/** @deprecated saveGeneticsHistory 사용 */
export function saveAnalysisHistory(entry: Omit<BarcodingHistoryEntry, 'id' | 'createdAt' | 'type'>): void {
  saveGeneticsHistory({ ...entry, type: 'barcoding' })
}

/** @deprecated deleteGeneticsEntries 사용 */
export function deleteMultipleEntries(ids: Set<string>): BarcodingHistoryEntry[] {
  return deleteGeneticsEntries(ids) as BarcodingHistoryEntry[]
}

/** @deprecated deleteGeneticsEntries 사용 */
export function deleteAnalysisEntry(id: string): BarcodingHistoryEntry[] {
  return deleteGeneticsEntries(new Set([id])) as BarcodingHistoryEntry[]
}

/** @deprecated toggleGeneticsPin 사용 */
export function togglePinEntry(id: string): BarcodingHistoryEntry[] {
  return toggleGeneticsPin(id) as BarcodingHistoryEntry[]
}

/** @deprecated */
export function clearAnalysisHistory(): void {
  if (typeof window === 'undefined') return
  const all = parseAll()
  removeRefsForEntries(all)
  writeJson(HISTORY_KEY, [])
  notifyChange()
}
