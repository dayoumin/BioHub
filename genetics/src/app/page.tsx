'use client'

import { useState, useCallback } from 'react'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { SequenceInput } from '@/components/SequenceInput'

export default function GeneticsPage() {
  const [marker, setMarker] = useState<BlastMarker>('COI')
  const [sequence, setSequence] = useState('')

  const handleAnalyze = useCallback((validation: SequenceValidation) => {
    // TODO: BLAST API 호출
    console.log('Analyze:', { marker, length: validation.length })
  }, [marker])

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        DNA 바코딩 종 판별
      </h1>
      <p className="mb-8 text-gray-600">
        DNA 서열을 입력하면 종을 동정하고, 결과 해석과 다음 단계를 안내합니다.
      </p>

      <SequenceInput
        sequence={sequence}
        onSequenceChange={setSequence}
        marker={marker}
        onMarkerChange={setMarker}
        onSubmit={handleAnalyze}
      />
    </main>
  )
}
