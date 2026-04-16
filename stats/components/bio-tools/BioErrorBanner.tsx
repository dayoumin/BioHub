import { AlertCircle } from 'lucide-react'
import { BIOLOGY_CALLOUT_ERROR } from '@/lib/design-tokens/biology'
import { cn } from '@/lib/utils'

interface BioErrorBannerProps {
  error: string | null
}

export function BioErrorBanner({ error }: BioErrorBannerProps): React.ReactElement | null {
  if (!error) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(BIOLOGY_CALLOUT_ERROR, 'flex items-start gap-2 p-4 text-sm text-error')}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error}
    </div>
  )
}
