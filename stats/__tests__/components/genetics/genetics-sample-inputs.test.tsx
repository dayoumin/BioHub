import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { BlastMarker, GenericBlastParams, SequenceValidation } from '@biohub/types'
import { SequenceInput } from '@/components/genetics/SequenceInput'
import { BlastSearchInput } from '@/components/genetics/BlastSearchInput'

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

function SequenceInputHarness({
  onSubmit,
}: {
  onSubmit: (validation: SequenceValidation) => void
}): React.ReactElement {
  const [sequence, setSequence] = React.useState('')
  const [marker, setMarker] = React.useState<BlastMarker>('COI')
  const [sampleName, setSampleName] = React.useState('')
  const [uploadedFileName, setUploadedFileName] = React.useState<string | null>(null)

  return (
    <SequenceInput
      sequence={sequence}
      onSequenceChange={setSequence}
      marker={marker}
      onMarkerChange={setMarker}
      sampleName={sampleName}
      onSampleNameChange={setSampleName}
      uploadedFileName={uploadedFileName}
      onUploadedFileNameChange={setUploadedFileName}
      onSubmit={onSubmit}
    />
  )
}

describe('genetics sample inputs', () => {
  it('SequenceInput은 마커별 예제를 보여 주고 선택 시 시료명과 서열을 채운다', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(<SequenceInputHarness onSubmit={handleSubmit} />)

    expect(screen.getByText('예제 서열')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gadus morhua (대구)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ITS' }))
    expect(screen.getByRole('button', { name: 'Saccharomyces cerevisiae (효모)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'COI' }))

    await user.click(screen.getByRole('button', { name: 'Gadus morhua (대구)' }))

    expect(screen.getByLabelText('시료명 (선택)')).toHaveValue('Gadus morhua (대구)')
    expect((screen.getByLabelText('DNA 서열 (FASTA)') as HTMLTextAreaElement).value)
      .toContain('>Example_Gadus_morhua_COI')

    const submitButton = screen.getByRole('button', { name: '분석 시작' })
    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })

    await user.click(submitButton)
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it('BlastSearchInput은 예제 선택에 맞춰 프로그램과 DB를 설정하고 제출한다', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn<(params: GenericBlastParams) => void>()

    render(<BlastSearchInput onSubmit={handleSubmit} />)

    expect(screen.getByText('예제 서열')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Human insulin (단백질)' }))

    expect((screen.getByLabelText('단백질 서열 (FASTA)') as HTMLTextAreaElement).value)
      .toContain('>Human_insulin_precursor')

    const submitButton = screen.getByRole('button', { name: 'BLAST 검색 시작' })
    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })

    await user.click(submitButton)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({
      program: 'blastp',
      database: 'swissprot',
    }))
  })
})
