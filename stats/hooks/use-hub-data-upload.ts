'use client'

/**
 * 허브 인라인 데이터 업로드 훅
 *
 * use-data-upload.ts의 경량 버전 — 허브에서 인라인 업로드 시 사용.
 * - DataValidationService로 검증
 * - analysis-store에 데이터 저장 (Step 1 호환)
 * - hubChatStore에 데이터 컨텍스트 설정
 * - 비동기 정규성 검정 (fire-and-forget)
 * - 업로드 request token: 파일 A → 파일 B 연속 선택 시 늦게 완료된 A 콜백 무시
 * - 제외: reanalysis 호환성, step 네비게이션, quick analysis 자동감지
 */

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { TOAST } from '@/lib/constants/toast-messages'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHubChatStore } from '@/lib/stores/hub-chat-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import { enrichWithNormality } from '@/lib/services/normality-enrichment-service'
import { raceWithTimeout } from '@/lib/utils/promise-utils'
import { findCriticalParseError, parseWarningMessage } from '@/lib/utils/csv-parse-errors'
import { buildHubDataContext } from '@/lib/utils/hub-data-context'
import type { DataRow, ColumnStatistics } from '@/types/analysis'

interface UseHubDataUploadReturn {
  /** 파일 선택 시 호출 — 파싱 + 검증 + 스토어 업데이트 */
  handleFileSelected: (file: File) => void
  /** 데이터 컨텍스트 클리어 */
  clearDataContext: () => void
}

export function useHubDataUpload(): UseHubDataUploadReturn {
  /** 연속 업로드 경쟁 상태 방지: 가장 최근에 시작된 파싱만 적용 */
  const uploadTokenRef = useRef(0)

  const {
    setUploadedFile,
    setUploadedData,
    setValidationResults,
    patchColumnNormality,
  } = useAnalysisStore()

  const { addMessage, setDataContext } = useHubChatStore()

  const handleFileSelected = useCallback((file: File) => {
    // CSV만 지원 (Excel은 추후 확장 가능)
    const isExcel = /\.xlsx?$/i.test(file.name)
    if (isExcel) {
      toast.error(TOAST.data.csvOnlyInHub)
      return
    }

    // 이 파싱 요청의 고유 토큰 — 콜백이 실행될 때 여전히 최신인지 확인
    const token = ++uploadTokenRef.current

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // 이 콜백이 실행되는 시점에 더 최근 업로드가 시작됐으면 무시
        if (token !== uploadTokenRef.current) return

        // PapaParse 파싱 오류 확인 (malformed CSV)
        if (results.errors.length > 0) {
          const critical = findCriticalParseError(results.errors)
          if (critical) {
            toast.error(TOAST.data.csvParseError(critical.message))
            return
          }
          // FieldMismatch 등 경고 수준 — 계속 진행 (오류 행도 results.data에 포함됨)
          toast.warning(parseWarningMessage(results.errors.length))
        }

        const data = results.data as DataRow[]
        if (data.length === 0) {
          toast.error(TOAST.data.emptyData)
          return
        }

        // 1. analysis-store 업데이트 (Step 1 호환)
        setUploadedFile(file)
        setUploadedData(data)

        // 2. 검증
        const validation = DataValidationService.performValidation(data)
        setValidationResults(validation)

        // 3. 데이터 컨텍스트 빌드 + 저장
        const columns = validation.columns ?? []
        setDataContext(buildHubDataContext(file.name, validation))

        // 4. system 메시지
        addMessage({
          id: `sys_${Date.now()}`,
          role: 'system',
          content: `데이터 로드됨: ${file.name} (${validation.totalRows}행 x ${columns.length}열)`,
          timestamp: Date.now(),
        })

        toast.success(TOAST.data.loadSuccess(file.name))

        // 5. 비동기 정규성 검정 (fire-and-forget)
        if (validation.columnStats?.length) {
          const capturedNonce = useAnalysisStore.getState().uploadNonce
          raceWithTimeout(
              enrichWithNormality(validation.columnStats, data),
              15_000,
              'Normality enrichment timed out'
            )
            .then(({ enrichedColumns, testedCount }) => {
              // token 가드: 더 최신 파일 업로드가 시작됐으면 무시
              if (token !== uploadTokenRef.current) return
              if (testedCount > 0) {
                const current = useAnalysisStore.getState()
                // nonce 가드: clearDataContext()가 setUploadedFile(null)로 uploadNonce를
                // 증가시키지만 uploadTokenRef는 변경하지 않으므로, token 가드만으로는
                // 검정 중 데이터 클리어를 감지할 수 없음 — 이 가드가 그 케이스를 차단함
                if (current.uploadNonce !== capturedNonce) return
                patchColumnNormality(enrichedColumns)

                // 정규성 검정 결과로 validationResults 업데이트
                const updatedValidation = useAnalysisStore.getState().validationResults
                if (updatedValidation) {
                  const prevCtx = useHubChatStore.getState().dataContext
                  if (prevCtx) {
                    useHubChatStore.getState().setDataContext(
                      buildHubDataContext(prevCtx.fileName, updatedValidation),
                    )
                  }
                }
              }
            })
            .catch(() => { /* graceful degradation */ })
        }
      },
      error: (err) => {
        if (token !== uploadTokenRef.current) return
        toast.error(TOAST.data.fileParseError(err.message))
      },
    })
  }, [setUploadedFile, setUploadedData, setValidationResults, patchColumnNormality, addMessage, setDataContext])

  const clearDataContext = useCallback(() => {
    uploadTokenRef.current += 1
    // hub-chat-store 클리어
    setDataContext(null)
    // analysis-store 업로드 데이터도 클리어 (동기화 유지)
    setUploadedFile(null)
    setUploadedData(null)
    setValidationResults(null)
  }, [setDataContext, setUploadedFile, setUploadedData, setValidationResults])

  return {
    handleFileSelected,
    clearDataContext,
  }
}
