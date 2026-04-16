// stats/app/genetics/protein/ProteinContent.tsx
'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  saveGeneticsHistoryEntry,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
  updateProteinHistoryReport,
  consumeTransferredSequence,
  formatTransferSource,
  cleanProteinSequence,
  validateProteinSequence as validateProtein,
  fetchAlphaFoldPrediction,
  AlphaFoldError,
  fetchUniProtSummaryForAccession,
  UniProtError,
  fetchQuickGoTermSummary,
  QuickGoError,
  fetchStringInteractionPartners,
  StringError,
  fetchPdbStructureSummaries,
  PdbError,
  buildProteinInterpretationMarkdown,
  fetchReactomePathwaysForUniProt,
  fetchReactomePathwayEnrichment,
  PROTEIN_EXAMPLES,
  ReactomeError,
  type ProteinHistoryEntry,
  type AlphaFoldPredictionSummary,
  type UniProtSummary,
  type UniProtGoTerm,
  type QuickGoTermSummary,
  type StringPartnerSummary,
  type PdbStructureSummary,
  type ReactomeEnrichmentResult,
  type ReactomePathwaySummary,
} from '@/lib/genetics'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { PyodideWorker } from '@/lib/services'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { resolveAxisColors, resolveChartPalette, resolveCssVar } from '@/lib/charts/chart-color-resolver'
import { BIOLOGY_CALLOUT_WARNING, BIOLOGY_CALLOUT_ERROR, BIOLOGY_INPUT, BIOLOGY_TEXTAREA } from '@/lib/design-tokens/biology'
import { downloadTextFile } from '@/lib/utils/download-file'
import { GeneticsExamplePicker } from '@/components/genetics/GeneticsExamplePicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, RotateCcw, Upload, Atom, Database, ArrowUpRight, RefreshCw, Network, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

// ── 타입 ──

interface ProteinResult {
  molecularWeight: number
  isoelectricPoint: number
  gravy: number
  aromaticity: number
  instabilityIndex: number
  isStable: boolean
  extinctionCoeffReduced: number
  extinctionCoeffOxidized: number
  aminoAcidComposition: Record<string, number>
  aminoAcidPercent: Record<string, number>
  secondaryStructureFraction: { helix: number; turn: number; sheet: number }
  hydropathyProfile: Array<{ position: number; score: number }>
  sequenceLength: number
  sequence: string
}

type AppState =
  | { step: 'input' }
  | { step: 'running' }
  | { step: 'result'; result: ProteinResult; analysisName: string }
  | { step: 'error'; message: string }

// ── DNA 서열 감지 ──
// 단백질 전용 아미노산 (DNA 염기에 없는 문자): F,L,P,W,Y,H,D,E,K,R,Q,I,M,V,S
const PROTEIN_ONLY_CHARS = /[FLPWYHDEKRIQMVS]/i

function isLikelyDna(seq: string): boolean {
  const cleaned = seq.replace(/\s/g, '').toUpperCase()
  if (cleaned.length === 0) return false
  // 단백질 전용 아미노산이 하나라도 있으면 DNA가 아님
  if (PROTEIN_ONLY_CHARS.test(cleaned)) return false
  // ATCGN만으로 구성된 경우 DNA로 판단
  return /^[ATCGN]+$/.test(cleaned)
}

// ── 아미노산 약어 매핑 ──

const AA_NAMES: Record<string, string> = {
  A: 'Ala', C: 'Cys', D: 'Asp', E: 'Glu', F: 'Phe',
  G: 'Gly', H: 'His', I: 'Ile', K: 'Lys', L: 'Leu',
  M: 'Met', N: 'Asn', P: 'Pro', Q: 'Gln', R: 'Arg',
  S: 'Ser', T: 'Thr', V: 'Val', W: 'Trp', Y: 'Tyr',
}

// ── 메인 컴포넌트 ──

export default function ProteinContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const [rawText, setRawText] = useState('')
  const [analysisName, setAnalysisName] = useState('')
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const [transferredAccession, setTransferredAccession] = useState<string | null>(null)
  const [transferredSource, setTransferredSource] = useState<string | null>(null)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // Sequence transfer from other pages
  useEffect(() => {
    const transferred = consumeTransferredSequence()
    if (transferred && transferred.sequenceType === 'protein') {
      setRawText(transferred.sequence)
      setTransferredAccession(transferred.accession ?? null)
      setTransferredSource(transferred.source)
      toast.info(`${formatTransferSource(transferred.source)}에서 단백질 서열이 전달되었습니다.`)
    }
  }, [])

  const cleanedLength = useMemo(() => cleanProteinSequence(rawText).length, [rawText])

  // History restoration
  useEffect(() => {
    const historyId = searchParams.get('history')
    if (!historyId) return

    let cancelled = false
    void hydrateGeneticsHistoryFromCloud().then(() => {
      if (cancelled) return
      const all = loadGeneticsHistory('protein')
      const entry = all.find(e => e.id === historyId) as ProteinHistoryEntry | undefined
      if (entry) {
        setDeepLinkError(null)
        setAnalysisName(entry.analysisName)
        setTransferredAccession(entry.accession ?? null)
        setTransferredSource(null)
        setCurrentHistoryId(entry.id)
        if (entry.resultData) {
          setRawText(entry.resultData.sequence)
          setState({ step: 'result', result: entry.resultData, analysisName: entry.analysisName })
          toast.info(`${entry.analysisName} 기록을 불러왔습니다.`)
        } else {
          setState({ step: 'input' })
          toast.info(`${entry.analysisName} 기록을 불러왔습니다. 저장된 전체 결과가 없어 서열을 다시 입력하여 분석하세요.`)
        }
      } else {
        setDeepLinkError('요청한 분석 기록을 찾을 수 없습니다.')
      }
    })
    return () => { cancelled = true }
  }, [searchParams])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      if (typeof text === 'string') {
        setRawText(text)
        setTransferredAccession(null)
        setTransferredSource(null)
        toast.success(`${file.name} 파일을 불러왔습니다.`)
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-uploaded
    e.target.value = ''
  }, [])

  const handleAnalyze = useCallback(async () => {
    const cleaned = cleanProteinSequence(rawText)

    // DNA detection
    if (isLikelyDna(rawText.replace(/^>.*\n/gm, ''))) {
      toast.warning('DNA 서열로 보입니다. Translation 워크벤치에서 번역 후 사용하세요.')
      return
    }

    const validation = validateProtein(rawText)
    if (!validation.valid) {
      toast.error(validation.errors[0] ?? '서열 검증 실패')
      return
    }

    setState({ step: 'running' })

    try {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<ProteinResult>(
        PyodideWorker.MolBio,
        'protein_properties',
        { proteinSeq: cleaned },
      )

      const now = new Date()
      const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const autoName = analysisName.trim()
        || `단백질 분석 · ${result.sequenceLength}aa · ${dateStr}`

      setState({ step: 'result', result, analysisName: autoName })

      const savedEntry = saveGeneticsHistoryEntry({
        type: 'protein',
        analysisName: autoName,
        sequenceLength: result.sequenceLength,
        molecularWeight: result.molecularWeight,
        isoelectricPoint: result.isoelectricPoint,
        isStable: result.isStable,
        accession: transferredAccession ?? undefined,
        resultData: result,
        projectId: activeResearchProjectId ?? undefined,
      })
      if (!savedEntry) {
        setCurrentHistoryId(null)
        toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
      } else {
        setCurrentHistoryId(savedEntry.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setState({ step: 'error', message: msg })
    }
  }, [rawText, analysisName, transferredAccession, activeResearchProjectId])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
    setRawText('')
    setAnalysisName('')
    setTransferredAccession(null)
    setTransferredSource(null)
    setCurrentHistoryId(null)
  }, [])

  const handleDismissError = useCallback(() => { setDeepLinkError(null) }, [])

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">단백질 특성 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BioPython ProtParam 기반으로 단백질의 물리화학적 특성을 분석합니다.
        </p>
      </div>

      {deepLinkError && (
        <div className={`mb-6 ${BIOLOGY_CALLOUT_WARNING}`} role="alert">
          <h2 className="mb-2 font-semibold text-warning">기록 복원 실패</h2>
          <p className="mb-4 text-sm text-warning-muted">{deepLinkError}</p>
          <Button variant="outline" onClick={handleDismissError}>
            새 분석 시작
          </Button>
        </div>
      )}

      {state.step === 'input' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="analysisName" className="mb-1 block text-sm font-medium text-foreground">
              분석명 <span className="font-normal text-muted-foreground">(선택)</span>
            </label>
            <input
              id="analysisName"
              type="text"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              placeholder="예: Hemoglobin beta subunit, Insulin precursor"
              maxLength={100}
              className={BIOLOGY_INPUT}
            />
            <p className="mt-1.5 text-xs text-muted-foreground/75">
              단백질명이나 accession을 적어 두면 히스토리와 기능 주석 결과를 구분하기 쉽습니다.
            </p>
          </div>

          {transferredSource && (
            <div className="rounded-lg bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              {formatTransferSource(transferredSource)}에서 전달된 서열
              {transferredAccession && <span className="ml-1 font-mono text-xs">({transferredAccession})</span>}
            </div>
          )}

          {!rawText.trim() && (
            <GeneticsExamplePicker
              title="예제 데이터"
              description="단백질 물성 분석 흐름을 바로 확인할 수 있는 대표 단백질 예제입니다."
              items={PROTEIN_EXAMPLES}
              onSelect={(example) => {
                setRawText(example.sequenceText)
                setTransferredAccession(null)
                setTransferredSource(null)
                if (!analysisName.trim()) {
                  setAnalysisName(example.label)
                }
              }}
            />
          )}

          <div>
            <label htmlFor="proteinSeq" className="mb-1 block text-sm font-medium text-foreground">
              단백질 서열
            </label>
            <textarea
              id="proteinSeq"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value)
                if (transferredAccession) setTransferredAccession(null)
                if (transferredSource) setTransferredSource(null)
              }}
              placeholder={`FASTA 형식 또는 순수 아미노산 서열을 입력하세요.\n\n>sp|P68871|HBB_HUMAN Hemoglobin subunit beta\nMVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTADAVMGNPKVKAHGKKVLG\nAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVAN\nALAHKYH`}
              rows={8}
              className={BIOLOGY_TEXTAREA}
            />
            <div className="mt-2 flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".fasta,.fa,.faa,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  FASTA 파일 업로드
                </span>
              </label>
              {rawText.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {cleanedLength}개 아미노산
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground/75">
              DNA 서열은 직접 넣지 말고 Translation 워크벤치에서 번역 후 전달하세요.
            </p>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={rawText.trim().length === 0}
            className="w-full sm:w-auto"
          >
            <Atom className="mr-2 h-4 w-4" />
            분석 시작
          </Button>
        </div>
      )}

      {state.step === 'running' && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">단백질 특성 분석 중... (Pyodide + BioPython ProtParam)</p>
        </div>
      )}

      {state.step === 'error' && (
        <div className={BIOLOGY_CALLOUT_ERROR} role="alert">
          <h2 className="mb-2 font-semibold text-red-800 dark:text-red-300">분석 오류</h2>
          <p className="mb-4 text-sm text-red-700 dark:text-red-400">{state.message}</p>
          <Button variant="outline" onClick={handleReset}>
            다시 시도
          </Button>
        </div>
      )}

      {state.step === 'result' && (
        <ProteinResultView
          result={state.result}
          analysisName={state.analysisName}
          accession={transferredAccession}
          historyEntryId={currentHistoryId}
          onReset={handleReset}
        />
      )}
    </main>
  )
}

// ══════════════════════════════════════════════════════════════
// 결과 뷰
// ══════════════════════════════════════════════════════════════

interface ProteinResultViewProps {
  result: ProteinResult
  analysisName: string
  accession: string | null
  historyEntryId: string | null
  onReset: () => void
}

function ProteinResultView({ result, analysisName, accession, historyEntryId, onReset }: ProteinResultViewProps): React.ReactElement {
  const ax = useMemo(() => resolveAxisColors(), [])
  const palette = useMemo(() => resolveChartPalette(4), [])
  const bgColor = useMemo(() => resolveCssVar('--background', '#ffffff'), [])
  const [uniProt, setUniProt] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    summary: UniProtSummary | null
    message: string | null
  }>({
    status: 'idle',
    summary: null,
    message: null,
  })

  useEffect(() => {
    setUniProt({
      status: 'idle',
      summary: null,
      message: null,
    })
  }, [accession])

  const handleLoadUniProt = useCallback(async () => {
    if (!accession || uniProt.status === 'loading') return

    setUniProt({ status: 'loading', summary: null, message: null })

    try {
      const summary = await fetchUniProtSummaryForAccession(accession)
      setUniProt({
        status: 'success',
        summary,
        message: null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof UniProtError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'UniProt 조회 중 알 수 없는 오류가 발생했습니다.'
      setUniProt({
        status: 'error',
        summary: null,
        message,
      })
    }
  }, [accession, uniProt.status])

  // ── Summary Cards ──

  const summaryCards = useMemo(() => [
    {
      label: '분자량',
      value: `${(result.molecularWeight / 1000).toFixed(2)} kDa`,
      sub: `${result.molecularWeight.toFixed(1)} Da`,
    },
    {
      label: '등전점 (pI)',
      value: result.isoelectricPoint.toFixed(2),
      sub: result.isoelectricPoint < 7 ? '산성' : result.isoelectricPoint > 7 ? '염기성' : '중성',
    },
    {
      label: 'GRAVY',
      value: result.gravy.toFixed(3),
      sub: result.gravy < 0 ? '친수성' : '소수성',
    },
    {
      label: '방향족성',
      value: `${(result.aromaticity * 100).toFixed(1)}%`,
      sub: 'Phe + Trp + Tyr',
    },
    {
      label: '불안정성 지수',
      value: result.instabilityIndex.toFixed(2),
      badge: result.isStable
        ? { label: '안정', variant: 'success' as const }
        : { label: '불안정', variant: 'destructive' as const },
    },
    {
      label: '소광 계수',
      value: result.extinctionCoeffReduced.toLocaleString(),
      sub: `환원 / 산화: ${result.extinctionCoeffOxidized.toLocaleString()}`,
    },
  ], [result])

  // ── Amino Acid Composition Chart ──

  const aaChartOption = useMemo(() => {
    const entries = Object.entries(result.aminoAcidComposition)
      .sort((a, b) => b[1] - a[1])

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params
          const data = p as { name: string; value: number }
          const letter = data.name
          const count = data.value
          const pct = result.aminoAcidPercent[letter]
          const name = AA_NAMES[letter] ?? letter
          return `<b>${name} (${letter})</b><br/>빈도: ${count}<br/>비율: ${(pct * 100).toFixed(1)}%`
        },
      },
      grid: { left: 50, right: 20, top: 20, bottom: 60 },
      xAxis: {
        type: 'category' as const,
        data: entries.map(([aa]) => aa),
        axisLabel: { fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: ax.axisLabel },
        axisLine: { lineStyle: { color: ax.axisLine } },
      },
      yAxis: {
        type: 'value' as const,
        name: '빈도',
        nameTextStyle: { fontSize: 11, color: ax.axisLabel },
        axisLabel: { color: ax.axisLabel },
        splitLine: { lineStyle: { color: ax.splitLine } },
      },
      series: [{
        type: 'bar' as const,
        data: entries.map(([, count]) => count),
        itemStyle: { color: palette[0], borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 28,
      }],
    }
  }, [result.aminoAcidComposition, result.aminoAcidPercent, ax, palette])

  // ── Hydropathy Profile Chart ──

  const hydropathyOption = useMemo(() => {
    const profile = result.hydropathyProfile
    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params
          const data = p as { data: [number, number] }
          return `위치: ${data.data[0]}<br/>Kyte-Doolittle 점수: ${data.data[1].toFixed(3)}`
        },
      },
      grid: { left: 55, right: 20, top: 20, bottom: 45 },
      xAxis: {
        type: 'value' as const,
        name: '잔기 위치',
        nameLocation: 'center' as const,
        nameGap: 28,
        nameTextStyle: { fontSize: 11, color: ax.axisLabel },
        axisLabel: { color: ax.axisLabel },
        axisLine: { lineStyle: { color: ax.axisLine } },
        min: 1,
        max: profile.length > 0 ? profile[profile.length - 1].position : 1,
      },
      yAxis: {
        type: 'value' as const,
        name: '소수성',
        nameTextStyle: { fontSize: 11, color: ax.axisLabel },
        axisLabel: { color: ax.axisLabel },
        splitLine: { lineStyle: { color: ax.splitLine } },
      },
      series: [
        {
          type: 'line' as const,
          data: profile.map(p => [p.position, p.score]),
          smooth: false,
          symbol: 'none',
          lineStyle: { width: 1.5, color: palette[1] },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 138, 206, 0.15)' },
                { offset: 0.5, color: 'rgba(24, 138, 206, 0.02)' },
                { offset: 1, color: 'rgba(186, 26, 26, 0.15)' },
              ],
            },
          },
        },
        {
          type: 'line' as const,
          data: [[1, 0], [profile.length > 0 ? profile[profile.length - 1].position : 1, 0]],
          symbol: 'none',
          lineStyle: { width: 1, color: ax.splitLine, type: 'dashed' as const },
          silent: true,
        },
      ],
    }
  }, [result.hydropathyProfile, ax, palette])

  // ── Secondary Structure Chart ──

  const ssData = result.secondaryStructureFraction
  const ssChartOption = useMemo(() => {
    const total = ssData.helix + ssData.turn + ssData.sheet
    const coil = Math.max(0, 1 - total)

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number }
          return `${p.name}: ${(p.value * 100).toFixed(1)}% (${p.percent.toFixed(1)}%)`
        },
      },
      series: [{
        type: 'pie' as const,
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: bgColor, borderWidth: 2 },
        label: {
          formatter: (p: { name: string; percent: number }) => `${p.name}\n${p.percent.toFixed(1)}%`,
          fontSize: 11,
        },
        data: [
          { value: ssData.helix, name: 'Helix', itemStyle: { color: palette[0] } },
          { value: ssData.sheet, name: 'Sheet', itemStyle: { color: palette[1] } },
          { value: ssData.turn, name: 'Turn', itemStyle: { color: palette[2] } },
          { value: coil, name: 'Coil', itemStyle: { color: ax.splitLine } },
        ].filter(d => d.value > 0),
      }],
    }
  }, [ssData, palette, ax.splitLine, bgColor])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{analysisName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {result.sequenceLength}개 아미노산 ({(result.molecularWeight / 1000).toFixed(1)} kDa)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          새 분석
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-muted/40 p-4"
          >
            <div className="text-xs font-medium text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-lg font-semibold font-mono tabular-nums">{card.value}</div>
            {card.badge && (
              <Badge
                variant={card.badge.variant}
                className="mt-1"
              >
                {card.badge.label}
              </Badge>
            )}
            {card.sub && (
              <div className="mt-0.5 text-xs text-muted-foreground">{card.sub}</div>
            )}
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-3 text-base font-semibold">UniProt 기능 주석</h3>
        {!accession ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5">
            <p className="text-sm text-muted-foreground">
              이 결과에는 accession이 없어 UniProt 기능 주석을 바로 조회할 수 없습니다.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              GenBank나 accession이 유지된 Translation 경로에서 넘어온 단백질만 자동 연결됩니다.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{accession}</Badge>
                  {uniProt.summary?.primaryAccession && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {uniProt.summary.primaryAccession}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  NCBI accession을 UniProtKB로 매핑해 기능, GO, 구조 연계를 요약합니다.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => { void handleLoadUniProt() }}
                disabled={uniProt.status === 'loading'}
              >
                {uniProt.status === 'loading'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : uniProt.status === 'success'
                    ? <RefreshCw className="h-4 w-4" />
                    : <Database className="h-4 w-4" />}
                {uniProt.status === 'success' ? '다시 조회' : 'UniProt 조회'}
              </Button>
            </div>

            {uniProt.status === 'loading' && <UniProtSkeleton />}

            {uniProt.status === 'error' && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{uniProt.message}</p>
              </div>
            )}

            {uniProt.status === 'success' && uniProt.summary && (
              <UniProtSummaryPanel
                summary={uniProt.summary}
                result={result}
                analysisName={analysisName}
                accession={accession}
                historyEntryId={historyEntryId}
              />
            )}
          </div>
        )}
      </section>

      {/* Amino Acid Composition */}
      <section>
        <h3 className="mb-3 text-base font-semibold">아미노산 조성</h3>
        <div className="rounded-xl bg-muted/30 p-4">
          <LazyReactECharts
            option={aaChartOption}
            style={{ height: 320 }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </section>

      {/* Hydropathy Profile */}
      <section>
        <h3 className="mb-1 text-base font-semibold">소수성 프로파일</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Kyte-Doolittle 스케일 기반. 양수 = 소수성, 음수 = 친수성.
        </p>
        <div className="rounded-xl bg-muted/30 p-4">
          <LazyReactECharts
            option={hydropathyOption}
            style={{ height: 280 }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </section>

      {/* Secondary Structure */}
      <section>
        <h3 className="mb-3 text-base font-semibold">이차 구조 예측</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-muted/30 p-4">
            <LazyReactECharts
              option={ssChartOption}
              style={{ height: 260 }}
              opts={{ renderer: 'svg' }}
            />
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-xl bg-muted/30 p-6">
            <StructureBar label="Helix" fraction={ssData.helix} color={palette[0]} />
            <StructureBar label="Sheet" fraction={ssData.sheet} color={palette[1]} />
            <StructureBar label="Turn" fraction={ssData.turn} color={palette[2]} />
            <StructureBar
              label="Coil"
              fraction={Math.max(0, 1 - ssData.helix - ssData.sheet - ssData.turn)}
              color={ax.splitLine}
            />
          </div>
        </div>
      </section>

      {/* Amino Acid Table */}
      <section>
        <h3 className="mb-3 text-base font-semibold">아미노산 조성표</h3>
        <div className="overflow-x-auto rounded-xl bg-muted/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">아미노산</th>
                <th className="px-4 py-3 text-left font-medium">약어</th>
                <th className="px-4 py-3 text-right font-medium">빈도</th>
                <th className="px-4 py-3 text-right font-medium">비율 (%)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.aminoAcidComposition)
                .sort((a, b) => b[1] - a[1])
                .map(([aa, count], idx) => (
                  <tr
                    key={aa}
                    className={idx % 2 === 0 ? 'bg-background/50' : ''}
                  >
                    <td className="px-4 py-2 font-mono font-medium">{aa}</td>
                    <td className="px-4 py-2 text-muted-foreground">{AA_NAMES[aa] ?? aa}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{count}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {((result.aminoAcidPercent[aa] ?? 0) * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ── 이차 구조 진행률 바 ──

interface StructureBarProps {
  label: string
  fraction: number
  color: string
}

function StructureBar({ label, fraction, color }: StructureBarProps): React.ReactElement {
  const pct = (fraction * 100).toFixed(1)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

const GO_ASPECT_LABELS: Record<UniProtGoTerm['aspect'], string> = {
  function: 'Molecular Function',
  process: 'Biological Process',
  component: 'Cellular Component',
}

const QUICKGO_ASPECT_LABELS: Record<QuickGoTermSummary['aspect'], string> = {
  molecular_function: 'Molecular Function',
  biological_process: 'Biological Process',
  cellular_component: 'Cellular Component',
}

function UniProtSkeleton(): React.ReactElement {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  )
}

function UniProtSummaryPanel({
  summary,
  result,
  analysisName,
  accession,
  historyEntryId,
}: {
  summary: UniProtSummary
  result: ProteinResult
  analysisName: string
  accession: string | null
  historyEntryId: string | null
}): React.ReactElement {
  const topFunctions = summary.functions.slice(0, 3)
  const topKeywords = summary.keywords.slice(0, 10)
  const topGoTerms = summary.goTerms.slice(0, 9)
  const topPdbIds = summary.pdbIds.slice(0, 8)
  const [quickGo, setQuickGo] = useState<{
    selectedId: string | null
    status: 'idle' | 'loading' | 'success' | 'error'
    summary: QuickGoTermSummary | null
    message: string | null
  }>({
    selectedId: null,
    status: 'idle',
    summary: null,
    message: null,
  })
  const [stringState, setStringState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    partners: StringPartnerSummary[]
    message: string | null
  }>({
    status: 'idle',
    partners: [],
    message: null,
  })
  const [reactomeState, setReactomeState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    pathways: ReactomePathwaySummary[]
    message: string | null
  }>({
    status: 'idle',
    pathways: [],
    message: null,
  })
  const [pdbState, setPdbState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    structures: PdbStructureSummary[]
    message: string | null
  }>({
    status: 'idle',
    structures: [],
    message: null,
  })
  const [alphaFoldState, setAlphaFoldState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    prediction: AlphaFoldPredictionSummary | null
    message: string | null
  }>({
    status: 'idle',
    prediction: null,
    message: null,
  })
  const [reactomeNetworkState, setReactomeNetworkState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    result: ReactomeEnrichmentResult | null
    message: string | null
  }>({
    status: 'idle',
    result: null,
    message: null,
  })

  useEffect(() => {
    setQuickGo({
      selectedId: null,
      status: 'idle',
      summary: null,
      message: null,
    })
    setStringState({
      status: 'idle',
      partners: [],
      message: null,
    })
    setReactomeState({
      status: 'idle',
      pathways: [],
      message: null,
    })
    setPdbState({
      status: 'idle',
      structures: [],
      message: null,
    })
    setAlphaFoldState({
      status: 'idle',
      prediction: null,
      message: null,
    })
    setReactomeNetworkState({
      status: 'idle',
      result: null,
      message: null,
    })
  }, [summary.primaryAccession])

  const handleSelectGoTerm = useCallback(async (goId: string) => {
    setQuickGo((previous) => ({
      selectedId: goId,
      status: 'loading',
      summary: previous.selectedId === goId ? previous.summary : null,
      message: null,
    }))

    try {
      const quickGoSummary = await fetchQuickGoTermSummary(goId)
      setQuickGo({
        selectedId: goId,
        status: 'success',
        summary: quickGoSummary,
        message: null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof QuickGoError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'QuickGO 조회 중 알 수 없는 오류가 발생했습니다.'
      setQuickGo((previous) => ({
        selectedId: goId,
        status: 'error',
        summary: previous.selectedId === goId ? previous.summary : null,
        message,
      }))
    }
  }, [])

  const handleLoadString = useCallback(async () => {
    if (stringState.status === 'loading') return

    const queryIdentifier = summary.geneNames[0] || summary.primaryAccession
    if (!queryIdentifier || !summary.taxonId) {
      setStringState({
        status: 'error',
        partners: [],
        message: 'STRING 조회에 필요한 gene/accession 또는 taxon ID가 없습니다.',
      })
      return
    }

    setStringState((previous) => ({
      status: 'loading',
      partners: previous.partners,
      message: null,
    }))

    try {
      const partners = await fetchStringInteractionPartners(queryIdentifier, summary.taxonId, {
        requiredScore: 700,
        limit: 10,
      })
      setStringState({
        status: 'success',
        partners,
        message: partners.length === 0 ? 'STRING 파트너가 없습니다.' : null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof StringError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'STRING 조회 중 알 수 없는 오류가 발생했습니다.'
      setStringState((previous) => ({
        status: 'error',
        partners: previous.partners,
        message,
      }))
    }
  }, [stringState.status, summary.geneNames, summary.primaryAccession, summary.taxonId])

  const stringGraphOption = useMemo(() => {
    if (stringState.partners.length === 0) return null

    const centerName = summary.geneNames[0] || summary.uniProtId || summary.primaryAccession
    const nodes = [
      {
        id: centerName,
        name: centerName,
        symbolSize: 52,
        value: 1,
        itemStyle: { color: '#2563eb' },
      },
      ...stringState.partners.map((partner) => ({
        id: partner.partnerName,
        name: partner.partnerName,
        symbolSize: 24 + Math.round(partner.score * 16),
        value: partner.score,
        itemStyle: { color: '#14b8a6' },
      })),
    ]

    const links = stringState.partners.map((partner) => ({
      source: centerName,
      target: partner.partnerName,
      value: partner.score,
      lineStyle: {
        width: 1 + partner.score * 4,
        opacity: 0.35 + partner.score * 0.45,
      },
    }))

    return {
      tooltip: {
        formatter: (params: unknown) => {
          const item = params as { dataType?: string; data?: { name?: string; value?: number }; value?: number }
          if (item.dataType === 'edge') {
            return `Combined score: ${(Number(item.value) * 1000).toFixed(0)}`
          }
          return item.data?.name ?? ''
        },
      },
      series: [{
        type: 'graph' as const,
        layout: 'force' as const,
        roam: true,
        data: nodes,
        links,
        force: {
          repulsion: 230,
          edgeLength: [60, 130],
          gravity: 0.08,
        },
        label: {
          show: true,
          position: 'right' as const,
          formatter: '{b}',
          fontSize: 11,
        },
        lineStyle: {
          color: '#94a3b8',
          curveness: 0.08,
        },
      }],
    }
  }, [stringState.partners, summary.geneNames, summary.uniProtId, summary.primaryAccession])

  const handleLoadReactome = useCallback(async () => {
    if (reactomeState.status === 'loading') return

    setReactomeState((previous) => ({
      status: 'loading',
      pathways: previous.pathways,
      message: null,
    }))

    try {
      const pathways = await fetchReactomePathwaysForUniProt(summary.primaryAccession)
      setReactomeState({
        status: 'success',
        pathways,
        message: null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof ReactomeError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Reactome 조회 중 알 수 없는 오류가 발생했습니다.'
      setReactomeState((previous) => ({
        status: 'error',
        pathways: previous.pathways,
        message,
      }))
    }
  }, [reactomeState.status, summary.primaryAccession])

  const handleLoadPdb = useCallback(async () => {
    if (pdbState.status === 'loading') return

    if (topPdbIds.length === 0) {
      setPdbState({
        status: 'error',
        structures: [],
        message: 'RCSB PDB로 조회할 구조 ID가 없습니다.',
      })
      return
    }

    setPdbState((previous) => ({
      status: 'loading',
      structures: previous.structures,
      message: null,
    }))

    try {
      const structures = await fetchPdbStructureSummaries(topPdbIds, { limit: 4 })
      setPdbState({
        status: 'success',
        structures,
        message: null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof PdbError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'RCSB PDB 조회 중 알 수 없는 오류가 발생했습니다.'
      setPdbState((previous) => ({
        status: 'error',
        structures: previous.structures,
        message,
      }))
    }
  }, [pdbState.status, topPdbIds])

  const handleLoadAlphaFold = useCallback(async () => {
    if (alphaFoldState.status === 'loading') return

    setAlphaFoldState((previous) => ({
      status: 'loading',
      prediction: previous.prediction,
      message: null,
    }))

    try {
      const prediction = await fetchAlphaFoldPrediction(summary.primaryAccession)
      setAlphaFoldState({
        status: 'success',
        prediction,
        message: null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof AlphaFoldError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'AlphaFold 조회 중 알 수 없는 오류가 발생했습니다.'
      setAlphaFoldState((previous) => ({
        status: 'error',
        prediction: previous.prediction,
        message,
      }))
    }
  }, [alphaFoldState.status, summary.primaryAccession])

  const reactomeNetworkIdentifiers = useMemo(() => {
    const identifiers = [
      summary.geneNames[0] || summary.primaryAccession,
      ...stringState.partners.map((partner) => partner.partnerName),
    ]

    const uniqueIdentifiers: string[] = []
    const seen = new Set<string>()
    for (const identifier of identifiers) {
      const value = identifier.trim()
      if (!value) continue
      const key = value.toUpperCase()
      if (seen.has(key)) continue
      seen.add(key)
      uniqueIdentifiers.push(value)
    }

    return uniqueIdentifiers.slice(0, 12)
  }, [stringState.partners, summary.geneNames, summary.primaryAccession])

  const directPathwayIds = useMemo(
    () => new Set(reactomeState.pathways.map((pathway) => pathway.stId)),
    [reactomeState.pathways],
  )

  const reactomeOverlapCount = useMemo(() => {
    if (!reactomeNetworkState.result) return 0
    return reactomeNetworkState.result.pathways.reduce(
      (count, pathway) => count + (directPathwayIds.has(pathway.stId) ? 1 : 0),
      0,
    )
  }, [directPathwayIds, reactomeNetworkState.result])

  const proteinReportMarkdown = useMemo(() => buildProteinInterpretationMarkdown({
    analysisName,
    accession,
    result,
    uniProtSummary: summary,
    quickGoSummary: quickGo.status === 'success' ? quickGo.summary : null,
    stringPartners: stringState.partners,
    reactomePathways: reactomeState.pathways,
    reactomeEnrichment: reactomeNetworkState.result,
    pdbStructures: pdbState.structures,
    alphaFoldPrediction: alphaFoldState.prediction,
  }), [
    accession,
    alphaFoldState.prediction,
    analysisName,
    pdbState.structures,
    quickGo.status,
    quickGo.summary,
    reactomeNetworkState.result,
    reactomeState.pathways,
    result,
    stringState.partners,
    summary,
  ])

  useEffect(() => {
    if (!historyEntryId) return
    if (
      quickGo.status === 'loading'
      || stringState.status === 'loading'
      || reactomeState.status === 'loading'
      || reactomeNetworkState.status === 'loading'
      || pdbState.status === 'loading'
      || alphaFoldState.status === 'loading'
    ) {
      return
    }
    updateProteinHistoryReport(historyEntryId, proteinReportMarkdown)
  }, [
    alphaFoldState.status,
    historyEntryId,
    pdbState.status,
    proteinReportMarkdown,
    quickGo.status,
    reactomeNetworkState.status,
    reactomeState.status,
    stringState.status,
  ])

  const handleCopyProteinReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(proteinReportMarkdown)
      toast.success('단백질 해석 요약을 클립보드에 복사했습니다.')
    } catch {
      toast.error('단백질 해석 요약 복사에 실패했습니다.')
    }
  }, [proteinReportMarkdown])

  const handleDownloadProteinReport = useCallback(() => {
    const safeName = analysisName.replace(/[^a-zA-Z0-9가-힣 ]/g, '').trim() || 'protein-report'
    downloadTextFile(proteinReportMarkdown, `${safeName}.md`, 'text/markdown;charset=utf-8')
    toast.success('단백질 해석 요약을 Markdown으로 저장했습니다.')
  }, [analysisName, proteinReportMarkdown])

  const handleLoadReactomeNetwork = useCallback(async () => {
    if (reactomeNetworkState.status === 'loading') return

    if (reactomeNetworkIdentifiers.length < 2) {
      setReactomeNetworkState({
        status: 'error',
        result: null,
        message: 'Reactome 네트워크 해석에는 중심 단백질과 STRING 파트너가 필요합니다.',
      })
      return
    }

    setReactomeNetworkState((previous) => ({
      status: 'loading',
      result: previous.result,
      message: null,
    }))

    try {
      const result = await fetchReactomePathwayEnrichment(reactomeNetworkIdentifiers, { limit: 8 })
      setReactomeNetworkState({
        status: 'success',
        result,
        message: null,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof ReactomeError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Reactome 네트워크 해석 중 알 수 없는 오류가 발생했습니다.'
      setReactomeNetworkState((previous) => ({
        status: 'error',
        result: previous.result,
        message,
      }))
    }
  }, [reactomeNetworkIdentifiers, reactomeNetworkState.status])

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
        <div>
          <h4 className="text-sm font-semibold">리포트용 해석 요약</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            현재 열린 UniProt, GO, STRING, Reactome, 구조 정보를 Markdown으로 묶습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { void handleCopyProteinReport() }}>
            <Copy className="h-4 w-4" />
            요약 복사
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadProteinReport}>
            <Download className="h-4 w-4" />
            Markdown 저장
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-background/80 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={summary.reviewed ? 'default' : 'secondary'}>
              {summary.reviewed ? 'Swiss-Prot reviewed' : 'Unreviewed'}
            </Badge>
            {summary.annotationScore != null && (
              <Badge variant="outline">Annotation {summary.annotationScore.toFixed(1)}</Badge>
            )}
          </div>
          <h4 className="text-base font-semibold">{summary.proteinName}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{summary.organismName}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-1 font-mono">{summary.uniProtId}</span>
            <span className="rounded-md bg-muted px-2 py-1">{summary.sequenceLength} aa</span>
            {summary.geneNames.length > 0 && (
              <span className="rounded-md bg-muted px-2 py-1">Gene: {summary.geneNames.join(', ')}</span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-background/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">UniProt 엔트리</h4>
              <p className="mt-1 text-xs text-muted-foreground">{summary.entryType}</p>
            </div>
            <a
              href={summary.entryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              열기
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          {summary.alternativeNames.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Alternative names</p>
              <p className="mt-1 text-sm text-foreground/90">
                {summary.alternativeNames.slice(0, 3).join(', ')}
              </p>
            </div>
          )}
          {summary.sourceDatabase && (
            <p className="mt-3 text-xs text-muted-foreground">
              Mapping source: {summary.sourceDatabase} ({summary.sourceAccession})
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-background/80 p-4">
          <h4 className="text-sm font-semibold">기능 요약</h4>
          {topFunctions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">기능 설명이 제공되지 않았습니다.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-foreground/90">
              {topFunctions.map((item) => (
                <li key={item} className="rounded-lg bg-muted/40 px-3 py-2 leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-background/80 p-4">
          <h4 className="text-sm font-semibold">키워드</h4>
          {topKeywords.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">키워드가 제공되지 않았습니다.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {topKeywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">{keyword}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-background/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">STRING 상호작용 네트워크</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.geneNames[0] || summary.primaryAccession} · taxon {summary.taxonId ?? 'unknown'} 기준 상위 파트너를 조회합니다.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => { void handleLoadString() }}
            disabled={stringState.status === 'loading'}
          >
            {stringState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
            {stringState.status === 'success' ? '다시 조회' : 'STRING 조회'}
          </Button>
        </div>

        {stringState.status === 'idle' && (
          <p className="mt-4 text-sm text-muted-foreground">상호작용 파트너를 보려면 STRING 조회를 실행하세요.</p>
        )}

        {stringState.status === 'loading' && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        )}

        {stringState.status === 'error' && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{stringState.message}</p>
          </div>
        )}

        {stringState.status === 'success' && (
          <div className="mt-4 space-y-4">
            {stringGraphOption && (
              <div className="rounded-xl bg-muted/20 p-3">
                <LazyReactECharts
                  option={stringGraphOption}
                  style={{ height: 280 }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            )}

            {stringState.partners.length === 0 ? (
              <p className="text-sm text-muted-foreground">{stringState.message ?? 'STRING 파트너가 없습니다.'}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-muted/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Partner</th>
                      <th className="px-4 py-3 font-medium">Combined</th>
                      <th className="px-4 py-3 font-medium">Top Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stringState.partners.map((partner) => (
                      <tr key={partner.partnerStringId} className="border-t border-border/50">
                        <td className="px-4 py-3 font-medium">{partner.partnerName}</td>
                        <td className="px-4 py-3 font-mono tabular-nums">{partner.score.toFixed(3)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatTopStringEvidence(partner)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-background/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Reactome Pathways</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.primaryAccession} 기준으로 Reactome pathway 매핑을 조회합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => { void handleLoadReactome() }}
              disabled={reactomeState.status === 'loading'}
            >
              {reactomeState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              {reactomeState.status === 'success' ? '다시 조회' : 'Reactome 조회'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { void handleLoadReactomeNetwork() }}
              disabled={reactomeNetworkState.status === 'loading' || reactomeNetworkIdentifiers.length < 2}
            >
              {reactomeNetworkState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
              {reactomeNetworkState.status === 'success' ? '네트워크 다시 해석' : '네트워크 해석'}
            </Button>
          </div>
        </div>

        {reactomeState.status === 'idle' && (
          <p className="mt-4 text-sm text-muted-foreground">경로 요약을 보려면 Reactome 조회를 실행하세요.</p>
        )}

        {reactomeState.status === 'loading' && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        )}

        {reactomeState.status === 'error' && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{reactomeState.message}</p>
          </div>
        )}

        {reactomeState.status === 'success' && (
          <div className="mt-4 space-y-3">
            {reactomeState.pathways.slice(0, 8).map((pathway) => (
              <div key={pathway.stId} className="rounded-xl bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{pathway.stId}</Badge>
                      {pathway.hasDiagram && <Badge variant="secondary">Diagram</Badge>}
                      {pathway.isInDisease && <Badge variant="destructive">Disease</Badge>}
                      {pathway.isInferred && <Badge variant="outline">Inferred</Badge>}
                    </div>
                    <h5 className="mt-2 text-sm font-semibold">{pathway.displayName}</h5>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{pathway.speciesName}</span>
                      {pathway.maxDepth != null && <span>Depth {pathway.maxDepth}</span>}
                      {pathway.releaseDate && <span>Release {pathway.releaseDate}</span>}
                    </div>
                  </div>
                  <a
                    href={pathway.pathwayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    열기
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                {pathway.doi && (
                  <p className="mt-2 text-xs text-muted-foreground">DOI: {pathway.doi}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-border/60 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold">STRING 기반 경로 해석</h5>
              <p className="mt-1 text-xs text-muted-foreground">
                {reactomeNetworkIdentifiers.length > 0
                  ? `${reactomeNetworkIdentifiers.slice(0, 4).join(', ')}${reactomeNetworkIdentifiers.length > 4 ? ' …' : ''}를 Reactome에 투영합니다.`
                  : '먼저 STRING 파트너를 불러오면 경로 해석을 실행할 수 있습니다.'}
              </p>
            </div>
            {reactomeNetworkState.result && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{reactomeNetworkState.result.pathwaysFound} pathways</Badge>
                <Badge variant="outline">{reactomeNetworkState.result.queryIdentifiers.length} identifiers</Badge>
                {reactomeOverlapCount > 0 && <Badge variant="outline">{reactomeOverlapCount} direct overlap</Badge>}
              </div>
            )}
          </div>

          {reactomeNetworkState.status === 'idle' && (
            <p className="mt-4 text-sm text-muted-foreground">
              {stringState.status === 'success' && stringState.partners.length > 0
                ? '현재 STRING 네트워크를 Reactome pathway enrichment로 해석할 수 있습니다.'
                : 'STRING 상호작용 파트너를 먼저 조회하면 경로 enrichment를 볼 수 있습니다.'}
            </p>
          )}

          {reactomeNetworkState.status === 'loading' && (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          )}

          {reactomeNetworkState.status === 'error' && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{reactomeNetworkState.message}</p>
            </div>
          )}

          {reactomeNetworkState.status === 'success' && reactomeNetworkState.result && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Enriched pathways</p>
                  <p className="mt-2 font-mono text-2xl tabular-nums">{reactomeNetworkState.result.pathwaysFound}</p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Identifiers used</p>
                  <p className="mt-2 font-mono text-2xl tabular-nums">{reactomeNetworkState.result.queryIdentifiers.length}</p>
                  {reactomeNetworkState.result.identifiersNotFound > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reactomeNetworkState.result.identifiersNotFound} identifiers not mapped
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Direct overlap</p>
                  <p className="mt-2 font-mono text-2xl tabular-nums">{reactomeOverlapCount}</p>
                </div>
              </div>

              {reactomeNetworkState.result.warnings.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                  <p className="text-xs text-muted-foreground">
                    {reactomeNetworkState.result.warnings.join(' ')}
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl bg-muted/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Pathway</th>
                      <th className="px-4 py-3 font-medium">Entities</th>
                      <th className="px-4 py-3 font-medium">FDR</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reactomeNetworkState.result.pathways.slice(0, 8).map((pathway) => (
                      <tr key={`network-${pathway.stId}`} className="border-t border-border/50 align-top">
                        <td className="px-4 py-3">
                          <div className="flex min-w-[18rem] flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={pathway.pathwayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                {pathway.name}
                              </a>
                              <Badge variant="outline" className="font-mono text-[11px]">{pathway.stId}</Badge>
                              {directPathwayIds.has(pathway.stId) && <Badge variant="secondary">Direct</Badge>}
                              {pathway.inDisease && <Badge variant="destructive">Disease</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{pathway.speciesName}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {pathway.entitiesFound}/{pathway.entitiesTotal}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {formatScientificMetric(pathway.fdr)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          P={formatScientificMetric(pathway.pValue)}
                          {pathway.lowLevelPathway ? ' · low-level pathway' : ''}
                          {pathway.reactionsFound > 0 ? ` · reactions ${pathway.reactionsFound}/${pathway.reactionsTotal}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl bg-background/80 p-4">
          <h4 className="text-sm font-semibold">GO Terms</h4>
          {topGoTerms.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">GO 주석이 제공되지 않았습니다.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">GO ID</th>
                    <th className="py-2 font-medium">Aspect</th>
                    <th className="py-2 font-medium">Term</th>
                  </tr>
                </thead>
                <tbody>
                  {topGoTerms.map((term) => (
                    <tr key={term.id} className="border-t border-border/50 align-top">
                      <td className="py-2 pr-3 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => { void handleSelectGoTerm(term.id) }}
                          className={`rounded px-1.5 py-0.5 text-left transition-colors hover:bg-primary/10 hover:text-primary ${
                            quickGo.selectedId === term.id ? 'bg-primary/10 text-primary' : ''
                          }`}
                        >
                          {term.id}
                        </button>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{GO_ASPECT_LABELS[term.aspect]}</td>
                      <td className="py-2">{term.term}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-background/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">구조 연계</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {topPdbIds.length > 0
                  ? 'UniProt cross-reference에서 연결된 PDB 구조의 메타데이터를 조회합니다.'
                  : 'PDB 구조가 없으면 AlphaFold 예측 모델을 fallback으로 조회합니다.'}
              </p>
            </div>
            {topPdbIds.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => { void handleLoadPdb() }}
                disabled={pdbState.status === 'loading' || topPdbIds.length === 0}
              >
                {pdbState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                {pdbState.status === 'success' ? 'RCSB 다시 조회' : 'RCSB 조회'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => { void handleLoadAlphaFold() }}
                disabled={alphaFoldState.status === 'loading'}
              >
                {alphaFoldState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Atom className="h-4 w-4" />}
                {alphaFoldState.status === 'success' ? 'AlphaFold 다시 조회' : 'AlphaFold 조회'}
              </Button>
            )}
          </div>

          {topPdbIds.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">연결된 PDB 구조가 없어 AlphaFold fallback을 사용할 수 있습니다.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {topPdbIds.map((pdbId) => (
                <a
                  key={pdbId}
                  href={`https://www.rcsb.org/structure/${pdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-mono text-primary hover:underline"
                >
                  {pdbId}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}

          {pdbState.status === 'idle' && topPdbIds.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">대표 구조의 실험법과 해상도를 보려면 RCSB 조회를 실행하세요.</p>
          )}

          {pdbState.status === 'loading' && (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          )}

          {pdbState.status === 'error' && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{pdbState.message}</p>
            </div>
          )}

          {pdbState.status === 'success' && (
            <div className="mt-4 space-y-3">
              {pdbState.structures.map((structure) => (
                <div key={structure.pdbId} className="rounded-xl bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{structure.pdbId}</Badge>
                        {structure.resolutionAngstrom != null && (
                          <Badge variant="secondary">{structure.resolutionAngstrom.toFixed(2)} A</Badge>
                        )}
                        {structure.assemblyCount != null && (
                          <Badge variant="outline">{structure.assemblyCount} assemblies</Badge>
                        )}
                      </div>
                      <h5 className="mt-2 text-sm font-semibold">{structure.title}</h5>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {structure.experimentalMethods.length > 0 && <span>{structure.experimentalMethods.join(', ')}</span>}
                        {structure.proteinEntityCount != null && <span>{structure.proteinEntityCount} protein entities</span>}
                        {structure.releaseDate && <span>Release {structure.releaseDate.slice(0, 10)}</span>}
                      </div>
                      {structure.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {structure.keywords.slice(0, 3).map((keyword) => (
                            <Badge key={`${structure.pdbId}-${keyword}`} variant="secondary">{keyword}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={structure.entryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      열기
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  {structure.citationDoi && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      DOI: {structure.citationDoi}
                      {structure.citationYear != null ? ` · ${structure.citationYear}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {topPdbIds.length === 0 && alphaFoldState.status === 'idle' && (
            <p className="mt-4 text-sm text-muted-foreground">
              {summary.primaryAccession} 기준 AlphaFold 모델 요약을 보려면 조회를 실행하세요.
            </p>
          )}

          {topPdbIds.length === 0 && alphaFoldState.status === 'loading' && (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          )}

          {topPdbIds.length === 0 && alphaFoldState.status === 'error' && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{alphaFoldState.message}</p>
            </div>
          )}

          {topPdbIds.length === 0 && alphaFoldState.status === 'success' && alphaFoldState.prediction && (
            <div className="mt-4 rounded-xl bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{alphaFoldState.prediction.entryId}</Badge>
                    {alphaFoldState.prediction.meanPlddt != null && (
                      <Badge variant="secondary">mean pLDDT {alphaFoldState.prediction.meanPlddt.toFixed(1)}</Badge>
                    )}
                    {alphaFoldState.prediction.latestVersion != null && (
                      <Badge variant="outline">v{alphaFoldState.prediction.latestVersion}</Badge>
                    )}
                    {alphaFoldState.prediction.isReviewed && <Badge variant="outline">Reviewed</Badge>}
                  </div>
                  <h5 className="mt-2 text-sm font-semibold">{alphaFoldState.prediction.proteinName}</h5>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {alphaFoldState.prediction.geneName && <span>Gene {alphaFoldState.prediction.geneName}</span>}
                    <span>{alphaFoldState.prediction.organismName}</span>
                    {alphaFoldState.prediction.modelCreatedDate && (
                      <span>Model {alphaFoldState.prediction.modelCreatedDate.slice(0, 10)}</span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-background/80 px-3 py-2 text-xs">
                      <p className="font-medium text-muted-foreground">Confidence Split</p>
                      <p className="mt-1 font-mono tabular-nums">
                        VH {(alphaFoldState.prediction.fractionVeryHigh * 100).toFixed(1)}% ·
                        C {(alphaFoldState.prediction.fractionConfident * 100).toFixed(1)}% ·
                        L {((alphaFoldState.prediction.fractionLow + alphaFoldState.prediction.fractionVeryLow) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-background/80 px-3 py-2 text-xs">
                      <p className="font-medium text-muted-foreground">Downloads</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {alphaFoldState.prediction.pdbUrl && (
                          <a href={alphaFoldState.prediction.pdbUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PDB</a>
                        )}
                        {alphaFoldState.prediction.cifUrl && (
                          <a href={alphaFoldState.prediction.cifUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CIF</a>
                        )}
                        {alphaFoldState.prediction.paeDocUrl && (
                          <a href={alphaFoldState.prediction.paeDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PAE JSON</a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={alphaFoldState.prediction.entryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  열기
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {topGoTerms.length > 0 && (
        <div className="rounded-xl bg-background/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">QuickGO 상세</h4>
              <p className="mt-1 text-xs text-muted-foreground">GO ID를 클릭하면 정의와 ontology 맥락을 불러옵니다.</p>
            </div>
            {quickGo.selectedId && (
              <Badge variant="outline" className="font-mono text-xs">{quickGo.selectedId}</Badge>
            )}
          </div>

          {quickGo.status === 'idle' && (
            <p className="mt-4 text-sm text-muted-foreground">상세를 보려면 GO term을 선택하세요.</p>
          )}

          {quickGo.status === 'loading' && (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          )}

          {quickGo.status === 'error' && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{quickGo.message}</p>
            </div>
          )}

          {quickGo.status === 'success' && quickGo.summary && (
            <QuickGoSummaryPanel summary={quickGo.summary} />
          )}
        </div>
      )}
    </div>
  )
}

function QuickGoSummaryPanel({ summary }: { summary: QuickGoTermSummary }): React.ReactElement {
  const topAncestors = summary.ancestors.slice(0, 8)
  const topChildren = summary.children.slice(0, 8)
  const topSynonyms = summary.synonyms.slice(0, 8)

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{QUICKGO_ASPECT_LABELS[summary.aspect]}</Badge>
          {summary.isObsolete && <Badge variant="destructive">Obsolete</Badge>}
          {summary.usage && <Badge variant="outline">{summary.usage}</Badge>}
        </div>
        <h5 className="mt-3 text-base font-semibold">{summary.name}</h5>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{summary.definition}</p>
        {summary.comment && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{summary.comment}</p>
        )}
      </div>

      {topSynonyms.length > 0 && (
        <div className="rounded-xl bg-muted/20 p-4">
          <h5 className="text-sm font-semibold">동의어</h5>
          <div className="mt-3 flex flex-wrap gap-2">
            {topSynonyms.map((synonym) => (
              <Badge key={`${synonym.name}-${synonym.type ?? 'none'}`} variant="outline">
                {synonym.name}
                {synonym.type ? ` (${synonym.type})` : ''}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-muted/20 p-4">
          <h5 className="text-sm font-semibold">상위 Term</h5>
          {topAncestors.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">상위 term 정보가 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topAncestors.map((term) => (
                <li key={term.id} className="rounded-lg bg-background/80 px-3 py-2">
                  <span className="font-mono text-xs text-primary">{term.id}</span>
                  <span className="ml-2">{term.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-muted/20 p-4">
          <h5 className="text-sm font-semibold">직계 하위 Term</h5>
          {topChildren.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">하위 term 정보가 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topChildren.map((term) => (
                <li key={term.id} className="rounded-lg bg-background/80 px-3 py-2">
                  <span className="font-mono text-xs text-primary">{term.id}</span>
                  <span className="ml-2">{term.name}</span>
                  {term.relation && (
                    <span className="ml-2 text-xs text-muted-foreground">({term.relation})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {summary.pathToRoot.length > 0 && (
        <div className="rounded-xl bg-muted/20 p-4">
          <h5 className="text-sm font-semibold">Root Path</h5>
          <div className="mt-3 space-y-2 text-sm">
            {summary.pathToRoot.map((step, index) => (
              <div key={`${step.child}-${step.parent}-${index}`} className="rounded-lg bg-background/80 px-3 py-2">
                <span className="font-mono text-xs text-primary">{step.child}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-mono text-xs text-primary">{step.parent}</span>
                <span className="ml-2 text-xs text-muted-foreground">({step.relationship})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatTopStringEvidence(partner: StringPartnerSummary): string {
  const entries = Object.entries(partner.evidence)
    .sort((a, b) => b[1] - a[1])
    .filter(([, value]) => value > 0)

  if (entries.length === 0) return 'No evidence breakdown'

  const [label, value] = entries[0]
  const labelMap: Record<string, string> = {
    neighborhood: 'Neighborhood',
    fusion: 'Fusion',
    phylogeny: 'Phylogeny',
    coexpression: 'Coexpression',
    experimental: 'Experimental',
    database: 'Database',
    textmining: 'Text mining',
  }

  return `${labelMap[label] ?? label} (${value.toFixed(3)})`
}

function formatScientificMetric(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'n/a'
  if (value === 0) return '0'
  if (value >= 0.001 && value < 1) return value.toFixed(3)
  return value.toExponential(2)
}
