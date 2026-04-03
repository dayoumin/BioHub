'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import PapersHub from '@/components/papers/PapersHub'
import DocumentEditor from '@/components/papers/DocumentEditor'

const PackageBuilder = dynamic(() => import('@/components/papers/PackageBuilder'), { ssr: false })

/**
 * /papers 라우트의 실제 로직 (ssr: false로 로드)
 *
 * - 쿼리 없음 → PapersHub (문서 목록 + 기존 결과 정리)
 * - ?doc=<id> → DocumentEditor
 * - ?pkg=<id> → PackageBuilder (기존 패키지)
 * - ?pkg=new&projectId=xxx → PackageBuilder (새 패키지)
 *
 * window.location.search 사용 (useSearchParams 아님, static export 호환)
 */
export default function PapersContent(): React.ReactElement {
  const [docId, setDocId] = useState<string | null>(null)
  const [pkgId, setPkgId] = useState<string | null>(null)
  const [pkgProjectId, setPkgProjectId] = useState<string | undefined>(undefined)
  const initializedRef = useRef(false)

  const syncFromSearch = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    setDocId(params.get('doc'))
    const pkg = params.get('pkg')
    setPkgId(pkg)
    setPkgProjectId(params.get('projectId') ?? undefined)
  }, [])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      syncFromSearch()
    }

    const handlePopState = (): void => {
      syncFromSearch()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [syncFromSearch])

  const handleOpenDocument = useCallback((id: string) => {
    window.history.pushState({}, '', `/papers?doc=${id}`)
    setDocId(id)
    setPkgId(null)
  }, [])

  const handleOpenPackage = useCallback((id: string, projectId?: string) => {
    const url = projectId
      ? `/papers?pkg=${id}&projectId=${projectId}`
      : `/papers?pkg=${id}`
    window.history.pushState({}, '', url)
    setPkgId(id)
    setPkgProjectId(projectId)
    setDocId(null)
  }, [])

  const handleBack = useCallback(() => {
    window.history.pushState({}, '', '/papers')
    setDocId(null)
    setPkgId(null)
    setPkgProjectId(undefined)
  }, [])

  if (docId) {
    return <DocumentEditor documentId={docId} onBack={handleBack} />
  }

  if (pkgId) {
    return (
      <PackageBuilder
        packageId={pkgId === 'new' ? undefined : pkgId}
        projectId={pkgProjectId}
        onBack={handleBack}
      />
    )
  }

  return <PapersHub onOpenDocument={handleOpenDocument} onOpenPackage={handleOpenPackage} />
}
