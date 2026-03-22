'use client'

import { useState } from 'react'
import type { BlastMarker, BlastResultStatus } from '@biohub/types'
import type { DecisionResult, MarkerRecommendation } from '@/lib/genetics/decision-engine'

interface ResultViewProps {
  decision: DecisionResult
  marker: BlastMarker
  onReset: (clearSequence?: boolean) => void
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

const needsAlternative = (status: BlastResultStatus): boolean =>
  status !== 'high'

export function ResultView({ decision, marker, onReset }: ResultViewProps) {
  const style = STATUS_STYLES[decision.status]
  const showAltTop = needsAlternative(decision.status) && decision.recommendedMarkers.length > 0

  return (
    <div className="space-y-4" role="region" aria-label="분석 결과">
      {/* 결과 카드 */}
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

      {/* 대안 마커 안내 */}
      {showAltTop && (
        <AlternativeMarkersCard marker={marker} markers={decision.recommendedMarkers} />
      )}

      {/* 분류군 맞춤 안내 */}
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

      {/* Top Hits 테이블 */}
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

      {/* 다음 단계 + 재분석 */}
      <div className="flex flex-wrap items-center gap-2">
        {decision.nextActions.map((action) => {
          if (action.action === 'genbank' && decision.topHits[0]) {
            return (
              <a
                key={action.action}
                href={`https://www.ncbi.nlm.nih.gov/nuccore/${decision.topHits[0].accession}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
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
              className="rounded-lg border border-gray-100 px-3 py-2 text-xs text-gray-400 cursor-not-allowed"
            >
              {action.label} <span className="text-[10px] text-gray-300">(준비 중)</span>
            </button>
          )
        })}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onReset(false)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            서열 유지하고 재분석
          </button>
          <button
            onClick={() => onReset(true)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            새 서열로 분석
          </button>
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
      <h3 className="mb-2 text-sm font-semibold text-blue-900">대안 마커로 재시도하세요</h3>
      <p className="mb-3 text-xs text-blue-800">
        {marker}로는 정확한 종 판별이 어렵습니다. 아래 마커의 서열을 확보하여 분석해보세요.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {markers.map((m, i) => (
          <button
            key={m.name}
            type="button"
            onClick={() => setSelected(m.name)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              selected === m.name
                ? 'border-blue-400 bg-blue-600 text-white shadow-sm'
                : 'border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {m.name}
            {i === 0 && selected !== m.name && (
              <span className="ml-1 text-[10px] text-blue-400">추천</span>
            )}
          </button>
        ))}
      </div>

      {selectedInfo && (
        <div className="rounded-lg border border-blue-200 bg-white p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-bold text-blue-900">{selectedInfo.name}</span>
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
