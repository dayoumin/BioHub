/**
 * Bio-Tools 히스토리 저장/조회
 *
 * genetics/analysis-history.ts 패턴을 따름:
 * localStorage 기반, CustomEvent 동기화, 연구과제 연결.
 */

import {
  upsertProjectEntityRef,
  removeProjectEntityRefs,
} from '@/lib/research/project-storage'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

// ─── 타입 ─────────────────────────────────────────

export interface BioToolHistoryEntry {
  id: string
  toolId: string
  toolNameEn: string
  toolNameKo: string
  csvFileName: string
  columnConfig: Record<string, string>
  results: unknown
  pinned?: boolean
  projectId?: string
  createdAt: number
}

// ─── 상수 ─────────────────────────────────────────

export const BIO_HISTORY_KEY = STORAGE_KEYS.bioTools.history
export const BIO_HISTORY_CHANGE_EVENT = 'bio-tools-history-changed'
const MAX_HISTORY = 30

const { readJson, writeJson } = createLocalStorageIO('[bio-tool-history]')

// ─── 내부 유틸 ────────────────────────────────────

function isValidEntry(item: unknown): item is BioToolHistoryEntry {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.toolId === 'string' &&
    typeof obj.toolNameEn === 'string' &&
    typeof obj.csvFileName === 'string' &&
    typeof obj.createdAt === 'number'
  )
}

function sortEntries(entries: BioToolHistoryEntry[]): BioToolHistoryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt - a.createdAt
  })
}

function saveToStorage(entries: BioToolHistoryEntry[]): void {
  writeJson(BIO_HISTORY_KEY, entries)
}

function notifyChange(): void {
  window.dispatchEvent(new Event(BIO_HISTORY_CHANGE_EVENT))
}

function removeRefsForEntries(entries: BioToolHistoryEntry[]): void {
  const targets = entries
    .filter(e => e.projectId)
    .map(e => ({ projectId: e.projectId!, entityKind: 'bio-tool-result' as const, entityId: e.id }))
  if (targets.length === 0) return
  try {
    removeProjectEntityRefs(targets)
  } catch {
    // ref 정리 실패는 무시 — dangling ref는 /projects에서 graceful 처리
  }
}

// ─── 공개 API ─────────────────────────────────────

export function loadBioToolHistory(preloadedRaw?: string | null): BioToolHistoryEntry[] {
  try {
    if (preloadedRaw !== undefined) {
      if (!preloadedRaw) return []
      const parsed: unknown = JSON.parse(preloadedRaw)
      if (!Array.isArray(parsed)) return []
      return sortEntries(parsed.filter(isValidEntry).slice(0, MAX_HISTORY))
    }
    const all = readJson<unknown[]>(BIO_HISTORY_KEY, [])
    return sortEntries(all.filter(isValidEntry).slice(0, MAX_HISTORY))
  } catch {
    return []
  }
}

export function saveBioToolEntry(
  entry: Omit<BioToolHistoryEntry, 'id' | 'createdAt'>,
): BioToolHistoryEntry {
  const newEntry: BioToolHistoryEntry = {
    ...entry,
    id: `bio-${entry.toolId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  }

  let overflow: BioToolHistoryEntry[] = []
  try {
    const history = loadBioToolHistory()
    const sorted = sortEntries([newEntry, ...history])
    const kept = sorted.slice(0, MAX_HISTORY)
    overflow = sorted.slice(MAX_HISTORY)
    saveToStorage(kept)
  } catch (err) {
    // writeJson이 DOMException을 Error로 래핑하므로 cause 확인
    const cause = err instanceof Error ? (err as Error & { cause?: unknown }).cause : err
    const isQuota = cause instanceof DOMException && (cause.name === 'QuotaExceededError' || cause.code === 22)
    if (isQuota) {
      throw new Error('QUOTA_EXCEEDED')
    }
    return newEntry
  }

  removeRefsForEntries(overflow)

  if (newEntry.projectId) {
    try {
      upsertProjectEntityRef({
        projectId: newEntry.projectId,
        entityKind: 'bio-tool-result',
        entityId: newEntry.id,
        label: `${newEntry.toolNameEn} — ${newEntry.csvFileName}`,
      })
    } catch {
      // ref 생성 실패 — entry는 저장됨
    }
  }

  notifyChange()
  return newEntry
}

export function getBioToolEntry(id: string, expectedToolId?: string): BioToolHistoryEntry | null {
  const all = loadBioToolHistory()
  const entry = all.find(e => e.id === id) ?? null
  if (expectedToolId && entry && entry.toolId !== expectedToolId) return null
  return entry
}

export function deleteBioToolEntries(ids: Set<string>): BioToolHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const all = loadBioToolHistory()
  const toDelete = all.filter(e => ids.has(e.id))
  const remaining = all.filter(e => !ids.has(e.id))

  removeRefsForEntries(toDelete)
  saveToStorage(remaining)
  notifyChange()
  return remaining
}

export function togglePinBioToolEntry(id: string): BioToolHistoryEntry[] {
  try {
    const entries = readJson<unknown[]>(BIO_HISTORY_KEY, []).filter(isValidEntry)
    const sorted = sortEntries(
      entries.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e),
    ).slice(0, MAX_HISTORY)
    saveToStorage(sorted)
    notifyChange()
    return sorted
  } catch {
    return []
  }
}
