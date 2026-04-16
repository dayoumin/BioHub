'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { downloadTextFile } from '@/lib/utils/download-file'
import { Search, Download, Copy, Check, Loader2, HelpCircle, ChevronDown, ArrowRight } from 'lucide-react'
import { storeSequenceForTransfer } from '@/lib/genetics/sequence-transfer'
import { GeneticsExamplePicker } from '@/components/genetics/GeneticsExamplePicker'
import { Button } from '@/components/ui/button'
import {
  BIOLOGY_CALLOUT_ERROR,
  BIOLOGY_INPUT,
  BIOLOGY_INSET_PANEL,
  BIOLOGY_PANEL,
  BIOLOGY_PANEL_SOFT,
  BIOLOGY_SEGMENTED,
  BIOLOGY_SEGMENTED_ACTIVE,
  BIOLOGY_TEXTAREA,
} from '@/lib/design-tokens/biology'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { toast } from 'sonner'

// ── 타입 ──

interface SearchResult {
  uid: string
  accession: string
  title: string
  organism: string
  length: number
  updateDate: string
}

type DbOption = 'nuccore' | 'protein'

const DB_LABELS: Record<DbOption, string> = {
  nuccore: 'Nucleotide',
  protein: 'Protein',
}

const SEARCH_TIPS = [
  { tip: '종명으로 검색', example: 'Gadus morhua COI', desc: '종명 + 마커 조합이 가장 정확' },
  { tip: 'Accession 번호 직접 입력', example: 'KF601412', desc: '알고 있는 서열을 바로 찾을 때' },
  { tip: '분류군 + 유전자', example: 'Salmonidae 16S rRNA', desc: '과(Family) 수준 검색' },
  { tip: '환경 DNA', example: 'environmental sample fish 12S', desc: 'eDNA 참조 서열 탐색' },
] as const

const DB_HELP: Record<DbOption, string> = {
  nuccore: 'DNA, RNA, mtDNA처럼 핵산 서열을 찾을 때 사용합니다.',
  protein: '번역된 단백질 서열이나 단백질 accession을 찾을 때 사용합니다.',
}

const GENBANK_QUERY_EXAMPLES = [
  {
    id: 'thunnus-coi',
    label: '참치 COI',
    description: 'DNA 바코딩용 COI 참조 서열을 찾는 예제입니다.',
    query: 'Thunnus albacares COI',
    db: 'nuccore' as const,
  },
  {
    id: 'kf601412',
    label: 'Accession 직접 검색',
    description: '이미 accession을 알고 있을 때 가장 빠르게 서열을 여는 방법입니다.',
    query: 'KF601412',
    db: 'nuccore' as const,
  },
  {
    id: 'salmon-16s',
    label: '연어 16S',
    description: '분류군과 마커를 조합해 참조 서열을 좁혀가는 예제입니다.',
    query: 'salmon 16S rRNA',
    db: 'nuccore' as const,
  },
  {
    id: 'human-insulin',
    label: '인슐린 단백질',
    description: '단백질 DB로 전환해 단백질 accession과 FASTA를 찾는 예제입니다.',
    query: 'human insulin',
    db: 'protein' as const,
  },
] as const

// ── 메인 컴포넌트 ──

export default function GenBankContent(): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [db, setDb] = useState<DbOption>('nuccore')
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [fetchingId, setFetchingId] = useState<string | null>(null)
  const [fastaContent, setFastaContent] = useState<string | null>(null)
  const [fastaAccession, setFastaAccession] = useState<string | null>(null)
  const [showTips, setShowTips] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fastaAbortRef = useRef<AbortController | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // 히스토리 복원
  useEffect(() => {
    let cancelled = false
    const historyId = searchParams.get('history')
    if (!historyId) return

    void hydrateGeneticsHistoryFromCloud().then(() => {
      if (cancelled) return

      const entry = loadGeneticsHistory('genbank').find(e => e.id === historyId)
      if (entry?.type === 'genbank') {
        setQuery(entry.query)
        setDb(entry.db as DbOption)
        setResults([])
        setTotalCount(0)
        setError(null)
        setHasSearched(false)
        setFetchingId(null)
        setFastaContent(null)
        setFastaAccession(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [searchParams])

  // 언마운트 시 진행 중인 요청 취소
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      fastaAbortRef.current?.abort()
    }
  }, [])

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsSearching(true)
    setError(null)
    setHasSearched(true)
    setFastaContent(null)
    setFastaAccession(null)

    try {
      const params = new URLSearchParams({ term: trimmed, db, retmax: '20' })
      const res = await fetch(`/api/ncbi/search?${params.toString()}`, { signal: ctrl.signal })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '검색 실패' })) as { error?: string }
        throw new Error(data.error || `검색 실패 (${res.status})`)
      }

      const data = await res.json() as { results: SearchResult[]; totalCount: number }
      setResults(data.results)
      setTotalCount(data.totalCount)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
      setResults([])
    } finally {
      if (!ctrl.signal.aborted) setIsSearching(false)
    }
  }, [query, db])

  const handleFetchFasta = useCallback(async (accession: string) => {
    fastaAbortRef.current?.abort()
    const ctrl = new AbortController()
    fastaAbortRef.current = ctrl

    setFetchingId(accession)
    setFastaContent(null)
    setFastaAccession(null)

    try {
      const params = new URLSearchParams({ id: accession, db, rettype: 'fasta', retmode: 'text' })
      const res = await fetch(`/api/ncbi/fetch?${params.toString()}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error('서열 다운로드에 실패했습니다.')
      const text = await res.text()
      setFastaContent(text)
      setFastaAccession(accession)

      // 히스토리 저장
      const matchedResult = results.find(r => r.accession === accession)
      const seqLines = text.split('\n').filter(l => !l.startsWith('>'))
      const saved = saveGeneticsHistory({
        type: 'genbank',
        query: query.trim(),
        db: db as 'nuccore' | 'protein',
        accession,
        organism: matchedResult?.organism ?? null,
        sequenceLength: seqLines.join('').replace(/\s/g, '').length,
        projectId: activeResearchProjectId ?? undefined,
      })
      if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('서열 다운로드에 실패했습니다.')
    } finally {
      if (!ctrl.signal.aborted) setFetchingId(null)
    }
  }, [db, query, results, activeResearchProjectId])

  const handleTransfer = useCallback((target: 'barcoding' | 'blast') => {
    if (!fastaContent) return
    storeSequenceForTransfer(fastaContent, 'genbank')
    router.push(`/genetics/${target}`)
  }, [fastaContent, router])

  return (
    <main>
      <div className="mb-6">

        <h1 className="text-2xl font-bold">GenBank 서열 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          NCBI GenBank에서 서열을 검색하고 FASTA로 다운로드
        </p>
      </div>

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종명, accession, 키워드 (예: Gadus morhua COI)"
              className={`${BIOLOGY_INPUT} py-2.5 pl-10 pr-3`}
            />
          </div>
          <div className={`${BIOLOGY_PANEL_SOFT} flex gap-1 p-0.5`}>
            {(Object.keys(DB_LABELS) as DbOption[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDb(d)}
                className={db === d ? BIOLOGY_SEGMENTED_ACTIVE : BIOLOGY_SEGMENTED}
              >
                {DB_LABELS[d]}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={!query.trim() || isSearching} className="px-6">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : '검색'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/75">
          {DB_HELP[db]}
        </p>
        {!query.trim() && (
          <div className="space-y-2">
            <GeneticsExamplePicker
              title="예제 검색어"
              description="참조 서열을 찾는 대표 검색 패턴입니다. 클릭하면 검색어와 DB가 함께 채워집니다."
              items={GENBANK_QUERY_EXAMPLES}
              onSelect={(example) => {
                setQuery(example.query)
                setDb(example.db)
              }}
            />
            <button
              type="button"
              onClick={() => setShowTips(prev => !prev)}
              aria-expanded={showTips}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <HelpCircle className="h-3 w-3" />
              검색 팁
              <ChevronDown className={`h-3 w-3 transition-transform ${showTips ? 'rotate-180' : ''}`} />
            </button>
            {showTips && (
              <div className={BIOLOGY_INSET_PANEL}>
                <ul className="space-y-1.5">
                  {SEARCH_TIPS.map(({ tip, example, desc }) => (
                    <li key={tip} className="flex items-start gap-2 text-xs">
                      <span className="font-medium text-foreground whitespace-nowrap">{tip}:</span>
                      <button
                        type="button"
                        onClick={() => { setQuery(example); setShowTips(false) }}
                        className="font-mono text-[color:var(--section-accent-bio)] hover:underline"
                      >
                        {example}
                      </button>
                      <span className="text-muted-foreground/60">— {desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className={`mb-4 ${BIOLOGY_CALLOUT_ERROR} p-4`}>
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {hasSearched && !isSearching && results.length === 0 && !error && (
        <div className={`${BIOLOGY_PANEL_SOFT} flex flex-col items-center justify-center px-4 py-12 text-center`}>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-muted-foreground">
            <Search className="h-6 w-6" />
          </div>
          <p className="mb-2 text-sm font-medium text-foreground">검색 결과가 없습니다</p>
          <p className="text-xs text-muted-foreground/80 max-w-sm">
            철자가 정확한지 확인하시거나, Accession Number를 띄어쓰기 없이 단독으로 입력해 보세요.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {totalCount.toLocaleString()}건 중 {results.length}건 표시
          </p>

          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.uid} className={`${BIOLOGY_PANEL} flex items-start gap-3 p-4 transition-colors hover:bg-surface-container`}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/${db}/${r.accession}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-medium text-[color:var(--section-accent-bio)] hover:underline"
                    >
                      {r.accession}
                    </a>
                    {r.length > 0 && (
                      <span className="text-xs text-muted-foreground">{r.length.toLocaleString()} bp</span>
                    )}
                    {r.updateDate && (
                      <span className="text-xs text-muted-foreground/50">{r.updateDate}</span>
                    )}
                  </div>
                  <p className="mb-0.5 text-sm leading-snug text-foreground">{r.title}</p>
                  {r.organism && (
                    <p className="text-xs italic text-muted-foreground">{r.organism}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  disabled={fetchingId === r.accession}
                  onClick={() => handleFetchFasta(r.accession)}
                >
                  {fetchingId === r.accession ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  FASTA
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FASTA 뷰어 */}
      {fastaContent && fastaAccession && (
        <FastaViewer accession={fastaAccession} content={fastaContent} onClose={() => setFastaContent(null)} onTransfer={handleTransfer} />
      )}
    </main>
  )
}

// ── FASTA 뷰어 ──

function FastaViewer({ accession, content, onClose, onTransfer }: {
  accession: string
  content: string
  onClose: () => void
  onTransfer: (target: 'barcoding' | 'blast') => void
}): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* */ }
  }, [content])

  const handleDownload = useCallback(() => {
    downloadTextFile(content, `${accession}.fasta`)
  }, [accession, content])

  return (
    <div className={`mt-6 ${BIOLOGY_PANEL_SOFT} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {accession} — FASTA
        </h3>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? '복사됨' : '복사'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleDownload}>
            <Download className="h-3 w-3" />
            다운로드
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
      <pre className={`${BIOLOGY_TEXTAREA} max-h-64 overflow-auto p-3 text-xs leading-relaxed text-foreground`}>
        {content}
      </pre>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">이 서열로:</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onTransfer('barcoding')}
        >
          <ArrowRight className="h-3 w-3" />
          종 판별하기
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onTransfer('blast')}
        >
          <ArrowRight className="h-3 w-3" />
          BLAST로 검색
        </Button>
      </div>
    </div>
  )
}
