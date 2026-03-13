import React from 'react'
import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { AIAnalysisProgress } from '@/components/common/analysis/AIAnalysisProgress'
import type { AnalysisPurpose } from '@/types/analysis'

interface PurposeItem {
  id: AnalysisPurpose
  icon: React.ReactNode
  title: string
  description: string
  examples: string
}

interface PurposeLegacySectionProps {
  analysisPurposes: PurposeItem[]
  selectedPurpose: AnalysisPurpose | null
  guidedSelectedPurpose?: AnalysisPurpose | null
  isAnalyzing: boolean
  aiProgress: number
  prefersReducedMotion: boolean
  onPurposeSelect: (purpose: AnalysisPurpose) => void
  selectedMethodBar: React.ReactNode
  t: {
    purposeHeading: string
    purposeHelp: string
    analyzingTitle: string
    guidanceAlert: string
  }
}

export function PurposeLegacySection({
  analysisPurposes,
  selectedPurpose,
  guidedSelectedPurpose,
  isAnalyzing,
  aiProgress,
  prefersReducedMotion,
  onPurposeSelect,
  selectedMethodBar,
  t,
}: PurposeLegacySectionProps): React.ReactNode {
  return (
    <>
      {/* Header with Action Button (상단 배치) */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight" id="purpose-selection-label">
          {t.purposeHeading}
        </h3>
        {/* Action Button - purpose step에서 상단에 표시 */}
        {selectedMethodBar}
      </div>

      {/* Purpose Selection */}
      <div>
        <div
          role="radiogroup"
          aria-labelledby="purpose-selection-label"
          aria-describedby="purpose-selection-help"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {analysisPurposes.map((purpose, index) => (
            <div
              key={purpose.id}
              className={prefersReducedMotion ? '' : 'animate-slide-in'}
              style={prefersReducedMotion ? undefined : {
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <PurposeCard
                icon={purpose.icon}
                title={purpose.title}
                description={purpose.description}
                examples={purpose.examples}
                selected={selectedPurpose === purpose.id || guidedSelectedPurpose === purpose.id}
                onClick={() => onPurposeSelect(purpose.id)}
                disabled={isAnalyzing}
              />
            </div>
          ))}
        </div>
        <div id="purpose-selection-help" className="sr-only">
          {t.purposeHelp}
        </div>
      </div>

      {/* AI Analysis Progress */}
      {isAnalyzing && (
        <AIAnalysisProgress
          progress={aiProgress}
          title={t.analyzingTitle}
        />
      )}

      {/* Initial guidance */}
      {!selectedPurpose && !isAnalyzing && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t.guidanceAlert}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
