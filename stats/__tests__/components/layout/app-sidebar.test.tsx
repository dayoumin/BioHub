import * as React from 'react'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'

const mockSetShowHub = vi.fn()
const mockOpenSettings = vi.fn()
const mockSetActiveProject = vi.fn()
const mockClearActiveProject = vi.fn()
const mockRefreshProjects = vi.fn()
let mockLanguage: 'ko' | 'en' = 'ko'

const analysisStoreState = {
  currentStep: 1,
  selectedMethod: null as { id: string } | null,
  results: null,
}

const modeStoreState = {
  setShowHub: mockSetShowHub,
}

const researchProjectStoreState = {
  activeResearchProjectId: null,
  projects: [] as Array<{
    id: string
    name: string
    status: string
    presentation?: { emoji?: string }
  }>,
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

vi.mock('@/hooks/use-app-preferences', () => ({
  useAppPreferences: () => ({
    currentLanguage: mockLanguage,
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
    mockLanguage = 'ko'
    analysisStoreState.currentStep = 1
    analysisStoreState.selectedMethod = null
    analysisStoreState.results = null
    researchProjectStoreState.activeResearchProjectId = null
    researchProjectStoreState.projects = []
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

  it('renders localized English labels when UI language is English', async () => {
    mockLanguage = 'en'
    localStorage.setItem(STORAGE_KEYS.ui.sidebar, 'expanded')

    render(<AppSidebar />)

    expect(await screen.findByText('Statistical Analysis')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Writing Tools')).toBeInTheDocument()
  })

  it('shows localized English tooltips while collapsed', async () => {
    mockLanguage = 'en'
    localStorage.setItem(STORAGE_KEYS.ui.sidebar, 'collapsed')
    const user = userEvent.setup()
    const { container } = render(<AppSidebar />)

    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    const disabledItem = container.querySelector('div.cursor-not-allowed')

    expect(settingsButton).not.toBeNull()
    expect(disabledItem).not.toBeNull()

    await user.hover(settingsButton as HTMLElement)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Settings')

    await user.unhover(settingsButton as HTMLElement)
    await user.hover(disabledItem as HTMLElement)

    await waitFor(() => {
      const tooltips = screen.getAllByRole('tooltip')
      expect(tooltips.some(tooltip => tooltip.textContent?.includes('Scientific Name Validation (Soon)'))).toBe(true)
    })
  })

  it('shows English auto-save toast when leaving an in-progress analysis', async () => {
    mockLanguage = 'en'
    localStorage.setItem(STORAGE_KEYS.ui.sidebar, 'expanded')
    analysisStoreState.currentStep = 2
    analysisStoreState.selectedMethod = { id: 't-test' }

    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByRole('link', { name: 'Bio-Tools' }))

    expect(toast.info).toHaveBeenCalledWith('Analysis auto-saved', {
      description: 'You can continue it when you return home.',
      duration: 3000,
    })
  })

  it('shows English activation toast when switching projects', async () => {
    mockLanguage = 'en'
    localStorage.setItem(STORAGE_KEYS.ui.sidebar, 'expanded')
    researchProjectStoreState.projects = [
      {
        id: 'project-1',
        name: 'Reef Survey',
        status: 'active',
        presentation: { emoji: '🧪' },
      },
    ]

    const user = userEvent.setup()
    render(<AppSidebar />)

    await user.click(screen.getByRole('button', { name: /Working Solo/i }))
    await user.click(screen.getByText('Reef Survey'))

    expect(toast.success).toHaveBeenCalledWith("'Reef Survey' activated")
  })
})
