import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MethodBrowser } from './MethodBrowser'
import type { StatisticalMethod } from '@/types/analysis'
import type { MethodGroup } from '@/lib/statistics/method-catalog'

interface PurposeBrowseSectionProps {
  browseMethodGroups: MethodGroup[]
  manualSelectedMethod: StatisticalMethod | null
  recommendedMethodId?: string
  onMethodSelect: (method: StatisticalMethod) => void
  onBack: () => void
  dataProfile?: { totalRows: number; numericVars: number; categoricalVars: number }
  selectedMethodBar: React.ReactNode
  t: {
    back: string
    allMethods: string
  }
}

export function PurposeBrowseSection({
  browseMethodGroups,
  manualSelectedMethod,
  recommendedMethodId,
  onMethodSelect,
  onBack,
  dataProfile,
  selectedMethodBar,
  t,
}: PurposeBrowseSectionProps): React.ReactNode {
  return (
    <div key="browse">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>
          <div className="h-4 w-px bg-border/60" />
          <h3 className="text-base font-semibold tracking-tight">
            {t.allMethods}
          </h3>
        </div>
        {/* Action Button - browse 모드에서는 수동 선택만으로 진행 가능 */}
        {selectedMethodBar}
      </div>

      {/* Method Browser */}
      <MethodBrowser
        methodGroups={browseMethodGroups}
        selectedMethod={manualSelectedMethod}
        recommendedMethodId={recommendedMethodId}
        onMethodSelect={onMethodSelect}
        dataProfile={dataProfile}
      />
    </div>
  )
}
