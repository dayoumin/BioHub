import { AlertCircle } from 'lucide-react'

interface BioErrorBannerProps {
  error: string | null
}

export function BioErrorBanner({ error }: BioErrorBannerProps): React.ReactElement | null {
  if (!error) return null

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error}
    </div>
  )
}
