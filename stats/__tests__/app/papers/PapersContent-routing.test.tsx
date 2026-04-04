/**
 * PapersContent Routing Tests
 *
 * Tests URL-based routing logic: doc/tab params, tab switching,
 * and URL state management via window.history.
 */

import React from 'react'
import { vi, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ---------- stub child components ----------

vi.mock('@/components/papers/PapersHub', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="papers-hub" data-props={JSON.stringify(props)} />
  ),
}))

vi.mock('@/components/papers/DocumentEditor', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="document-editor" data-doc-id={props.documentId as string} />
  ),
}))

vi.mock('@/components/papers/PackageBuilder', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="package-builder" data-pkg-id={props.packageId as string} />
  ),
}))

vi.mock('@/app/literature/LiteratureSearchContent', () => ({
  default: () => <div data-testid="literature-search" />,
}))

// Make next/dynamic resolve synchronously
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Execute the loader eagerly and cache the module reference.
    // Because vi.mock hoists, the component mocks above are already in place,
    // so the dynamic import resolves to our stubs.
    let Comp: React.ComponentType | null = null
    const promise = loader().then((mod) => {
      Comp = mod.default
    })
    // Return a wrapper that renders the resolved component (or nothing while loading)
    const DynamicWrapper = (props: Record<string, unknown>): React.ReactElement | null => {
      if (!Comp) {
        // Force synchronous resolution for tests — microtask should already have settled
        throw promise
      }
      return <Comp {...props} />
    }
    DynamicWrapper.displayName = 'DynamicWrapper'
    return DynamicWrapper
  },
}))

// ---------- helpers ----------

let replaceStateSpy: Mock
let pushStateSpy: Mock

function setLocationSearch(search: string): void {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search },
  })
}

beforeEach(() => {
  replaceStateSpy = vi.fn()
  pushStateSpy = vi.fn()
  Object.defineProperty(window, 'history', {
    writable: true,
    value: {
      ...window.history,
      replaceState: replaceStateSpy,
      pushState: pushStateSpy,
      back: vi.fn(),
    },
  })
  setLocationSearch('')
})

afterEach(() => {
  vi.restoreAllMocks()
})

// We need to lazily import so that the mocks above are in place
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let PapersContent: typeof import('@/app/papers/PapersContent').default

beforeAll(async () => {
  const mod = await import('@/app/papers/PapersContent')
  PapersContent = mod.default
})

describe('PapersContent routing', () => {
  it('doc param takes priority over tab param', () => {
    setLocationSearch('?doc=abc&tab=literature')

    render(<PapersContent />)

    expect(screen.getByTestId('document-editor')).toBeInTheDocument()
    expect(screen.getByTestId('document-editor').getAttribute('data-doc-id')).toBe('abc')
    expect(screen.queryByTestId('literature-search')).not.toBeInTheDocument()
  })

  it('tab=literature shows LiteratureSearchContent', () => {
    setLocationSearch('?tab=literature')

    render(<PapersContent />)

    expect(screen.getByTestId('literature-search')).toBeInTheDocument()
    expect(screen.queryByTestId('papers-hub')).not.toBeInTheDocument()
    expect(screen.queryByTestId('document-editor')).not.toBeInTheDocument()
  })

  it('tab switch uses replaceState and preserves project param', () => {
    setLocationSearch('?tab=literature&project=p1')

    render(<PapersContent />)

    // Verify we are on the literature tab
    expect(screen.getByTestId('literature-search')).toBeInTheDocument()

    // Now click the docs tab button ("문서")
    const docsButton = screen.getByRole('button', { name: /문서/i })
    fireEvent.click(docsButton)

    // replaceState should have been called
    expect(replaceStateSpy).toHaveBeenCalledTimes(1)

    const [, , url] = replaceStateSpy.mock.calls[0] as [unknown, string, string]

    // URL should NOT contain tab= (docs is default, so tab is removed)
    expect(url).not.toContain('tab=')

    // URL should still contain project=p1
    expect(url).toContain('project=p1')
  })

  it('default (no params) shows PapersHub', () => {
    setLocationSearch('')

    render(<PapersContent />)

    expect(screen.getByTestId('papers-hub')).toBeInTheDocument()
    expect(screen.queryByTestId('document-editor')).not.toBeInTheDocument()
    expect(screen.queryByTestId('literature-search')).not.toBeInTheDocument()
  })
})
