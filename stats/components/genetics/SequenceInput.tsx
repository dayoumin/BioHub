'use client'

import { useMemo, useCallback, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { validateSequence } from '@/lib/genetics/validate-sequence'
import { EXAMPLE_SEQUENCES } from '@/lib/genetics/example-sequences'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/genetics/CopyButton'
import { focusRing } from '@/components/common/card-styles'

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
  /** 제출 버튼 텍스트 (기본 '분석 시작') */
  submitLabel?: string
  /** 마커 선택 UI 숨김 (BOLD 등 마커 불필요 도구) */
  hideMarkerSelector?: boolean
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
  submitLabel,
  hideMarkerSelector,
}: SequenceInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSequence = useDebounce(sequence, 300)
  const debouncedValidation = useMemo<SequenceValidation | null>(
    () => debouncedSequence.trim() ? validateSequence(debouncedSequence) : null,
    [debouncedSequence],
  )
  // raw sequence가 비었으면 debounce 지연과 무관하게 즉시 null
  const validation = sequence.trim() ? debouncedValidation : null
  const isStale = sequence !== debouncedSequence
  const canSubmit = validation?.valid === true && !isStale

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_000_000) {
      toast.error('파일 크기가 1MB를 초과합니다. 더 작은 파일을 사용하세요.')
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
    if (!canSubmit || !validation) return
    onSubmit(validation)
  }, [canSubmit, validation, onSubmit])

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
          className={`w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ${focusRing} focus-visible:border-primary`}
        />
      </div>

      {!hideMarkerSelector && <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          마커
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKERS.map((m) => (
            <Button
              key={m.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMarkerChange(m.value)}
              title={m.help}
              className={`min-w-[4.5rem] ${
                marker === m.value
                  ? 'border-blue-500 bg-blue-50 font-medium text-blue-700 hover:bg-blue-50'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {m.label}
            </Button>
          ))}
        </div>
        {marker && (
          <p className="mt-1.5 text-xs text-blue-600/80">
            {MARKERS.find(m => m.value === marker)?.help}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground/50">
          어떤 마커를 선택할지 모르겠다면 동물은 COI, 진균은 ITS, 양서류는 16S로 시작하세요.
        </p>
      </div>}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="sequence" className="block text-sm font-medium text-gray-700">
            DNA 서열 (FASTA)
          </label>
          <div className="flex items-center gap-1">
            {!sequence.trim() && (() => {
              const example = EXAMPLE_SEQUENCES.find(ex => ex.marker === marker) ?? EXAMPLE_SEQUENCES[0]
              const latinName = example.species.split(' (')[0]
              return (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-green-600 hover:text-green-800"
                  onClick={() => {
                    onSequenceChange(example.sequence)
                    onUploadedFileNameChange(null)
                  }}
                >
                  예제 서열 넣기 ({latinName})
                </Button>
              )
            })()}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => fileInputRef.current?.click()}
              title="FASTA 파일 업로드"
            >
              <Upload className="h-4 w-4" />
            </Button>
            {sequence.trim() && (
              <CopyButton text={sequence} />
            )}
            {sequence.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => {
                  onSequenceChange('')
                  onUploadedFileNameChange(null)
                }}
                title="서열 지우기"
              >
                <X className="h-4 w-4" />
              </Button>
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
          className={`max-h-[300px] min-h-[150px] w-full resize-y overflow-y-auto rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm ${focusRing}`}
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
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3"
        >
          {submitLabel ?? '분석 시작'}
        </Button>
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

