/**
 * 모듈별 히스토리 → HistoryItem 변환 어댑터
 *
 * 통계 분석, 유전학, Bio-Tools 각각의 히스토리 엔트리를
 * UnifiedHistorySidebar가 소비하는 HistoryItem<T>으로 정규화.
 */

import type { HistoryItem, HistoryBadge } from '@/types/history'
import type { AnalysisHistory } from '@/lib/stores/history-store'
import type { GeneticsHistoryEntry, BarcodingHistoryEntry, BlastSearchHistoryEntry, GenBankHistoryEntry, SeqStatsHistoryEntry } from '@/lib/genetics/analysis-history'
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

// ── 유전학 어댑터 (GeneticsHistoryEntry union 지원) ──

function toBarcodingItem(entry: BarcodingHistoryEntry): HistoryItem<GeneticsHistoryEntry> {
  const badges: HistoryBadge[] = []
  if (entry.topSpecies && entry.topSpecies !== entry.sampleName) {
    badges.push({ label: '', value: entry.topSpecies, variant: 'default' })
  }
  badges.push({ label: '', value: entry.marker, variant: 'muted' })
  if (entry.topIdentity != null) {
    badges.push({ label: '', value: `${(entry.topIdentity * 100).toFixed(1)}%`, variant: 'mono' })
  }
  return {
    id: entry.id,
    title: entry.sampleName || entry.sequencePreview,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: !!entry.resultData,
    data: entry,
  }
}

function toBlastSearchItem(entry: BlastSearchHistoryEntry): HistoryItem<GeneticsHistoryEntry> {
  const badges: HistoryBadge[] = [
    { label: '', value: entry.program, variant: 'mono' },
    { label: '', value: `${entry.hitCount} hits`, variant: 'default' },
  ]
  if (entry.topHitIdentity != null) {
    badges.push({ label: '', value: `${(entry.topHitIdentity * 100).toFixed(1)}%`, variant: 'mono' })
  }
  return {
    id: entry.id,
    title: entry.topHitSpecies ?? `${entry.program} · ${entry.database}`,
    subtitle: entry.topHitSpecies ? `${entry.program} · ${entry.database}` : undefined,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: true,
    data: entry,
  }
}

function toGenBankItem(entry: GenBankHistoryEntry): HistoryItem<GeneticsHistoryEntry> {
  const badges: HistoryBadge[] = [
    { label: '', value: entry.db === 'protein' ? 'Protein' : 'Nucleotide', variant: 'muted' },
  ]
  if (entry.organism) {
    badges.push({ label: '', value: entry.organism, variant: 'default' })
  }
  return {
    id: entry.id,
    title: entry.accession,
    subtitle: entry.query,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: true,
    data: entry,
  }
}

function toSeqStatsItem(entry: SeqStatsHistoryEntry): HistoryItem<GeneticsHistoryEntry> {
  const badges: HistoryBadge[] = [
    { label: '', value: `${entry.sequenceCount}개 서열`, variant: 'default' },
    { label: 'GC', value: `${(entry.overallGcContent * 100).toFixed(1)}%`, variant: 'mono' },
  ]
  return {
    id: entry.id,
    title: entry.analysisName,
    subtitle: `평균 ${entry.meanLength} bp`,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: true,
    data: entry,
  }
}

export function toGeneticsHistoryItem(
  entry: GeneticsHistoryEntry,
): HistoryItem<GeneticsHistoryEntry> {
  switch (entry.type) {
    case 'barcoding': return toBarcodingItem(entry)
    case 'blast': return toBlastSearchItem(entry)
    case 'genbank': return toGenBankItem(entry)
    case 'seq-stats': return toSeqStatsItem(entry)
  }
}

export function toGeneticsHistoryItems(
  entries: GeneticsHistoryEntry[],
): HistoryItem<GeneticsHistoryEntry>[] {
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
