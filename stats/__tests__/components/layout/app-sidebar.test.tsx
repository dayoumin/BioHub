import * as React from 'react'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSetShowHub = vi.fn()
const mockOpenSettings = vi.fn()
const mockSetActiveProject = vi.fn()
const mockClearActiveProject = vi.fn()
const mockRefreshProjects = vi.fn()

const analysisStoreState = {
  currentStep: 1,
  selectedMethod: null,
  results: null,
}

const modeStoreState = {
  setShowHub: mockSetShowHub,
}

const researchProjectStoreState = {
  activeResearchProjectId: null,
  projects: [],
  setActiveProject: mockSetActiveProject,
  clearActiveProject: mockClearActiveProject,
  refreshProjects: mockRefreshProjects,
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string
    }
  >(({ children, href, ...props }, ref) => (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  )),
}))

vi.mock('@/contexts/ui-context', () => ({
  useUI: () => ({
    openSettings: mockOpenSettings,
  }),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: (selector: (state: typeof analysisStoreState) => unknown) => selector(analysisStoreState),
}))

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: (selector: (state: typeof modeStoreState) => unknown) => selector(modeStoreState),
}))

vi.mock('@/lib/stores/research-project-store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stores/research-project-store')>(
    '@/lib/stores/research-project-store',
  )

  return {
    ...actual,
    useResearchProjectStore: (
      selector: (state: typeof researchProjectStoreState) => unknown,
    ) => selector(researchProjectStoreState),
  }
})

vi.mock('@/lib/research/project-storage', () => ({
  listProjectEntityRefs: () => [],
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
  },
}))

import { AppSidebar } from '@/components/layout/app-sidebar'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem(STORAGE_KEYS.ui.sidebar, 'collapsed')
  })

  it('shows only the current item tooltip while collapsed', async () => {
    const user = userEvent.setup()
    const { container } = render(<AppSidebar />)

    const bioToolsLink = container.querySelector('a[href="/bio-tools"]')
    const graphStudioLink = container.querySelector('a[href="/graph-studio"]')

    expect(bioToolsLink).not.toBeNull()
    expect(graphStudioLink).not.toBeNull()

    await user.hover(bioToolsLink as HTMLElement)

    const firstTooltip = await screen.findByRole('tooltip')
    expect(within(firstTooltip).getByText('Bio-Tools')).toBeInTheDocument()

    await user.hover(firstTooltip)
    await user.unhover(bioToolsLink as HTMLElement)
    await user.hover(graphStudioLink as HTMLElement)

    await waitFor(() => {
      const tooltips = screen.getAllByRole('tooltip')
      expect(tooltips).toHaveLength(1)
      expect(within(tooltips[0] as HTMLElement).getByText('Graph Studio')).toBeInTheDocument()
    })

    const remainingTooltips = screen.getAllByRole('tooltip')
    expect(remainingTooltips.some(tooltip => tooltip.textContent?.includes('Bio-Tools'))).toBe(false)
  })
})
