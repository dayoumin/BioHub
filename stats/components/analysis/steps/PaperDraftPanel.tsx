'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Copy, Loader2, X, Sparkles, RefreshCw, Download, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaperDraft, PaperTable, DiscussionState } from '@/lib/services/paper-draft/paper-types'
import { LangToggle } from '@/components/common/LangToggle'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'

// ── 타입 ─────────────────────────────────────────────────────

interface PaperDraftPanelProps {
  draft: PaperDraft
  discussionState: DiscussionState
  onGenerateDiscussion: () => void
  onCancelDiscussion: () => void
  onLanguageChange: (lang: 'ko' | 'en') => void
}

// ── 섹션 정의 ─────────────────────────────────────────────────

const SECTIONS = [
  { id: 'tables',     label: '통계표' },
  { id: 'chart',      label: '그래프' },
  { id: 'methods',    label: 'Methods' },
  { id: 'results',    label: 'Results' },
  { id: 'captions',   label: 'Captions' },
  { id: 'discussion', label: 'Discussion' },
] as const

// ── HTML clipboard 변환 ───────────────────────────────────────

/** HTML 이스케이프 후 *text* → <em>, **text** → <strong> */
export function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

async function copyRichText(text: string): Promise<void> {
  if (!text) return
  const html = markdownToHtml(text)
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  } catch {
    await navigator.clipboard.writeText(text)
  }
}

async function copyHtmlDirect(html: string, plain: string): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
  } catch {
    await navigator.clipboard.writeText(plain)
  }
}

// ── 파일 다운로드 헬퍼 ────────────────────────────────────────

function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── 복사 버튼 훅 ──────────────────────────────────────────────

function useCopyState() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(async (text: string, sectionName?: string) => {
    await copyRichText(text)
    setCopied(true)
    if (sectionName) toast.success(TOAST.clipboard.sectionCopied(sectionName))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  const triggerHtml = useCallback(async (html: string, plain: string, sectionName?: string) => {
    await copyHtmlDirect(html, plain)
    setCopied(true)
    if (sectionName) toast.success(TOAST.clipboard.sectionCopied(sectionName))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { copied, trigger, triggerHtml }
}

// ── 복사 버튼 ────────────────────────────────────────────────

interface CopyButtonProps {
  text: string
  'data-testid': string
  label?: string
  size?: 'sm' | 'default'
  className?: string
  sectionName?: string
}

function CopyButton({ text, 'data-testid': testId, label = '복사', size = 'sm', className, sectionName }: CopyButtonProps) {
  const { copied, trigger } = useCopyState()

  return (
    <Button
      variant="ghost"
      size={size}
      data-testid={testId}
      className={cn('gap-1.5 text-xs', className)}
      onClick={() => trigger(text, sectionName)}
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5 text-green-500" />복사됨</>
      ) : (
        <><Copy className="h-3.5 w-3.5" />{label}</>
      )}
    </Button>
  )
}

// ── HTML 복사 버튼 (테이블용) ──────────────────────────────────

interface HtmlCopyButtonProps {
  html: string
  plain: string
  'data-testid': string
  sectionName?: string
}

function HtmlCopyButton({ html, plain, 'data-testid': testId, sectionName }: HtmlCopyButtonProps) {
  const { copied, triggerHtml } = useCopyState()

  return (
    <Button
      variant="ghost"
      size="sm"
      data-testid={testId}
      className="gap-1.5 text-xs"
      onClick={() => triggerHtml(html, plain, sectionName)}
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5 text-green-500" />복사됨</>
      ) : (
        <><Copy className="h-3.5 w-3.5" />복사</>
      )}
    </Button>
  )
}

// ── 섹션 헤더 ────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  badge?: string
  copyText?: string
  copyTestId: string
  /** HTML 복사 모드 (테이블용) */
  htmlCopy?: { html: string; plain: string }
  onSave?: () => void
  sectionName?: string
}

function SectionHeader({ title, badge, copyText, copyTestId, htmlCopy, onSave, sectionName }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {htmlCopy ? (
          <HtmlCopyButton html={htmlCopy.html} plain={htmlCopy.plain} data-testid={copyTestId} sectionName={sectionName} />
        ) : copyText ? (
          <CopyButton text={copyText} data-testid={copyTestId} sectionName={sectionName} />
        ) : null}
        {onSave && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onSave}>
            <Download className="h-3.5 w-3.5" />저장
          </Button>
        )}
      </div>
    </div>
  )
}

// ── 본문 텍스트 (워드 스타일) ─────────────────────────────────

function DraftText({ text, className }: { text: string; className?: string }) {
  return (
    <p
      className={cn(
        'text-sm leading-[1.8] whitespace-pre-wrap',
        'text-foreground/90',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
    />
  )
}

// ── 통계표 렌더러 ─────────────────────────────────────────────

function TableRenderer({ table }: { table: PaperTable }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="[&_table]:w-full [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs [&_td]:text-xs [&_caption]:text-left [&_caption]:font-semibold [&_caption]:text-xs [&_caption]:mb-2"
        // htmlContent is pre-sanitized via escapeHtml in paper-tables.ts
        dangerouslySetInnerHTML={{ __html: table.htmlContent }}
      />
    </div>
  )
}

// ── 차트 이미지 렌더러 ────────────────────────────────────────

function ChartImageSection({ imageUrl }: { imageUrl: string }) {
  const handleSave = useCallback(() => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = 'analysis-chart.png'
    a.click()
  }, [imageUrl])

  return (
    <div className="space-y-2">
      <img
        src={imageUrl}
        alt="분석 차트 이미지"
        className="w-full rounded border bg-card"
      />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleSave}>
          <Download className="h-3.5 w-3.5" />PNG 저장
        </Button>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export function PaperDraftPanel({
  draft,
  discussionState,
  onGenerateDiscussion,
  onCancelDiscussion,
  onLanguageChange,
}: PaperDraftPanelProps) {
  const [selectedLang, setSelectedLang] = useState<'ko' | 'en'>(draft.language)
  const isLangLoading = selectedLang !== draft.language

  useEffect(() => {
    setSelectedLang(draft.language)
  }, [draft.language])

  const handleLangChange = useCallback((next: 'ko' | 'en') => {
    if (next === selectedLang) return
    setSelectedLang(next)
    onLanguageChange(next)
  }, [selectedLang, onLanguageChange])

  const handleAnchorClick = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    document.getElementById(`draft-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 전체 복사용 텍스트
  const captionsFullText = useMemo(
    () => draft.captions?.map((c) => `${c.label}. ${c.text}`).join('\n\n') ?? '',
    [draft.captions]
  )

  const tablesFullText = useMemo(
    () => draft.tables?.map(t => `${t.title}\n${t.plainText}`).join('\n\n') ?? '',
    [draft.tables]
  )

  const tablesFullHtml = useMemo(
    () => draft.tables?.map(t => t.htmlContent).join('<br/><br/>') ?? '',
    [draft.tables]
  )

  const discussionDoneText = discussionState.status === 'done' ? discussionState.text : ''

  const allText = useMemo(
    () => [
      tablesFullText ? `## 통계표\n\n${tablesFullText}` : '',
      draft.methods  ? `## Methods\n\n${draft.methods}` : '',
      draft.results  ? `## Results\n\n${draft.results}` : '',
      captionsFullText ? `## Captions\n\n${captionsFullText}` : '',
      discussionDoneText ? `## Discussion\n\n${discussionDoneText}` : '',
    ].filter(Boolean).join('\n\n'),
     
    [tablesFullText, draft.methods, draft.results, captionsFullText, discussionDoneText]
  )

  // 전체 저장 핸들러
  const handleSaveAll = useCallback(() => {
    downloadTextFile(allText, `결과정리_${new Date().toISOString().slice(0, 10)}.txt`)
    toast.success(TOAST.paperDraft.allSaved)
  }, [allText])

  // 가시적 섹션 필터
  const visibleSections = useMemo(() => {
    return SECTIONS.filter(s => {
      if (s.id === 'tables') return (draft.tables?.length ?? 0) > 0
      if (s.id === 'chart') return !!draft.chartImageUrl
      if (s.id === 'captions') return (draft.captions?.length ?? 0) > 0
      if (s.id === 'discussion') return true
      return !!draft[s.id as 'methods' | 'results']
    })
  }, [draft])

  return (
    <div data-testid="paper-draft-panel" className="flex flex-col h-full">

      {/* 상단 바: 앵커 + 언어 토글 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          {visibleSections.map((s, i) => (
            <span key={s.id} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-muted-foreground/30 select-none">·</span>}
              <a
                href={`#draft-section-${s.id}`}
                className="hover:text-foreground transition-colors px-1 py-0.5 rounded whitespace-nowrap"
                onClick={(e) => handleAnchorClick(e, s.id)}
              >
                {s.label}
              </a>
            </span>
          ))}
        </nav>

        <LangToggle value={selectedLang} onChange={handleLangChange} loading={isLangLoading} />
      </div>

      {/* 본문 — 워드 문서 스타일 */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className={cn(
            'px-6 py-6 space-y-8 transition-opacity duration-150',
            'bg-card',
            'mx-auto',
            isLangLoading && 'opacity-40 pointer-events-none',
          )}
          style={{ fontFamily: "'Times New Roman', 'Batang', serif" }}
        >

          {/* 통계표 */}
          {draft.tables && draft.tables.length > 0 && (
            <section id="draft-section-tables">
              <SectionHeader
                title="통계표"
                htmlCopy={{ html: tablesFullHtml, plain: tablesFullText }}
                copyTestId="draft-copy-btn-tables"
                sectionName="통계표"
                onSave={() => {
                  downloadTextFile(tablesFullText, '통계표.tsv')
                  toast.success(TOAST.paperDraft.tablesSaved)
                }}
              />
              <div className="space-y-6">
                {draft.tables.map((table) => (
                  <div key={table.id} className="space-y-2">
                    <TableRenderer table={table} />
                    <div className="flex gap-1">
                      <HtmlCopyButton
                        html={table.htmlContent}
                        plain={table.plainText}
                        data-testid={`draft-copy-btn-table-${table.id}`}
                        sectionName={table.title}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 차트 이미지 */}
          {draft.chartImageUrl && (
            <section id="draft-section-chart">
              <SectionHeader
                title="그래프"
                copyTestId="draft-copy-btn-chart"
                sectionName="그래프"
              />
              <ChartImageSection imageUrl={draft.chartImageUrl} />
            </section>
          )}

          {/* Methods */}
          {draft.methods && (
            <section id="draft-section-methods">
              <SectionHeader
                title="Methods"
                badge="APA 7th"
                copyText={draft.methods}
                copyTestId="draft-copy-btn-methods"
                sectionName="Methods"
                onSave={() => {
                  downloadTextFile(draft.methods ?? '', 'methods.txt')
                  toast.success(TOAST.paperDraft.methodsSaved)
                }}
              />
              <DraftText text={draft.methods} />
              <p className="mt-3 text-[11px] text-muted-foreground border-t pt-2" style={{ fontFamily: 'inherit' }}>
                BioHub Statistical Platform (SciPy 1.x / statsmodels 0.x 기반, Python 브라우저 내 실행)
              </p>
            </section>
          )}

          {/* Results */}
          {draft.results && (
            <section id="draft-section-results">
              <SectionHeader
                title="Results"
                badge="APA 7th"
                copyText={draft.results}
                copyTestId="draft-copy-btn-results"
                sectionName="Results"
                onSave={() => {
                  downloadTextFile(draft.results ?? '', 'results.txt')
                  toast.success(TOAST.paperDraft.resultsSaved)
                }}
              />
              <DraftText text={draft.results} />
            </section>
          )}

          {/* Captions */}
          {draft.captions && draft.captions.length > 0 && (
            <section id="draft-section-captions">
              <SectionHeader
                title="Captions"
                copyText={captionsFullText}
                copyTestId="draft-copy-btn-captions"
                sectionName="Captions"
              />
              <div className="space-y-3">
                {draft.captions.map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20"
                  >
                    <p className="text-sm leading-relaxed flex-1" style={{ fontFamily: 'inherit' }}>
                      <strong>{cap.label}.</strong>{' '}
                      <span dangerouslySetInnerHTML={{ __html: markdownToHtml(cap.text) }} />
                    </p>
                    <CopyButton
                      text={`${cap.label}. ${cap.text}`}
                      data-testid={`draft-copy-btn-caption-${i}`}
                      sectionName={cap.label}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Discussion */}
          <section id="draft-section-discussion">
            <SectionHeader
              title="Discussion"
              copyText={discussionState.status === 'done' ? discussionState.text : undefined}
              copyTestId="draft-copy-btn-discussion"
              sectionName="Discussion"
            />

            {discussionState.status === 'idle' && (
              <div className="flex flex-col items-start gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  data-testid="draft-discussion-btn"
                  onClick={onGenerateDiscussion}
                  disabled
                  aria-label="AI 생성 (준비 중)"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 생성
                </Button>
                <p className="text-xs text-muted-foreground">
                  기존 AI 해석을 학술 논문 문체로 변환합니다 <span className="text-muted-foreground/60">(준비 중)</span>
                </p>
              </div>
            )}

            {discussionState.status === 'streaming' && (
              <div className="space-y-3">
                <DraftText text={discussionState.partial} />
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">생성 중...</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs ml-1"
                    onClick={onCancelDiscussion}
                  >
                    <X className="h-3 w-3" />
                    취소
                  </Button>
                </div>
              </div>
            )}

            {discussionState.status === 'cancelling' && (
              <div className="space-y-2">
                <DraftText text={discussionState.partial} className="opacity-60" />
                <p className="text-xs text-muted-foreground">취소 중... 생성된 일부 내용입니다</p>
              </div>
            )}

            {discussionState.status === 'done' && (
              <div className="space-y-3">
                <DraftText text={discussionState.text} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="draft-discussion-btn"
                  onClick={onGenerateDiscussion}
                >
                  <RefreshCw className="h-3 w-3" />
                  다시 생성
                </Button>
              </div>
            )}

            {discussionState.status === 'error' && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{discussionState.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  data-testid="draft-discussion-btn"
                  onClick={onGenerateDiscussion}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  다시 시도
                </Button>
              </div>
            )}
          </section>

        </div>
      </ScrollArea>

      {/* 하단 액션 바 */}
      <div className="px-4 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CopyButton
            text={allText}
            data-testid="draft-copy-btn-all"
            label="전체 복사"
            size="default"
            sectionName="전체"
          />
          <Button variant="ghost" size="default" className="gap-1.5 text-xs" onClick={handleSaveAll}>
            <FileText className="h-3.5 w-3.5" />
            전체 저장
          </Button>
        </div>
        {!discussionDoneText && discussionState.status !== 'streaming' && (
          <span className="text-[11px] text-muted-foreground/60">
            Discussion 미포함
          </span>
        )}
      </div>
    </div>
  )
}
