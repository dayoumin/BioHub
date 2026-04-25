import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StartWritingButton from '../StartWritingButton'

describe('StartWritingButton', () => {
  it('renders the pending label and suppresses clicks while pending', () => {
    const onClick = vi.fn()

    render(
      <StartWritingButton
        label="문서에서 작성"
        onClick={onClick}
        pending
      />,
    )

    const button = screen.getByRole('button', { name: '문서 준비 중...' })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('respects the disabled state without entering pending mode', () => {
    render(
      <StartWritingButton
        label="자료 작성"
        onClick={vi.fn()}
        disabled
      />,
    )

    expect(screen.getByRole('button', { name: '자료 작성' })).toBeDisabled()
  })
})
