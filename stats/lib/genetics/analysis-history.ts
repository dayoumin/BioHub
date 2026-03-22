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

const HISTORY_KEY = 'biohub:genetics:history'
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

/** 고정 항목 먼저, 그 다음 최신순 */
function sortEntries(entries: AnalysisHistoryEntry[]): AnalysisHistoryEntry[] {
  return entries.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt - a.createdAt
  })
}

function saveToStorage(entries: AnalysisHistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
}

export function loadAnalysisHistory(): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return sortEntries(parsed.filter(isValidEntry).slice(0, MAX_HISTORY))
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
  const history = loadAnalysisHistory()
  const entry = history.find(e => e.id === id)
  if (entry) entry.pinned = !entry.pinned
  const sorted = sortEntries(history)
  saveToStorage(sorted)
  return sorted
}

export function clearAnalysisHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HISTORY_KEY)
}
