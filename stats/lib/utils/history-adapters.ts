/**
 * 모듈별 히스토리 → HistoryItem 변환 어댑터
 *
 * 통계 분석, 유전학, Bio-Tools 각각의 히스토리 엔트리를
 * UnifiedHistorySidebar가 소비하는 HistoryItem<T>으로 정규화.
 */

import type { HistoryItem, HistoryBadge } from '@/types/history'
import type { AnalysisHistory } from '@/lib/stores/history-store'
import type { AnalysisHistoryEntry } from '@/lib/genetics/analysis-history'
import type { BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'

// ── 통계 분석 어댑터 ──

export function toAnalysisHistoryItem(
  item: AnalysisHistory,
  pinnedIds: string[],
): HistoryItem<AnalysisHistory> {
  const badges: HistoryBadge[] = []

  if (item.method?.name) {
    badges.push({ label: '', value: item.method.name, variant: 'default' })
  }
  if (item.dataFileName) {
    badges.push({ label: '', value: item.dataFileName, variant: 'muted' })
  }

  // p-value 뱃지
  const results = item.results as Record<string, unknown> | null
  if (results && typeof results.pValue === 'number') {
    badges.push({
      label: 'p',
      value: results.pValue.toFixed(4),
      variant: results.pValue < 0.05 ? 'primary' : 'muted',
    })
  }

  return {
    id: item.id,
    title: item.name,
    subtitle: item.purpose || undefined,
    badges,
    pinned: pinnedIds.includes(item.id),
    createdAt: new Date(item.timestamp).getTime(),
    hasResult: item.results !== null,
    data: item,
  }
}

export function toAnalysisHistoryItems(
  items: AnalysisHistory[],
  pinnedIds: string[],
): HistoryItem<AnalysisHistory>[] {
  return items.map((item) => toAnalysisHistoryItem(item, pinnedIds))
}

// ── 유전학 어댑터 ──

export function toGeneticsHistoryItem(
  entry: AnalysisHistoryEntry,
): HistoryItem<AnalysisHistoryEntry> {
  const badges: HistoryBadge[] = []

  if (entry.topSpecies && entry.topSpecies !== entry.sampleName) {
    badges.push({ label: '', value: entry.topSpecies, variant: 'default' })
  }
  badges.push({ label: '', value: entry.marker, variant: 'muted' })
  if (entry.topIdentity != null) {
    badges.push({
      label: '',
      value: `${(entry.topIdentity * 100).toFixed(1)}%`,
      variant: 'mono',
    })
  }

  return {
    id: entry.id,
    title: entry.sampleName || entry.sequencePreview,
    subtitle: undefined,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: !!entry.resultData,
    data: entry,
  }
}

export function toGeneticsHistoryItems(
  entries: AnalysisHistoryEntry[],
): HistoryItem<AnalysisHistoryEntry>[] {
  return entries.map(toGeneticsHistoryItem)
}

// ── Bio-Tools 어댑터 ──

export function toBioToolHistoryItem(
  entry: BioToolHistoryEntry,
): HistoryItem<BioToolHistoryEntry> {
  const badges: HistoryBadge[] = [
    { label: '', value: entry.toolNameKo || entry.toolNameEn, variant: 'default' },
  ]

  return {
    id: entry.id,
    title: entry.csvFileName,
    subtitle: undefined,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: entry.results !== undefined,
    data: entry,
  }
}

export function toBioToolHistoryItems(
  entries: BioToolHistoryEntry[],
): HistoryItem<BioToolHistoryEntry>[] {
  return entries.map(toBioToolHistoryItem)
}
