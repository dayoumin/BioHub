import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '@/components/terminology/LanguageSwitcher'

const mockUseAppPreferences = vi.fn()

vi.mock('@/hooks/use-app-preferences', () => ({
  useAppPreferences: () => mockUseAppPreferences(),
}))

function hasTextContent(text: string) {
  return (_content: string, node: Element | null) =>
    node?.tagName === 'P' && (node.textContent?.includes(text) ?? false)
}

describe('LanguageSwitcher', () => {
  it('renders Korean helper copy when current language is Korean', () => {
    mockUseAppPreferences.mockReturnValue({
      currentLanguage: 'ko',
      setLanguage: vi.fn(),
    })

    render(<LanguageSwitcher />)

    expect(screen.getByText('UI 언어')).toBeInTheDocument()
    expect(screen.getByText('기본값')).toBeInTheDocument()
    expect(screen.getByText('현재:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(hasTextContent('버튼, 안내 문구, 결과 설명 등 UI 텍스트 언어를 변경합니다.'))).toBeInTheDocument()
  })

  it('renders English helper copy when current language is English', () => {
    mockUseAppPreferences.mockReturnValue({
      currentLanguage: 'en',
      setLanguage: vi.fn(),
    })

    render(<LanguageSwitcher />)

    expect(screen.getByText('UI Language')).toBeInTheDocument()
    expect(screen.getByText('Current', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(hasTextContent('Changes the language used for buttons, guidance, and other UI text.'))).toBeInTheDocument()
    expect(screen.queryByText('기본값')).toBeNull()
  })
})
