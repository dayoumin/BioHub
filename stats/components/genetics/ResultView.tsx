'use client'

import type { BlastMarker, BlastResultStatus } from '@biohub/types'
import type { DecisionResult } from '@/lib/genetics/decision-engine'

const VALID_MARKERS = new Set<string>(['COI', 'CytB', '16S', '12S', 'ITS', 'D-loop'])

/** 표시명 → BlastMarker 매핑 (getRecommendedMarkers가 표시명을 반환하므로) */
const MARKER_ALIAS: Record<string, BlastMarker> = {
  'Cyt b': 'CytB',
  '16S rRNA': '16S',
  'ITS1': 'ITS',
  'ITS2': 'ITS',
}

function toBlastMarker(name: string): BlastMarker | null {
  if (VALID_MARKERS.has(name)) return name as BlastMarker
  return MARKER_ALIAS[name] ?? null
}

interface ResultViewProps {
  decision: DecisionResult
  marker: BlastMarker
  onReset: (clearSequence?: boolean) => void
  onRetryWithMarker?: (marker: BlastMarker) => void
}

const STATUS_STYLES: Record<BlastResultStatus, { bg: string; border: string; text: string; badge: string }> = {
  high:      { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700' },
  ambiguous: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
  low:       { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' },
  failed:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700' },
  no_hit:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700' },
}

const STATUS_LABELS: Record<BlastResultStatus, string> = {
  high: '종 수준 확인',
  ambiguous: '종 구분 불확실',
  low: '속 수준 확인',
  failed: '동정 실패',
  no_hit: '매칭 없음',
}

export function ResultView({ decision, marker, onReset, onRetryWithMarker }: ResultViewProps) {
  const style = STATUS_STYLES[decision.status]

  return (
    <div className="space-y-4" role="region" aria-label="분석 결과">
      {/* 1. 결과 카드 */}
      <div className={`rounded-xl border ${style.border} ${style.bg} p-6`} role="status" aria-live="polite">
        <div className="mb-3 flex items-center justify-between">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}>
            {STATUS_LABELS[decision.status]}
          </span>
          {decision.topHits[0] && (
            <span className="text-sm font-semibold text-gray-700">
              {(decision.topHits[0].identity * 100).toFixed(1)}%
            </span>
          )}
        </div>

        <h2 className={`mb-1 text-xl font-bold ${style.text}`}>
          {decision.title}
        </h2>
        <p className="text-sm text-gray-600">{decision.description}</p>
      </div>

      {/* 2. Top Hits 테이블 */}
      {decision.topHits.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">매칭 결과</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">종명</th>
                  <th className="pb-2 text-right">유사도</th>
                  <th className="pb-2 text-right">Coverage</th>
                  <th className="pb-2 text-right">E-value</th>
                  <th className="pb-2 text-right">Accession</th>
                </tr>
              </thead>
              <tbody>
                {decision.topHits.map((hit, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2">
                      <span className="italic">{hit.species}</span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      {(hit.identity * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right font-mono text-gray-500">
                      {hit.queryCoverage != null
                        ? `${(hit.queryCoverage * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-500">
                      {hit.evalue != null
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. 분류군 맞춤 안내 (핵심 차별화) */}
      {decision.taxonAlert && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">
            {decision.taxonAlert.title}
          </h3>
          <p className="mb-3 text-sm text-amber-800">
            {decision.taxonAlert.description}
          </p>
          <div className="rounded-lg bg-white/60 p-3">
            <p className="text-sm font-medium text-amber-900">권장 조치</p>
            <p className="text-sm text-amber-800">{decision.taxonAlert.recommendation}</p>
          </div>
        </div>
      )}

      {/* 4. 추천 마커 */}
      {decision.recommendedMarkers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">추천 대안 마커</h3>
          <div className="flex flex-wrap gap-2">
            {decision.recommendedMarkers.map((m) => {
              const blastMarker = toBlastMarker(m)
              if (blastMarker && onRetryWithMarker) {
                return (
                  <button
                    key={m}
                    onClick={() => onRetryWithMarker(blastMarker)}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 transition hover:bg-blue-100 hover:border-blue-300"
                  >
                    {m} <span className="text-xs text-blue-400">→ 재분석</span>
                  </button>
                )
              }
              return (
                <span
                  key={m}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600"
                  title="이 마커는 별도 실험이 필요합니다"
                >
                  {m}
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            현재 마커({marker})로 충분한 해상도를 얻지 못했을 때, 위 마커를 클릭하면 같은 서열로 재분석합니다.
          </p>
        </div>
      )}

      {/* 5. 다음 행동 버튼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">다음 단계</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {decision.nextActions.map((action) => {
            // GenBank 링크는 바로 열 수 있음
            if (action.action === 'genbank' && decision.topHits[0]) {
              return (
                <a
                  key={action.action}
                  href={`https://www.ncbi.nlm.nih.gov/nuccore/${decision.topHits[0].accession}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {action.label}
                </a>
              )
            }

            return (
              <button
                key={action.action}
                disabled
                title="준비 중인 기능입니다"
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-400 cursor-not-allowed"
              >
                {action.label}
                <span className="ml-1 text-xs text-gray-300">(준비 중)</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 새 분석 */}
      <div className="flex gap-2">
        <button
          onClick={() => onReset(false)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          서열 유지하고 재분석
        </button>
        <button
          onClick={() => onReset(true)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          새 서열로 분석
        </button>
      </div>
    </div>
  )
}
