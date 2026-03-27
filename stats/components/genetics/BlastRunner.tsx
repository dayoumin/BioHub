'use client'

import { useCallback, useMemo } from 'react'
import type { BlastMarker } from '@biohub/types'
import { cleanSequence } from '@/lib/genetics/validate-sequence'
import { enrichBarcodeHits, BLAST_STEP_LABELS } from '@/lib/genetics/blast-utils'
import { useBlastExecution } from '@/hooks/use-blast-execution'
import { BlastProgressUI } from '@/components/genetics/BlastProgressUI'

export type { BlastErrorCode } from '@/lib/genetics/blast-utils'
import type { BlastErrorCode } from '@/lib/genetics/blast-utils'

type BarcodeResult = { hits: Array<Record<string, unknown>> }

interface BlastRunnerProps {
  sequence: string
  marker: BlastMarker
  onResult: (data: unknown) => void
  onError: (message: string, code: BlastErrorCode) => void
  onCancel: () => void
}

export function BlastRunner({ sequence, marker, onResult, onError, onCancel }: BlastRunnerProps): React.ReactElement {
  const payload = useMemo(() => ({
    sequence: cleanSequence(sequence),
    marker,
  }), [sequence, marker])

  const transform = useCallback(async (
    rawHits: Array<Record<string, unknown>>,
    signal: AbortSignal,
  ): Promise<BarcodeResult> => {
    await enrichBarcodeHits(rawHits, signal)
    return { hits: rawHits }
  }, [])

  const { phase, currentStep, elapsed, estimatedTime, errorMessage, cancel } =
    useBlastExecution<BarcodeResult>({
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
      stepLabels={BLAST_STEP_LABELS}
      errorMessage={errorMessage}
      onCancel={cancel}
    />
  )
}
