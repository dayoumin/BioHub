'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Copy,
  Check,
  Sparkles,
  Square,
  RefreshCw,
  BookOpen,
  AlertCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = 'ko' | 'en'
type SectionId = 'methods' | 'results' | 'captions' | 'discussion'

/** 한/영 양쪽 콘텐츠를 함께 제공. 한 언어만 있을 경우 동일한 값을 넣어도 됨. */
export interface LocalizedText {
  ko: string
  en: string
}

export interface CaptionItem {
  id: string
  label: LocalizedText // e.g. { ko: "표 1", en: "Table 1" }
  text: LocalizedText
}

export interface PaperDraftContent {
  methods: LocalizedText
  methodsCitation?: LocalizedText // BioHub 인용 문구
  results: LocalizedText
  captions: CaptionItem[]
  discussion?: string // Discussion은 AI 생성이므로 단일 언어
}

export interface PaperDraftPanelProps {
  isOpen: boolean
  onClose: () => void
  content: PaperDraftContent
  /** Discussion AI 생성. AbortSignal로 취소, onChunk으로 스트리밍 수신 */
  onGenerateDiscussion: (
    signal: AbortSignal,
    onChunk: (chunk: string) => void,
  ) => Promise<void>
  onRegenerateAll?: () => void
  className?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'methods', label: 'Methods' },
  { id: 'results', label: 'Results' },
  { id: 'captions', label: 'Captions' },
  { id: 'discussion', label: 'Discussion' },
]

const COPY_RESET_MS = 2000

// ─── Hook: 복사 피드백 상태 ───────────────────────────────────────────────────

function useCopyFeedback() {
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set())
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const resetKey = useCallback((key: string, set: 'copied' | 'error') => {
    const timer = setTimeout(() => {
      if (set === 'copied') {
        setCopiedKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } else {
        setErrorKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
      timersRef.current.delete(key)
    }, COPY_RESET_MS)

    const existing = timersRef.current.get(key)
    if (existing !== undefined) clearTimeout(existing)
    timersRef.current.set(key, timer)
  }, [])

  const copy = useCallback(
    async (key: string, text: string) => {
      try {
        // 1차 시도: Clipboard API
        if (navigator.clipboard?.writeText !== undefined) {
          await navigator.clipboard.writeText(text)
        } else {
          // 2차 fallback: execCommand (iframe, HTTP 환경)
          const el = document.createElement('textarea')
          el.value = text
          el.style.position = 'fixed'
          el.style.opacity = '0'
          document.body.appendChild(el)
          el.select()
          const ok = document.execCommand('copy')
          document.body.removeChild(el)
          if (!ok) throw new Error('execCommand failed')
        }
        setCopiedKeys((prev) => new Set(prev).add(key))
        resetKey(key, 'copied')
      } catch {
        setErrorKeys((prev) => new Set(prev).add(key))
        resetKey(key, 'error')
      }
    },
    [resetKey],
  )

  const isCopied = useCallback(
    (key: string) => copiedKeys.has(key),
    [copiedKeys],
  )

  const isCopyError = useCallback(
    (key: string) => errorKeys.has(key),
    [errorKeys],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  return { copy, isCopied, isCopyError }
}

// ─── Sub: CopyButton ─────────────────────────────────────────────────────────

interface CopyButtonProps {
  copyKey: string
  text: string
  label?: string
  size?: 'sm' | 'xs'
  disabled?: boolean
  isCopied: (key: string) => boolean
  isCopyError: (key: string) => boolean
  onCopy: (key: string, text: string) => void
  className?: string
}

function CopyButton({
  copyKey,
  text,
  label,
  size = 'sm',
  disabled = false,
  isCopied,
  isCopyError,
  onCopy,
  className,
}: CopyButtonProps) {
  const copied = isCopied(copyKey)
  const hasError = isCopyError(copyKey)
  const isXs = size === 'xs'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onCopy(copyKey, text)}
      disabled={disabled}
      aria-label={label ?? '복사'}
      className={cn(
        'gap-1 transition-colors duration-150',
        isXs ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2 text-xs',
        copied && 'text-success hover:text-success',
        hasError && 'text-destructive hover:text-destructive',
        !copied && !hasError && 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <Check className={cn(isXs ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            {label !== undefined && <span>복사됨</span>}
          </motion.span>
        ) : hasError ? (
          <motion.span
            key="error"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <AlertCircle className={cn(isXs ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            {label !== undefined && <span>실패</span>}
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <Copy className={cn(isXs ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            {label !== undefined && <span>{label}</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  )
}

// ─── Sub: SectionHeader ───────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  showApaBadge?: boolean
  copyKey?: string
  copyText?: string
  copyLabel?: string
  copyDisabled?: boolean
  isCopied: (key: string) => boolean
  isCopyError: (key: string) => boolean
  onCopy: (key: string, text: string) => void
  extra?: React.ReactNode
}

function SectionHeader({
  title,
  showApaBadge = false,
  copyKey,
  copyText,
  copyLabel = '복사',
  copyDisabled = false,
  isCopied,
  isCopyError,
  onCopy,
  extra,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {showApaBadge && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground/70 bg-muted/60"
        >
          APA 7th
        </Badge>
      )}
      <div className="flex-1" />
      {extra}
      {copyKey !== undefined && copyText !== undefined && (
        <CopyButton
          copyKey={copyKey}
          text={copyText}
          label={copyLabel}
          disabled={copyDisabled}
          isCopied={isCopied}
          isCopyError={isCopyError}
          onCopy={onCopy}
        />
      )}
    </div>
  )
}

// ─── Sub: TextBody ────────────────────────────────────────────────────────────

function TextBody({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-muted/50 border border-border/40 px-4 py-3',
        'text-sm leading-7 text-foreground/90',
        className,
      )}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0 [&_em]:not-italic [&_em]:font-normal">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  )
}

// ─── Sub: CitationFootnote ────────────────────────────────────────────────────

function CitationFootnote({ text }: { text: string }) {
  return (
    <p className="pl-4 text-[11px] text-muted-foreground/60 leading-relaxed border-l-2 border-border/30">
      {text}
    </p>
  )
}

// ─── Sub: CaptionCard ────────────────────────────────────────────────────────

interface CaptionCardProps {
  item: CaptionItem
  lang: Language
  isCopied: (key: string) => boolean
  isCopyError: (key: string) => boolean
  onCopy: (key: string, text: string) => void
}

function CaptionCard({ item, lang, isCopied, isCopyError, onCopy }: CaptionCardProps) {
  const text = item.text[lang]
  const label = item.label[lang]

  return (
    <div className="rounded-lg border border-border/50 bg-card px-3.5 py-3 flex gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
          {label}
        </span>
        <p className="text-[13px] leading-6 text-foreground/85">{text}</p>
      </div>
      <CopyButton
        copyKey={`caption-${item.id}`}
        text={text}
        size="xs"
        isCopied={isCopied}
        isCopyError={isCopyError}
        onCopy={onCopy}
        className="self-start mt-0.5 flex-shrink-0"
      />
    </div>
  )
}

// ─── Sub: DiscussionSection ───────────────────────────────────────────────────

type DiscussionState = 'empty' | 'streaming' | 'partial' | 'complete' | 'error'

interface DiscussionSectionProps {
  text: string
  state: DiscussionState
  errorMessage: string | null
  isCopied: (key: string) => boolean
  isCopyError: (key: string) => boolean
  onCopy: (key: string, text: string) => void
  onGenerate: () => void
  onRegenerate: () => void
  onCancel: () => void
}

function DiscussionSection({
  text,
  state,
  errorMessage,
  isCopied,
  isCopyError,
  onCopy,
  onGenerate,
  onRegenerate,
  onCancel,
}: DiscussionSectionProps) {
  return (
    <div className="space-y-2.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Discussion</h3>
        <div className="flex-1" />

        {/* 복사 버튼 — 텍스트가 있을 때만 */}
        {(state === 'complete' || state === 'partial') && (
          <CopyButton
            copyKey="discussion"
            text={text}
            label="복사"
            isCopied={isCopied}
            isCopyError={isCopyError}
            onCopy={onCopy}
          />
        )}

        {/* 취소 버튼 — 스트리밍 중 */}
        {state === 'streaming' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-7 px-2.5 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <Square className="w-3 h-3 fill-current" />
            취소
          </Button>
        )}

        {/* AI 생성 버튼 — empty / error */}
        {(state === 'empty' || state === 'error') && (
          <Button
            variant="default"
            size="sm"
            onClick={onGenerate}
            className="h-7 px-2.5 text-xs gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            AI 생성
          </Button>
        )}

        {/* 재생성 버튼 — complete / partial */}
        {(state === 'complete' || state === 'partial') && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="h-7 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            재생성
          </Button>
        )}
      </div>

      {/* 본문 */}
      <AnimatePresence mode="wait">
        {/* empty 상태 */}
        {state === 'empty' && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 py-8 px-6 text-center"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <p className="text-[13px] text-muted-foreground/60 leading-relaxed max-w-[240px]">
              AI가 학술 논문 문체로 Discussion을 작성합니다
            </p>
          </motion.div>
        )}

        {/* 에러 상태 */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-2 py-6 px-6 text-center"
          >
            <AlertCircle className="w-5 h-5 text-destructive/60" />
            <p className="text-[13px] text-destructive/70 leading-relaxed">
              {errorMessage ?? '생성 중 오류가 발생했습니다. 다시 시도해 주세요.'}
            </p>
          </motion.div>
        )}

        {/* 스트리밍 / 완료 / 중단 텍스트 */}
        {(state === 'streaming' || state === 'complete' || state === 'partial') && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* 중단 배지 */}
            {state === 'partial' && (
              <div className="flex items-center gap-1.5 mb-2">
                <Badge
                  variant="outline"
                  className="text-[10px] border-warning-border text-warning gap-1 h-5"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  생성 중단됨 — 내용이 불완전할 수 있습니다
                </Badge>
              </div>
            )}

            <div
              className={cn(
                'rounded-lg bg-muted/50 border border-border/40 px-4 py-3',
                'text-sm leading-7 text-foreground/90',
                state === 'partial' && 'border-warning-border/40',
              )}
            >
              <p className="whitespace-pre-wrap">
                {text}
                {state === 'streaming' && (
                  <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom rounded-[1px]" />
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main: PaperDraftPanel ────────────────────────────────────────────────────

export function PaperDraftPanel({
  isOpen,
  onClose,
  content,
  onGenerateDiscussion,
  onRegenerateAll,
}: PaperDraftPanelProps) {
  const [lang, setLang] = useState<Language>('ko')
  const [activeSection, setActiveSection] = useState<SectionId>('methods')
  const [discussionText, setDiscussionText] = useState(content.discussion ?? '')
  const [discussionState, setDiscussionState] = useState<DiscussionState>(
    content.discussion ? 'complete' : 'empty',
  )
  const [discussionError, setDiscussionError] = useState<string | null>(null)

  const { copy, isCopied, isCopyError } = useCopyFeedback()
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Map<SectionId, HTMLElement>>(new Map())

  // ── 탭 클릭 → 섹션 스크롤 ──────────────────────────────────────────────────
  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id)
    const el = sectionRefs.current.get(id)
    const container = scrollRef.current
    if (el == null || container == null) return

    // getBoundingClientRect 기준으로 정확히 계산
    const elTop = el.getBoundingClientRect().top
    const containerTop = container.getBoundingClientRect().top
    const scrollOffset = container.scrollTop + (elTop - containerTop) - 8
    container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
  }, [])

  // ── IntersectionObserver: 현재 보이는 섹션 → 탭 동기화 ──────────────────────
  useEffect(() => {
    if (!isOpen) return
    const container = scrollRef.current
    if (container == null) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).getBoundingClientRect().top -
              (b.target as HTMLElement).getBoundingClientRect().top,
          )
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).dataset[
            'section'
          ] as SectionId
          if (id) setActiveSection(id)
        }
      },
      { root: container, rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    )

    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [isOpen])

  // ── Discussion AI 생성 (공통) ──────────────────────────────────────────────
  const runGenerate = useCallback(async () => {
    if (discussionState === 'streaming') return
    abortRef.current = new AbortController()
    setDiscussionText('')
    setDiscussionError(null)
    setDiscussionState('streaming')

    try {
      await onGenerateDiscussion(abortRef.current.signal, (chunk) => {
        setDiscussionText((prev) => prev + chunk)
      })
      setDiscussionState('complete')
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message === 'AbortError')

      if (isAbort) {
        // 취소: 입력된 텍스트가 있으면 partial, 없으면 empty
        setDiscussionState(
          (prev) => prev, // setter는 함수형으로
        )
        setDiscussionText((currentText) => {
          setDiscussionState(currentText.length > 0 ? 'partial' : 'empty')
          return currentText
        })
      } else {
        const msg =
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
        setDiscussionError(msg)
        setDiscussionState('error')
      }
    }
  }, [discussionState, onGenerateDiscussion])

  const handleCancelDiscussion = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ── 전체 Markdown 복사 ─────────────────────────────────────────────────────
  const buildFullMarkdown = useCallback(() => {
    const parts: string[] = []
    parts.push(`## Methods\n\n${content.methods[lang]}`)
    if (content.methodsCitation) {
      parts.push(`\n> ${content.methodsCitation[lang]}`)
    }
    parts.push(`\n## Results\n\n${content.results[lang]}`)
    if (content.captions.length > 0) {
      parts.push(
        `\n## Captions\n\n` +
          content.captions
            .map((c) => `**${c.label[lang]}**: ${c.text[lang]}`)
            .join('\n\n'),
      )
    }
    if (discussionText && discussionState !== 'empty' && discussionState !== 'error') {
      parts.push(`\n## Discussion\n\n${discussionText}`)
    }
    return parts.join('\n')
  }, [content, lang, discussionText, discussionState])

  // ── section ref 등록 헬퍼 ─────────────────────────────────────────────────
  const registerSection = useCallback(
    (id: SectionId) => (el: HTMLElement | null) => {
      if (el != null) sectionRefs.current.set(id, el)
      else sectionRefs.current.delete(id)
    },
    [],
  )

  const isStreaming = discussionState === 'streaming'

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — 연하게 (분석 결과 참고 가능) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/8"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[560px] flex-col bg-background border-l border-border shadow-2xl"
          >
            {/* ── 헤더 ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  논문 초안
                </span>
              </div>

              {/* 언어 토글 */}
              <div
                className="flex items-center rounded-full bg-muted p-0.5 gap-0.5"
                role="group"
                aria-label="언어 선택"
              >
                {(['ko', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={cn(
                      'px-3 py-0.5 rounded-full text-xs font-medium transition-all duration-150',
                      lang === l
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {l === 'ko' ? '한글' : 'English'}
                  </button>
                ))}
              </div>

              {/* 닫기 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="패널 닫기"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* ── 앵커 탭바 ─────────────────────────────────────────────── */}
            <div
              className="flex-shrink-0 flex items-center px-5 border-b border-border bg-background/95 backdrop-blur-sm"
              role="tablist"
            >
              {SECTIONS.map(({ id, label }) => {
                const isActive = activeSection === id
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => scrollToSection(id)}
                    className={cn(
                      'relative px-3.5 py-2.5 text-xs font-medium transition-colors duration-150',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                    {isActive && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── 스크롤 영역 ───────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              <div className="px-5 py-5">

                {/* Methods */}
                <section
                  ref={registerSection('methods')}
                  data-section="methods"
                  className="pb-6"
                >
                  <div className="space-y-2.5">
                    <SectionHeader
                      title="Methods"
                      showApaBadge
                      copyKey="methods"
                      copyText={content.methods[lang]}
                      copyLabel="복사"
                      isCopied={isCopied}
                      isCopyError={isCopyError}
                      onCopy={copy}
                    />
                    <TextBody text={content.methods[lang]} />
                    {content.methodsCitation != null && (
                      <CitationFootnote text={content.methodsCitation[lang]} />
                    )}
                  </div>
                </section>

                <Separator className="opacity-40" />

                {/* Results */}
                <section
                  ref={registerSection('results')}
                  data-section="results"
                  className="py-6"
                >
                  <div className="space-y-2.5">
                    <SectionHeader
                      title="Results"
                      showApaBadge
                      copyKey="results"
                      copyText={content.results[lang]}
                      copyLabel="복사"
                      isCopied={isCopied}
                      isCopyError={isCopyError}
                      onCopy={copy}
                    />
                    <TextBody text={content.results[lang]} />
                  </div>
                </section>

                <Separator className="opacity-40" />

                {/* Captions */}
                <section
                  ref={registerSection('captions')}
                  data-section="captions"
                  className="py-6"
                >
                  <div className="space-y-2.5">
                    <SectionHeader
                      title="Captions"
                      copyKey="captions-all"
                      copyText={content.captions
                        .map((c) => `${c.label[lang]}: ${c.text[lang]}`)
                        .join('\n\n')}
                      copyLabel="전체 복사"
                      isCopied={isCopied}
                      isCopyError={isCopyError}
                      onCopy={copy}
                    />
                    <div className="space-y-2">
                      {content.captions.map((item) => (
                        <CaptionCard
                          key={item.id}
                          item={item}
                          lang={lang}
                          isCopied={isCopied}
                          isCopyError={isCopyError}
                          onCopy={copy}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                <Separator className="opacity-40" />

                {/* Discussion */}
                <section
                  ref={registerSection('discussion')}
                  data-section="discussion"
                  className="pt-6 pb-24" // 푸터에 가려지지 않도록 충분한 padding
                >
                  <DiscussionSection
                    text={discussionText}
                    state={discussionState}
                    errorMessage={discussionError}
                    isCopied={isCopied}
                    isCopyError={isCopyError}
                    onCopy={copy}
                    onGenerate={runGenerate}
                    onRegenerate={runGenerate}
                    onCancel={handleCancelDiscussion}
                  />
                </section>

              </div>
            </div>

            {/* ── 푸터 ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 border-t border-border bg-background/95">
              <Button
                variant="secondary"
                size="sm"
                disabled={isStreaming}
                onClick={() => copy('all-markdown', buildFullMarkdown())}
                className="h-8 px-3 gap-1.5 text-xs"
              >
                {isCopied('all-markdown') ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    복사됨
                  </>
                ) : isCopyError('all-markdown') ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    실패
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    전체 복사
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      Markdown
                    </span>
                  </>
                )}
              </Button>

              {onRegenerateAll != null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerateAll}
                  disabled={isStreaming}
                  className="h-8 px-3 gap-1.5 text-xs text-muted-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  다시 생성
                </Button>
              )}

              <div className="flex-1" />
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                {lang === 'ko' ? 'KO' : 'EN'} · APA 7th
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
