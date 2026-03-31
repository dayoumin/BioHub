'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Search, Download, Copy, Check, ExternalLink, Loader2, HelpCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { focusRing } from '@/components/common/card-styles'
import { saveGeneticsHistory, loadGeneticsHistory } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'

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

// ── 메인 컴포넌트 ──

export default function GenBankContent(): React.ReactElement {
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
    const historyId = new URLSearchParams(window.location.search).get('history')
    if (!historyId) return
    const entry = loadGeneticsHistory('genbank').find(e => e.id === historyId)
    if (entry?.type === 'genbank') {
      setQuery(entry.query)
      setDb(entry.db as DbOption)
    }
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

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
      saveGeneticsHistory({
        type: 'genbank',
        query: query.trim(),
        db: db as 'nuccore' | 'protein',
        accession,
        organism: matchedResult?.organism ?? null,
        sequenceLength: seqLines.join('').replace(/\s/g, '').length,
        projectId: activeResearchProjectId ?? undefined,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('서열 다운로드에 실패했습니다.')
    } finally {
      if (!ctrl.signal.aborted) setFetchingId(null)
    }
  }, [db, query, results, activeResearchProjectId])

  return (
    <main>
      <div className="mb-6">
        <Link href="/genetics" className="mb-3 inline-block text-sm text-primary hover:underline">
          &larr; 유전적 분석
        </Link>
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
              className={`w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm ${focusRing}`}
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {(Object.keys(DB_LABELS) as DbOption[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDb(d)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  db === d
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {DB_LABELS[d]}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={!query.trim() || isSearching} className="px-6">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : '검색'}
          </Button>
        </div>
        {!query.trim() && !hasSearched && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground/50">예제:</span>
              {[
                { q: 'Thunnus albacares COI', label: '참치 COI' },
                { q: 'KF601412', label: 'accession' },
                { q: 'salmon 16S rRNA', label: '연어 16S' },
                { q: 'human insulin', label: '인슐린' },
              ].map(({ q, label }) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                >
                  {label}
                </button>
              ))}
            </div>
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
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <ul className="space-y-1.5">
                  {SEARCH_TIPS.map(({ tip, example, desc }) => (
                    <li key={tip} className="flex items-start gap-2 text-xs">
                      <span className="font-medium text-foreground whitespace-nowrap">{tip}:</span>
                      <button
                        type="button"
                        onClick={() => { setQuery(example); setShowTips(false) }}
                        className="font-mono text-primary hover:underline"
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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {hasSearched && !isSearching && results.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {totalCount.toLocaleString()}건 중 {results.length}건 표시
          </p>

          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {results.map((r) => (
              <div key={r.uid} className="flex items-start gap-3 p-4 transition hover:bg-muted/20">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/${db}/${r.accession}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-medium text-primary hover:underline"
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
        <FastaViewer accession={fastaAccession} content={fastaContent} onClose={() => setFastaContent(null)} />
      )}
    </main>
  )
}

// ── FASTA 뷰어 ──

function FastaViewer({ accession, content, onClose }: {
  accession: string
  content: string
  onClose: () => void
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
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${accession}.fasta`
    a.click()
    URL.revokeObjectURL(url)
  }, [accession, content])

  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
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
      <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground">
        {content}
      </pre>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        <span>이 서열을</span>
        <Link href="/genetics/barcoding" className="text-primary hover:underline">종 판별</Link>
        <span>또는</span>
        <Link href="/genetics/blast" className="text-primary hover:underline">BLAST 검색</Link>
        <span>에 사용할 수 있습니다.</span>
      </p>
    </div>
  )
}
