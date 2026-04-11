'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Send, Loader2, ArrowUpFromLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import { useTerminology } from '@/hooks/use-terminology'

interface ChatInputProps {
  onSubmit: (message: string) => void
  isProcessing: boolean
  prefillValue?: string
  onPrefillValueConsumed?: () => void
  submitValue?: string
  onSubmitValueConsumed?: () => void
  externalValue?: string
  onExternalValueConsumed?: () => void
  onUploadClick?: () => void
  onFileSelected?: (file: File) => void
}

export function ChatInput({
  onSubmit,
  isProcessing,
  prefillValue,
  onPrefillValueConsumed,
  submitValue,
  onSubmitValueConsumed,
  externalValue,
  onExternalValueConsumed,
  onUploadClick,
  onFileSelected,
}: ChatInputProps) {
  const t = useTerminology()
  const [value, setValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  const onPrefillConsumedRef = useRef(onPrefillValueConsumed)
  onPrefillConsumedRef.current = onPrefillValueConsumed

  const onExternalValueConsumedRef = useRef(onExternalValueConsumed)
  onExternalValueConsumedRef.current = onExternalValueConsumed

  const onSubmitConsumedRef = useRef(onSubmitValueConsumed)
  onSubmitConsumedRef.current = onSubmitValueConsumed

  useEffect(() => {
    if (prefillValue) {
      setValue(prefillValue)
      onPrefillConsumedRef.current?.()
    }
  }, [prefillValue])

  useEffect(() => {
    if (externalValue) {
      setValue(externalValue)
      onExternalValueConsumedRef.current?.()
    }
  }, [externalValue])

  useEffect(() => {
    if (submitValue && !isProcessing) {
      onSubmitRef.current(submitValue)
      setValue('')
      onSubmitConsumedRef.current?.()
    }
  }, [isProcessing, submitValue])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isProcessing) return
    onSubmit(trimmed)
    setValue('')
  }, [value, isProcessing, onSubmit])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value)
  }, [])

  const handleUploadClick = useCallback(() => {
    if (onFileSelected && fileInputRef.current) {
      fileInputRef.current.click()
      return
    }

    onUploadClick?.()
  }, [onFileSelected, onUploadClick])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onFileSelected) {
      onFileSelected(file)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileSelected])

  const showUploadButton = onUploadClick ?? onFileSelected

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          data-testid="ai-chat-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t.hub.chatInput.placeholder}
          disabled={isProcessing}
          rows={2}
          className={cn(
            'min-h-[64px] max-h-[160px] resize-none pl-5 pr-24',
            'rounded-2xl border-border bg-background text-base',
            'shadow-sm',
            focusRing,
            'focus-visible:border-primary',
            'transition-all duration-200',
          )}
        />

        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {showUploadButton && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleUploadClick}
              disabled={isProcessing}
              className="h-10 w-10 rounded-lg text-muted-foreground/50 hover:bg-accent hover:text-foreground"
              aria-label={t.hub.chatInput.uploadAriaLabel}
              title={t.hub.chatInput.uploadTitle}
            >
              <ArrowUpFromLine className="h-4 w-4" />
            </Button>
          )}

          <Button
            data-testid="ai-chat-submit"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isProcessing}
            className="h-10 w-10 rounded-lg"
            aria-label={t.hub.chatInput.sendAriaLabel}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {onFileSelected && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
        <ShieldCheck className="h-3 w-3 shrink-0" />
        {t.hub.chatInput.privacyNotice}
      </p>
    </div>
  )
}
