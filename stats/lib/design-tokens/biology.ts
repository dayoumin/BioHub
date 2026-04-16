import { focusRingBio } from '@/lib/design-tokens/common'
import { cn } from '@/lib/utils'

export const BIOLOGY_PANEL = 'rounded-[1.5rem] bg-surface-container-lowest'

export const BIOLOGY_PANEL_SOFT = 'rounded-[1.5rem] bg-surface-container-low'

export const BIOLOGY_PANEL_FOCUS = 'rounded-[1.5rem] bg-surface-container-high'

export const BIOLOGY_INSET_PANEL = 'rounded-xl bg-surface-container-low p-4'

export const BIOLOGY_CALLOUT_WARNING = 'rounded-[1.5rem] bg-warning-bg p-5'

export const BIOLOGY_CALLOUT_ERROR = 'rounded-[1.5rem] bg-error-bg p-6'

export const BIOLOGY_CALLOUT_INFO = 'rounded-[1.5rem] bg-info-bg p-5'

export const BIOLOGY_INPUT = cn(
  focusRingBio,
  'w-full rounded-xl border-0 bg-surface-container-lowest px-3 py-2 text-sm shadow-none',
)

export const BIOLOGY_TEXTAREA = cn(
  BIOLOGY_INPUT,
  'resize-y font-mono',
)

export const BIOLOGY_TABLE_SHELL = 'overflow-x-auto rounded-[1.25rem] bg-surface-container-low p-1'

export const BIOLOGY_TABLE_HEAD_ROW = 'bg-surface-container-high text-left text-xs text-muted-foreground'

export const BIOLOGY_TABLE_BODY_ROW = 'bg-surface-container-lowest transition-colors duration-200 hover:bg-surface-container'

export const BIOLOGY_ACTION_LINK = cn(
  focusRingBio,
  'rounded-xl bg-surface-container-low px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-surface-container',
)

export const BIOLOGY_SEGMENTED = 'rounded-xl bg-surface-container-low px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-container'

export const BIOLOGY_SEGMENTED_ACTIVE = 'rounded-xl bg-surface-container-high px-3 py-1.5 text-sm font-medium text-[color:var(--section-accent-bio)]'
