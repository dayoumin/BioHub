'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { validateSequence } from '@/lib/genetics/validate-sequence'

const MARKERS: { value: BlastMarker; label: string }[] = [
  { value: 'COI', label: 'COI (동물 표준)' },
  { value: 'CytB', label: 'Cyt b (포유류 법의학)' },
  { value: '16S', label: '16S rRNA (양서류/eDNA)' },
  { value: '12S', label: '12S rRNA (어류 eDNA)' },
  { value: 'ITS', label: 'ITS (진균)' },
  { value: 'D-loop', label: 'D-loop (참치/연어)' },
]

interface SequenceInputProps {
  sequence: string
  onSequenceChange: (seq: string) => void
  marker: BlastMarker
  onMarkerChange: (marker: BlastMarker) => void
  onSubmit: (validation: SequenceValidation) => void
}

export function SequenceInput({
  sequence,
  onSequenceChange,
  marker,
  onMarkerChange,
  onSubmit,
}: SequenceInputProps) {
  const [validation, setValidation] = useState<SequenceValidation | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 디바운스 300ms로 유효성 검사
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!sequence.trim()) {
      setValidation(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      setValidation(validateSequence(sequence))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sequence])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        onSequenceChange(text)
      }
    }
    reader.readAsText(file)
  }, [onSequenceChange])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (validation?.valid) onSubmit(validation)
  }, [validation, onSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="marker" className="mb-1 block text-sm font-medium text-gray-700">
          마커
        </label>
        <select
          id="marker"
          value={marker}
          onChange={(e) => onMarkerChange(e.target.value as BlastMarker)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {MARKERS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="sequence" className="block text-sm font-medium text-gray-700">
            DNA 서열 (FASTA)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            파일 업로드 (.fasta, .fa, .txt)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".fasta,.fa,.txt,.fas"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        <textarea
          id="sequence"
          value={sequence}
          onChange={(e) => onSequenceChange(e.target.value)}
          placeholder={">sample_sequence\nATGCGTACGTACGTACG..."}
          rows={8}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {validation && (
          <div className="mt-2 space-y-1">
            {validation.errors.map((err, i) => (
              <p key={i} className="text-sm text-red-600">{err}</p>
            ))}
            {validation.warnings.map((warn, i) => (
              <p key={i} className="text-sm text-amber-600">{warn}</p>
            ))}
            {validation.valid && (
              <p className="text-sm text-gray-500">
                {validation.length} bp · GC {(validation.gcContent * 100).toFixed(1)}%
                {validation.ambiguousCount > 0 && ` · N: ${validation.ambiguousCount}`}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!validation?.valid}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        분석 시작
      </button>
    </form>
  )
}
