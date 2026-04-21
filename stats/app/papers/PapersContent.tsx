'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Search, PenTool } from 'lucide-react'
import PapersHub from '@/components/papers/PapersHub'
import DocumentEditor from '@/components/papers/DocumentEditor'

const PackageBuilder = dynamic(() => import('@/components/papers/PackageBuilder'), { ssr: false })

const LiteratureSearchContent = dynamic(
  () => import('@/app/literature/LiteratureSearchContent'),
  { ssr: false },
)

type PapersTab = 'docs' | 'literature'

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
  const [docSectionId, setDocSectionId] = useState<string | undefined>(undefined)
  const [pkgId, setPkgId] = useState<string | null>(null)
  const [pkgProjectId, setPkgProjectId] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<PapersTab>('docs')
  const initializedRef = useRef(false)

  const syncFromSearch = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    setDocId(params.get('doc'))
    setDocSectionId(params.get('section') ?? undefined)
    const pkg = params.get('pkg')
    setPkgId(pkg)
    setPkgProjectId(params.get('projectId') ?? undefined)
    setTab((params.get('tab') as PapersTab) === 'literature' ? 'literature' : 'docs')
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
    setDocSectionId(undefined)
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
    setDocSectionId(undefined)
  }, [])

  const switchTab = useCallback((newTab: PapersTab) => {
    const params = new URLSearchParams(window.location.search)
    // doc/pkg 열린 상태에서 탭 전환은 없지만 방어적으로 제거
    params.delete('doc')
    params.delete('pkg')
    params.delete('projectId')
    if (newTab === 'docs') params.delete('tab')
    else params.set('tab', newTab)
    const qs = params.toString()
    window.history.replaceState({}, '', `/papers${qs ? `?${qs}` : ''}`)
    setTab(newTab)
    setDocId(null)
    setDocSectionId(undefined)
    setPkgId(null)
  }, [])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  if (docId) {
    return <DocumentEditor documentId={docId} initialSectionId={docSectionId} onBack={handleBack} />
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

  return (
    <div className="flex flex-col h-full">
      {/* 탭 바 */}
      <div className="flex gap-1 px-6 pt-4">
        <button
          type="button"
          onClick={() => switchTab('docs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'docs'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          문서
        </button>
        <button
          type="button"
          onClick={() => switchTab('literature')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'literature'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          문헌 검색
        </button>
      </div>

      {/* 콘텐츠 */}
      {tab === 'literature' ? (
        <LiteratureSearchContent />
      ) : (
        <PapersHub onOpenDocument={handleOpenDocument} onOpenPackage={handleOpenPackage} />
      )}
    </div>
  )
}
