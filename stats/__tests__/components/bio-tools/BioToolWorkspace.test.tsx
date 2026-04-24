import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BioToolWorkspace } from '@/components/bio-tools/BioToolWorkspace'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'tool' ? 'mantel-test' : null),
  }),
  useRouter: () => ({
    push: pushMock,
  }),
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

vi.mock('@/components/bio-tools/tools', () => ({
  TOOL_COMPONENTS: {
    'mantel-test': () => <div data-testid="mock-mantel-tool">Mantel tool</div>,
  },
}))

vi.mock('@/components/bio-tools/BioToolsHub', () => ({
  BioToolsHub: () => <div data-testid="bio-tools-hub">Hub</div>,
}))

vi.mock('@/components/bio-tools/BioToolSidebar', () => ({
  BioToolSidebar: () => <aside data-testid="bio-tool-sidebar">Sidebar</aside>,
}))

describe('BioToolWorkspace', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('keeps the active tool chip row horizontally scrollable inside the header', () => {
    render(<BioToolWorkspace />)

    const chipRow = screen.getByTestId('bio-tools-active-chip-row')

    expect(chipRow).toHaveClass('min-w-0')
    expect(chipRow).toHaveClass('flex-1')
    expect(chipRow).toHaveClass('overflow-x-auto')
    expect(chipRow).toHaveClass('whitespace-nowrap')
    expect(chipRow.closest('.overflow-hidden')).not.toBeNull()
  })
})
