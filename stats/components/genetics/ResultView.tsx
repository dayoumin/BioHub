'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsvFile } from '@/lib/utils/download-file'
import { Download, ArrowRight } from 'lucide-react'
import type { BlastMarker, BlastResultStatus } from '@biohub/types'
import type { DecisionResult, MarkerRecommendation } from '@/lib/genetics/decision-engine'
import { storeSequenceForTransfer } from '@/lib/genetics/sequence-transfer'
import { Button } from '@/components/ui/button'
import {
  BIOLOGY_ACTION_LINK,
  BIOLOGY_INSET_PANEL,
  BIOLOGY_PANEL,
  BIOLOGY_TABLE_BODY_ROW,
  BIOLOGY_TABLE_HEAD_ROW,
  BIOLOGY_TABLE_SHELL,
} from '@/lib/design-tokens/biology'

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
  const router = useRouter()
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
    downloadCsvFile(csv, `barcoding_${marker}_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [decision.topHits, marker])

  return (
    <div className="space-y-4" role="region" aria-label="분석 결과">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex-1 rounded-[1.5rem] ${style.bg} p-6`} role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <h2 className={`text-lg font-bold ${style.text}`}>
              {decision.title}
            </h2>
            {decision.topHits[0] && (
              <span className="text-sm font-semibold text-foreground/80">
                {(decision.topHits[0].identity * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/75">{decision.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {decision.topHits.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          )}
          {sequence && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                storeSequenceForTransfer(sequence, 'barcoding')
                router.push('/genetics/blast')
              }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              BLAST로 재검색
            </Button>
          )}
        </div>
      </div>

      {showAltTop && (
        <AlternativeMarkersCard key={marker} marker={marker} markers={decision.recommendedMarkers} />
      )}

      {decision.taxonAlert && (
        <div className="rounded-[1.5rem] bg-warning-bg p-5">
          <h3 className="mb-2 text-sm font-semibold text-warning">
            {decision.taxonAlert.title}
          </h3>
          <p className="mb-3 text-sm text-warning-muted">
            {decision.taxonAlert.description}
          </p>
          <div className={BIOLOGY_INSET_PANEL}>
            <p className="text-sm font-medium text-warning">권장 조치</p>
            <p className="text-sm text-warning-muted">{decision.taxonAlert.recommendation}</p>
          </div>
        </div>
      )}

      {decision.topHits.length > 0 && (
        <div className={`${BIOLOGY_PANEL} p-5`}>
          <h3 className="mb-3 text-sm font-semibold text-foreground/90">매칭 결과</h3>
          <div className={BIOLOGY_TABLE_SHELL}>
            <table className="w-full text-sm">
              <thead>
                <tr className={BIOLOGY_TABLE_HEAD_ROW}>
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
                    <tr key={hit.accession || i} className={BIOLOGY_TABLE_BODY_ROW}>
                      <td className="py-2 text-muted-foreground/60">{i + 1}</td>
                      <td className="py-2">
                        {hit.taxid && !speciesIsAccession ? (
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${hit.taxid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="italic text-foreground hover:text-[color:var(--section-accent-bio)] hover:underline"
                          >
                            {hit.species || '(미확인)'}
                          </a>
                        ) : (
                          <span className="italic">{hit.species || '(미확인)'}</span>
                        )}
                        {(hit.country || hit.isBarcode) && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                            {hit.country && <span title="채집 국가">{hit.country.split(':')[0]}</span>}
                            {hit.isBarcode && <span className="rounded-full bg-surface-container-low px-1.5 py-0.5 text-[color:var(--section-accent-bio)]" title="BOLD 등록 바코드 서열">barcode</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {(hit.identity * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {hit.alignCoverage != null
                          ? `${(hit.alignCoverage * 100).toFixed(0)}%`
                          : '-'}
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
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
                          className="text-[color:var(--section-accent-bio)] hover:underline"
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
    <div className="rounded-[1.5rem] bg-info-bg p-5">
      <h3 className="mb-2 text-sm font-semibold text-info">다른 마커를 시도해볼 수 있습니다</h3>
      <p className="mb-3 text-xs text-info-muted">
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
                ? 'border-0 bg-[color:var(--section-accent-bio)] text-white hover:bg-[color:var(--section-accent-bio)]'
                : 'border-0 bg-surface-container-low text-foreground/80 hover:bg-surface-container'
            }`}
          >
            {m.displayName}
            {i === 0 && selected !== m.name && (
              <span className="ml-1 text-[10px] text-[color:var(--section-accent-bio)]/70">추천</span>
            )}
          </Button>
        ))}
      </div>

      {selectedInfo && (
        <div className={BIOLOGY_INSET_PANEL}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{selectedInfo.displayName}</span>
            <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--section-accent-bio)]">
              {selectedInfo.reason}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/75">
            {selectedInfo.detail}
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-info-muted">
        같은 서열로 마커만 바꿔도 동일한 결과가 나옵니다. 해당 마커 영역을 별도로 시퀀싱해야 합니다.
      </p>
    </div>
  )
}

const ACTION_LINK = BIOLOGY_ACTION_LINK

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
