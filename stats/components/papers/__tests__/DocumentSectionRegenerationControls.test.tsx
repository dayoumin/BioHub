import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DocumentSectionRegenerationControls from '../DocumentSectionRegenerationControls'

describe('DocumentSectionRegenerationControls', () => {
  it('runs body-preserving linked source refresh without confirmation', () => {
    const onRefreshLinkedSources = vi.fn()
    const onRegenerateSection = vi.fn()

    render(
      <DocumentSectionRegenerationControls
        sectionTitle="연구 방법"
        disabled={false}
        pendingMode={null}
        reviewSourceCount={0}
        hasChangedSources={false}
        onRefreshLinkedSources={onRefreshLinkedSources}
        onRegenerateSection={onRegenerateSection}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '본문 보존 갱신' }))

    expect(onRefreshLinkedSources).toHaveBeenCalledTimes(1)
    expect(onRegenerateSection).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('requires confirmation before replacing section body', async () => {
    const onRefreshLinkedSources = vi.fn()
    const onRegenerateSection = vi.fn()

    render(
      <DocumentSectionRegenerationControls
        sectionTitle="결과"
        disabled={false}
        pendingMode={null}
        reviewSourceCount={2}
        hasChangedSources
        onRefreshLinkedSources={onRefreshLinkedSources}
        onRegenerateSection={onRegenerateSection}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '섹션 다시 생성' }))

    expect(onRegenerateSection).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('섹션 본문을 새 초안으로 교체할까요?')).toBeInTheDocument()
    expect(within(dialog).getByText(/현재 “결과” 본문/)).toBeInTheDocument()
    expect(within(dialog).getByText(/확인이 필요한 원본 2개/)).toBeInTheDocument()
    expect(within(dialog).getByText(/원본 자료 변경이 감지된 상태/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: '본문 교체하고 재생성' }))

    expect(onRegenerateSection).toHaveBeenCalledTimes(1)
    expect(onRefreshLinkedSources).not.toHaveBeenCalled()
  })

  it('shows pending labels and disables both actions', () => {
    render(
      <DocumentSectionRegenerationControls
        sectionTitle="연구 방법"
        disabled
        pendingMode="regenerate"
        reviewSourceCount={0}
        hasChangedSources={false}
        onRefreshLinkedSources={vi.fn()}
        onRegenerateSection={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '본문 보존 갱신' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '재생성 중' })).toBeDisabled()
  })
})
