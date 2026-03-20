'use client'

import { useState, useCallback } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, Copy, CheckCircle2, AlertCircle, ExternalLink, ShieldAlert } from 'lucide-react'
import {
  runBarcoding,
  validateFasta,
  type BarcodingSearchMode,
  type BarcodingResult,
  type BarcodingProgress,
} from '@/lib/services/bio/barcoding-service'
import {
  validateBarcodingHits,
  applyValidationToHits,
  type SpeciesValidation,
} from '@/lib/services/bio/species-validation-service'
import type { BlastDatabase, BlastProgram, UnifiedBarcodingHit } from '@/lib/services/bio/types'

const tool = getBioToolById('barcoding')

const SAMPLE_FASTA = `>Sample_COI Paralichthys olivaceus cytochrome oxidase subunit I
CCTTTATATAGTATTTGGTGCTTGAGCCGGAATAGTCGGCACAGCCCTAAGCCTGCTAAT
CCGTGCCGAACTAAGCCAACCAGGCGCTCTCCTCGGAGACGACCAGATCTACAACGTAAT
TGTTACGGCACATGCCTTCGTAATAATTTTCTTTATAGTAATACCAATCATGATTGGAGG
CTTTGGAAACTGACTAGTCCCACTAATGATCGGAGCCCCAGACATGGCATTCCCACGAATA
AACAACATAAGCTTTTGACTTCTACCGCCTTCATTCCTTCTACTTCTAGCCTCTTCTGGCG`

export default function BarcodingPage(): React.ReactElement {
  const [fastaInput, setFastaInput] = useState('')
  const [searchMode, setSearchMode] = useState<BarcodingSearchMode>('ncbi')
  const [database, setDatabase] = useState<BlastDatabase>('nt')
  const [program, setProgram] = useState<BlastProgram>('blastn')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<BarcodingProgress | null>(null)
  const [result, setResult] = useState<BarcodingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [validations, setValidations] = useState<Map<string, SpeciesValidation>>(new Map())

  const handleLoadSample = useCallback(() => {
    setFastaInput(SAMPLE_FASTA)
    setError(null)
  }, [])

  const handleRun = useCallback(async () => {
    const validation = validateFasta(fastaInput)
    if (!validation.valid) {
      setError(validation.error ?? '서열 검증 실패')
      return
    }

    setIsRunning(true)
    setError(null)
    setResult(null)
    setProgress({ phase: 'submitting', message: '준비 중...' })

    try {
      const res = await runBarcoding(
        { fastaInput, searchMode, database, program, maxHits: 10 },
        setProgress,
      )

      // 학명 검증 (실패해도 결과는 표시)
      if (res.hits.length > 0) {
        setProgress({ phase: 'validating', message: '학명 검증 중...' })
        try {
          const vMap = await validateBarcodingHits(res.hits)
          applyValidationToHits(res.hits, vMap)
          setValidations(vMap)
        } catch {
          // species-checker 실패 — 무시 (graceful degradation)
        }
      }

      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }, [fastaInput, searchMode, database, program])

  const handleCopyTable = useCallback(async () => {
    if (!result?.hits.length) return
    const header = '종명\t유사도(%)\tE-value\tAccession\t출처'
    const rows = result.hits.map(h =>
      `${h.scientificName}\t${h.similarity.toFixed(2)}\t${h.eValue ?? '-'}\t${h.accession ?? h.processId ?? '-'}\t${h.source.toUpperCase()}`
    )
    await navigator.clipboard.writeText([header, ...rows].join('\n'))
    setCopiedIdx(-1)
    setTimeout(() => setCopiedIdx(null), 2000)
  }, [result])

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        {/* 서열 입력 영역 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">서열 입력 (FASTA)</h2>
            <Button variant="ghost" size="sm" onClick={handleLoadSample}>
              샘플 서열 불러오기
            </Button>
          </div>
          <Textarea
            placeholder={">Sample_01 COI gene\nATGCTAGCTAGCTAGC..."}
            className="font-mono text-xs min-h-[160px] resize-y"
            value={fastaInput}
            onChange={(e) => {
              setFastaInput(e.target.value)
              setError(null)
            }}
          />
        </div>

        {/* 옵션 */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">검색 DB</label>
            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as BarcodingSearchMode)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ncbi">NCBI BLAST</SelectItem>
                <SelectItem value="bold">BOLD Systems</SelectItem>
                <SelectItem value="both">NCBI + BOLD (병행)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchMode === 'ncbi' || searchMode === 'both') && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Database</label>
                <Select value={database} onValueChange={(v) => setDatabase(v as BlastDatabase)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nt">nt (nucleotide)</SelectItem>
                    <SelectItem value="nr">nr (protein)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Program</label>
                <Select value={program} onValueChange={(v) => setProgram(v as BlastProgram)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blastn">blastn</SelectItem>
                    <SelectItem value="blastx">blastx</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={handleRun}
            disabled={isRunning || !fastaInput.trim()}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                종 동정 실행
              </>
            )}
          </Button>
        </div>

        {/* 진행 상태 */}
        {progress && isRunning && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm">{progress.message}</span>
            {progress.pollCount != null && progress.maxPolls != null && (
              <div className="ml-auto">
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(progress.pollCount / progress.maxPolls) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="space-y-4">
            {/* 결과 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">종 동정 결과</h3>
                <Badge variant="secondary" className="text-xs">
                  {result.hits.length}건
                </Badge>
                {result.sources.map(s => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s.toUpperCase()}
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleCopyTable}>
                {copiedIdx === -1 ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" />표 복사</>
                )}
              </Button>
            </div>

            {/* 결과 테이블 */}
            {result.hits.length > 0 ? (
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 w-8">#</th>
                      <th className="text-left px-3 py-2">종명</th>
                      <th className="text-left px-3 py-2">국명</th>
                      <th className="text-right px-3 py-2">유사도</th>
                      <th className="text-right px-3 py-2">E-value</th>
                      <th className="text-right px-3 py-2">Coverage</th>
                      <th className="text-left px-3 py-2">Accession</th>
                      <th className="text-center px-3 py-2">출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.hits.map((hit, idx) => (
                      <HitRow key={`${hit.source}-${hit.accession ?? hit.processId}-${idx}`} hit={hit} rank={idx + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
                매칭 결과가 없습니다. 서열 길이 또는 데이터베이스를 변경해보세요.
              </div>
            )}

            {/* 쿼리 정보 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>서열 길이: {result.queryLength}bp</span>
              {result.blastRid && (
                <a
                  href={`https://blast.ncbi.nlm.nih.gov/Blast.cgi?CMD=Get&RID=${result.blastRid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  NCBI에서 보기 <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}

// ─── 결과 행 컴포넌트 ─────────────────────────────

function HitRow({ hit, rank }: { hit: UnifiedBarcodingHit; rank: number }): React.ReactElement {
  const identityColor = hit.similarity >= 99
    ? 'text-green-600 dark:text-green-400'
    : hit.similarity >= 97
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-orange-600 dark:text-orange-400'

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2 text-muted-foreground">{rank}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-medium italic">{hit.validatedName ?? hit.scientificName}</span>
          {hit.isProtectedSpecies && (
            <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          )}
        </div>
        {hit.taxonomy?.family && (
          <span className="text-xs text-muted-foreground">{hit.taxonomy.family}</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs">
        {hit.koreanName ?? <span className="text-muted-foreground">-</span>}
      </td>
      <td className={`text-right px-3 py-2 font-mono font-medium ${identityColor}`}>
        {hit.similarity.toFixed(2)}%
      </td>
      <td className="text-right px-3 py-2 font-mono text-xs">
        {hit.eValue ?? '-'}
      </td>
      <td className="text-right px-3 py-2 font-mono text-xs">
        {hit.coverage != null ? `${hit.coverage.toFixed(1)}%` : '-'}
      </td>
      <td className="px-3 py-2 text-xs font-mono">
        {hit.accession ? (
          <a
            href={`https://www.ncbi.nlm.nih.gov/nuccore/${hit.accession}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {hit.accession}
          </a>
        ) : hit.processId ? (
          <span>{hit.processId}</span>
        ) : '-'}
      </td>
      <td className="text-center px-3 py-2">
        <Badge variant="outline" className="text-[10px] px-1.5">
          {hit.source.toUpperCase()}
        </Badge>
      </td>
    </tr>
  )
}
