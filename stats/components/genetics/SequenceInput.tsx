'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { validateSequence } from '@/lib/genetics/validate-sequence'
import { EXAMPLE_SEQUENCES } from '@/lib/genetics/example-sequences'

const MARKERS: { value: BlastMarker; label: string; help: string }[] = [
  { value: 'COI', label: 'COI (동물 표준)', help: '어류, 곤충 등 대부분의 동물' },
  { value: 'CytB', label: 'Cyt b (포유류 법의학)', help: '포유류, 법의학 시료' },
  { value: '16S', label: '16S rRNA (양서류/eDNA)', help: '양서류, 환경 DNA' },
  { value: '12S', label: '12S rRNA (어류 eDNA)', help: '어류 환경 DNA (짧은 단편)' },
  { value: 'ITS', label: 'ITS (진균)', help: '진균, 식물' },
  { value: 'D-loop', label: 'D-loop (참치/연어)', help: '참치류, 연어과 종 세분화' },
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
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
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
    if (file.size > 1_000_000) {
      alert('파일 크기가 1MB를 초과합니다. 더 작은 파일을 사용하세요.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        onSequenceChange(text)
        setUploadedFileName(file.name)
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
        <label className="mb-2 block text-sm font-medium text-gray-700">
          마커
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKERS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMarkerChange(m.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                marker === m.value
                  ? 'border-blue-500 bg-blue-50 font-medium text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {MARKERS.find(m => m.value === marker)?.help}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="sequence" className="block text-sm font-medium text-gray-700">
            DNA 서열 (FASTA)
          </label>
          <div className="flex gap-3">
            {!sequence.trim() && (
              <button
                type="button"
                onClick={() => {
                  onSequenceChange(EXAMPLE_SEQUENCES[0].sequence)
                  setUploadedFileName(null)
                }}
                className="text-xs text-green-600 hover:text-green-800"
              >
                예제 서열 넣기
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              파일 업로드
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".fasta,.fa,.txt,.fas"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        {uploadedFileName && (
          <p className="mb-1 text-xs text-green-600">
            {uploadedFileName} 로드 완료
          </p>
        )}
        <textarea
          id="sequence"
          value={sequence}
          onChange={(e) => {
            onSequenceChange(e.target.value)
            if (uploadedFileName) setUploadedFileName(null)
          }}
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

      <div>
        <button
          type="submit"
          disabled={!validation?.valid}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          분석 시작
        </button>
        {validation && !validation.valid && sequence.trim() && (
          <p className="mt-1 text-center text-xs text-red-500">
            위 오류를 수정하면 분석을 시작할 수 있습니다
          </p>
        )}
        {!sequence.trim() && (
          <p className="mt-1 text-center text-xs text-gray-400">
            서열을 입력하거나 예제 서열을 넣어 시작하세요
          </p>
        )}
      </div>
    </form>
  )
}
