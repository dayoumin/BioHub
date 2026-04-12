import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UnifiedHistorySidebar } from '../UnifiedHistorySidebar'
import type { HistoryItem } from '@/types/history'

interface TestHistoryData {
  note: string
}

const items: HistoryItem<TestHistoryData>[] = [
  {
    id: 'history-1',
    title: 'One Sample T-Test',
    subtitle: '평균 비교',
    pinned: false,
    createdAt: Date.now(),
    hasResult: true,
    data: {
      note: 'sample',
    },
  },
]

describe('UnifiedHistorySidebar', () => {
  it('닫힌 상태와 열린 상태에서 우측 패널 아이콘이 올바르게 전환된다', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <UnifiedHistorySidebar
        items={items}
        onSelect={onSelect}
        defaultOpen={false}
        title="Analysis history"
      />,
    )

    expect(container.querySelector('.lucide-panel-right-open')).toBeInTheDocument()
    expect(container.querySelector('.lucide-panel-right-close')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Analysis history')).toBeInTheDocument()
    expect(container.querySelector('.lucide-panel-right-close')).toBeInTheDocument()
    expect(container.querySelector('.lucide-panel-right-open')).not.toBeInTheDocument()

    const collapseButton = container.querySelector('button[title="패널 접기"]')
    expect(collapseButton).not.toBeNull()

    fireEvent.click(collapseButton as HTMLButtonElement)

    expect(container.querySelector('.lucide-panel-right-open')).toBeInTheDocument()
    expect(container.querySelector('.lucide-panel-right-close')).not.toBeInTheDocument()
  })
})
