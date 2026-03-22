import type { BlastMarker, BlastResultStatus } from '@biohub/types'

export interface AnalysisHistoryEntry {
  id: string
  sampleName: string
  marker: BlastMarker
  sequencePreview: string
  topSpecies: string | null
  topIdentity: number | null
  status: BlastResultStatus | null
  pinned?: boolean
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
  try {
    const history = loadAnalysisHistory()
    const newEntry: AnalysisHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    }
    const updated = sortEntries([newEntry, ...history]).slice(0, MAX_HISTORY)
    saveToStorage(updated)
    notifyChange()
  } catch {
    // localStorage full
  }
}

export function deleteMultipleEntries(ids: Set<string>): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const history = loadAnalysisHistory().filter(e => !ids.has(e.id))
  saveToStorage(history)
  return history
}

export function deleteAnalysisEntry(id: string): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const history = loadAnalysisHistory().filter(e => e.id !== id)
  saveToStorage(history)
  return history
}

export function togglePinEntry(id: string): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const entries = parseValidEntries(raw)
    const sorted = sortEntries(
      entries.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e)
    )
    saveToStorage(sorted)
    return sorted
  } catch {
    return []
  }
}

export function clearAnalysisHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HISTORY_KEY)
}
