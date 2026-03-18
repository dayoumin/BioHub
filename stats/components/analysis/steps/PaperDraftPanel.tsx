'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Copy, Loader2, X, Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaperDraft, DiscussionState } from '@/lib/services/paper-draft/paper-types'
import { LangToggle } from '@/components/common/LangToggle'

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
  { id: 'methods',    label: 'Methods'    },
  { id: 'results',    label: 'Results'    },
  { id: 'captions',   label: 'Captions'  },
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

// ── 복사 버튼 훅 ──────────────────────────────────────────────

function useCopyState() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(async (text: string) => {
    await copyRichText(text)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { copied, trigger }
}

// ── 복사 버튼 ────────────────────────────────────────────────

interface CopyButtonProps {
  text: string
  'data-testid': string
  label?: string
  size?: 'sm' | 'default'
  className?: string
}

function CopyButton({ text, 'data-testid': testId, label = '복사', size = 'sm', className }: CopyButtonProps) {
  const { copied, trigger } = useCopyState()

  return (
    <Button
      variant="ghost"
      size={size}
      data-testid={testId}
      className={cn('gap-1.5 text-xs', className)}
      onClick={() => trigger(text)}
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5 text-green-500" />복사됨</>
      ) : (
        <><Copy className="h-3.5 w-3.5" />{label}</>
      )}
    </Button>
  )
}

// ── 섹션 헤더 ────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  copyText?: string
  copyTestId: string
}

function SectionHeader({ title, copyText, copyTestId }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
          APA 7th
        </Badge>
      </div>
      {copyText ? (
        <CopyButton text={copyText} data-testid={copyTestId} />
      ) : null}
    </div>
  )
}

// ── 본문 텍스트 ───────────────────────────────────────────────

function DraftText({ text, className }: { text: string; className?: string }) {
  return (
    <p
      className={cn('text-sm leading-relaxed whitespace-pre-wrap', className)}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
    />
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
  // 사용자가 선택한 언어 (draft.language와 일치하면 로딩 완료)
  const [selectedLang, setSelectedLang] = useState<'ko' | 'en'>(draft.language)
  const isLangLoading = selectedLang !== draft.language

  // draft가 새로 도착하면 selectedLang 동기화
  useEffect(() => {
    setSelectedLang(draft.language)
  }, [draft.language])

  const handleLangChange = useCallback((next: 'ko' | 'en') => {
    if (next === selectedLang) return
    setSelectedLang(next)
    onLanguageChange(next)
  }, [selectedLang, onLanguageChange])

  // 앵커 스크롤 — Radix ScrollArea는 네이티브 href 앵커 미동작
  const handleAnchorClick = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    document.getElementById(`draft-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Captions 전체 복사 텍스트
  const captionsFullText = useMemo(
    () => draft.captions?.map((c) => `${c.label}. ${c.text}`).join('\n\n') ?? '',
    [draft.captions]
  )

  // 전체 복사 텍스트 — discussionState.partial 변경(streaming)으로 불필요한 재계산 방지
  const discussionDoneText = discussionState.status === 'done' ? discussionState.text : ''
  const allText = useMemo(
    () => [
      draft.methods  ? `## Methods\n\n${draft.methods}`   : '',
      draft.results  ? `## Results\n\n${draft.results}`   : '',
      captionsFullText ? `## Captions\n\n${captionsFullText}` : '',
      discussionDoneText ? `## Discussion\n\n${discussionDoneText}` : '',
    ].filter(Boolean).join('\n\n'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.methods, draft.results, captionsFullText, discussionDoneText]
  )

  return (
    <div data-testid="paper-draft-panel" className="flex flex-col h-full">

      {/* 상단 바: 앵커 + 언어 토글 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        {/* 앵커 링크 */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          {SECTIONS.filter(s => {
            if (s.id === 'captions') return (draft.captions?.length ?? 0) > 0
            if (s.id === 'discussion') return true
            return !!draft[s.id as 'methods' | 'results']
          }).map((s, i) => (
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

      {/* 본문 */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className={cn(
            'px-5 py-4 space-y-8 transition-opacity duration-150',
            isLangLoading && 'opacity-40 pointer-events-none'
          )}
        >

          {/* Methods */}
          {draft.methods && (
            <section id="draft-section-methods">
              <SectionHeader
                title="Methods"
                copyText={draft.methods}
                copyTestId="draft-copy-btn-methods"
              />
              <DraftText text={draft.methods} />
              <p className="mt-3 text-[11px] text-muted-foreground border-t pt-2">
                BioHub Statistical Platform (SciPy 1.x / statsmodels 0.x 기반, Python 브라우저 내 실행)
              </p>
            </section>
          )}

          {/* Results */}
          {draft.results && (
            <section id="draft-section-results">
              <SectionHeader
                title="Results"
                copyText={draft.results}
                copyTestId="draft-copy-btn-results"
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
              />
              <div className="space-y-3">
                {draft.captions.map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20"
                  >
                    <p className="text-sm leading-relaxed flex-1">
                      <strong>{cap.label}.</strong>{' '}
                      <span dangerouslySetInnerHTML={{ __html: markdownToHtml(cap.text) }} />
                    </p>
                    <CopyButton
                      text={`${cap.label}. ${cap.text}`}
                      data-testid={`draft-copy-btn-caption-${i}`}
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
            />

            {/* idle */}
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

            {/* streaming */}
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

            {/* cancelling */}
            {discussionState.status === 'cancelling' && (
              <div className="space-y-2">
                <DraftText text={discussionState.partial} className="opacity-60" />
                <p className="text-xs text-muted-foreground">취소 중... 생성된 일부 내용입니다</p>
              </div>
            )}

            {/* done — 재생성 버튼 포함 */}
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

            {/* error */}
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

      {/* 하단 전체 복사 */}
      <div className="px-4 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between">
        <CopyButton
          text={allText}
          data-testid="draft-copy-btn-all"
          label="전체 복사 (Markdown)"
          size="default"
        />
        {!discussionDoneText && discussionState.status !== 'streaming' && (
          <span className="text-[11px] text-muted-foreground/60">
            Discussion 미포함
          </span>
        )}
      </div>
    </div>
  )
}
