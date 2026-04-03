'use client'

import { useState, useCallback, useRef, useMemo, useEffect, memo } from 'react'
import {
  Search,
  Settings2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  X,
  Loader2,
  ArrowUpDown,
  BookOpen,
  BookmarkPlus,
  FileText,
} from 'lucide-react'
import type {
  LiteratureSource,
  LiteratureItem,
  SourceSearchResult,
} from '@/lib/types/literature'
import type { CitationRecord } from '@/lib/research/citation-types'
import { createCitationRecord, citationKey } from '@/lib/research/citation-types'
import { saveCitation, listCitationsByProject } from '@/lib/research/citation-storage'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { EmptyState } from '@/components/common/EmptyState'

// ── 상수 ──

const ALL_SOURCES: LiteratureSource[] = ['openalex', 'pubmed', 'gbif', 'obis', 'nanet']

/** 소스별 기본값 (src/lib/korea-filter-config.ts의 LITERATURE_SEARCH_CONFIG와 동일) */
const DEFAULT_SOURCES: LiteratureSource[] = ['openalex', 'gbif', 'obis']
const MAX_RESULTS_PER_SOURCE = 20
const INCLUDE_KOREA_KEYWORD_BY_DEFAULT = true

const SOURCE_LABELS: Record<LiteratureSource, string> = {
  openalex: 'OpenAlex',
  gbif: 'GBIF',
  obis: 'OBIS',
  nanet: '국회도서관',
  pubmed: 'PubMed',
}

const SOURCE_BADGE_COLORS: Record<LiteratureSource, string> = {
  openalex: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  pubmed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  gbif: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  obis: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
  nanet: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
}

type SortKey = 'year' | 'citations' | 'source'

type SourceFetchStatus = 'idle' | 'loading' | 'done' | 'error'

interface SourceState {
  status: SourceFetchStatus
  items: LiteratureItem[]
  error: string | null
  elapsed: number
}

function createInitialSourceState(): SourceState {
  return { status: 'idle', items: [], error: null, elapsed: 0 }
}

// ── 중복 제거 ──

/** 메타데이터 풍부도 점수 (높을수록 우선 보존) */
function metadataScore(item: LiteratureItem): number {
  let score = 0
  if (item.doi) score += 4
  if (item.abstract) score += 2
  if (item.citedByCount != null && item.citedByCount > 0) score += 1
  if (item.pdfUrl) score += 1
  return score
}

/** 아이템에서 가능한 모든 중복 판별 키를 생성 */
function itemKeys(item: LiteratureItem): string[] {
  const keys: string[] = []
  if (item.doi) keys.push(`doi:${item.doi.toLowerCase()}`)
  if (item.url) keys.push(`url:${item.url.toLowerCase()}`)
  keys.push(`title:${item.title.toLowerCase().trim()}|${item.year ?? 'null'}`)
  return keys
}

function deduplicateItems(items: LiteratureItem[]): LiteratureItem[] {
  // 각 키 → 해당 키로 등록된 대표 아이템
  const seen = new Map<string, LiteratureItem>()
  // 대표 아이템 집합 (삽입 순서 보존)
  const result = new Map<LiteratureItem, true>()

  for (const item of items) {
    const keys = itemKeys(item)

    // 기존에 등록된 아이템 중 키가 겹치는 것을 찾음
    let existing: LiteratureItem | undefined
    for (const key of keys) {
      const found = seen.get(key)
      if (found) { existing = found; break }
    }

    if (existing) {
      // 새 아이템이 더 풍부하면 교체
      if (metadataScore(item) > metadataScore(existing)) {
        result.delete(existing)
        result.set(item, true)

        // 기존 아이템의 키들도 새 아이템으로 재매핑
        for (const [k, v] of seen) {
          if (v === existing) seen.set(k, item)
        }
        // 새 아이템의 키도 등록
        for (const key of keys) {
          seen.set(key, item)
        }
      } else {
        // 기존이 더 풍부하거나 동일 → 새 아이템의 키를 기존 대표에 추가 등록
        for (const key of keys) {
          if (!seen.has(key)) seen.set(key, existing)
        }
      }
    } else {
      // 완전히 새로운 아이템 → 모든 키 등록
      result.set(item, true)
      for (const key of keys) {
        seen.set(key, item)
      }
    }
  }

  return Array.from(result.keys())
}

// ── 정렬 ──

function sortItems(items: LiteratureItem[], sortKey: SortKey): LiteratureItem[] {
  const sorted = [...items]
  switch (sortKey) {
    case 'year':
      sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
      break
    case 'citations':
      sorted.sort((a, b) => (b.citedByCount ?? 0) - (a.citedByCount ?? 0))
      break
    case 'source':
      sorted.sort((a, b) => a.source.localeCompare(b.source))
      break
  }
  return sorted
}

// ── 검색 입력 영역 ──

interface SearchFormProps {
  onSearch: (query: string, sources: LiteratureSource[], options: SearchFormOptions) => void
  isSearching: boolean
  onCancel: () => void
}

interface SearchFormOptions {
  yearFrom: number | undefined
  yearTo: number | undefined
  keywords: string
  keywordOperator: 'AND' | 'OR'
  excludeKeywords: string
  includeKoreaKeyword: boolean
}

const SearchForm = memo(function SearchForm({ onSearch, isSearching, onCancel }: SearchFormProps): React.ReactElement {
  const [query, setQuery] = useState('')
  const [selectedSources, setSelectedSources] = useState<LiteratureSource[]>(
    [...DEFAULT_SOURCES],
  )
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [yearFrom, setYearFrom] = useState<string>('')
  const [yearTo, setYearTo] = useState<string>('')
  const [keywords, setKeywords] = useState('')
  const [keywordOperator, setKeywordOperator] = useState<'AND' | 'OR'>('OR')
  const [excludeKeywords, setExcludeKeywords] = useState('')
  const [includeKoreaKeyword, setIncludeKoreaKeyword] = useState(
    INCLUDE_KOREA_KEYWORD_BY_DEFAULT,
  )

  const canSubmit = query.trim().length > 0 && selectedSources.length > 0

  const handleSourceToggle = useCallback((source: LiteratureSource) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source],
    )
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || isSearching) return

    onSearch(query.trim(), selectedSources, {
      yearFrom: yearFrom ? Number(yearFrom) : undefined,
      yearTo: yearTo ? Number(yearTo) : undefined,
      keywords,
      keywordOperator,
      excludeKeywords,
      includeKoreaKeyword,
    })
  }, [
    canSubmit, isSearching, query, selectedSources, yearFrom, yearTo,
    keywords, keywordOperator, excludeKeywords, includeKoreaKeyword, onSearch,
  ])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 검색어 입력 */}
      <div>
        <label htmlFor="literature-query" className="mb-1.5 block text-sm font-medium text-foreground">
          검색어
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="literature-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="학명 또는 키워드 입력"
            className="pl-10"
            disabled={isSearching}
          />
        </div>
      </div>

      {/* 소스 선택 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          검색 소스
        </label>
        <div className="flex flex-wrap gap-3">
          {ALL_SOURCES.map(source => (
            <label
              key={source}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selectedSources.includes(source)}
                onCheckedChange={() => handleSourceToggle(source)}
                disabled={isSearching}
              />
              <span className={selectedSources.includes(source) ? 'text-foreground' : 'text-muted-foreground'}>
                {SOURCE_LABELS[source]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 고급 옵션 */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            고급 옵션
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
            {/* 연도 범위 */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">연도 범위</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="시작 연도"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  className="h-8 w-28 text-sm"
                  min={1900}
                  max={2100}
                  disabled={isSearching}
                />
                <span className="text-xs text-muted-foreground">~</span>
                <Input
                  type="number"
                  placeholder="종료 연도"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  className="h-8 w-28 text-sm"
                  min={1900}
                  max={2100}
                  disabled={isSearching}
                />
              </div>
            </div>

            {/* 추가 키워드 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">추가 키워드</label>
              <Input
                placeholder="쉼표로 구분 (예: virus, disease)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="h-8 text-sm"
                disabled={isSearching}
              />
            </div>

            {/* 키워드 연산자 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">키워드 연산자</label>
              <div className="flex gap-2">
                {(['AND', 'OR'] as const).map(op => (
                  <Button
                    key={op}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setKeywordOperator(op)}
                    disabled={isSearching}
                    className={`h-8 text-xs ${
                      keywordOperator === op
                        ? 'border-primary bg-primary/5 font-medium text-primary hover:bg-primary/5'
                        : 'text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {op}
                  </Button>
                ))}
              </div>
            </div>

            {/* 제외 키워드 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">제외 키워드</label>
              <Input
                placeholder="쉼표로 구분"
                value={excludeKeywords}
                onChange={(e) => setExcludeKeywords(e.target.value)}
                className="h-8 text-sm"
                disabled={isSearching}
              />
            </div>

            {/* Korea 키워드 포함 */}
            <div className="flex items-center gap-3">
              <Switch
                checked={includeKoreaKeyword}
                onCheckedChange={setIncludeKoreaKeyword}
                disabled={isSearching}
              />
              <label className="text-xs font-medium text-muted-foreground">
                Korea 키워드 포함
              </label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 검색 / 취소 버튼 */}
      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit || isSearching} className="flex-1">
          <Search className="mr-2 h-4 w-4" />
          검색
        </Button>
        {isSearching && (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
})

// ── 소스별 진행 상태 ──

interface SourceProgressProps {
  sourceStates: Record<LiteratureSource, SourceState>
  activeSources: LiteratureSource[]
}

const SourceProgress = memo(function SourceProgress({ sourceStates, activeSources }: SourceProgressProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {activeSources.map(source => {
        const state = sourceStates[source]
        return (
          <div
            key={source}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              state.status === 'done'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                : state.status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                  : state.status === 'loading'
                    ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'border-border bg-muted/50 text-muted-foreground'
            }`}
          >
            {state.status === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
            {state.status === 'done' && <Check className="h-3 w-3" />}
            {state.status === 'error' && <X className="h-3 w-3" />}
            <span>{SOURCE_LABELS[source]}</span>
            {state.status === 'done' && (
              <span className="text-[10px] opacity-70">
                {state.items.length}건 {state.elapsed.toFixed(1)}s
              </span>
            )}
            {state.status === 'loading' && (
              <span className="text-[10px] opacity-70">검색 중...</span>
            )}
            {state.status === 'error' && (
              <span className="text-[10px] opacity-70">에러</span>
            )}
          </div>
        )
      })}
    </div>
  )
})

// ── 문헌 카드 ──

interface LiteratureCardProps {
  item: LiteratureItem
  onSave?: (item: LiteratureItem) => void
  isSaved?: boolean
}

const LiteratureCard = memo(function LiteratureCard({ item, onSave, isSaved }: LiteratureCardProps): React.ReactElement {
  const [showAbstract, setShowAbstract] = useState(false)

  const authorsDisplay = useMemo(() => {
    if (item.authors.length === 0) return '저자 미상'
    if (item.authors.length <= 3) return item.authors.join(', ')
    return `${item.authors.slice(0, 3).join(', ')} 외 ${item.authors.length - 3}명`
  }, [item.authors])

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20">
      {/* 제목 */}
      <div className="mb-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold leading-snug text-foreground hover:text-primary hover:underline"
        >
          {item.title}
          <ExternalLink className="ml-1 inline-block h-3 w-3 align-text-top opacity-50" />
        </a>
      </div>

      {/* 메타 정보 */}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{authorsDisplay}</span>
        {item.journal && (
          <>
            <span className="opacity-40">|</span>
            <span className="italic">{item.journal}</span>
          </>
        )}
        {item.year != null && (
          <>
            <span className="opacity-40">|</span>
            <span>{item.year}</span>
          </>
        )}
        {item.citedByCount != null && item.citedByCount > 0 && (
          <>
            <span className="opacity-40">|</span>
            <span>인용 {item.citedByCount}회</span>
          </>
        )}
      </div>

      {/* 뱃지 행 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={`text-[10px] ${SOURCE_BADGE_COLORS[item.source]}`}>
          {SOURCE_LABELS[item.source]}
        </Badge>
        {item.doi && (
          <a
            href={`https://doi.org/${item.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            DOI
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {item.pdfUrl && (
          <a
            href={item.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            PDF
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {/* GBIF/OBIS 전용 메타 */}
        {item.locality && (
          <span className="text-[10px] text-muted-foreground/70">
            {item.locality}
          </span>
        )}
        {item.basisOfRecord && (
          <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
            {item.basisOfRecord}
          </span>
        )}
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs"
            onClick={() => onSave(item)}
            disabled={isSaved}
          >
            {isSaved
              ? <><Check className="w-3 h-3 mr-1" />저장됨</>
              : <><BookmarkPlus className="w-3 h-3 mr-1" />저장</>
            }
          </Button>
        )}
      </div>

      {/* 초록 (접기/펼치기) */}
      {item.abstract && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowAbstract(prev => !prev)}
            className="text-xs font-medium text-primary/80 hover:text-primary"
          >
            {showAbstract ? '초록 접기' : '초록 보기'}
          </button>
          {showAbstract && (
            <p className="mt-1.5 rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {item.abstract}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

// ── 결과 목록 ──

interface ResultsListProps {
  items: LiteratureItem[]
  sortKey: SortKey
  onSortChange: (key: SortKey) => void
  onSave?: (item: LiteratureItem) => void
  savedIds?: Set<string>
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'year', label: '연도순' },
  { key: 'citations', label: '인용수순' },
  { key: 'source', label: '소스순' },
]

function ResultsList({ items, sortKey, onSortChange, onSave, savedIds }: ResultsListProps): React.ReactElement {
  const sortedItems = useMemo(() => sortItems(items, sortKey), [items, sortKey])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="검색 결과가 없습니다"
        description="다른 키워드나 소스를 선택해 보세요"
        variant="inline"
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* 정렬 + 결과 수 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{items.length}</span>건
          (중복 제거 후)
        </p>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSortChange(opt.key)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                sortKey === opt.key
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 문헌 카드 목록 */}
      <div className="space-y-2">
        {sortedItems.map(item => (
          <LiteratureCard
            key={item.id}
            item={item}
            onSave={onSave}
            isSaved={savedIds?.has(citationKey(item))}
          />
        ))}
      </div>
    </div>
  )
}

// ── API 호출 ──

function buildSearchUrl(
  source: LiteratureSource,
  query: string,
  options: SearchFormOptions,
): string {
  const params = new URLSearchParams({
    source,
    query,
    maxResults: String(MAX_RESULTS_PER_SOURCE),
  })

  if (options.yearFrom != null) params.set('yearFrom', String(options.yearFrom))
  if (options.yearTo != null) params.set('yearTo', String(options.yearTo))
  if (options.includeKoreaKeyword) params.set('includeKoreaKeyword', 'true')
  if (options.keywords.trim()) params.set('keywords', options.keywords.trim())
  if (options.keywordOperator !== 'OR') params.set('keywordOperator', options.keywordOperator)
  if (options.excludeKeywords.trim()) params.set('excludeKeywords', options.excludeKeywords.trim())

  return `/api/literature/search?${params.toString()}`
}

async function fetchSource(
  source: LiteratureSource,
  query: string,
  options: SearchFormOptions,
  signal: AbortSignal,
): Promise<SourceSearchResult> {
  const url = buildSearchUrl(source, query, options)
  const start = performance.now()

  try {
    const res = await fetch(url, { signal })
    const elapsed = (performance.now() - start) / 1000

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { source, items: [], error: text || `HTTP ${res.status}`, elapsed }
    }

    const data: unknown = await res.json()
    if (
      typeof data === 'object' && data !== null &&
      'items' in data && Array.isArray((data as Record<string, unknown>).items)
    ) {
      return {
        source,
        items: (data as { items: LiteratureItem[] }).items,
        elapsed: (data as { elapsed?: number }).elapsed ?? elapsed,
      }
    }

    // error 응답 형태
    if (typeof data === 'object' && data !== null && 'error' in data) {
      return {
        source,
        items: [],
        error: String((data as { error: unknown }).error),
        elapsed,
      }
    }

    return { source, items: [], error: '알 수 없는 응답 형식', elapsed }
  } catch (err: unknown) {
    const elapsed = (performance.now() - start) / 1000
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { source, items: [], error: '검색이 취소되었습니다', elapsed }
    }
    return {
      source,
      items: [],
      error: err instanceof Error ? err.message : '네트워크 오류',
      elapsed,
    }
  }
}

// ── 메인 컴포넌트 ──

export default function LiteratureSearchContent(): React.ReactElement {
  const [sourceStates, setSourceStates] = useState<Record<LiteratureSource, SourceState>>(() => ({
    openalex: createInitialSourceState(),
    pubmed: createInitialSourceState(),
    gbif: createInitialSourceState(),
    obis: createInitialSourceState(),
    nanet: createInitialSourceState(),
  }))
  const [activeSources, setActiveSources] = useState<LiteratureSource[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('year')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)

  // URL에서 project 파라미터 읽기 + 기존 저장 목록 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pid = params.get('project')
    if (!pid) return
    setProjectId(pid)
    listCitationsByProject(pid)
      .then(records => {
        setSavedIds(new Set(records.map(r => citationKey(r.item))))
      })
      .catch(() => {})
  }, [])

  const handleSaveCitation = useCallback(async (item: LiteratureItem) => {
    if (!projectId) return
    const record: CitationRecord = createCitationRecord(projectId, item)
    await saveCitation(record)
    setSavedIds(prev => new Set([...prev, citationKey(item)]))
  }, [projectId])

  // unmount 시 진행 중인 검색 취소
  useEffect(() => {
    return () => { abortControllerRef.current?.abort() }
  }, [])

  // 모든 소스 결과를 합친 후 중복 제거
  const allItems = useMemo(() => {
    const combined: LiteratureItem[] = []
    for (const source of activeSources) {
      combined.push(...sourceStates[source].items)
    }
    return deduplicateItems(combined)
  }, [sourceStates, activeSources])

  const handleSearch = useCallback((
    query: string,
    sources: LiteratureSource[],
    options: SearchFormOptions,
  ) => {
    // 이전 검색 취소
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setActiveSources(sources)
    setIsSearching(true)
    setHasSearched(true)

    // 소스별 상태 초기화
    setSourceStates(prev => {
      const next = { ...prev }
      for (const source of ALL_SOURCES) {
        next[source] = createInitialSourceState()
      }
      for (const source of sources) {
        next[source] = { ...createInitialSourceState(), status: 'loading' }
      }
      return next
    })

    // 각 소스 병렬 fetch
    let completed = 0
    const total = sources.length

    for (const source of sources) {
      fetchSource(source, query, options, controller.signal).then(result => {
        if (controller.signal.aborted) return

        setSourceStates(prev => ({
          ...prev,
          [source]: {
            status: result.error ? 'error' : 'done',
            items: result.items,
            error: result.error ?? null,
            elapsed: result.elapsed,
          },
        }))

        completed++
        if (completed >= total) {
          setIsSearching(false)
        }
      })
    }
  }, [])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsSearching(false)

    // loading 상태인 소스를 error로 전환
    setSourceStates(prev => {
      const next = { ...prev }
      for (const source of activeSources) {
        if (next[source].status === 'loading') {
          next[source] = { ...next[source], status: 'error', error: '검색이 취소되었습니다' }
        }
      }
      return next
    })
  }, [activeSources])

  // 검색 중이거나 완료된 소스가 하나라도 있는지
  const showProgress = activeSources.length > 0 && hasSearched

  return (
    <main className="mx-auto max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">문헌 통합검색</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenAlex, PubMed, GBIF, OBIS, 국회도서관에서 논문과 표본 기록을 통합 검색합니다
        </p>
      </div>

      {/* 검색 폼 */}
      <div className="mb-6 rounded-lg border border-border bg-card p-5">
        <SearchForm
          onSearch={handleSearch}
          isSearching={isSearching}
          onCancel={handleCancel}
        />
      </div>

      {/* 소스별 진행 상태 */}
      {showProgress && (
        <div className="mb-4">
          <SourceProgress sourceStates={sourceStates} activeSources={activeSources} />
        </div>
      )}

      {/* 에러 요약 (에러가 있는 소스만) */}
      {hasSearched && !isSearching && activeSources.some(s => sourceStates[s].status === 'error') && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="mb-1 text-xs font-medium text-destructive">일부 소스에서 오류가 발생했습니다</p>
          {activeSources
            .filter(s => sourceStates[s].status === 'error')
            .map(source => (
              <p key={source} className="text-xs text-destructive/80">
                {SOURCE_LABELS[source]}: {sourceStates[source].error}
              </p>
            ))}
        </div>
      )}

      {/* 프로젝트 인용 추가 모드 배너 */}
      {projectId && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg text-sm mb-4">
          <BookmarkPlus className="w-4 h-4 text-primary" />
          <span>프로젝트 문서에 인용 추가 모드 — 검색 결과에서 <strong>저장</strong>을 클릭하세요.</span>
        </div>
      )}

      {/* 결과 목록 */}
      {hasSearched && (
        <ResultsList
          items={allItems}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onSave={projectId ? handleSaveCitation : undefined}
          savedIds={savedIds}
        />
      )}
    </main>
  )
}
