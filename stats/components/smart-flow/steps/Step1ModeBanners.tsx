import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2, Zap } from 'lucide-react'
import type { StatisticalMethod } from '@/types/smart-flow'

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
    <Card className="mb-6 border-amber-300/50 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{t.badge}</Badge>
              <span className="font-medium">{method.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t.description}
            </p>
          </div>
          <div className="flex gap-2">
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
