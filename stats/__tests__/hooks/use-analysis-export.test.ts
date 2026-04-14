/**
 * useAnalysisExport 훅 단위 테스트
 *
 * Panel/Sidebar가 공용으로 소비하는 exportAnalysis 동작:
 * - item.results 없을 때 noResults 에러 토스트 + ExportService 호출 스킵
 * - 정상 경로: reportGenerating info → ExportService.export → reportSuccess
 * - ExportService.export result.success=false → reportError
 * - ExportService.export throw → exportError
 * - item.aiInterpretation 없고 item.results.aiInterpretation 있을 때 recover
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { AnalysisHistory } from '@/lib/stores/history-store'

const exportMock = vi.fn()
const convertMock = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastInfoMock = vi.fn()

vi.mock('@/lib/services/export/export-service', () => ({
  ExportService: {
    export: (...args: unknown[]) => exportMock(...args),
  },
}))

vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: (...args: unknown[]) => convertMock(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}))

import { useAnalysisExport } from '@/hooks/use-analysis-export'

function makeHistory(overrides: Partial<AnalysisHistory> = {}): AnalysisHistory {
  return {
    id: 'h-1',
    name: 'Test Analysis',
    timestamp: Date.now(),
    method: { id: 'independent-t-test', name: 'Independent t-test' },
    dataFileName: 'sample.csv',
    dataRowCount: 100,
    results: {
      pValue: 0.01,
      statistic: 2.5,
    } as unknown as AnalysisHistory['results'],
    aiInterpretation: null,
    apaFormat: null,
    ...overrides,
  } as AnalysisHistory
}

describe('useAnalysisExport', () => {
  beforeEach(() => {
    exportMock.mockReset()
    convertMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    toastInfoMock.mockReset()
    convertMock.mockReturnValue({ method: 'independent-t-test' })
  })

  it('item.results가 null이면 noResults 에러 토스트 + 모든 하위 호출 스킵', async () => {
    const { result } = renderHook(() => useAnalysisExport())
    const item = makeHistory({ results: null as unknown as AnalysisHistory['results'] })

    await act(async () => {
      await result.current.exportAnalysis(item, 'docx')
    })

    expect(toastErrorMock).toHaveBeenCalledWith('분석 결과가 없습니다.')
    expect(exportMock).not.toHaveBeenCalled()
    expect(convertMock).not.toHaveBeenCalled()
    expect(toastInfoMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('정상 경로: generating info → export 호출 → success 토스트', async () => {
    exportMock.mockResolvedValue({ success: true, fileName: 'report.docx' })
    const { result } = renderHook(() => useAnalysisExport())
    const item = makeHistory()

    await act(async () => {
      await result.current.exportAnalysis(item, 'docx')
    })

    expect(toastInfoMock).toHaveBeenCalledWith('DOCX 보고서를 생성하고 있습니다...')
    expect(exportMock).toHaveBeenCalledTimes(1)
    const [context, format] = exportMock.mock.calls[0]
    expect(format).toBe('docx')
    expect(context.dataInfo).toEqual({
      fileName: 'sample.csv',
      totalRows: 100,
      columnCount: 0,
      variables: [],
    })
    expect(context.exportOptions).toEqual({
      includeInterpretation: true,
      includeRawData: false,
      includeMethodology: false,
      includeReferences: false,
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('보고서가 다운로드되었습니다.', {
      description: 'report.docx',
    })
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('ExportService.export가 success:false 반환 시 reportError 토스트', async () => {
    exportMock.mockResolvedValue({ success: false, error: 'bad format' })
    const { result } = renderHook(() => useAnalysisExport())

    await act(async () => {
      await result.current.exportAnalysis(makeHistory(), 'docx')
    })

    expect(toastErrorMock).toHaveBeenCalledWith('보고서 생성 실패', {
      description: 'bad format',
    })
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('ExportService.export가 throw하면 exportError 토스트', async () => {
    exportMock.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useAnalysisExport())

    await act(async () => {
      await result.current.exportAnalysis(makeHistory(), 'docx')
    })

    expect(toastErrorMock).toHaveBeenCalledWith('내보내기 중 오류가 발생했습니다.')
  })

  it('item.aiInterpretation 없을 때 item.results.aiInterpretation에서 복원', async () => {
    exportMock.mockResolvedValue({ success: true, fileName: 'x.docx' })
    const { result } = renderHook(() => useAnalysisExport())
    const item = makeHistory({
      aiInterpretation: null,
      apaFormat: null,
      results: {
        pValue: 0.01,
        aiInterpretation: 'AI해석본문',
        apaFormat: 't(98) = 2.50, p = .01',
      } as unknown as AnalysisHistory['results'],
    })

    await act(async () => {
      await result.current.exportAnalysis(item, 'docx')
    })

    const [context] = exportMock.mock.calls[0]
    expect(context.aiInterpretation).toBe('AI해석본문')
    expect(context.apaFormat).toBe('t(98) = 2.50, p = .01')
  })

  it('optionsOverride로 기본 옵션 덮어쓰기', async () => {
    exportMock.mockResolvedValue({ success: true, fileName: 'x.docx' })
    const { result } = renderHook(() => useAnalysisExport())

    await act(async () => {
      await result.current.exportAnalysis(makeHistory(), 'docx', {
        includeMethodology: true,
        includeReferences: true,
      })
    })

    const [context] = exportMock.mock.calls[0]
    expect(context.exportOptions).toEqual({
      includeInterpretation: true,
      includeRawData: false,
      includeMethodology: true,
      includeReferences: true,
    })
  })
})
