'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsvFile } from '@/lib/utils/download-file'
import { storeSequenceForTransfer } from '@/lib/genetics/sequence-transfer'
import { Download, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  BoldHit,
  BoldClassification,
  BoldDatabase,
  BoldSearchMode,
} from '@biohub/types'

// ── Props ──

interface BoldResultViewProps {
  hits: BoldHit[]
  classification: BoldClassification
  db: BoldDatabase
  searchMode: BoldSearchMode
  sequence: string
  sampleName: string
  onReset: () => void
}

// ── Classification rank styles ──

const RANK_STYLES: Record<BoldClassification['rank'], { bg: string; text: string; label: string }> = {
  species: { bg: 'bg-green-50 dark:bg-green-950/30',  text: 'text-green-800 dark:text-green-300',  label: '종(Species)' },
  genus:   { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-800 dark:text-yellow-300', label: '속(Genus)' },
  family:  { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-800 dark:text-orange-300', label: '과(Family)' },
  order:   { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-800 dark:text-orange-300', label: '목(Order)' },
  none:    { bg: 'bg-red-50 dark:bg-red-950/30',    text: 'text-red-800 dark:text-red-300',    label: '판정 불가' },
}

// ── Similarity color helpers ──

function similarityColorClass(sim: number): string {
  if (sim >= 0.97) return 'bg-green-500'
  if (sim >= 0.90) return 'bg-yellow-500'
  if (sim >= 0.75) return 'bg-orange-400'
  return 'bg-red-400'
}

function similarityTextClass(sim: number): string {
  if (sim >= 0.97) return 'text-green-700 dark:text-green-400'
  if (sim >= 0.90) return 'text-yellow-700 dark:text-yellow-400'
  return 'text-orange-700 dark:text-orange-400'
}

// ── Sort ──

type SortDir = 'asc' | 'desc'

function sortHits(hits: BoldHit[], dir: SortDir): BoldHit[] {
  return [...hits].sort((a, b) =>
    dir === 'desc' ? b.similarity - a.similarity : a.similarity - b.similarity,
  )
}

// ── CSV ──

function buildCsv(hits: BoldHit[]): string {
  const esc = (s: string): string =>
    s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  const header = '#,Process ID,Species,Similarity (%),BIN,Family,Country,Accession'
  const rows = hits.map((h, i) =>
    [
      i + 1,
      esc(h.processId),
      esc(h.taxonomy.species ?? ''),
      (h.similarity * 100).toFixed(1),
      esc(h.bin ?? ''),
      esc(h.taxonomy.family ?? ''),
      esc(h.country ?? ''),
      esc(h.accession ?? ''),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

// ── Component ──

export function BoldResultView({
  hits,
  classification,
  db,
  searchMode,
  sequence,
  sampleName,
  onReset,
}: BoldResultViewProps): React.ReactElement {
  const router = useRouter()
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const rankStyle = RANK_STYLES[classification.rank]

  const sorted = useMemo(() => sortHits(hits, sortDir), [hits, sortDir])

  const toggleSort = useCallback(() => {
    setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))
  }, [])

  const handleExportCsv = useCallback(() => {
    if (hits.length === 0) return
    const csv = buildCsv(hits)
    const name = sampleName ? sampleName.replace(/\s+/g, '_') : 'bold'
    downloadCsvFile(csv, `bold_${name}_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [hits, sampleName])

  const handleBarcodingTransfer = useCallback(() => {
    storeSequenceForTransfer(sequence, 'bold')
    router.push('/genetics/barcoding')
  }, [sequence, router])

  return (
    <div className="space-y-4" role="region" aria-label="BOLD 종 동정 결과">
      {/* ── Classification banner ── */}
      <div className={`rounded-xl ${rankStyle.bg} p-6`} role="status" aria-live="polite">
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${rankStyle.bg} ${rankStyle.text}`}>
            {rankStyle.label}
          </span>
          {classification.supportingRecords > 0 && (
            <span className="text-xs text-muted-foreground/70">
              {classification.supportingRecords}건 일치
            </span>
          )}
        </div>
        <h2 className={`text-2xl font-bold tracking-tight ${rankStyle.text}`}>
          {classification.rank === 'none'
            ? '판정 불가'
            : <span className="italic">{classification.taxon}</span>}
        </h2>
        {classification.rank === 'none' && (
          <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
            유사도 기준을 충족하는 일치 항목이 없습니다. 서열 품질을 확인하거나 다른 DB를 시도해 보세요.
          </p>
        )}
      </div>

      {/* ── Hit table ── */}
      {sorted.length > 0 && (
        <div className="rounded-xl bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground/80">
            매칭 결과 ({sorted.length}건)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-2">#</th>
                  <th className="pb-2 pr-3">Process ID</th>
                  <th className="pb-2 pr-3">Species</th>
                  <th
                    className="cursor-pointer select-none pb-2 pr-3 text-right hover:text-gray-700"
                    onClick={toggleSort}
                    title="클릭하여 정렬"
                  >
                    Similarity {sortDir === 'desc' ? '↓' : '↑'}
                  </th>
                  <th className="pb-2 pr-3">BIN</th>
                  <th className="pb-2 pr-3">Family</th>
                  <th className="pb-2 pr-3">Country</th>
                  <th className="pb-2">Accession</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((hit, i) => {
                  const pct = (hit.similarity * 100).toFixed(1)
                  return (
                    <tr key={hit.processId || i} className="border-b border-border/30">
                      <td className="py-2 pr-2 text-muted-foreground/60">{i + 1}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        <a
                          href={`https://id.boldsystems.org/record?processid=${encodeURIComponent(hit.processId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {hit.processId}
                        </a>
                      </td>
                      <td className="py-2 pr-3 italic">
                        {hit.taxonomy.species || <span className="not-italic text-muted-foreground/50">-</span>}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${similarityColorClass(hit.similarity)}`}
                              style={{ width: `${Math.min(hit.similarity * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono text-xs font-medium ${similarityTextClass(hit.similarity)}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                        {hit.bin ?? '-'}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {hit.taxonomy.family ?? '-'}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground/70 text-xs">
                        {hit.country ?? '-'}
                      </td>
                      <td className="py-2 text-xs">
                        {hit.accession ? (
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/nuccore/${hit.accession}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {hit.accession}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {hits.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            CSV 다운로드
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          다시 분석
        </Button>
        {sequence && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleBarcodingTransfer}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            바코딩으로 재검색
          </Button>
        )}
      </div>
    </div>
  )
}
