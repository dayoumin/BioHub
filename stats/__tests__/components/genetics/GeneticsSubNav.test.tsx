import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeneticsSubNav } from '@/components/genetics/GeneticsSubNav'

let mockPathname = '/genetics'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

vi.mock('next/link', () => ({
  default: React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  >(({ children, href, ...props }, ref) => (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  )),
}))

describe('GeneticsSubNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/genetics'
  })

  it('유전학 홈에서는 개별 도구 서브내비를 렌더링하지 않는다', () => {
    const { container } = render(<GeneticsSubNav />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('DNA 바코딩 종 판별')).not.toBeInTheDocument()
  })

  it('슬래시가 붙은 홈 경로에서도 서브내비를 렌더링하지 않는다', () => {
    mockPathname = '/genetics/'

    const { container } = render(<GeneticsSubNav />)

    expect(container).toBeEmptyDOMElement()
  })

  it('개별 도구 페이지에서는 서브내비를 렌더링한다', () => {
    mockPathname = '/genetics/blast'

    render(<GeneticsSubNav />)

    const blastLink = screen.getByRole('link', { name: 'BLAST 서열 검색' })
    const barcodingLink = screen.getByRole('link', { name: 'DNA 바코딩 종 판별' })

    expect(screen.getByTitle('유전적 분석 홈으로 이동')).toBeInTheDocument()
    expect(blastLink).toHaveAttribute('href', '/genetics/blast')
    expect(blastLink).toHaveClass('text-foreground')
    expect(blastLink.getAttribute('style')).toContain('background-color')

    expect(barcodingLink).toHaveAttribute('href', '/genetics/barcoding')
    expect(barcodingLink).toHaveClass('text-muted-foreground')
    expect(barcodingLink.getAttribute('style')).toBeNull()
  })

  it('중첩 경로에서도 현재 도구를 활성 상태로 유지한다', () => {
    mockPathname = '/genetics/blast/results'

    render(<GeneticsSubNav />)

    const blastLink = screen.getByRole('link', { name: 'BLAST 서열 검색' })
    const genBankLink = screen.getByRole('link', { name: 'GenBank 서열 검색' })

    expect(blastLink).toHaveAttribute('href', '/genetics/blast')
    expect(blastLink).toHaveClass('text-foreground')
    expect(blastLink.getAttribute('style')).toContain('background-color')

    expect(genBankLink).toHaveAttribute('href', '/genetics/genbank')
    expect(genBankLink).toHaveClass('text-muted-foreground')
  })
})
