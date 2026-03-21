'use client'

import { type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CollapsibleSection } from '@/components/analysis/common'
import { proseBase } from '@/components/common/card-styles'
import type { TerminologyDictionary } from '@/lib/terminology/terminology-types'

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
  detailedInterpretOpen: boolean
  onDetailedInterpretOpenChange: (open: boolean) => void
  onReinterpret: () => void
  containerRef: RefObject<HTMLDivElement | null>
  t: TerminologyDictionary
}

export function AiInterpretationCard({
  parsedInterpretation,
  isInterpreting,
  interpretationModel,
  interpretError,
  isRetryExhausted = false,
  prefersReducedMotion,
  detailedInterpretOpen,
  onDetailedInterpretOpenChange,
  onReinterpret,
  containerRef,
  t,
}: AiInterpretationCardProps) {
  return (
    <div className="space-y-2" data-testid="ai-interpretation-section" ref={containerRef}>
      <AnimatePresence mode="wait">
        {isInterpreting && !parsedInterpretation && (
          <motion.div
            key="ai-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-violet-200 dark:border-violet-800/50">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                </div>
                <span className="text-sm text-violet-700 dark:text-violet-300 font-medium">{t.results.ai.loading}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {parsedInterpretation && (
          <motion.div
            key="ai-content"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Card className="border-violet-200 dark:border-violet-800/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t.results.ai.label}</span>
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
              <CardContent className="pt-2 pb-4 px-4 space-y-2">
                <div className={cn(proseBase, 'text-sm leading-relaxed')}>
                  <ReactMarkdown>{parsedInterpretation.summary}</ReactMarkdown>
                  {isInterpreting && (
                    <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
                {parsedInterpretation.detail && (
                  <CollapsibleSection
                    label={t.results.ai.detailedLabel}
                    open={detailedInterpretOpen}
                    onOpenChange={onDetailedInterpretOpenChange}
                    contentClassName="pt-2"
                    icon={<Sparkles className="h-3.5 w-3.5 text-violet-400" />}
                  >
                    <div className={cn(proseBase, 'text-sm leading-relaxed border-t border-border/10 pt-3')}>
                      <ReactMarkdown>{parsedInterpretation.detail}</ReactMarkdown>
                    </div>
                  </CollapsibleSection>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
