import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import GeneticsPage from '@/app/genetics/page'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/common/SortablePinnedCardGrid', () => ({
  SortablePinnedCardGrid: ({
    title,
    description,
    emptyTitle,
    emptyDescription,
  }: {
    title: string
    description: string
    emptyTitle: string
    emptyDescription: string
  }) => (
    <section data-testid="genetics-pinned-grid">
      <h2>{title}</h2>
      <p>{description}</p>
      <p>{emptyTitle}</p>
      <p>{emptyDescription}</p>
    </section>
  ),
}))

vi.mock('@/components/genetics/GeneticsToolCard', () => ({
  GeneticsToolCard: ({
    tool,
  }: {
    tool: {
      id: string
      title: string
      href: string
    }
  }) => <a href={tool.href}>{tool.title}</a>,
}))

vi.mock('@/lib/genetics/pinned-tools-store', () => ({
  usePinnedGeneticsToolsStore: (
    selector: (state: { pinnedIds: string[]; reorderPins: () => void }) => unknown,
  ) => selector({ pinnedIds: [], reorderPins: vi.fn() }),
}))

vi.mock('@/lib/bio-tools/bio-tool-registry', () => ({
  getBioToolById: (id: string) => {
    if (id === 'hardy-weinberg') {
      return { id, nameKo: 'Hardy-Weinberg 평형' }
    }

    if (id === 'fst') {
      return { id, nameKo: 'Fst 유전적 분화' }
    }

    return undefined
  },
}))

describe('GeneticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('최근 사용 없이 카테고리 중심 허브를 렌더링한다', () => {
    render(<GeneticsPage />)

    expect(screen.getByRole('heading', { name: '유전학 분석' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '고정 도구' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '최근 사용' })).not.toBeInTheDocument()
    expect(screen.queryByText('서열 기반 종 동정, 참조 검색, 비교 분석, 단백질 확장까지 한 흐름으로 이어집니다.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '분석 흐름을 고르세요' })).not.toBeInTheDocument()
    expect(screen.queryByText('선택한 흐름에서 바로 시작할 수 있는 도구입니다.')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: /종 동정/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /참조 서열 찾기/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DNA 바코드 종 동정' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'BOLD ID 종 동정' })).toBeInTheDocument()
  })

  it('카테고리 선택에 따라 도구 목록이 바뀐다', async () => {
    const user = userEvent.setup()

    render(<GeneticsPage />)

    await user.click(screen.getByRole('button', { name: /참조 서열 찾기/ }))

    expect(screen.getByRole('heading', { name: '참조 서열 찾기' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'BLAST 서열 검색' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GenBank 서열 검색' })).toBeInTheDocument()
  })
})
