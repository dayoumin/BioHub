// stats/components/genetics/MultiSequenceInput.tsx
'use client'

import { useMemo, useCallback, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { parseMultiFasta, type ParsedSequence } from '@/lib/genetics/multi-fasta-parser'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/genetics/CopyButton'
import { focusRing } from '@/components/common/card-styles'
import { useDebounce } from '@/hooks/useDebounce'

interface MultiSequenceInputProps {
  /** Raw text (multi-FASTA or plain sequences) */
  value: string
  onChange: (value: string) => void
  /** Minimum number of sequences required */
  minSequences: number
  /** Optional label override */
  label?: string
  /** Optional placeholder override */
  placeholder?: string
  /** File upload callback (file name tracking is caller's responsibility) */
  uploadedFileName: string | null
  onUploadedFileNameChange: (name: string | null) => void
  /** Called when user submits with valid sequences */
  onSubmit: (sequences: ParsedSequence[]) => void
}

const MAX_FILE_SIZE = 5_000_000 // 5MB for multi-FASTA
const ACCEPTED_EXTENSIONS = '.fasta,.fa,.txt,.fas'

export function MultiSequenceInput({
  value,
  onChange,
  minSequences,
  label = 'DNA 서열 (Multi-FASTA)',
  placeholder = '>sequence_1\nATGCATGC...\n>sequence_2\nGGCCTTAA...',
  uploadedFileName,
  onUploadedFileNameChange,
  onSubmit,
}: MultiSequenceInputProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedValue = useDebounce(value, 300)

  const parsed = useMemo<ParsedSequence[]>(
    () => debouncedValue.trim() ? parseMultiFasta(debouncedValue) : [],
    [debouncedValue],
  )

  // Use raw value for immediate empty check
  const displayParsed = value.trim() ? parsed : []
  const isStale = value !== debouncedValue

  const totalLength = useMemo(
    () => displayParsed.reduce((sum, s) => sum + s.sequence.length, 0),
    [displayParsed],
  )
  const meanLength = displayParsed.length > 0 ? Math.round(totalLength / displayParsed.length) : 0
  const hasEnough = displayParsed.length >= minSequences
  const canSubmit = hasEnough && !isStale

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error('파일 크기가 5MB를 초과합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        onChange(text)
        onUploadedFileNameChange(file.name)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [onChange, onUploadedFileNameChange])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(displayParsed)
  }, [canSubmit, displayParsed, onSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="multi-seq" className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <div className="flex items-center gap-1">
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
            {value.trim() && <CopyButton text={value} />}
            {value.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => {
                  onChange('')
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
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        {uploadedFileName && (
          <p className="mb-1 text-xs text-green-600">{uploadedFileName} 로드 완료</p>
        )}
        <textarea
          id="multi-seq"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (uploadedFileName) onUploadedFileNameChange(null)
          }}
          placeholder={placeholder}
          rows={10}
          className={`max-h-[400px] min-h-[180px] w-full resize-y overflow-y-auto rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm ${focusRing}`}
        />

        {/* Real-time stats */}
        {value.trim() && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className={`font-medium ${hasEnough ? 'text-green-600' : 'text-amber-600'}`}>
              {displayParsed.length}개 서열
              {!hasEnough && ` (최소 ${minSequences}개 필요)`}
            </span>
            {displayParsed.length > 0 && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">평균 {meanLength} bp</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">총 {totalLength.toLocaleString()} bp</span>
              </>
            )}
            {isStale && (
              <span className="text-xs text-gray-400">(분석 중...)</span>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full py-3">
        분석 시작
      </Button>
      {!value.trim() && (
        <p className="text-center text-xs text-gray-400">
          Multi-FASTA 형식으로 서열을 입력하거나 파일을 업로드하세요
        </p>
      )}
    </form>
  )
}

