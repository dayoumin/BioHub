import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Settings2, Zap } from 'lucide-react'
import type { StatisticalMethod } from '@/types/analysis'

interface ReanalysisBannerProps {
  method: StatisticalMethod
  t: {
    title: string
    description: string
  }
}

export function ReanalysisBanner({ method, t }: ReanalysisBannerProps): React.ReactNode {
  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{t.title}</Badge>
              <span className="font-medium">{method.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickAnalysisBannerProps {
  method: StatisticalMethod
  onNormalMode: () => void
  onChangeMethod: () => void
  t: {
    badge: string
    description: string
    normalMode: string
    changeMethod: string
  }
}

export function QuickAnalysisBanner({ method, onNormalMode, onChangeMethod, t }: QuickAnalysisBannerProps): React.ReactNode {
  return (
    <Card className="mb-6 border-0 bg-surface-container-low shadow-none">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{t.badge}</Badge>
              <span className="font-medium tracking-tight text-foreground">{method.name}</span>
            </div>
            <div
              data-testid="quick-analysis-selected-method"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-medium text-secondary"
            >
              <Check className="h-3.5 w-3.5 text-primary" />
              선택된 방법
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onNormalMode}
            >
              {t.normalMode}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onChangeMethod}
            >
              {t.changeMethod}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
