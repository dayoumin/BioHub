'use client'

interface WritingEntrySurfaceProps {
  title: string
  description?: string
  action?: React.ReactNode
  children?: React.ReactNode
}

export default function WritingEntrySurface({
  title,
  description,
  action,
  children,
}: WritingEntrySurfaceProps): React.ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
