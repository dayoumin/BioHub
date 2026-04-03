'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Download } from 'lucide-react'
import type { BlastMarker, BlastResultStatus } from '@biohub/types'
import type { DecisionResult, MarkerRecommendation } from '@/lib/genetics/decision-engine'
import { Button } from '@/components/ui/button'

interface ResultViewProps {
  decision: DecisionResult
  marker: BlastMarker
  sequence?: string
  onReset: (clearSequence?: boolean) => void
}

const BLAST_WARNING = { bg: 'bg-warning-bg', border: 'border-warning-border', text: 'text-warning', badge: 'bg-warning-bg text-warning' } as const
const BLAST_ERROR   = { bg: 'bg-error-bg',   border: 'border-error-border',   text: 'text-error',   badge: 'bg-error-bg text-error' } as const

const BLAST_STATUS_STYLES: Record<BlastResultStatus, { bg: string; border: string; text: string; badge: string }> = {
  high:      { bg: 'bg-success-bg', border: 'border-success-border', text: 'text-success', badge: 'bg-success-bg text-success' },
  ambiguous: BLAST_WARNING,
  low:       BLAST_WARNING,
  failed:    BLAST_ERROR,
  no_hit:    BLAST_ERROR,
}

const needsAlternative = (status: BlastResultStatus): boolean =>
  status !== 'high'

export function ResultView({ decision, marker, sequence, onReset }: ResultViewProps) {
  const style = BLAST_STATUS_STYLES[decision.status]
  const showAltTop = needsAlternative(decision.status) && decision.recommendedMarkers.length > 0

  const handleExportCsv = useCallback(() => {
    if (decision.topHits.length === 0) return
    const header = 'Rank,Species,Identity(%),Align Coverage(%),Bit Score,E-value,Accession'
    const csvEscape = (s: string): string =>
      s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    const rows = decision.topHits.map((hit, i) =>
      `${i + 1},${csvEscape(hit.species || '(미확인)')},${(hit.identity * 100).toFixed(1)},${hit.alignCoverage != null ? (hit.alignCoverage * 100).toFixed(0) : ''},${hit.bitScore != null ? Math.round(hit.bitScore) : ''},${hit.evalue != null ? hit.evalue : ''},${hit.accession}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barcoding_${marker}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [decision.topHits, marker])

  return (
    <div className="space-y-4" role="region" aria-label="분석 결과">
      <div className={`rounded-xl border ${style.border} ${style.bg} p-6`} role="status" aria-live="polite">
        <div className="mb-2 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${style.text}`}>
            {decision.title}
          </h2>
          {decision.topHits[0] && (
            <span className="text-sm font-semibold text-gray-700">
              {(decision.topHits[0].identity * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{decision.description}</p>
      </div>

      {showAltTop && (
        <AlternativeMarkersCard key={marker} marker={marker} markers={decision.recommendedMarkers} />
      )}

      {decision.taxonAlert && (
        <div className="rounded-xl border border-warning-border bg-warning-bg p-5">
          <h3 className="mb-2 text-sm font-semibold text-warning">
            {decision.taxonAlert.title}
          </h3>
          <p className="mb-3 text-sm text-warning-muted">
            {decision.taxonAlert.description}
          </p>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-sm font-medium text-warning">권장 조치</p>
            <p className="text-sm text-warning-muted">{decision.taxonAlert.recommendation}</p>
          </div>
        </div>
      )}

      {decision.topHits.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">매칭 결과</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">종명</th>
                  <th className="pb-2 text-right">유사도</th>
                  <th className="pb-2 text-right" title="정렬 커버리지 — 정렬된 구간 내 매칭 비율 (전체 서열 대비 아님)">Align%</th>
                  <th className="pb-2 text-right" title="Bit score — 높을수록 좋은 매칭 (E-value가 0일 때 더 유용)">Score</th>
                  <th className="pb-2 text-right">Accession</th>
                </tr>
              </thead>
              <tbody>
                {decision.topHits.map((hit, i) => {
                  const speciesIsAccession = hit.species === hit.accession

                  return (
                    <tr key={hit.accession || i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2">
                        {hit.taxid && !speciesIsAccession ? (
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${hit.taxid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="italic text-gray-900 hover:text-blue-600 hover:underline"
                          >
                            {hit.species || '(미확인)'}
                          </a>
                        ) : (
                          <span className="italic">{hit.species || '(미확인)'}</span>
                        )}
                        {(hit.country || hit.isBarcode) && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                            {hit.country && <span title="채집 국가">{hit.country.split(':')[0]}</span>}
                            {hit.isBarcode && <span className="rounded bg-green-50 px-1 text-green-600" title="BOLD 등록 바코드 서열">barcode</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {(hit.identity * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono text-gray-500">
                        {hit.alignCoverage != null
                          ? `${(hit.alignCoverage * 100).toFixed(0)}%`
                          : '-'}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-500">
                        {hit.bitScore != null
                          ? Math.round(hit.bitScore)
                          : hit.evalue != null
                            ? hit.evalue === 0 ? '0' : hit.evalue.toExponential(1)
                            : '-'}
                      </td>
                      <td className="py-2 text-right">
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/nuccore/${hit.accession}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {hit.accession}
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <NextActionButtons decision={decision} marker={marker} sequence={sequence} />
        <div className="ml-auto flex gap-2">
          {decision.topHits.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          )}
          {sequence && (
            <Button variant="outline" size="sm" onClick={() => onReset(false)}>
              서열 유지하고 재분석
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onReset(true)}>
            새 서열로 분석
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 대안 마커 안내 카드 */
function AlternativeMarkersCard({ marker, markers }: { marker: BlastMarker; markers: MarkerRecommendation[] }) {
  const [selected, setSelected] = useState<string>(markers[0]?.name ?? '')
  const selectedInfo = markers.find(m => m.name === selected)

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <h3 className="mb-2 text-sm font-semibold text-blue-900">다른 마커를 시도해볼 수 있습니다</h3>
      <p className="mb-3 text-xs text-blue-800">
        {marker} 마커로는 종 수준 판별이 충분하지 않을 수 있습니다. 아래 마커의 서열을 확보하면 더 나은 결과를 기대할 수 있습니다.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {markers.map((m, i) => (
          <Button
            key={m.name}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelected(m.name)}
            className={`rounded-full ${
              selected === m.name
                ? 'border-blue-400 bg-blue-600 text-white shadow-sm hover:bg-blue-600'
                : 'border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {m.displayName}
            {i === 0 && selected !== m.name && (
              <span className="ml-1 text-[10px] text-blue-400">추천</span>
            )}
          </Button>
        ))}
      </div>

      {selectedInfo && (
        <div className="rounded-lg border border-blue-200 bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-bold text-blue-900">{selectedInfo.displayName}</span>
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              {selectedInfo.reason}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-blue-800/80">
            {selectedInfo.detail}
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-blue-600/50">
        같은 서열로 마커만 바꿔도 동일한 결과가 나옵니다. 해당 마커 영역을 별도로 시퀀싱해야 합니다.
      </p>
    </div>
  )
}

const ACTION_LINK = 'rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50'

/** BOLD에서 지원하는 마커인지 확인 (COI 계열만 동물 바코딩 DB) */
const BOLD_SUPPORTED_MARKERS: ReadonlySet<BlastMarker> = new Set(['COI', 'ITS'])

/** 다음 단계 버튼 — 활성/비활성 분기 */
function NextActionButtons({
  decision,
  marker,
  sequence,
}: {
  decision: DecisionResult
  marker: BlastMarker
  sequence?: string
}) {
  const topHit = decision.topHits[0]
  const topSpecies = topHit?.species ?? ''
  const topAccession = topHit?.accession ?? ''

  // 중복 제거: recommend-marker, change-marker는 AlternativeMarkersCard가 대체
  const actions = decision.nextActions.filter(
    a => a.action !== 'recommend-marker' && a.action !== 'change-marker'
  )

  const [boldCopied, setBoldCopied] = useState(false)
  const boldTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => () => { if (boldTimerRef.current) clearTimeout(boldTimerRef.current) }, [])

  const handleBoldClick = useCallback(() => {
    if (sequence) {
      navigator.clipboard.writeText(sequence).then(() => {
        setBoldCopied(true)
        if (boldTimerRef.current) clearTimeout(boldTimerRef.current)
        boldTimerRef.current = setTimeout(() => setBoldCopied(false), 2000)
      }).catch(() => {
        // clipboard API 실패 시 무시 — 사용자가 직접 붙여넣기
      })
    }
  }, [sequence])

  return (
    <>
      {actions.map((action) => {
        switch (action.action) {
          case 'genbank':
            if (!topAccession) return null
            return (
              <a key={action.action} href={`https://www.ncbi.nlm.nih.gov/nuccore/${topAccession}`}
                target="_blank" rel="noopener noreferrer" className={ACTION_LINK}>
                {action.label}
              </a>
            )

          case 'species-info':
            if (!topSpecies || topSpecies === topAccession) return null
            return (
              <a key={action.action}
                href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=${encodeURIComponent(topSpecies)}`}
                target="_blank" rel="noopener noreferrer" className={ACTION_LINK}>
                종 상세정보
              </a>
            )

          case 'quality-check':
            // 서열 품질은 이미 입력 시 validation으로 표시 → 입력 화면으로 돌아가기
            return null

          default:
            return (
              <Button key={action.action} variant="outline" size="sm" disabled title="준비 중인 기능입니다">
                {action.label} <span className="text-[10px] text-gray-300">(준비 중)</span>
              </Button>
            )
        }
      })}

      {/* BOLD 검색 — COI/ITS만, 서열 있을 때만 (히스토리 복원 시 서열 없음) */}
      {topHit && sequence && BOLD_SUPPORTED_MARKERS.has(marker) && (
        <a
          href="https://id.boldsystems.org/"
          target="_blank"
          rel="noopener noreferrer"
          className={ACTION_LINK}
          title={boldCopied
            ? '서열이 복사되었습니다!'
            : sequence
              ? '클릭 시 서열이 클립보드에 복사됩니다. BOLD에서 붙여넣기하세요.'
              : '서열을 직접 붙여넣으세요'}
          onClick={handleBoldClick}
        >
          {boldCopied ? '서열 복사됨!' : 'BOLD 검색'}
        </a>
      )}
    </>
  )
}

