import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResultsCopyExport } from '../use-results-copy-export'

const {
  successMock,
  errorMock,
  generateSummaryTextMock,
  exportCodeFromAnalysisMock,
  isCodeExportAvailableMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  successMock: vi.fn(),
  errorMock: vi.fn(),
  generateSummaryTextMock: vi.fn(),
  exportCodeFromAnalysisMock: vi.fn(),
  isCodeExportAvailableMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => successMock(...args),
    error: (...args: unknown[]) => errorMock(...args),
  },
}))

vi.mock('@/lib/services', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services')>('@/lib/services')
  return {
    ...actual,
    generateSummaryText: (...args: unknown[]) => generateSummaryTextMock(...args),
    exportCodeFromAnalysis: (...args: unknown[]) => exportCodeFromAnalysisMock(...args),
    isCodeExportAvailable: (...args: unknown[]) => isCodeExportAvailableMock(...args),
  }
})

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}))

interface HookOverrides {
  results?: Record<string, unknown> | null
  statisticalResult?: Record<string, unknown> | null
}

class MockClipboardItem {
  public readonly items: Record<string, MockBlob>

  public constructor(items: Record<string, MockBlob>) {
    this.items = items
  }
}

class MockBlob {
  private readonly value: string
  public readonly type: string

  public constructor(parts: Array<string | number>, options?: { type?: string }) {
    this.value = parts.map((part) => String(part)).join('')
    this.type = options?.type ?? ''
  }

  public async text(): Promise<string> {
    return this.value
  }
}

function makeHook(overrides?: HookOverrides) {
  return renderHook(
    ({ hookOverrides }: { hookOverrides?: HookOverrides }) =>
      useResultsCopyExport({
        results: hookOverrides?.results === null
          ? null
          : {
              method: 'Independent Samples t-Test',
              pValue: 0.03,
              statistic: 2.5,
              effectSize: 0.8,
              interpretation: '유의',
              confidence: {
                lower: 0.1,
                upper: 0.9,
                estimate: 0.5,
                level: 0.95,
              },
              ...hookOverrides?.results,
            },
        statisticalResult: hookOverrides?.statisticalResult === null
          ? null
          : {
              testName: 't-test',
              statisticName: 't',
              statistic: 2.5,
              pValue: 0.03,
              interpretation: '통계적으로 유의합니다.',
              ...hookOverrides?.statisticalResult,
            } as never,
        interpretation: 'AI 해석 본문',
        apaFormat: 't(18) = 2.50, p = .030',
        selectedMethod: {
          id: 'two-sample-t',
          name: 'Independent Samples t-Test',
          description: 'Two groups',
          category: 't-test',
        },
        variableMapping: {
          dependentVar: 'value',
          groupVar: 'group',
        },
        analysisOptions: {
          alpha: 0.05,
          showAssumptions: true,
          showEffectSize: true,
          alternative: 'two-sided',
          methodSettings: {},
        },
        uploadedFileName: 'test.csv',
        uploadedData: [{ group: 'A', value: 10 }],
        t: {
          results: {
            clipboard: {
              aiSeparator: 'AI 해석',
              itemHeader: '항목',
              valueHeader: '값',
              statistic: (name: string) => name,
              df: '자유도',
              effectSize: '효과크기',
              confidenceInterval: '신뢰구간',
              interpretation: '해석',
              aiInterpretation: 'AI 해석',
            },
            toast: {
              copyWithAi: 'copy-with-ai',
              copySuccess: 'copy-success',
              copyError: 'copy-error',
            },
          },
        } as never,
      }),
    {
      initialProps: {
        hookOverrides: overrides,
      },
    },
  )
}

describe('useResultsCopyExport', () => {
  const originalClipboardItem = globalThis.ClipboardItem
  const originalBlob = globalThis.Blob
  const originalClipboard = navigator.clipboard

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    generateSummaryTextMock.mockReturnValue('Plain summary')
    isCodeExportAvailableMock.mockReturnValue(true)

    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: MockClipboardItem,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'Blob', {
      value: MockBlob,
      configurable: true,
      writable: true,
    })

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: vi.fn().mockResolvedValue(undefined),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: originalClipboardItem,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'Blob', {
      value: originalBlob,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    })
  })

  it('ClipboardItem 경로에서 html/plain payload를 쓰고 copied state를 reset한다', async () => {
    const { result } = makeHook()

    await act(async () => {
      await result.current.handleCopyResults()
    })

    expect(navigator.clipboard.write).toHaveBeenCalledTimes(1)
    const clipboardItems = vi.mocked(navigator.clipboard.write).mock.calls[0]?.[0] as unknown as MockClipboardItem[]
    const firstItem = clipboardItems[0]
    expect(firstItem).toBeDefined()
    const plainText = await firstItem.items['text/plain'].text()
    const htmlText = await firstItem.items['text/html'].text()
    expect(plainText).toContain('Plain summary')
    expect(plainText).toContain('AI 해석 본문')
    expect(htmlText).toContain('<h3>t-test</h3>')
    expect(htmlText).toContain('AI 해석')
    expect(result.current.isCopied).toBe(true)
    expect(successMock).toHaveBeenCalledWith('copy-with-ai')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.isCopied).toBe(false)
  })

  it('resetCopyState가 copied 상태와 pending timeout을 정리한다', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { result } = makeHook()

    await act(async () => {
      await result.current.handleCopyResults()
    })
    expect(result.current.isCopied).toBe(true)

    act(() => {
      result.current.resetCopyState()
    })

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(result.current.isCopied).toBe(false)
  })

  it('unmount 시 pending copy timeout을 정리한다', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { result, unmount } = makeHook()

    await act(async () => {
      await result.current.handleCopyResults()
    })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('ClipboardItem이 없으면 writeText fallback을 사용한다', async () => {
    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { result } = makeHook()

    await act(async () => {
      await result.current.handleCopyResults()
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Plain summary'))
  })

  it('copy 실패 시 에러 토스트와 로거를 호출한다', async () => {
    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: vi.fn(),
        writeText: vi.fn().mockRejectedValue(new Error('clipboard failed')),
      },
      configurable: true,
    })

    const { result } = makeHook()

    await act(async () => {
      await result.current.handleCopyResults()
    })

    expect(loggerErrorMock).toHaveBeenCalledWith('Copy failed', {
      error: expect.any(Error),
    })
    expect(errorMock).toHaveBeenCalledWith('copy-error')
  })

  it('code export success/error를 toast로 노출한다', () => {
    exportCodeFromAnalysisMock
      .mockReturnValueOnce({ success: true, fileName: 'analysis.R' })
      .mockReturnValueOnce({ success: false, error: 'boom' })

    const { result } = makeHook()

    act(() => {
      result.current.handleCodeExport('R')
    })
    expect(successMock).toHaveBeenCalledWith('R 코드를 다운로드했습니다.', {
      description: 'analysis.R',
    })

    act(() => {
      result.current.handleCodeExport('python')
    })
    expect(errorMock).toHaveBeenCalledWith('boom')
  })
})
