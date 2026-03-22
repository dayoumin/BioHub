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

export function loadAnalysisHistory(): AnalysisHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as AnalysisHistoryEntry[]).slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

export function saveAnalysisHistory(entry: Omit<AnalysisHistoryEntry, 'id' | 'createdAt'>): void {
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
  localStorage.removeItem(HISTORY_KEY)
}
