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
 *   S3: 정상 흐름 — 단일 업로드 완료 시 normality 패치 적용됨
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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
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

/**
 * Papa.parse는 오버로드 함수라 mockImplementationOnce에 직접 구현을 넘기면
 * TypeScript가 스트림 오버로드로 해석해 타입 에러가 발생한다.
 * 테스트에서 필요한 파일 파싱 오버로드만 사용하도록 좁힌 타입으로 캐스팅하는 헬퍼.
 */
type MockParseImpl = (_file: File, config?: { complete?: (r: ParseResult<Record<string, string>>) => void }) => void
function mockParseOnce(
  parseMock: { mockImplementationOnce: (_fn: never) => unknown },
  impl: MockParseImpl
): void {
  parseMock.mockImplementationOnce(impl as never)
}

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

function makeParseResultWithErrors(
  errors: ParseResult<Record<string, string>>['errors'],
): ParseResult<Record<string, string>> {
  return {
    ...makeParseResult('data.csv'),
    errors,
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

      let firstComplete: ((_r: ParseResult<Record<string, string>>) => void) | null = null

      // 첫 번째 parse: complete를 캡처만 (아직 실행 안 함)
      mockParseOnce(parseMock, (_file, config) => {
        firstComplete = config?.complete ?? null
      })

      // 두 번째 parse: 즉시 실행
      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResult('file2.csv'))
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

      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResult('solo.csv'))
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
      let resolveEnrich!: (val: { enrichedColumns: ColumnStatistics[]; testedCount: number; failedColumns: string[] }) => void
      enrichMock.mockReturnValueOnce(
        new Promise((resolve) => { resolveEnrich = resolve })
      )

      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResult('data.csv'))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('data.csv')) })

      // complete 콜백 실행됨 → enrichWithNormality 호출 중 (아직 resolve 안 됨)
      expect(enrichMock).toHaveBeenCalledOnce()
      expect(useAnalysisStore.getState().uploadedFileName).toBe('data.csv')

      // Before: normality 아직 없음 (enrichment 미완료)
      const normalityBefore = useAnalysisStore.getState().validationResults?.columnStats?.[0].normality
      expect(normalityBefore).toBeUndefined()

      // 사용자가 데이터 클리어 → setUploadedFile(null) → uploadNonce 증가 (uploadTokenRef는 변경 없음)
      act(() => { result.current.clearDataContext() })
      expect(useAnalysisStore.getState().uploadedFileName).toBeNull()

      // 클리어 후 새 validationResults를 수동 설정:
      // — 실제로는 새 파일 업로드가 시작됐지만 아직 enrichWithNormality를 호출하지 않은 상황 시뮬레이션
      // — validationResults가 null이 아닌 상태에서도 nonce 가드가 패치를 막는지 검증하기 위함
      // — patchColumnNormality는 validationResults가 null이면 자체 early return하므로,
      //   null이 아닌 상태에서 테스트해야 nonce 가드의 실제 동작을 증명할 수 있음
      const freshValidation = {
        isValid: true, totalRows: 5, columnCount: 1, missingValues: 0,
        dataType: 'tabular' as const, variables: ['weight'], errors: [], warnings: [],
        columnStats: [
          { name: 'weight', type: 'numeric', numericCount: 5, textCount: 0, missingCount: 0, uniqueValues: 5 },
        ] as ColumnStatistics[],
      }
      act(() => { useAnalysisStore.getState().setValidationResults(freshValidation) })

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
          failedColumns: [],
        })
        await Promise.resolve()
      })

      // nonce 가드가 patchColumnNormality 호출을 차단했으므로 fresh validationResults에 normality가 없어야 함
      // (validationResults가 null이 아닌 상태에서 normality가 undefined → 실제로 패치가 막힌 것)
      const normalityAfter = useAnalysisStore.getState().validationResults?.columnStats?.[0].normality
      expect(normalityAfter).toBeUndefined()
      // fresh validationResults 자체는 보존됨 (clearDataContext가 다시 호출되지 않았음)
      expect(useAnalysisStore.getState().validationResults).not.toBeNull()
    })
  })

  // ── S4: PapaParse 에러 — 치명적 오류 (Delimiter/Quotes) ─────

  describe('S4: 치명적 CSV 파싱 오류 — Delimiter/Quotes', () => {
    it('Delimiter 에러 → toast.error + 스토어 업데이트 안 됨', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const { toast } = await import('sonner')

      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResultWithErrors([
          { type: 'Delimiter', code: 'UndetectableDelimiter', message: '구분자를 감지할 수 없습니다.', row: 0 },
        ]))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('bad.csv')) })

      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        expect.stringContaining('구분자를 감지할 수 없습니다.')
      )
      // 스토어에 데이터가 들어가면 안 됨
      expect(useAnalysisStore.getState().uploadedFileName).toBeNull()
      expect(useHubChatStore.getState().dataContext).toBeNull()
    })

    it('Quotes 에러 → toast.error + 스토어 업데이트 안 됨', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const { toast } = await import('sonner')

      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResultWithErrors([
          { type: 'Quotes', code: 'InvalidQuotes', message: '따옴표가 올바르지 않습니다.', row: 2 },
        ]))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('bad.csv')) })

      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        expect.stringContaining('따옴표가 올바르지 않습니다.')
      )
      expect(useAnalysisStore.getState().uploadedFileName).toBeNull()
    })
  })

  // ── S5: PapaParse 에러 — 경고 수준 (FieldMismatch) ──────────

  describe('S5: 경고 수준 CSV 파싱 오류 — FieldMismatch', () => {
    it('FieldMismatch → toast.warning + 스토어 업데이트는 진행됨', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const { toast } = await import('sonner')

      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResultWithErrors([
          { type: 'FieldMismatch', code: 'TooFewFields', message: '필드 수가 맞지 않습니다.', row: 3 },
        ]))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('partial.csv')) })

      expect(vi.mocked(toast.warning)).toHaveBeenCalledWith(
        expect.stringContaining('1건')
      )
      // 데이터는 스토어에 들어가야 함
      expect(useAnalysisStore.getState().uploadedFileName).toBe('partial.csv')
      expect(useHubChatStore.getState().dataContext?.fileName).toBe('partial.csv')
      // toast.error는 호출되면 안 됨
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    })

    it('FieldMismatch 여러 개 → 건수가 toast에 포함됨', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const { toast } = await import('sonner')

      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResultWithErrors([
          { type: 'FieldMismatch', code: 'TooFewFields', message: 'err', row: 1 },
          { type: 'FieldMismatch', code: 'TooFewFields', message: 'err', row: 2 },
          { type: 'FieldMismatch', code: 'TooFewFields', message: 'err', row: 5 },
        ]))
      })

      const { result } = renderHook(() => useHubDataUpload())
      act(() => { result.current.handleFileSelected(makeFile('partial.csv')) })

      expect(vi.mocked(toast.warning)).toHaveBeenCalledWith(
        expect.stringContaining('3건')
      )
    })
  })

  // ── S6: error 콜백 token 가드 ───────────────────────────────

  describe('S6: error 콜백 — stale 토큰 무시', () => {
    it('첫 번째 파일 에러가 두 번째 파일 선택 후 발생하면 toast 호출 안 됨', async () => {
      const Papa = (await import('papaparse')).default
      const parseMock = vi.mocked(Papa.parse)
      const { toast } = await import('sonner')

      type ParseConfig = { complete?: (_r: ParseResult<Record<string, string>>) => void; error?: (_e: Error) => void }
      let firstErrorCallback: ((_e: Error) => void) | null = null

      // 첫 번째 parse: error 콜백 캡처만 (실행 안 함)
      parseMock.mockImplementationOnce(((_file: File, config?: ParseConfig) => {
        firstErrorCallback = config?.error ?? null
      }) as never)
      // 두 번째 parse: 정상 완료
      parseMock.mockImplementationOnce(((_file: File, config?: ParseConfig) => {
        config?.complete?.(makeParseResult('file2.csv'))
      }) as never)

      const { result } = renderHook(() => useHubDataUpload())

      act(() => { result.current.handleFileSelected(makeFile('file1.csv')) })
      act(() => { result.current.handleFileSelected(makeFile('file2.csv')) })

      // file2 완료 후 file1의 stale error 콜백 실행
      act(() => { firstErrorCallback?.(new Error('파일 읽기 실패')) })

      // stale error이므로 toast.error가 호출되면 안 됨
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
      // file2 데이터는 유지됨
      expect(useAnalysisStore.getState().uploadedFileName).toBe('file2.csv')
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

      enrichMock.mockResolvedValueOnce({ enrichedColumns: [enrichedCol], testedCount: 1, failedColumns: [] })
      mockParseOnce(parseMock, (_file, config) => {
        config?.complete?.(makeParseResult('data.csv'))
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
