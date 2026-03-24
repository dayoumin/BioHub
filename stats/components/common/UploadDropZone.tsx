'use client'

import React from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Shared dashed-border container className for upload zones.
 * Apply to your own container element (div, motion.div, etc.).
 */
export function uploadZoneClassName(
  isDragActive: boolean,
  opts?: { isLoading?: boolean; clickable?: boolean; compact?: boolean }
): string {
  return cn(
    'border-2 border-dashed rounded-xl px-6 text-center transition-all duration-200',
    opts?.compact ? 'py-4' : 'py-6',
    isDragActive
      ? 'border-primary bg-primary/5 shadow-[0_0_0_4px_rgba(var(--primary-rgb,0,0,0),0.05)]'
      : 'border-border/60 hover:border-primary/40 hover:bg-muted/20',
    opts?.isLoading && 'pointer-events-none opacity-50',
    opts?.clickable && 'cursor-pointer',
  )
}

interface UploadDropZoneContentProps {
  isDragActive?: boolean
  isLoading?: boolean
  /** Primary label shown when not dragging */
  label: string
  /** Subtitle (e.g., file size limits, supported formats) */
  subtitle: string
  /** Button text */
  buttonLabel: string
  /** Button text during loading */
  loadingLabel?: string
  /** Text shown during drag-over */
  dragActiveLabel?: string
  /** Click handler for the button (omit if zone itself is clickable) */
  onButtonClick?: () => void
  /** Disable interaction */
  disabled?: boolean
  /** data-testid for the button element */
  buttonTestId?: string
  /** Hide the icon box above the label (default: true) */
  showIcon?: boolean
}

/**
 * Upload zone inner content: icon → label → subtitle → button.
 *
 * Render inside a dashed-border container. Use `uploadZoneClassName()`
 * for consistent container styling across Analysis and Graph Studio.
 *
 * @example
 * ```tsx
 * <div className={cn(uploadZoneClassName(isDragActive), 'group')} {...getRootProps()}>
 *   <input {...getInputProps()} />
 *   <UploadDropZoneContent label="..." subtitle="..." buttonLabel="..." />
 * </div>
 * ```
 */
export function UploadDropZoneContent({
  isDragActive = false,
  isLoading = false,
  label,
  subtitle,
  buttonLabel,
  loadingLabel,
  dragActiveLabel = '파일을 여기에 놓으세요',
  onButtonClick,
  disabled = false,
  buttonTestId,
  showIcon = true,
}: UploadDropZoneContentProps): React.ReactElement {
  return (
    <>
      {showIcon && (
        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors duration-200">
          <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight mb-1" aria-live="polite">
        {isDragActive ? dragActiveLabel : label}
      </h3>
      <p className="text-xs text-muted-foreground/80 mb-3">{subtitle}</p>
      <Button
        variant="outline"
        size="sm"
        className="shadow-sm"
        onClick={onButtonClick}
        disabled={isLoading || disabled}
        data-testid={buttonTestId}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            {loadingLabel ?? buttonLabel}
          </>
        ) : (
          buttonLabel
        )}
      </Button>
    </>
  )
}
