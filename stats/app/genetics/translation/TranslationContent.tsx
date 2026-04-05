// stats/app/genetics/translation/TranslationContent.tsx
'use client'

import { useState, useCallback, useEffect, useRef, useMemo, memo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { resolveAxisColors } from '@/lib/charts/chart-color-resolver'
import type { EChartsOption } from 'echarts'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import {
  saveGeneticsHistory,
} from '@/lib/genetics/analysis-history'
import {
  consumeTransferredSequence,
  storeSequenceForTransfer,
  formatTransferSource,
} from '@/lib/genetics/sequence-transfer'
import { CopyButton } from '@/components/genetics/CopyButton'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { focusRing } from '@/lib/design-tokens/common'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface GeneticTable {
  id: number
  name: string
  startCodons: string[]
  stopCodons: string[]
}

interface TranslateFrame {
  frame: number
  protein: string
  strand: string
  startPos: number
  codons: number
}

interface TranslateResult {
  frames: TranslateFrame[]
  reverseComplement: string
  sequenceLength: number
  geneticCodeName: string
  startCodons: string[]
  stopCodons: string[]
  availableTables: GeneticTable[]
}

interface OrfEntry {
  strand: string
  frame: number
  start: number
  end: number
  lengthBp: number
  lengthCodons: number
  startCodon: string
  stopCodon: string
  protein: string
}

interface OrfResult {
  orfs: OrfEntry[]
  sequenceLength: number
  geneticCodeName: string
  startCodons: string[]
  stopCodons: string[]
  minLength: number
  totalFound: number
}

interface CodonDetail {
  codon: string
  aminoAcid: string
  count: number
  frequency: number
  rscu: number
}

interface CodonUsageResult {
  codonCounts: CodonDetail[]
  rscu: Record<string, number>
  totalCodons: number
  aminoAcidFrequency: Record<string, number>
  sequenceLength: number
  geneticCodeName: string
}

type AnalysisTab = 'translate' | 'orf' | 'codon'

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function TranslationContent(): React.ReactElement {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // ── Shared state ─────────────────────────────────────────
  const [rawText, setRawText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [geneticCode, setGeneticCode] = useState(1)
  const [activeTab, setActiveTab] = useState<AnalysisTab>('translate')

  // ── Loading / error ──────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Results ──────────────────────────────────────────────
  const [translateResult, setTranslateResult] = useState<TranslateResult | null>(null)
  const [orfResult, setOrfResult] = useState<OrfResult | null>(null)
  const [codonResult, setCodonResult] = useState<CodonUsageResult | null>(null)

  // ── ORF specific ─────────────────────────────────────────
  const [minOrfLength, setMinOrfLength] = useState(100)
  const [selectedOrfIdx, setSelectedOrfIdx] = useState<number | null>(null)

  // ── Available tables (filled after first translate call) ─
  const [availableTables, setAvailableTables] = useState<GeneticTable[]>([])

  // ── Sequence transfer on mount ───────────────────────────
  useEffect(() => {
    const transferred = consumeTransferredSequence()
    if (transferred && transferred.sequenceType !== 'protein') {
      setRawText(transferred.sequence)
      toast.info(`${formatTransferSource(transferred.source)}에서 서열이 전달되었습니다.`)
    }
  }, [])

  // ── File upload ──────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_000_000) {
      toast.error('파일 크기가 1MB를 초과합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setRawText(text)
        setUploadedFileName(file.name)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleClearInput = useCallback(() => {
    setRawText('')
    setUploadedFileName(null)
    setTranslateResult(null)
    setOrfResult(null)
    setCodonResult(null)
    setSelectedOrfIdx(null)
    setErrorMsg(null)
  }, [])

  // ── Clean sequence for validation display ────────────────
  const cleanedLength = useMemo(() => {
    const lines = rawText.trim().split('\n')
    let len = 0
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('>')) continue
      len += trimmed.replace(/[^A-Za-z]/g, '').length
    }
    return len
  }, [rawText])

  // ── Save history ─────────────────────────────────────────
  const saveHistory = useCallback((
    mode: 'translate' | 'orf' | 'codon',
    seqLen: number,
    codeName: string,
    orfCount?: number,
  ) => {
    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const modeLabel = mode === 'translate' ? '번역' : mode === 'orf' ? 'ORF' : '코돈'
    const analysisName = uploadedFileName
      ? `${uploadedFileName} · ${modeLabel} · ${dateStr}`
      : `${modeLabel} · ${seqLen}bp · ${dateStr}`

    const saved = saveGeneticsHistory({
      type: 'translation',
      analysisName,
      sequenceLength: seqLen,
      geneticCode,
      geneticCodeName: codeName,
      analysisMode: mode,
      ...(orfCount !== undefined ? { orfCount } : {}),
      projectId: activeResearchProjectId ?? undefined,
    })
    if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
  }, [geneticCode, uploadedFileName, activeResearchProjectId])

  // ── Run analysis ─────────────────────────────────────────
  const runAnalysis = useCallback(async (tab: AnalysisTab) => {
    if (!rawText.trim()) {
      toast.error('DNA 서열을 입력해 주세요.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const core = PyodideCoreService.getInstance()
      await core.initialize()

      if (tab === 'translate') {
        const result = await core.callWorkerMethod<TranslateResult>(
          PyodideWorker.MolBio,
          'translate',
          { sequence: rawText, geneticCode },
        )
        setTranslateResult(result)
        if (result.availableTables.length > 0) {
          setAvailableTables(result.availableTables)
        }
        saveHistory('translate', result.sequenceLength, result.geneticCodeName)
      } else if (tab === 'orf') {
        const result = await core.callWorkerMethod<OrfResult>(
          PyodideWorker.MolBio,
          'find_orfs',
          { sequence: rawText, geneticCode, minLength: minOrfLength },
        )
        setOrfResult(result)
        setSelectedOrfIdx(null)
        saveHistory('orf', result.sequenceLength, result.geneticCodeName, result.totalFound)
      } else {
        const result = await core.callWorkerMethod<CodonUsageResult>(
          PyodideWorker.MolBio,
          'codon_usage',
          { sequence: rawText, geneticCode },
        )
        setCodonResult(result)
        saveHistory('codon', result.sequenceLength, result.geneticCodeName)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }, [rawText, geneticCode, minOrfLength, saveHistory])

  // ── Navigate to protein page ─────────────────────────────
  const navigateToProtein = useCallback((protein: string) => {
    storeSequenceForTransfer(protein, 'translation', { sequenceType: 'protein' })
    router.push('/genetics/protein')
  }, [router])

  const handleRunClick = useCallback(() => {
    void runAnalysis(activeTab)
  }, [runAnalysis, activeTab])

  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val as AnalysisTab)
  }, [])

  const handleGeneticCodeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setGeneticCode(Number(e.target.value))
  }, [])

  const handleMinOrfLengthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v) && v > 0) setMinOrfLength(v)
  }, [])

  const handleSequenceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value)
    if (uploadedFileName) setUploadedFileName(null)
  }, [uploadedFileName])

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <main>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Translation 워크벤치</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          DNA 서열의 6-frame 번역, ORF 탐색, 코돈 사용 빈도를 분석합니다.
        </p>
      </div>

      {/* ── Input Section ────────────────────────────────── */}
      <div className="space-y-4 rounded-2xl bg-muted/30 p-5">
        {/* Genetic code selector */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[260px] flex-1">
            <label htmlFor="geneticCode" className="mb-1 block text-sm font-medium">
              유전 코드 테이블
            </label>
            <select
              id="geneticCode"
              value={geneticCode}
              onChange={handleGeneticCodeChange}
              className={`w-full rounded-lg bg-background px-3 py-2 text-sm ${focusRing}`}
            >
              {availableTables.length > 0
                ? availableTables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id}. {t.name}
                  </option>
                ))
                : (
                  <>
                    <option value={1}>1. Standard</option>
                    <option value={2}>2. Vertebrate Mitochondrial</option>
                    <option value={3}>3. Yeast Mitochondrial</option>
                    <option value={4}>4. Mold Mitochondrial</option>
                    <option value={5}>5. Invertebrate Mitochondrial</option>
                    <option value={6}>6. Ciliate Nuclear</option>
                    <option value={9}>9. Echinoderm Mitochondrial</option>
                    <option value={10}>10. Euplotid Nuclear</option>
                    <option value={11}>11. Bacterial/Plant Plastid</option>
                  </>
                )
              }
            </select>
          </div>
        </div>

        {/* DNA input textarea */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="dnaSequence" className="block text-sm font-medium">
              DNA 서열 (FASTA 또는 raw)
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                title="FASTA 파일 업로드"
              >
                <Upload className="h-4 w-4" />
              </Button>
              {rawText.trim() && <CopyButton text={rawText} />}
              {rawText.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  onClick={handleClearInput}
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
            id="dnaSequence"
            value={rawText}
            onChange={handleSequenceChange}
            placeholder={">sequence\nATGCGTACGTACGTACG..."}
            rows={6}
            className={`max-h-[250px] min-h-[120px] w-full resize-y overflow-y-auto rounded-lg bg-background px-3 py-2 font-mono text-sm ${focusRing}`}
          />

          {rawText.trim() && (
            <p className="mt-1 text-xs text-muted-foreground">
              {cleanedLength} bp (FASTA 헤더/공백 제외)
            </p>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="translate">번역 (6-frame)</TabsTrigger>
            <TabsTrigger value="orf">ORF 탐색</TabsTrigger>
            <TabsTrigger value="codon">코돈 사용 빈도</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {activeTab === 'orf' && (
              <div className="flex items-center gap-2">
                <label htmlFor="minOrfLength" className="text-sm text-muted-foreground">
                  최소 길이
                </label>
                <input
                  id="minOrfLength"
                  type="number"
                  min={1}
                  value={minOrfLength}
                  onChange={handleMinOrfLengthChange}
                  className={`w-20 rounded-lg bg-background px-2 py-1.5 text-sm tabular-nums ${focusRing}`}
                />
                <span className="text-sm text-muted-foreground">codons</span>
              </div>
            )}

            <Button
              onClick={handleRunClick}
              disabled={isLoading || !rawText.trim()}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                '분석 실행'
              )}
            </Button>
          </div>
        </div>

        {/* Error display */}
        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50/60 p-4 dark:bg-red-950/20" role="alert">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">분석 오류</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">BioPython으로 분석 중... (Pyodide)</p>
          </div>
        )}

        {/* ── Tab A: Translation ──────────────────────────── */}
        <TabsContent value="translate" className="mt-4">
          {!isLoading && translateResult && (
            <TranslateResultView
              result={translateResult}
              onNavigateToProtein={navigateToProtein}
            />
          )}
          {!isLoading && !translateResult && !errorMsg && (
            <EmptyState label="6-frame 번역 결과가 여기에 표시됩니다." />
          )}
        </TabsContent>

        {/* ── Tab B: ORF Finder ───────────────────────────── */}
        <TabsContent value="orf" className="mt-4">
          {!isLoading && orfResult && (
            <OrfResultView
              result={orfResult}
              selectedIdx={selectedOrfIdx}
              onSelectOrf={setSelectedOrfIdx}
              onNavigateToProtein={navigateToProtein}
            />
          )}
          {!isLoading && !orfResult && !errorMsg && (
            <EmptyState label="ORF 탐색 결과가 여기에 표시됩니다." />
          )}
        </TabsContent>

        {/* ── Tab C: Codon Usage ──────────────────────────── */}
        <TabsContent value="codon" className="mt-4">
          {!isLoading && codonResult && (
            <CodonUsageView result={codonResult} />
          )}
          {!isLoading && !codonResult && !errorMsg && (
            <EmptyState label="코돈 사용 빈도 결과가 여기에 표시됩니다." />
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function EmptyState({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

// ── Translation Result ─────────────────────────────────────

interface TranslateResultViewProps {
  result: TranslateResult
  onNavigateToProtein: (protein: string) => void
}

function TranslateResultView({ result, onNavigateToProtein }: TranslateResultViewProps): React.ReactElement {
  const [expandedFrame, setExpandedFrame] = useState<number | null>(null)

  const toggleExpand = useCallback((frame: number) => {
    setExpandedFrame(prev => prev === frame ? null : frame)
  }, [])

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{result.sequenceLength} bp</Badge>
        <Badge variant="secondary">{result.geneticCodeName}</Badge>
        <Badge variant="outline">Start: {result.startCodons.join(', ')}</Badge>
        <Badge variant="outline">Stop: {result.stopCodons.join(', ')}</Badge>
      </div>

      {/* Frames table */}
      <div className="overflow-x-auto rounded-xl bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frame</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Strand</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Codons</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">단백질 서열</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {result.frames.map(f => {
              const isExpanded = expandedFrame === f.frame
              const frameLabel = f.frame > 0 ? `+${f.frame}` : String(f.frame)
              return (
                <Fragment key={f.frame}>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => toggleExpand(f.frame)}
                  >
                    <td className="px-4 py-3 font-mono font-medium tabular-nums">
                      {frameLabel}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={f.strand === '+' ? 'default' : 'secondary'} className="text-xs">
                        {f.strand === '+' ? '5\u2032\u21923\u2032' : '3\u2032\u21925\u2032'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{f.codons}</td>
                    <td className="max-w-[400px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                      {f.protein.slice(0, 80)}{f.protein.length > 80 ? '...' : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isExpanded
                        ? <ChevronUp className="inline h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="inline h-4 w-4 text-muted-foreground" />}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4 pt-0">
                        <ProteinDisplay protein={f.protein} />
                        {f.protein.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <CopyButton text={f.protein} />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                onNavigateToProtein(f.protein)
                              }}
                            >
                              단백질 분석으로 전달
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Protein display with M / * highlighting ────────────────

const ProteinDisplay = memo(function ProteinDisplay({ protein }: { protein: string }): React.ReactElement {
  if (!protein) {
    return <p className="text-sm text-muted-foreground">(빈 서열)</p>
  }

  const lineLen = 60
  const lines: React.ReactElement[] = []

  for (let i = 0; i < protein.length; i += lineLen) {
    const chunk = protein.slice(i, i + lineLen)
    const spans: React.ReactNode[] = []
    let normal = ''

    const flushNormal = (): void => {
      if (normal) {
        spans.push(normal)
        normal = ''
      }
    }

    for (let j = 0; j < chunk.length; j++) {
      const ch = chunk[j]
      if (ch === 'M') {
        flushNormal()
        spans.push(<span key={`${i}-${j}`} className="font-bold text-green-600 dark:text-green-400">{ch}</span>)
      } else if (ch === '*') {
        flushNormal()
        spans.push(<span key={`${i}-${j}`} className="font-bold text-red-600 dark:text-red-400">{ch}</span>)
      } else {
        normal += ch
      }
    }
    if (normal) spans.push(normal)

    lines.push(
      <span
        key={i}
        className="inline-block w-full"
        style={{ paddingLeft: '3.75rem', textIndent: '-3.75rem' }}
      >
        <span className="inline-block w-12 text-right text-muted-foreground/60 tabular-nums select-none mr-3">
          {i + 1}
        </span>
        <span>{spans}</span>
        {'\n'}
      </span>,
    )
  }

  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
        <span><span className="font-bold text-green-600 dark:text-green-400">M</span> = Start (Met)</span>
        <span><span className="font-bold text-red-600 dark:text-red-400">*</span> = Stop</span>
      </div>
      <pre className="font-mono text-xs leading-relaxed overflow-x-auto">{lines}</pre>
    </div>
  )
})

// ── ORF Result View ────────────────────────────────────────

interface OrfResultViewProps {
  result: OrfResult
  selectedIdx: number | null
  onSelectOrf: (idx: number | null) => void
  onNavigateToProtein: (protein: string) => void
}

function OrfResultView({ result, selectedIdx, onSelectOrf, onNavigateToProtein }: OrfResultViewProps): React.ReactElement {
  const handleRowClick = useCallback((idx: number) => {
    onSelectOrf(idx === selectedIdx ? null : idx)
  }, [onSelectOrf, selectedIdx])

  const selectedOrf = selectedIdx !== null ? result.orfs[selectedIdx] ?? null : null

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{result.sequenceLength} bp</Badge>
        <Badge variant="secondary">{result.totalFound}개 ORF 발견</Badge>
        <Badge variant="outline">min {result.minLength} codons</Badge>
        <Badge variant="secondary">{result.geneticCodeName}</Badge>
      </div>

      {result.orfs.length === 0 ? (
        <div className="rounded-xl bg-muted/30 py-12 text-center text-sm text-muted-foreground">
          최소 {result.minLength} codons 이상의 ORF가 발견되지 않았습니다.
          <br />
          최소 길이를 줄여서 다시 시도해 보세요.
        </div>
      ) : (
        <>
          {/* ORF table */}
          <div className="overflow-x-auto rounded-xl bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Strand</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frame</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Start</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">End</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">bp</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Codons</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Start codon</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Stop codon</th>
                </tr>
              </thead>
              <tbody>
                {result.orfs.map((orf, idx) => {
                  const isSelected = idx === selectedIdx
                  return (
                    <tr
                      key={idx}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => handleRowClick(idx)}
                    >
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={orf.strand === '+' ? 'default' : 'secondary'} className="text-xs">
                          {orf.strand}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums">
                        {orf.frame > 0 ? `+${orf.frame}` : orf.frame}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{orf.start.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{orf.end.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{orf.lengthBp.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{orf.lengthCodons.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center font-mono">{orf.startCodon}</td>
                      <td className="px-4 py-2.5 text-center font-mono">{orf.stopCodon}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Selected ORF protein */}
          {selectedOrf && (
            <div className="space-y-3 rounded-xl bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  ORF #{(selectedIdx ?? 0) + 1} 번역 결과 ({selectedOrf.lengthCodons} codons)
                </h3>
                <div className="flex items-center gap-2">
                  <CopyButton text={selectedOrf.protein} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateToProtein(selectedOrf.protein)}
                  >
                    단백질 분석으로 전달
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ProteinDisplay protein={selectedOrf.protein} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Codon Usage View ───────────────────────────────────────

interface CodonUsageViewProps {
  result: CodonUsageResult
}

function CodonUsageView({ result }: CodonUsageViewProps): React.ReactElement {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ax = useMemo(() => resolveAxisColors(), [])

  // Group codons by amino acid
  const grouped = useMemo(() => {
    const map = new Map<string, CodonDetail[]>()
    for (const cd of result.codonCounts) {
      const existing = map.get(cd.aminoAcid)
      if (existing) {
        existing.push(cd)
      } else {
        map.set(cd.aminoAcid, [cd])
      }
    }
    // Sort groups by amino acid letter
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [result.codonCounts])

  // RSCU bar chart option
  const rscuOption = useMemo((): EChartsOption => {
    // Filter codons that have count > 0 for a cleaner chart, sorted by amino acid
    const filtered = result.codonCounts
      .filter(c => c.count > 0 && c.aminoAcid !== '*')
      .sort((a, b) => a.aminoAcid.localeCompare(b.aminoAcid) || a.codon.localeCompare(b.codon))

    return {
      grid: { left: 50, right: 20, top: 30, bottom: 80, containLabel: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return ''
          const p = params[0] as { name: string; value: number }
          const detail = filtered.find(c => c.codon === p.name)
          if (!detail) return ''
          return `<b>${detail.codon}</b> (${detail.aminoAcid})<br/>Count: ${detail.count}<br/>RSCU: ${detail.rscu.toFixed(3)}`
        },
      },
      xAxis: {
        type: 'category',
        data: filtered.map(c => c.codon),
        axisLabel: {
          fontSize: 9,
          rotate: 90,
          color: ax.axisLabel,
          fontFamily: 'monospace',
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'RSCU',
        nameTextStyle: { color: ax.axisLabel, fontSize: 11 },
        axisLabel: { color: ax.axisLabel, fontSize: 11 },
        splitLine: { lineStyle: { color: ax.splitLine } },
      },
      series: [{
        type: 'bar',
        data: filtered.map(c => ({
          value: c.rscu,
          itemStyle: {
            color: c.rscu > 1.3 ? '#2563eb' : c.rscu < 0.7 ? '#94a3b8' : '#60a5fa',
          },
        })),
        barMaxWidth: 16,
      }],
    }
  }, [result.codonCounts, ax])

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{result.sequenceLength} bp</Badge>
        <Badge variant="secondary">{result.totalCodons} codons</Badge>
        <Badge variant="secondary">{result.geneticCodeName}</Badge>
      </div>

      {/* RSCU Bar Chart */}
      <div className="rounded-xl bg-background p-4">
        <h3 className="mb-2 text-sm font-medium">RSCU (Relative Synonymous Codon Usage)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          RSCU {'>'} 1: 해당 코돈이 기대보다 많이 사용됨 / RSCU {'<'} 1: 기대보다 적게 사용됨
        </p>
        <LazyReactECharts
          option={rscuOption}
          style={{ height: 320 }}
          notMerge
        />
      </div>

      {/* Codon table grouped by amino acid */}
      <div className="rounded-xl bg-background">
        <div className="px-4 py-3">
          <h3 className="text-sm font-medium">코돈별 상세</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">아미노산</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">코돈</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Count</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Frequency</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">RSCU</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([aa, codons]) => (
                <Fragment key={aa}>
                  {codons.map((cd, ci) => (
                    <tr
                      key={cd.codon}
                      className={ci === 0 ? 'bg-muted/20' : ''}
                    >
                      {ci === 0 && (
                        <td
                          className="px-4 py-2 font-mono font-medium"
                          rowSpan={codons.length}
                        >
                          {aa === '*' ? 'Stop' : aa}
                        </td>
                      )}
                      <td className="px-4 py-2 font-mono">{cd.codon}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{cd.count}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {(cd.frequency * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <span className={
                          cd.rscu > 1.3 ? 'font-medium text-blue-600 dark:text-blue-400' :
                          cd.rscu < 0.7 && cd.rscu > 0 ? 'text-muted-foreground' :
                          ''
                        }>
                          {cd.rscu.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
