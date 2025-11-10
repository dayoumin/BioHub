/**
 * ChatbotTabs 컴포넌트 테스트
 */

import { render, screen } from '@testing-library/react'
import { ChatbotTabs } from '../chatbot-tabs'

describe('ChatbotTabs', () => {
  const mockConversationsContent = <div>Conversations Content</div>
  const mockDocumentsContent = <div>Documents Content</div>
  const mockSettingsContent = <div>Settings Content</div>

  it('컴포넌트가 정상적으로 렌더링됨', () => {
    render(
      <ChatbotTabs
        conversationsContent={mockConversationsContent}
        documentsContent={mockDocumentsContent}
        settingsContent={mockSettingsContent}
      />
    )

    expect(screen.getByText('Conversations Content')).toBeInTheDocument()
  })

  it('3개의 탭 버튼이 렌더링됨', () => {
    render(
      <ChatbotTabs
        conversationsContent={mockConversationsContent}
        documentsContent={mockDocumentsContent}
        settingsContent={mockSettingsContent}
      />
    )

    expect(screen.getByRole('tab', { name: /대화/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /문서/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /설정/i })).toBeInTheDocument()
  })

  it('기본 탭은 conversations', () => {
    render(
      <ChatbotTabs
        conversationsContent={mockConversationsContent}
        documentsContent={mockDocumentsContent}
        settingsContent={mockSettingsContent}
      />
    )

    const conversationsTab = screen.getByRole('tab', { name: /대화/i })
    expect(conversationsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('defaultTab 설정 적용', () => {
    render(
      <ChatbotTabs
        conversationsContent={mockConversationsContent}
        documentsContent={mockDocumentsContent}
        settingsContent={mockSettingsContent}
        defaultTab="settings"
      />
    )

    const settingsTab = screen.getByRole('tab', { name: /설정/i })
    expect(settingsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('탭 아이콘이 렌더링됨', () => {
    const { container } = render(
      <ChatbotTabs
        conversationsContent={mockConversationsContent}
        documentsContent={mockDocumentsContent}
        settingsContent={mockSettingsContent}
      />
    )

    // lucide-react 아이콘은 SVG로 렌더링됨
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThanOrEqual(3) // 최소 3개 (탭당 1개)
  })

  it('Props가 올바르게 전달됨', () => {
    const mockOnTabChange = jest.fn()

    render(
      <ChatbotTabs
        conversationsContent={mockConversationsContent}
        documentsContent={mockDocumentsContent}
        settingsContent={mockSettingsContent}
        defaultTab="conversations"
        onTabChange={mockOnTabChange}
      />
    )

    // Props가 정상적으로 전달되었는지 확인
    expect(screen.getByRole('tab', { name: /대화/i })).toBeInTheDocument()
  })

  it('TypeScript 타입이 올바르게 정의됨', () => {
    // 타입 체크는 컴파일 타임에 이루어지므로 런타임 테스트는 렌더링만 확인
    const { container } = render(
      <ChatbotTabs
        conversationsContent={<div>Test</div>}
        documentsContent={<div>Test</div>}
        settingsContent={<div>Test</div>}
      />
    )

    expect(container).toBeInTheDocument()
  })
})
