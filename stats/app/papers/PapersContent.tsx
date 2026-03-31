'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import PapersHub from '@/components/papers/PapersHub'
import DocumentEditor from '@/components/papers/DocumentEditor'

/**
 * /papers 라우트의 실제 로직 (ssr: false로 로드)
 *
 * - 쿼리 없음 → PapersHub (문서 목록 + 기존 결과 정리)
 * - ?doc=<id> → DocumentEditor
 *
 * window.location.search 사용 (useSearchParams 아님, static export 호환)
 */
export default function PapersContent(): React.ReactElement {
  const [docId, setDocId] = useState<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const params = new URLSearchParams(window.location.search)
    setDocId(params.get('doc'))
  }, [])

  const handleOpenDocument = useCallback((id: string) => {
    window.history.pushState({}, '', `/papers?doc=${id}`)
    setDocId(id)
  }, [])

  const handleBack = useCallback(() => {
    window.history.pushState({}, '', '/papers')
    setDocId(null)
  }, [])

  if (docId) {
    return <DocumentEditor documentId={docId} onBack={handleBack} />
  }

  return <PapersHub onOpenDocument={handleOpenDocument} />
}
