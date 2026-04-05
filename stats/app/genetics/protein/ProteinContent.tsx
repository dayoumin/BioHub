// stats/app/genetics/protein/ProteinContent.tsx
'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import type { ProteinHistoryEntry } from '@/lib/genetics/analysis-history'
import { consumeTransferredSequence, formatTransferSource } from '@/lib/genetics/sequence-transfer'
import { cleanProteinSequence, validateProteinSequence as validateProtein } from '@/lib/genetics/validate-sequence'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { resolveAxisColors, resolveChartPalette, resolveCssVar } from '@/lib/charts/chart-color-resolver'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, Upload, Atom } from 'lucide-react'
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
        setState({ step: 'input' })
        toast.info(`${entry.analysisName} 기록을 불러왔습니다. 서열을 다시 입력하여 분석하세요.`)
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

      const saved = saveGeneticsHistory({
        type: 'protein',
        analysisName: autoName,
        sequenceLength: result.sequenceLength,
        molecularWeight: result.molecularWeight,
        isoelectricPoint: result.isoelectricPoint,
        isStable: result.isStable,
        accession: transferredAccession ?? undefined,
        projectId: activeResearchProjectId ?? undefined,
      })
      if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
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
        <div className="mb-6 rounded-lg bg-amber-50/50 p-6 dark:bg-amber-950/20" role="alert">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">기록 복원 실패</h2>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{deepLinkError}</p>
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
              className="w-full rounded-lg bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {transferredSource && (
            <div className="rounded-lg bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              {formatTransferSource(transferredSource)}에서 전달된 서열
              {transferredAccession && <span className="ml-1 font-mono text-xs">({transferredAccession})</span>}
            </div>
          )}

          <div>
            <label htmlFor="proteinSeq" className="mb-1 block text-sm font-medium text-foreground">
              단백질 서열
            </label>
            <textarea
              id="proteinSeq"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`FASTA 형식 또는 순수 아미노산 서열을 입력하세요.\n\n>sp|P68871|HBB_HUMAN Hemoglobin subunit beta\nMVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTADAVMGNPKVKAHGKKVLG\nAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVAN\nALAHKYH`}
              rows={8}
              className="w-full rounded-lg bg-card px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <div className="rounded-lg bg-red-50/50 p-6 dark:bg-red-950/20" role="alert">
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
  onReset: () => void
}

function ProteinResultView({ result, analysisName, onReset }: ProteinResultViewProps): React.ReactElement {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 프로젝트 전체 컨벤션: 마운트 시 1회 해석
  const ax = useMemo(() => resolveAxisColors(), [])
  const palette = useMemo(() => resolveChartPalette(4), [])
  const bgColor = useMemo(() => resolveCssVar('--background', '#ffffff'), [])

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
