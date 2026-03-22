import type { BlastMarker, BlastResultStatus } from '@biohub/types'
import type { DecisionResult } from '@/lib/genetics/decision-engine'
import {
  upsertProjectEntityRef,
  removeProjectEntityRefs,
} from '@/lib/research/project-storage'

export interface AnalysisHistoryEntry {
  id: string
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

export const HISTORY_KEY = 'biohub:genetics:history'
export const HISTORY_CHANGE_EVENT = 'genetics-history-changed'
const MAX_HISTORY = 20

function isValidEntry(item: unknown): item is AnalysisHistoryEntry {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.marker === 'string' &&
    typeof obj.sequencePreview === 'string' &&
    typeof obj.createdAt === 'number'
  )
}

function sortEntries(entries: AnalysisHistoryEntry[]): AnalysisHistoryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt - a.createdAt
  })
}

function saveToStorage(entries: AnalysisHistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
}

/** raw JSON 문자열에서 유효한 엔트리만 추출 (정렬 없음) */
function parseValidEntries(raw: string | null): AnalysisHistoryEntry[] {
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isValidEntry)
}

function notifyChange(): void {
  window.dispatchEvent(new Event(HISTORY_CHANGE_EVENT))
}

/** 프로젝트에 연결된 entry의 ref를 일괄 정리 (1회 localStorage 읽기-쓰기) */
function removeRefsForEntries(entries: AnalysisHistoryEntry[]): void {
  const targets = entries
    .filter(e => e.projectId)
    .map(e => ({ projectId: e.projectId!, entityKind: 'blast-result' as const, entityId: e.id }))
  if (targets.length === 0) return
  try {
    removeProjectEntityRefs(targets)
  } catch {
    // ref 정리 실패는 무시 — dangling ref는 /projects에서 graceful 처리
  }
}

/** preloadedRaw를 전달하면 localStorage 재읽기 생략 */
export function loadAnalysisHistory(preloadedRaw?: string | null): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = preloadedRaw !== undefined ? preloadedRaw : localStorage.getItem(HISTORY_KEY)
    return sortEntries(parseValidEntries(raw).slice(0, MAX_HISTORY))
  } catch {
    return []
  }
}

export function saveAnalysisHistory(entry: Omit<AnalysisHistoryEntry, 'id' | 'createdAt'>): void {
  if (typeof window === 'undefined') return

  const newEntry: AnalysisHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  }

  try {
    const history = loadAnalysisHistory()
    const sorted = sortEntries([newEntry, ...history])
    const kept = sorted.slice(0, MAX_HISTORY)
    const overflow = sorted.slice(MAX_HISTORY)

    saveToStorage(kept)
    removeRefsForEntries(overflow)
  } catch {
    // localStorage full
    return
  }

  // ref 생성은 entry 저장 성공 후 별도 처리
  if (newEntry.projectId) {
    try {
      upsertProjectEntityRef({
        projectId: newEntry.projectId,
        entityKind: 'blast-result',
        entityId: newEntry.id,
        label: newEntry.sampleName,
      })
    } catch {
      // ref 생성 실패 — entry는 저장됨, 프로젝트 연결만 누락
    }
  }

  notifyChange()
}

export function deleteMultipleEntries(ids: Set<string>): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const all = loadAnalysisHistory()
  const toDelete = all.filter(e => ids.has(e.id))
  const remaining = all.filter(e => !ids.has(e.id))

  removeRefsForEntries(toDelete)

  saveToStorage(remaining)
  notifyChange()
  return remaining
}

export function deleteAnalysisEntry(id: string): AnalysisHistoryEntry[] {
  return deleteMultipleEntries(new Set([id]))
}

export function togglePinEntry(id: string): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const entries = parseValidEntries(raw)
    const sorted = sortEntries(
      entries.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e)
    ).slice(0, MAX_HISTORY)
    saveToStorage(sorted)
    notifyChange()
    return sorted
  } catch {
    return []
  }
}

export function clearAnalysisHistory(): void {
  if (typeof window === 'undefined') return

  // 전체 삭제 시 모든 ref 정리
  const all = loadAnalysisHistory()
  removeRefsForEntries(all)

  localStorage.removeItem(HISTORY_KEY)
  notifyChange()
}
