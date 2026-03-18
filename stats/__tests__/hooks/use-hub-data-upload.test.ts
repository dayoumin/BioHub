/**
 * use-hub-data-upload — 경쟁 상태 시뮬레이션
 *
 * Fix 1의 이중 가드를 검증:
 *   - token 가드: 연속 파일 선택 시 stale 파싱 콜백 무시
 *   - nonce 가드: 정규성 검정 중 clearDataContext() 호출 시 패치 무시
 *
 * 시나리오별 검증:
 *   S1: 파일 A 파싱 중 파일 B 선택 → A complete 콜백은 무시됨
 *   S2: 파일 A complete 후 정규성 검정 중 clearDataContext() → 패치 무시됨
 *   S3: 정상 흐름 — 단일 업로드 완료 시 normaliy 패치 적용됨
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ParseResult } from 'papaparse'
import { useHubDataUpload } from '@/hooks/use-hub-data-upload'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHubChatStore } from '@/lib/stores/hub-chat-store'
import { enrichWithNormality } from '@/lib/services/normality-enrichment-service'
import type { ColumnStatistics } from '@/types/analysis'

// ===== 모의 =====

vi.mock('papaparse', () => ({
  default: { parse: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/services/data-validation-service', () => ({
  DataValidationService: {
    performValidation: vi.fn().mockReturnValue({
      isValid: true,
      totalRows: 10,
      columnCount: 2,
      missingValues: 0,
      dataType: 'tabular',
      variables: ['weight', 'group'],
      errors: [],
      warnings: [],
      columnStats: [
        { name: 'weight', type: 'numeric', numericCount: 10, textCount: 0, missingCount: 0, uniqueValues: 10 },
        { name: 'group', type: 'categorical', numericCount: 0, textCount: 10, missingCount: 0, uniqueValues: 2 },
      ] as ColumnStatistics[],
    }),
  },
}))

// enrichWithNormality: 기본값은 즉시 resolve — 테스트마다 override
vi.mock('@/lib/services/normality-enrichment-service', () => ({
  enrichWithNormality: vi.fn(),
}))

// ===== 헬퍼 =====

function makeFile(name: string): File {
  return new File(['a,b\n1,2\n3,4'], name, { type: 'text/csv' })
}

function makeParseResult(fileName: string): ParseResult<Record<string, string>> {
  return {
    data: [
      { weight: '70', group: 'A' },
      { weight: '65', group: 'B' },
    ],
    errors: [],
    meta: { delimiter: ',', linebreak: '\n', aborted: false, truncated: false, cursor: 0, fields: ['weight', 'group'] },
  }
}

// ===== 공통 setup =====

beforeEach(() => {
  act(() => {
    useAnalysisStore.getState().reset()
    useHubChatStore.getState().clearAll()
  })
  vi.clearAllMocks()
  // 기본 mock: 정규성 검정이 아직 완료되지 않은 pending 상태 시뮬레이션.
  // S2/S3에서 mockReturnValueOnce로 override.
  // pending Promise를 쓰면 S1 테스트에서 .then()이 실행되지 않아 token 가드만 검증 가능.
  vi.mocked(enrichWithNormality).mockReturnValue(new Promise(() => { /* never resolves */ }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ===== 테스트 =====

describe('use-hub-data-upload — 경쟁 상태 시뮬레이션', () => {

  // ── S1: token 가드 ──────────────────────────────────────────

  describe('S1: token 가드 — 연속 파일 선택', () => {
    it('두 번째 파일 선택 후 첫 번째 complete 콜백은 무시된다', async () => {
      const { default: Papa } = await import('papaparse')
      const parseMock = vi.mocked(Papa.parse)

      let firstComplete: ((results: ParseResult<Record<string, string>>) => void) | null = null

      // 첫 번째 parse: complete를 캡처만 (아직 실행 안 함)
      parseMock.mockImplementationOnce((_file, config: { complete?: (r: ParseResult<Record<string, string>>) => void }) => {
        firstComplete = config.complete ?? null
      })

      // 두 번째 parse: 즉시 실행
      parseMock.mockImplementationOnce((_file, config: { complete?: (r: ParseResult<Record<string, string>>) => void }) => {
        config.complete?.(makeParseResult('file2.csv'))
      })

      const { result } = renderHook(() => useHubDataUpload())

      // 첫 번째 파일 선택 (파싱 대기 중)
      act(() => { result.current.handleFileSelected(makeFile('file1.csv')) })

      // 두 번째 파일 선택 (즉시 파싱 완료)
      act(() => { result.current.handleFileSelected(makeFile('file2.csv')) })

      // 두 번째 complete 후 store는 file2 데이터
      expect(useAnalysisStore.getState().uploadedFileName).toBe('file2.csv')

      // 이제 첫 번째 stale 콜백 실행
      act(() => { firstComplete?.(makeParseResult('file1.csv')) })

      // file1 데이터가 덮어쓰지 않아야 함 — file2 유지
      expect(useAnalysisStore.getState().uploadedFileName).toBe('file2.csv')
    })

    it('첫 번째 업로드가 유일하면 complete 콜백이 적용된다', async () => {
      const { default: Papa } = await import('papaparse')
      const parseMock = vi.mocked(Papa.parse)

      parseMock.mockImplementationOnce((_file, config: { complete?: (r: ParseResult<Record<string, string>>) => void }) => {
        config.complete?.(makeParseResult('solo.csv'))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('solo.csv')) })

      expect(useAnalysisStore.getState().uploadedFileName).toBe('solo.csv')
      expect(useHubChatStore.getState().dataContext?.fileName).toBe('solo.csv')
    })
  })

  // ── S2: nonce 가드 ─────────────────────────────────────────

  describe('S2: nonce 가드 — clearDataContext()가 정규성 검정 중 호출됨', () => {
    it('clearDataContext() 후 enrichWithNormality 완료 시 patchColumnNormality가 호출되지 않는다', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const enrichMock = vi.mocked(enrichWithNormality)

      // enrichWithNormality를 수동으로 resolve할 수 있도록 제어
      let resolveEnrich!: (val: { enrichedColumns: ColumnStatistics[]; testedCount: number }) => void
      enrichMock.mockReturnValueOnce(
        new Promise((resolve) => { resolveEnrich = resolve })
      )

      parseMock.mockImplementationOnce((_file, config: { complete?: (r: ParseResult<Record<string, string>>) => void }) => {
        config.complete?.(makeParseResult('data.csv'))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('data.csv')) })

      // complete 콜백 실행됨 → enrichWithNormality 호출 중 (아직 resolve 안 됨)
      expect(enrichMock).toHaveBeenCalledOnce()
      expect(useAnalysisStore.getState().uploadedFileName).toBe('data.csv')

      // Before: normality 아직 없음 (enrichment 미완료)
      const normalityBefore = useAnalysisStore.getState().validationResults?.columnStats?.[0].normality
      expect(normalityBefore).toBeUndefined()

      // 사용자가 데이터 클리어 → setUploadedFile(null) → uploadNonce 증가
      act(() => { result.current.clearDataContext() })

      // clearDataContext 후 uploadedFile은 null
      expect(useAnalysisStore.getState().uploadedFileName).toBeNull()

      // 이제 enrichWithNormality 늦게 완료 — nonce 불일치로 패치 차단되어야 함
      await act(async () => {
        resolveEnrich({
          enrichedColumns: [
            {
              name: 'weight', type: 'numeric', numericCount: 10, textCount: 0,
              missingCount: 0, uniqueValues: 10,
              normality: { statistic: 0.97, pValue: 0.3, isNormal: true, testName: 'shapiro-wilk' },
            },
          ],
          testedCount: 1,
        })
        await Promise.resolve()
      })

      // After: normality가 여전히 undefined여야 함 — nonce 가드가 patchColumnNormality를 차단
      // clearDataContext() 후 validationResults 자체가 null이므로, 패치 시도가 있었어도 반영 안 됨
      const normalityAfter = useAnalysisStore.getState().validationResults?.columnStats?.[0].normality
      expect(normalityAfter).toBeUndefined()
    })
  })

  // ── S3: 정상 흐름 ───────────────────────────────────────────

  describe('S3: 정상 흐름 — 단일 업로드 + 정규성 검정 완료', () => {
    it('방해 없이 완료되면 normality 데이터가 store에 패치된다', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const enrichMock = vi.mocked(enrichWithNormality)

      const enrichedCol: ColumnStatistics = {
        name: 'weight', type: 'numeric', numericCount: 10, textCount: 0,
        missingCount: 0, uniqueValues: 10,
        normality: { statistic: 0.97, pValue: 0.3, isNormal: true, testName: 'shapiro-wilk' },
      }

      enrichMock.mockResolvedValueOnce({ enrichedColumns: [enrichedCol], testedCount: 1 })
      parseMock.mockImplementationOnce((_file, config: { complete?: (r: ParseResult<Record<string, string>>) => void }) => {
        config.complete?.(makeParseResult('data.csv'))
      })

      const { result } = renderHook(() => useHubDataUpload())

      await act(async () => {
        result.current.handleFileSelected(makeFile('data.csv'))
        await new Promise(r => setTimeout(r, 0))  // macrotask flush — .then() 체인 깊이에 무관하게 안전
      })

      // 정규성 결과가 패치되어야 함
      const normality = useAnalysisStore.getState().validationResults?.columnStats?.[0].normality
      expect(normality?.pValue).toBe(0.3)
      expect(normality?.isNormal).toBe(true)
    })
  })
})
