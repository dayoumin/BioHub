'use client'

import { useMemo, useCallback, useRef } from 'react'
import { useState } from 'react'
import { Upload, X, Copy, Check } from 'lucide-react'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { validateSequence } from '@/lib/genetics/validate-sequence'
import { EXAMPLE_SEQUENCES } from '@/lib/genetics/example-sequences'
import { useDebounce } from '@/hooks/useDebounce'

const MARKERS: { value: BlastMarker; label: string; help: string }[] = [
  { value: 'COI', label: 'COI', help: '동물 표준 바코드 — 어류, 곤충 등 대부분의 동물' },
  { value: 'CytB', label: 'Cyt b', help: '포유류, 법의학 시료 — COI 보완 마커' },
  { value: '16S', label: '16S rRNA', help: '양서류 표준 — 환경 DNA, 보편적 프라이머' },
  { value: '12S', label: '12S rRNA', help: '어류 eDNA — 짧은 단편, 열화 시료 적합' },
  { value: 'ITS', label: 'ITS', help: '진균 표준 바코드 — 진균, 식물' },
  { value: 'D-loop', label: 'D-loop', help: '참치류, 연어과 종 세분화 — 가장 빠른 진화 영역' },
]

interface SequenceInputProps {
  sequence: string
  onSequenceChange: (seq: string) => void
  marker: BlastMarker
  onMarkerChange: (marker: BlastMarker) => void
  sampleName: string
  onSampleNameChange: (name: string) => void
  uploadedFileName: string | null
  onUploadedFileNameChange: (name: string | null) => void
  onSubmit: (validation: SequenceValidation) => void
}

export function SequenceInput({
  sequence,
  onSequenceChange,
  marker,
  onMarkerChange,
  sampleName,
  onSampleNameChange,
  uploadedFileName,
  onUploadedFileNameChange,
  onSubmit,
}: SequenceInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSequence = useDebounce(sequence, 300)
  const validation = useMemo<SequenceValidation | null>(
    () => debouncedSequence.trim() ? validateSequence(debouncedSequence) : null,
    [debouncedSequence],
  )

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
        onUploadedFileNameChange(file.name)
      }
    }
    reader.readAsText(file)
  }, [onSequenceChange, onUploadedFileNameChange])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (validation?.valid) onSubmit(validation)
  }, [validation, onSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 시료명 */}
      <div>
        <label htmlFor="sampleName" className="mb-1 block text-sm font-medium text-gray-700">
          시료명 <span className="font-normal text-gray-400">(선택)</span>
        </label>
        <input
          id="sampleName"
          type="text"
          value={sampleName}
          onChange={(e) => onSampleNameChange(e.target.value)}
          placeholder="예: 제주 채집 시료 #3, 시장 구매 참치"
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          나중에 분석 기록을 구분하는 데 사용됩니다
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          마커
        </label>
        <p className="mb-2 text-xs text-gray-500">
          시퀀싱에 사용한 프라이머의 마커 영역을 선택하세요. 모르면 COI(기본값)로 시작하세요.
        </p>
        <div className="flex flex-wrap gap-2">
          {MARKERS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMarkerChange(m.value)}
              title={m.help}
              className={`min-w-[4.5rem] rounded-lg border px-3 py-1.5 text-center text-sm transition ${
                marker === m.value
                  ? 'border-blue-500 bg-blue-50 font-medium text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {marker && (
          <p className="mt-1.5 text-xs text-blue-600/80">
            {MARKERS.find(m => m.value === marker)?.help}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="sequence" className="block text-sm font-medium text-gray-700">
            DNA 서열 (FASTA)
          </label>
          <div className="flex items-center gap-1">
            {!sequence.trim() && (
              <button
                type="button"
                onClick={() => {
                  onSequenceChange(EXAMPLE_SEQUENCES[0].sequence)
                  onUploadedFileNameChange(null)
                }}
                className="text-xs text-green-600 hover:text-green-800"
              >
                예제 서열 넣기
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded p-1 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
              title="FASTA 파일 업로드"
            >
              <Upload className="h-4 w-4" />
            </button>
            {sequence.trim() && (
              <CopyButton text={sequence} />
            )}
            {sequence.trim() && (
              <button
                type="button"
                onClick={() => {
                  onSequenceChange('')
                  onUploadedFileNameChange(null)
                }}
                className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                title="서열 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
            if (uploadedFileName) onUploadedFileNameChange(null)
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded p-1 transition ${copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
      title={copied ? '복사됨' : '서열 복사'}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
