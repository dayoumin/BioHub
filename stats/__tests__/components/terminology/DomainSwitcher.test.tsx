import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DomainSwitcher } from '@/components/terminology/DomainSwitcher'

const mockUseTerminologyContext = vi.fn()
const mockGetAvailableDomains = vi.fn()

vi.mock('@/hooks/use-terminology', () => ({
  useTerminologyContext: () => mockUseTerminologyContext(),
}))

vi.mock('@/lib/terminology', () => ({
  getAvailableDomains: () => mockGetAvailableDomains(),
}))

function hasTextContent(text: string) {
  return (_content: string, node: Element | null) =>
    node?.tagName === 'P' && (node.textContent?.includes(text) ?? false)
}

describe('DomainSwitcher', () => {
  it('renders Korean domain guidance when current language is Korean', () => {
    mockUseTerminologyContext.mockReturnValue({
      currentDomain: 'aquaculture',
      currentLanguage: 'ko',
      setDomain: vi.fn(),
      dictionary: { displayName: '수산과학' },
    })
    mockGetAvailableDomains.mockReturnValue(['aquaculture', 'generic'])

    render(<DomainSwitcher />)

    expect(screen.getByText('용어 도메인')).toBeInTheDocument()
    expect(screen.getByText('기본값')).toBeInTheDocument()
    expect(screen.getByText('현재:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(hasTextContent('전문 용어와 예시 문맥만 바꾸며, UI 언어는 별도로 유지됩니다.'))).toBeInTheDocument()
  })

  it('renders English domain guidance when current language is English', () => {
    mockUseTerminologyContext.mockReturnValue({
      currentDomain: 'generic',
      currentLanguage: 'en',
      setDomain: vi.fn(),
      dictionary: { displayName: 'General Statistics' },
    })
    mockGetAvailableDomains.mockReturnValue(['aquaculture', 'generic'])

    render(<DomainSwitcher />)

    expect(screen.getByText('Terminology Domain')).toBeInTheDocument()
    expect(screen.getByText('Current', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(hasTextContent('Changes domain-specific terminology and examples while keeping the UI language separate.'))).toBeInTheDocument()
    expect(screen.queryByText('기본값')).toBeNull()
  })
})
