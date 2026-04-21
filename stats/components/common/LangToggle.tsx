'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppLanguageCode } from '@/lib/preferences'

interface LangToggleProps {
  value: AppLanguageCode
  onChange: (lang: AppLanguageCode) => void
  loading?: boolean
}

export function LangToggle({ value, onChange, loading }: LangToggleProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <div className="flex items-center rounded-md border text-xs overflow-hidden">
        {(['ko', 'en'] as const).map((l) => (
          <button
            key={l}
            type="button"
            disabled={loading}
            onClick={() => onChange(l)}
            className={cn(
              'px-2.5 py-1 transition-colors disabled:opacity-60',
              value === l
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {l === 'ko' ? '한글' : 'EN'}
          </button>
        ))}
      </div>
    </div>
  )
}
