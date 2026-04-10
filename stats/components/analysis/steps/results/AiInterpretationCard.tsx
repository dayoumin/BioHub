'use client'

import { type ReactNode, type RefObject, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, AlertCircle, AlertTriangle, ArrowRight, ChevronDown, List } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { proseBase } from '@/components/common/card-styles'
import { AI_ACCENT } from '@/lib/design-tokens'
import { parseDetailSections, type InterpretationSection, type SectionCategory } from '@/lib/services'
import { getSectionIcon } from './ai-section-config'
import type { TerminologyDictionary } from '@/lib/terminology'

// ============================================
// 타입
// ============================================

interface ParsedInterpretation {
  summary: string
  detail: string | null
}

interface AiInterpretationCardProps {
  parsedInterpretation: ParsedInterpretation | null
  isInterpreting: boolean
  interpretationModel: string | null | undefined
  interpretError: string | null
  /** 재시도 횟수 소진 — true이면 retry 대신 안내 메시지 표시 */
  isRetryExhausted?: boolean
  prefersReducedMotion: boolean
  onReinterpret: () => void
  containerRef: RefObject<HTMLDivElement | null>
  /** 결과 Phase (0~4) — Phase 1부터 스켈레톤 표시 */
  phase?: number
  t: TerminologyDictionary
  footerAction?: ReactNode
}

// ============================================
// 스트리밍 커서
// ============================================

function StreamingCursor(): React.ReactElement {
  return <span className={cn('inline-block w-1.5 h-4 animate-pulse ml-0.5 align-text-bottom', AI_ACCENT.cursor)} />
}

// ============================================
// Summary 블록 (memo — detail 스트리밍 중 summary 안정 후 재렌더 방지)
// ============================================

const SummaryBlock = memo(function SummaryBlock({
  summary,
  showCursor,
}: {
  summary: string
  showCursor: boolean
}): React.ReactElement {
  return (
    <div className={cn(AI_ACCENT.surfaceStrong, 'rounded-lg px-5 py-4')}>
      <div className={cn(proseBase, 'max-w-[78ch] text-sm leading-7')}>
        <ReactMarkdown>{summary}</ReactMarkdown>
        {showCursor && <StreamingCursor />}
      </div>
    </div>
  )
})

// ============================================
// 섹션 pill 버튼
// ============================================

function SectionPill({
  section,
  isActive,
  onSelect,
  prefersReducedMotion,
}: {
  section: InterpretationSection
  isActive: boolean
  onSelect: (key: string) => void
  prefersReducedMotion: boolean
}): React.ReactElement {
  const Icon = getSectionIcon(section.key)
  const handleClick = useCallback(() => onSelect(section.key), [onSelect, section.key])

  return (
    <motion.button
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'transition-all duration-150',
        isActive
          ? cn(AI_ACCENT.pillActiveBg, AI_ACCENT.label, 'shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]')
          : 'bg-surface-container/60 text-muted-foreground hover:bg-surface-container-high/60',
      )}
    >
      <Icon className="w-3 h-3" />
      {section.shortLabel}
    </motion.button>
  )
}

// ============================================
// 개별 섹션 콘텐츠 렌더링
// ============================================

function SectionContent({
  section,
}: {
  section: InterpretationSection
}): React.ReactElement {
  const Icon = getSectionIcon(section.key)

  return (
    <div className="flex items-start gap-2.5 py-3.5">
      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {section.label}
        </span>
        <div className={cn(proseBase, 'mt-1 max-w-[76ch] text-sm leading-7')}>
          <ReactMarkdown>{section.content}</ReactMarkdown>
          {section.isStreaming && <StreamingCursor />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 주의사항 callout (Warning 스타일)
// ============================================

function WarningCallout({
  section,
  prefersReducedMotion,
}: {
  section: InterpretationSection
  prefersReducedMotion: boolean
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const isLong = section.content.length > 120

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
      className="rounded-lg border-0 bg-warning-bg/40 p-4"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-warning uppercase tracking-wider">
            {section.label}
          </span>
          <div className={cn(
            proseBase,
            'text-sm leading-relaxed mt-0.5',
            !expanded && isLong && 'overflow-hidden max-h-[3.5em]',
          )}>
            <ReactMarkdown>{section.content}</ReactMarkdown>
            {section.isStreaming && <StreamingCursor />}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              className="text-xs text-warning/80 hover:text-warning mt-1 flex items-center gap-0.5"
            >
              <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// 추가 분석 제안 CTA
// ============================================

function ActionCallout({
  section,
  prefersReducedMotion,
}: {
  section: InterpretationSection
  prefersReducedMotion: boolean
}): React.ReactElement {
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
      className={cn('rounded-lg border-0 p-4', AI_ACCENT.surface)}
    >
      <div className="flex items-start gap-2">
        <ArrowRight className={cn('w-4 h-4 flex-shrink-0 mt-0.5', AI_ACCENT.icon)} />
        <div className="flex-1 min-w-0">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', AI_ACCENT.labelSecondary)}>
            {section.label}
          </span>
          <div className={cn(proseBase, 'text-sm leading-relaxed mt-0.5')}>
            <ReactMarkdown>{section.content}</ReactMarkdown>
            {section.isStreaming && <StreamingCursor />}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// 메인 컴포넌트
// ============================================

export function AiInterpretationCard({
  parsedInterpretation,
  isInterpreting,
  interpretationModel,
  interpretError,
  isRetryExhausted = false,
  prefersReducedMotion,
  onReinterpret,
  containerRef,
  phase = 4,
  t,
  footerAction,
}: AiInterpretationCardProps): React.ReactElement {
  // 상세 섹션 파싱
  const sections = useMemo(
    () => parseDetailSections(parsedInterpretation?.detail ?? null, isInterpreting),
    [parsedInterpretation?.detail, isInterpreting],
  )

  // 카테고리별 분류 (single-pass)
  const { detail: detailSections, warning: warningSections, action: actionSections } = useMemo(() => {
    const grouped: Record<SectionCategory, InterpretationSection[]> = { detail: [], warning: [], action: [] }
    for (const s of sections) grouped[s.category].push(s)
    return grouped
  }, [sections])

  // pill 탐색 상태
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  // 사용자가 pill/전체보기를 직접 조작했으면 자동 선택을 억제
  const userInteracted = useRef(false)
  const prevDetailRef = useRef<string | null>(null)

  // detail 변경 또는 스트리밍 완료 시 pill 자동 선택
  const detail = parsedInterpretation?.detail ?? null
  useEffect(() => {
    // detail 변경 여부를 먼저 판정 — 스트리밍 중에도 추적해야
    // 완료 시점에 "동일 detail" 판정이 올바르게 동작함
    const detailChanged = prevDetailRef.current !== detail
    prevDetailRef.current = detail

    if (isInterpreting) return // 스트리밍 중에는 UI 건드리지 않음

    // detail이 바뀐 경우(히스토리 전환·재해석 완료)만 userInteracted 리셋
    // 스트리밍 완료(isInterpreting만 변경, detail 동일)에서는 사용자 선택 유지
    if (detailChanged) {
      userInteracted.current = false
    }

    if (userInteracted.current) return // 사용자가 직접 선택 → 유지

    if (detailSections.length > 0) {
      setActiveSection(detailSections[0].key)
    } else {
      setActiveSection(null)
    }
    setShowAll(false)
  }, [detail, isInterpreting]) // eslint-disable-line react-hooks/exhaustive-deps -- detailSections는 detail에서 파생

  // 선택된 섹션 찾기
  const selectedSection = useMemo(
    () => activeSection ? detailSections.find(s => s.key === activeSection) ?? null : null,
    [activeSection, detailSections],
  )

  const handlePillClick = useCallback((key: string): void => {
    userInteracted.current = true
    setActiveSection(prev => prev === key ? null : key)
    setShowAll(false)
  }, [])

  const handleShowAll = useCallback((): void => {
    userInteracted.current = true
    setShowAll(prev => !prev)
    setActiveSection(null)
  }, [])

  // 섹션이 없고 detail이 있으면 plain markdown fallback
  const hasSections = sections.length > 0
  const hasDetail = !!parsedInterpretation?.detail

  return (
    <div className="space-y-2" data-testid="ai-interpretation-section" ref={containerRef}>
      <AnimatePresence mode="wait">
        {/* === 스켈레톤: Phase 1+ & 아직 스트리밍 시작 전 === */}
        {(phase >= 1 && !prefersReducedMotion) && !isInterpreting && !parsedInterpretation && !interpretError && (
          <motion.div
            key="ai-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Card className="border border-border/40 bg-surface-container-lowest">
              <CardContent className="py-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', AI_ACCENT.iconBgSubtle)}>
                    <Sparkles className={cn('w-4 h-4 animate-pulse', AI_ACCENT.icon)} />
                  </div>
                  <span className="text-sm text-muted-foreground/50 font-medium">{t.results.ai.loading}</span>
                </div>
                <div className="space-y-2 pl-11">
                  <Skeleton className="h-3 w-3/4 bg-surface-container-high/40" />
                  <Skeleton className="h-3 w-1/2 bg-surface-container-high/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* === 로딩 상태 === */}
        {isInterpreting && !parsedInterpretation && (
          <motion.div
            key="ai-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Card className="border border-border/40 bg-surface-container-lowest">
              <CardContent className="py-5 flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', AI_ACCENT.iconBg)}>
                  <Sparkles className={cn('w-4 h-4 animate-pulse', AI_ACCENT.icon)} />
                </div>
                <span className={cn('text-sm font-medium', AI_ACCENT.label)}>{t.results.ai.loading}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* === 콘텐츠 === */}
        {parsedInterpretation && (
          <motion.div
            key="ai-content"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Card className="border border-border/40 bg-surface-container-lowest">
              {/* --- Header --- */}
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', AI_ACCENT.iconBg)}>
                      <Sparkles className={cn('w-3.5 h-3.5', AI_ACCENT.icon)} />
                    </div>
                    <span className={cn('text-sm font-semibold', AI_ACCENT.label)}>{t.results.ai.label}</span>
                    {interpretationModel && interpretationModel !== 'unknown' && (
                      <span className="text-[10px] text-muted-foreground/40 font-mono hidden sm:inline">{interpretationModel}</span>
                    )}
                  </div>
                  {!isInterpreting && (
                    <Button variant="outline" size="sm" onClick={onReinterpret} className="text-xs h-7 px-2 gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {t.results.ai.reinterpret}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3.5 px-5 pb-4 pt-2">
                {/* --- 1. Summary Hero --- */}
                <SummaryBlock
                  summary={parsedInterpretation.summary}
                  showCursor={isInterpreting && !hasDetail}
                />

                {/* --- 2. Section Pills --- */}
                {detailSections.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {detailSections.map(section => (
                      <SectionPill
                        key={section.key}
                        section={section}
                        isActive={activeSection === section.key}
                        onSelect={handlePillClick}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShowAll}
                      aria-expanded={showAll}
                      className={cn(
                        'ml-auto h-6 gap-1 px-2 text-xs',
                        showAll && AI_ACCENT.labelSecondary,
                      )}
                    >
                      <List className="w-3 h-3" />
                      {showAll ? '접기' : '전체 보기'}
                    </Button>
                  </div>
                )}

                {/* --- 3. Selected Section Content --- */}
                <AnimatePresence mode="wait">
                  {selectedSection && !showAll && (
                    <motion.div
                      key={selectedSection.key}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="rounded-lg bg-surface-container/35 px-4"
                    >
                      <SectionContent section={selectedSection} />
                    </motion.div>
                  )}

                  {showAll && (
                    <motion.div
                      key="show-all"
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg bg-surface-container/35 px-4 divide-y divide-surface-container-high/60"
                    >
                      {detailSections.map(section => (
                        <SectionContent key={section.key} section={section} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* --- Fallback: 볼드 소제목 없는 상세 텍스트 --- */}
                {hasDetail && !hasSections && (
                  <div className={cn(proseBase, 'max-w-[78ch] rounded-lg bg-surface-container/30 p-4 text-sm leading-7')}>
                    <ReactMarkdown>{parsedInterpretation.detail}</ReactMarkdown>
                    {isInterpreting && <StreamingCursor />}
                  </div>
                )}

                {/* --- 4. 주의사항 (Warning) --- */}
                {warningSections.map(section => (
                  <WarningCallout key={section.key} section={section} prefersReducedMotion={prefersReducedMotion} />
                ))}

                {/* --- 5. 추가 분석 제안 (CTA) --- */}
                {actionSections.map(section => (
                  <ActionCallout key={section.key} section={section} prefersReducedMotion={prefersReducedMotion} />
                ))}

                {footerAction && (
                  <div className="pt-1">
                    {footerAction}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === 에러 상태 === */}
      {interpretError && (
        isRetryExhausted ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t.results.ai.retryExhausted}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {interpretError}
              <Button variant="ghost" size="sm" onClick={onReinterpret} className="ml-2 text-xs h-6 px-2">
                {t.results.ai.retry}
              </Button>
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  )
}
