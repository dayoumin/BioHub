import type { BlastMarker, BlastResultStatus } from '@biohub/types'

export interface AnalysisHistoryEntry {
  id: string
  marker: BlastMarker
  sequencePreview: string
  topSpecies: string | null
  status: BlastResultStatus | null
  createdAt: number
}

const HISTORY_KEY = 'biohub:genetics:history'
const MAX_HISTORY = 10

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

export function loadAnalysisHistory(): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry).slice(0, MAX_HISTORY)
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
    const updated = [newEntry, ...history].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch {
    // localStorage full — 무시
  }
}

export function clearAnalysisHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HISTORY_KEY)
}
