'use client'

import { useCallback, useMemo } from 'react'
import type { BoldHit, BoldClassification, BoldDatabase, BoldSearchMode, BoldIdResult } from '@biohub/types'
import { cleanSequence } from '@/lib/genetics/validate-sequence'
import { BOLD_STEP_LABELS } from '@/lib/genetics/bold-utils'
import type { BoldErrorCode } from '@/lib/genetics/bold-utils'
import { useBoldExecution } from '@/hooks/use-bold-execution'
import { BlastProgressUI } from '@/components/genetics/BlastProgressUI'

export type { BoldErrorCode }

interface BoldRunnerProps {
  sequence: string
  db: BoldDatabase
  searchMode: BoldSearchMode
  onResult: (result: BoldIdResult) => void
  onError: (message: string, code: BoldErrorCode) => void
  onCancel: () => void
}

export function BoldRunner({
  sequence,
  db,
  searchMode,
  onResult,
  onError,
  onCancel,
}: BoldRunnerProps): React.ReactElement {
  const payload = useMemo(() => ({
    sequence: cleanSequence(sequence),
    db,
    searchMode,
  }), [sequence, db, searchMode])

  const transform = useCallback(async (
    hits: BoldHit[],
    classification: BoldClassification,
  ): Promise<BoldIdResult> => {
    return { hits, classification, db, searchMode }
  }, [db, searchMode])

  const { phase, currentStep, elapsed, estimatedTime, errorMessage, cancel } =
    useBoldExecution<BoldIdResult>({
      payload,
      transform,
      onComplete: onResult,
      onError,
      onCancel,
    })

  return (
    <BlastProgressUI
      phase={phase}
      currentStep={currentStep}
      elapsed={elapsed}
      estimatedTime={estimatedTime}
      stepLabels={BOLD_STEP_LABELS}
      errorMessage={errorMessage}
      onCancel={cancel}
    />
  )
}
