'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Send, X, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { logger } from '@/lib/utils/logger'
import { llmRecommender } from '@/lib/services/llm-recommender'
import type { AIRecommendation } from '@/types/smart-flow'
import { useTerminology } from '@/hooks/use-terminology'

interface AIRecommendationSectionProps {
    onRecommendationSelect: (rec: AIRecommendation) => void
    disabled?: boolean
}

export function AIRecommendationSection({
    onRecommendationSelect,
    disabled
}: AIRecommendationSectionProps) {
    const t = useTerminology()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [responseText, setResponseText] = useState<string | null>(null)
    const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value)
    }

    const handleClearSearch = () => {
        setInputValue('')
        setResponseText(null)
        setRecommendation(null)
        setErrorMessage(null)
    }

    const handleSubmit = async () => {
        if (!inputValue.trim() || isLoading) return

        setIsLoading(true)
        setResponseText(null)
        setRecommendation(null)
        setErrorMessage(null)

        try {
            const { recommendation: aiRec, responseText: aiText } =
                await llmRecommender.recommendFromNaturalLanguage(inputValue, null, null, null)

            if (aiText) setResponseText(aiText)
            if (aiRec) {
                setRecommendation(aiRec)
            }
        } catch (error) {
            logger.error('[AISection] Error', { error })
            setErrorMessage('추천에 실패했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (inputValue.trim() && !isLoading) {
                handleSubmit()
            }
        }
    }

    return (
        <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-foreground/90">{t.hub.aiSearch.title}</h3>
                    <p className="text-[11px] text-muted-foreground/70">
                        {t.hub.aiSearch.description}
                    </p>
                </div>
            </div>

            <div className="relative">
                <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={t.hub.aiSearch.placeholder}
                    className="min-h-[60px] resize-none pr-24 text-sm border-white/50 bg-white/50 focus:bg-white focus:border-primary/30 transition-all rounded-lg shadow-inner"
                    disabled={isLoading || disabled}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                    {inputValue && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                            onClick={handleClearSearch}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs shadow-sm"
                        onClick={handleSubmit}
                        disabled={isLoading || !inputValue.trim() || disabled}
                    >
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                {t.hub.aiSearch.sendButton}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Error feedback */}
            {errorMessage && (
                <p className="mt-3 text-xs text-destructive">
                    {errorMessage}
                </p>
            )}

            <AnimatePresence>
                {recommendation && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-5 space-y-3"
                    >
                        {responseText && (
                            <div className="bg-primary/5 rounded-lg px-4 py-3 border border-primary/10">
                                <div className="flex items-start gap-2.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                        {responseText}
                                    </p>
                                </div>
                            </div>
                        )}

                        {recommendation.method && (
                            <Button
                                className="w-full justify-between group"
                                variant="outline"
                                onClick={() => onRecommendationSelect(recommendation)}
                            >
                                <span>{recommendation.method.name} 분석 시작하기</span>
                                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
