'use client'

import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Upload, X, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import type { BlastProgram, BlastDatabase, GenericBlastParams, SequenceValidation } from '@biohub/types'
import { BLAST_DB_BY_PROGRAM, BLAST_DEFAULT_DB, BLAST_PROGRAM_LABELS, BLAST_DB_LABELS } from '@biohub/types'
import { validateBlastSequence, isDnaProgram, cleanSequence, cleanProteinSequence } from '@/lib/genetics/validate-sequence'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { GeneticsExamplePicker } from '@/components/genetics/GeneticsExamplePicker'
import { BIOLOGY_INPUT, BIOLOGY_PANEL_SOFT, BIOLOGY_TEXTAREA } from '@/lib/design-tokens/biology'

const PROGRAMS: BlastProgram[] = ['blastn', 'blastp', 'blastx', 'tblastn', 'tblastx']

/** 프로그램별 예제 서열 */
const BLAST_EXAMPLES: Record<string, { label: string; program: BlastProgram; db: BlastDatabase; sequence: string }> = {
  blastn: {
    label: 'Gadus morhua COI (DNA)',
    program: 'blastn',
    db: 'nt',
    sequence: `>Gadus_morhua_COI_example
CCTCTACCTGGTGTTTGGTGCCTGAGCCGGAATAGTCGGCACAGCTCTAAG
CCTTCTAATTCGAGCTGAGCTGAGCCAACCAGGCGCCCTTCTAGGCGATGA
CCAAATTTATAATGTAATTGTTACAGCACATGCCTTTGTAATAATTTTCTTT
ATAGTAATACCAATTATAATTGGAGGATTTGGAAACTGACTAGTGCCCCTAA
TGATCGGTGCCCCAGACATAGCATTCCCACGAATAAACAACATAAGTTTCTG
ACTTCTCCCTCCATCATTCCTTCTTCTCCTAGCCTCTTCTGGCGTAGAAGCC
GGAGCAGGAACAGGATGAACTGTATATCCCCCCCTATCAGGCAACCTAGCCC
ATGCCGGAGCATCAGTTGATCTAACAATTTTCTCACTCCACCTGGCAGGTGT
CTCATCAATCCTAGGCGCAATCAACTTTATTACAACAATCATTAACATGAAA
CCCCCAGCCATTTCTCAATACCAAACACCCCTGTTCGTGTGAGCAGTTCTCA
TTACAGCCGTACTACTCCTCCTATCTCTTCCAGTCCTCGCCGCCGGCATTAC
CATGCTTTTAACAGACCGAAACCTTAATACAACCTTCTTTGACCCTGCAGGA
GGAGGAGACCCAATTCTTTACCAACACTTATTT`,
  },
  blastp: {
    label: 'Human insulin (단백질)',
    program: 'blastp',
    db: 'swissprot',
    sequence: `>Human_insulin_precursor
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYT
PKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSL
YQLENYCN`,
  },
  blastx: {
    label: 'Mouse Hemoglobin mRNA (DNA→단백질)',
    program: 'blastx',
    db: 'swissprot',
    sequence: `>Mouse_Hbb_mRNA_example
ATGGTGCACCTGACTGATGCTGAGAAGGCTGCTGTCTCTTGCCTGTGGGGAAAGGTGA
ACTCCGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTTGTCTACCCTTGGAC
CCAGCGGTACTTTGATAGCTTTGGAGACCTATCCTCTGCCTCTGCTATCATGGGTAACC
CTAAGGTGAAGGCCCATGGCAAGAAGGTGATAAACGCCTTCAATGATGGCCTGAAACAC
TTGGACAACCTCAAGGGCACCTTTGCTCATCTGAGTGAGCTCCACTGTGACAAGCTGCA
TGTGGATCCTGAGAACTTCAAGCTCCTGGGAAATGTGCTGGTGACCGTTTTGGCAATCC
ATTTCGGCAAAGAATTCACCCCTGCTGCACAGGCTGCCTATCAGAAAGTGGTGGCTGGT
GTGGCTAATGCCCTGGCCCACAAGTACCACTAA`,
  },
}

export interface BlastInitialValues {
  program?: BlastProgram
  database?: BlastDatabase
  sequence?: string
}

interface BlastSearchInputProps {
  onSubmit: (params: GenericBlastParams) => void
  initialValues?: BlastInitialValues
}

export function BlastSearchInput({ onSubmit, initialValues }: BlastSearchInputProps): React.ReactElement {
  const [program, setProgram] = useState<BlastProgram>(initialValues?.program ?? 'blastn')
  const [database, setDatabase] = useState<BlastDatabase>(initialValues?.database ?? 'nt')
  const [sequence, setSequence] = useState(initialValues?.sequence ?? '')
  const initialAppliedRef = useRef(false)

  // initialValues가 마운트 후 비동기로 들어올 때 상태 동기화 (1회만)
  useEffect(() => {
    if (!initialValues || initialAppliedRef.current) return
    initialAppliedRef.current = true
    if (initialValues.program) setProgram(initialValues.program)
    if (initialValues.database) setDatabase(initialValues.database)
    if (initialValues.sequence) setSequence(initialValues.sequence)
  }, [initialValues])
  const [expect, setExpect] = useState(10)
  const [hitlistSize, setHitlistSize] = useState(50)
  const [megablast, setMegablast] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedDbs = BLAST_DB_BY_PROGRAM[program]

  const handleProgramChange = useCallback((p: BlastProgram) => {
    setProgram(p)
    const dbs = BLAST_DB_BY_PROGRAM[p]
    if (!dbs.includes(database)) {
      setDatabase(BLAST_DEFAULT_DB[p])
    }
  }, [database])

  const debouncedSequence = useDebounce(sequence, 300)
  const validation = useMemo<SequenceValidation | null>(
    () => debouncedSequence.trim() ? validateBlastSequence(debouncedSequence, program) : null,
    [debouncedSequence, program],
  )
  const displayValidation = sequence.trim() ? validation : null
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
        setSequence(text)
        setUploadedFileName(file.name)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const cleaned = isDnaProgram(program)
      ? cleanSequence(sequence)
      : cleanProteinSequence(sequence)

    onSubmit({
      sequence: cleaned,
      program,
      database,
      expect,
      hitlistSize,
      megablast: program === 'blastn' ? megablast : undefined,
    })
  }, [canSubmit, sequence, program, database, expect, hitlistSize, megablast, onSubmit])

  const inputType = isDnaProgram(program) ? 'DNA' : '단백질'
  const placeholder = isDnaProgram(program)
    ? '>query_sequence\nATGCGTACGTACGTACG...'
    : '>query_protein\nMKTAYIAKQRQISFVKSH...'
  const exampleItems = useMemo(
    () => Object.entries(BLAST_EXAMPLES).map(([id, example]) => ({
      id,
      label: example.label,
      description: `${example.program} · ${example.db}`,
      program: example.program,
      db: example.db,
      sequenceText: example.sequence,
    })),
    [],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* BLAST 프로그램 선택 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          BLAST 프로그램
        </label>
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p) => {
            const info = BLAST_PROGRAM_LABELS[p]
            return (
              <Button
                key={p}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleProgramChange(p)}
                className={`${
                  program === p
                    ? 'border-0 bg-surface-container-high font-medium text-[color:var(--section-accent-bio)] hover:bg-surface-container-high'
                    : 'border-0 bg-surface-container-low text-muted-foreground hover:bg-surface-container hover:text-foreground'
                }`}
              >
                <span className="font-mono text-xs">{info.name}</span>
              </Button>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          입력: {BLAST_PROGRAM_LABELS[program].input} → 검색: {BLAST_PROGRAM_LABELS[program].search}
          <span className="mx-1.5 text-border">|</span>
          {BLAST_PROGRAM_LABELS[program].useCase}
        </p>
      </div>

      {/* 데이터베이스 선택 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          데이터베이스
        </label>
        <div className="flex flex-wrap gap-2">
          {allowedDbs.map((db) => (
            <Button
              key={db}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDatabase(db)}
              className={`text-xs ${
                database === db
                  ? 'border-0 bg-surface-container-high font-medium text-[color:var(--section-accent-bio)] hover:bg-surface-container-high'
                  : 'border-0 bg-surface-container-low text-muted-foreground hover:bg-surface-container hover:text-foreground'
              }`}
            >
              {db}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {BLAST_DB_LABELS[database]}
        </p>
      </div>

      {/* 서열 입력 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="blast-sequence" className="block text-sm font-medium text-foreground">
            {inputType} 서열 (FASTA)
          </label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-surface-container-low hover:text-[color:var(--section-accent-bio)]"
              onClick={() => fileInputRef.current?.click()}
              title="FASTA 파일 업로드"
            >
              <Upload className="h-4 w-4" />
            </Button>
            {sequence.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-surface-container-low hover:text-destructive"
                onClick={() => { setSequence(''); setUploadedFileName(null) }}
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
          <p className="mb-1 text-xs text-[color:var(--section-accent-bio)]">{uploadedFileName} 로드 완료</p>
        )}
        <textarea
          id="blast-sequence"
          value={sequence}
          onChange={(e) => { setSequence(e.target.value); if (uploadedFileName) setUploadedFileName(null) }}
          placeholder={placeholder}
          rows={6}
          className={`${BIOLOGY_TEXTAREA} max-h-[300px] min-h-[120px] overflow-y-auto`}
        />
        {displayValidation && (
          <div className="mt-1.5 space-y-0.5">
            {displayValidation.errors.map((err, i) => (
              <p key={i} className="text-sm text-destructive">{err}</p>
            ))}
            {displayValidation.warnings.map((w, i) => (
              <p key={i} className="text-sm text-warning">{w}</p>
            ))}
            {displayValidation.valid && (
              <p className="text-sm text-muted-foreground">
                {displayValidation.length} {isDnaProgram(program) ? 'bp' : 'aa'}
                {displayValidation.gcContent > 0 && ` · GC ${(displayValidation.gcContent * 100).toFixed(1)}%`}
              </p>
            )}
          </div>
        )}

        {/* 예제 서열 */}
        {!sequence.trim() && (
          <div className="mt-4">
            <GeneticsExamplePicker
              title="예제 서열"
              description="프로그램 유형별 대표 예제를 넣고 바로 검색 흐름을 확인할 수 있습니다."
              items={exampleItems}
              onSelect={(example) => {
                setSequence(example.sequenceText)
                setUploadedFileName(null)
                handleProgramChange(example.program)
                setDatabase(example.db)
              }}
            />
          </div>
        )}
      </div>

      {/* 고급 옵션 토글 */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(prev => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
          고급 옵션
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showAdvanced && (
          <div className={`mt-3 grid gap-4 p-4 sm:grid-cols-3 ${BIOLOGY_PANEL_SOFT}`}>
            <div>
              <label htmlFor="expect" className="mb-1 block text-xs font-medium text-muted-foreground">
                E-value 임계값
              </label>
              <select
                id="expect"
                value={expect}
                onChange={(e) => setExpect(Number(e.target.value))}
                className={BIOLOGY_INPUT}
              >
                {[0.001, 0.01, 0.1, 1, 10, 100].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hitlist" className="mb-1 block text-xs font-medium text-muted-foreground">
                최대 결과 수
              </label>
              <select
                id="hitlist"
                value={hitlistSize}
                onChange={(e) => setHitlistSize(Number(e.target.value))}
                className={BIOLOGY_INPUT}
              >
                {[10, 25, 50, 100, 250, 500].map(v => (
                  <option key={v} value={v}>{v}개</option>
                ))}
              </select>
            </div>

            {program === 'blastn' && (
              <div className="flex items-center gap-2">
                <input
                  id="megablast"
                  type="checkbox"
                  checked={megablast}
                  onChange={(e) => setMegablast(e.target.checked)}
                  className="h-4 w-4 rounded border-0 bg-surface-container-low"
                />
                <label htmlFor="megablast" className="text-xs font-medium text-muted-foreground">
                  Megablast (빠른 검색)
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 제출 */}
      <Button type="submit" disabled={!canSubmit} className="w-full py-3">
        BLAST 검색 시작
      </Button>
      {!sequence.trim() && (
        <p className="text-center text-xs text-muted-foreground/60">
          {inputType} 서열을 입력하거나 예제를 선택해 시작하세요
        </p>
      )}
    </form>
  )
}
