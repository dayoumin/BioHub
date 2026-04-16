'use client'

import { useState, useCallback, useMemo } from 'react'
import { downloadCsvFile } from '@/lib/utils/download-file'
import { Download, ArrowUpDown } from 'lucide-react'
import type { BlastProgram, GenericBlastHit } from '@biohub/types'
import { Button } from '@/components/ui/button'
import {
  BIOLOGY_PANEL,
  BIOLOGY_TABLE_BODY_ROW,
  BIOLOGY_TABLE_HEAD_ROW,
  BIOLOGY_TABLE_SHELL,
} from '@/lib/design-tokens/biology'

interface BlastSearchResultProps {
  hits: GenericBlastHit[]
  program: BlastProgram
  database: string
  elapsed: number
  onReset: () => void
}

type SortKey = 'identity' | 'evalue' | 'bitScore' | 'alignLength'
type SortDir = 'asc' | 'desc'

/** accession에 맞는 NCBI 링크 생성 — blastx는 단백질 DB 검색이므로 protein */
function ncbiLink(accession: string, program: BlastProgram): string {
  const isNucleotideHit = program === 'blastn' || program === 'tblastn' || program === 'tblastx'
  return `https://www.ncbi.nlm.nih.gov/${isNucleotideHit ? 'nuccore' : 'protein'}/${accession}`
}

/** E-value 표시 */
function formatEvalue(evalue: number): string {
  if (evalue === 0) return '0'
  if (evalue < 0.001) return evalue.toExponential(1)
  return evalue.toPrecision(2)
}

export function BlastSearchResult({ hits, program, database, elapsed, onReset }: BlastSearchResultProps): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('bitScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'evalue' ? 'asc' : 'desc')
    }
  }, [sortKey])

  const sorted = useMemo(() => [...hits].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    return sortDir === 'asc' ? va - vb : vb - va
  }), [hits, sortKey, sortDir])

  const handleExportCsv = useCallback(() => {
    const header = 'Accession,Species,Identity(%),E-value,Bit Score,Align Length,Mismatches,Gap Opens'
    const csvEscape = (s: string): string => s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    const rows = sorted.map(h =>
      `${h.accession},${csvEscape(h.species ?? '')},${(h.identity * 100).toFixed(1)},${h.evalue},${h.bitScore},${h.alignLength},${h.mismatches},${h.gapOpens}`
    )
    const csv = [header, ...rows].join('\n')
    downloadCsvFile(csv, `blast_${program}_${database}_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [sorted, program, database])

  const SortHeader = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => (
    <th
      className={`cursor-pointer select-none pb-2 transition-colors duration-200 hover:text-foreground ${className ?? ''}`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === field && (
          <ArrowUpDown className="h-3 w-3" />
        )}
      </span>
    </th>
  )

  return (
    <div className="space-y-4" role="region" aria-label="BLAST 검색 결과">
      {/* 요약 */}
      <div className={`${BIOLOGY_PANEL} flex items-center justify-between p-4`}>
        <div>
          <h2 className="text-lg font-semibold">
            {hits.length}개 히트
          </h2>
          <p className="text-xs text-muted-foreground">
            {program} · {database} · {elapsed}초 소요
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* 히트 없음 */}
      {hits.length === 0 && (
        <div className="rounded-[1.5rem] bg-warning-bg p-6 text-center">
          <p className="text-sm text-warning">매칭 결과가 없습니다.</p>
          <p className="mt-1 text-xs text-warning-muted">
            E-value 임계값을 높이거나 다른 데이터베이스를 시도하세요.
          </p>
        </div>
      )}

      {/* 결과 테이블 */}
      {hits.length > 0 && (
        <div className={BIOLOGY_TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={BIOLOGY_TABLE_HEAD_ROW}>
                  <th className="px-3 pb-2 pt-3">#</th>
                  <th className="px-3 pb-2 pt-3">Accession</th>
                  <th className="px-3 pb-2 pt-3">종명</th>
                  <SortHeader label="Identity" field="identity" className="px-3 pt-3 text-right" />
                  <SortHeader label="E-value" field="evalue" className="px-3 pt-3 text-right" />
                  <SortHeader label="Score" field="bitScore" className="px-3 pt-3 text-right" />
                  <SortHeader label="Align" field="alignLength" className="px-3 pt-3 text-right" />
                  <th className="px-3 pb-2 pt-3 text-right">Gaps</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((hit, i) => (
                  <tr key={`${hit.accession}-${i}`} className={BIOLOGY_TABLE_BODY_ROW}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <a
                        href={ncbiLink(hit.accession, program)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {hit.accession}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <span className={hit.species ? 'italic text-foreground' : 'text-muted-foreground'}>
                        {hit.species || '(미확인)'}
                      </span>
                      {hit.description && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70" title={hit.description}>
                          {hit.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={
                        hit.identity >= 0.97 ? 'text-[color:var(--section-accent-bio)]' :
                        hit.identity >= 0.90 ? 'text-warning' :
                        'text-muted-foreground'
                      }>
                        {(hit.identity * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {formatEvalue(hit.evalue)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {Math.round(hit.bitScore)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {hit.alignLength}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {hit.gapOpens}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 액션 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset}>
          새 검색
        </Button>
      </div>
    </div>
  )
}
