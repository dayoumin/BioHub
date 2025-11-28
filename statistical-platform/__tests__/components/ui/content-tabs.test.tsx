/**
 * ContentTabs Component Tests
 *
 * Tests for the ContentTabs and ContentTabsContent components
 * which provide underline-style tab navigation.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { FileText, Table, MessageSquare } from 'lucide-react'

describe('ContentTabs', () => {
  const defaultTabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'results', label: 'Results', icon: Table },
    { id: 'interpretation', label: 'Interpretation', icon: MessageSquare }
  ]

  const mockOnTabChange = jest.fn()

  beforeEach(() => {
    mockOnTabChange.mockClear()
  })

  describe('Rendering', () => {
    it('renders all tabs', () => {
      render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
        />
      )

      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /results/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /interpretation/i })).toBeInTheDocument()
    })

    it('renders tab icons', () => {
      render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
        />
      )

      // Icons are rendered as SVG elements within buttons
      const tabButtons = screen.getAllByRole('tab')
      tabButtons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('renders without icons when not provided', () => {
      const tabsWithoutIcons = [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2' }
      ]

      render(
        <ContentTabs
          tabs={tabsWithoutIcons}
          activeTab="tab1"
          onTabChange={mockOnTabChange}
        />
      )

      const tabButtons = screen.getAllByRole('tab')
      tabButtons.forEach(button => {
        expect(button.querySelector('svg')).not.toBeInTheDocument()
      })
    })

    it('renders badge when provided', () => {
      const tabsWithBadge = [
        { id: 'notifications', label: 'Notifications', badge: 5 }
      ]

      render(
        <ContentTabs
          tabs={tabsWithBadge}
          activeTab="notifications"
          onTabChange={mockOnTabChange}
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('does not render badge when value is 0', () => {
      const tabsWithZeroBadge = [
        { id: 'notifications', label: 'Notifications', badge: 0 }
      ]

      render(
        <ContentTabs
          tabs={tabsWithZeroBadge}
          activeTab="notifications"
          onTabChange={mockOnTabChange}
        />
      )

      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
          ariaLabel="Test tabs"
        />
      )

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-label', 'Test tabs')

      const activeTab = screen.getByRole('tab', { name: /summary/i })
      expect(activeTab).toHaveAttribute('aria-selected', 'true')
      expect(activeTab).toHaveAttribute('tabindex', '0')

      const inactiveTab = screen.getByRole('tab', { name: /results/i })
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
      expect(inactiveTab).toHaveAttribute('tabindex', '-1')
    })

    it('links tabs to panels via aria-controls', () => {
      render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
        />
      )

      const summaryTab = screen.getByRole('tab', { name: /summary/i })
      expect(summaryTab).toHaveAttribute('aria-controls', 'tabpanel-summary')
      expect(summaryTab).toHaveAttribute('id', 'tab-summary')
    })
  })

  describe('Interaction', () => {
    it('calls onTabChange when clicking a tab', () => {
      render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
        />
      )

      fireEvent.click(screen.getByRole('tab', { name: /results/i }))
      expect(mockOnTabChange).toHaveBeenCalledWith('results')
    })

    it('does not call onTabChange when clicking disabled tab', () => {
      const tabsWithDisabled = [
        { id: 'enabled', label: 'Enabled' },
        { id: 'disabled', label: 'Disabled', disabled: true }
      ]

      render(
        <ContentTabs
          tabs={tabsWithDisabled}
          activeTab="enabled"
          onTabChange={mockOnTabChange}
        />
      )

      fireEvent.click(screen.getByRole('tab', { name: /disabled/i }))
      expect(mockOnTabChange).not.toHaveBeenCalled()
    })

    it('disabled tab has correct attributes', () => {
      const tabsWithDisabled = [
        { id: 'enabled', label: 'Enabled' },
        { id: 'disabled', label: 'Disabled', disabled: true }
      ]

      render(
        <ContentTabs
          tabs={tabsWithDisabled}
          activeTab="enabled"
          onTabChange={mockOnTabChange}
        />
      )

      const disabledTab = screen.getByRole('tab', { name: /disabled/i })
      expect(disabledTab).toBeDisabled()
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('applies custom gap', () => {
      render(
        <ContentTabs
          tabs={defaultTabs}
          activeTab="summary"
          onTabChange={mockOnTabChange}
          gap="gap-8"
        />
      )

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveClass('gap-8')
    })
  })
})

describe('ContentTabsContent', () => {
  describe('Visibility', () => {
    it('renders children when show is true', () => {
      render(
        <ContentTabsContent tabId="test" show={true}>
          <div data-testid="content">Tab Content</div>
        </ContentTabsContent>
      )

      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('does not render children when show is false', () => {
      render(
        <ContentTabsContent tabId="test" show={false}>
          <div data-testid="content">Tab Content</div>
        </ContentTabsContent>
      )

      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <ContentTabsContent tabId="summary" show={true}>
          <div>Content</div>
        </ContentTabsContent>
      )

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveAttribute('id', 'tabpanel-summary')
      expect(panel).toHaveAttribute('aria-labelledby', 'tab-summary')
    })

    it('works without tabId', () => {
      render(
        <ContentTabsContent show={true}>
          <div>Content</div>
        </ContentTabsContent>
      )

      const panel = screen.getByRole('tabpanel')
      expect(panel).not.toHaveAttribute('id')
      expect(panel).not.toHaveAttribute('aria-labelledby')
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(
        <ContentTabsContent tabId="test" show={true} className="custom-panel">
          <div>Content</div>
        </ContentTabsContent>
      )

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveClass('custom-panel')
    })

    it('has animation classes by default', () => {
      render(
        <ContentTabsContent tabId="test" show={true}>
          <div>Content</div>
        </ContentTabsContent>
      )

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveClass('animate-in', 'fade-in')
    })
  })
})

describe('ContentTabs Integration', () => {
  it('works together as a complete tab system', () => {
    const TestComponent = () => {
      const [activeTab, setActiveTab] = React.useState('tab1')

      return (
        <div>
          <ContentTabs
            tabs={[
              { id: 'tab1', label: 'Tab 1' },
              { id: 'tab2', label: 'Tab 2' },
              { id: 'tab3', label: 'Tab 3' }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <ContentTabsContent tabId="tab1" show={activeTab === 'tab1'}>
            <div data-testid="content-1">Content 1</div>
          </ContentTabsContent>
          <ContentTabsContent tabId="tab2" show={activeTab === 'tab2'}>
            <div data-testid="content-2">Content 2</div>
          </ContentTabsContent>
          <ContentTabsContent tabId="tab3" show={activeTab === 'tab3'}>
            <div data-testid="content-3">Content 3</div>
          </ContentTabsContent>
        </div>
      )
    }

    render(<TestComponent />)

    // Initially tab1 is active
    expect(screen.getByTestId('content-1')).toBeInTheDocument()
    expect(screen.queryByTestId('content-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('content-3')).not.toBeInTheDocument()

    // Click tab2
    fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }))
    expect(screen.queryByTestId('content-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('content-2')).toBeInTheDocument()
    expect(screen.queryByTestId('content-3')).not.toBeInTheDocument()

    // Click tab3
    fireEvent.click(screen.getByRole('tab', { name: 'Tab 3' }))
    expect(screen.queryByTestId('content-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('content-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('content-3')).toBeInTheDocument()
  })
})
