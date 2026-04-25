'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Search } from 'lucide-react'
import PapersHub from '@/components/papers/PapersHub'
import DocumentEditor from '@/components/papers/DocumentEditor'
import { Button } from '@/components/ui/button'

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
  const [docTableId, setDocTableId] = useState<string | undefined>(undefined)
  const [docFigureId, setDocFigureId] = useState<string | undefined>(undefined)
  const [docAttachCitationKey, setDocAttachCitationKey] = useState<string | undefined>(undefined)
  const [pkgId, setPkgId] = useState<string | null>(null)
  const [pkgProjectId, setPkgProjectId] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<PapersTab>('docs')
  const initializedRef = useRef(false)

  const syncFromSearch = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    setDocId(params.get('doc'))
    setDocSectionId(params.get('section') ?? undefined)
    setDocTableId(params.get('table') ?? undefined)
    setDocFigureId(params.get('figure') ?? undefined)
    setDocAttachCitationKey(params.get('attachCitation') ?? undefined)
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
    setDocTableId(undefined)
    setDocFigureId(undefined)
    setDocAttachCitationKey(undefined)
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
    setDocTableId(undefined)
    setDocFigureId(undefined)
    setDocAttachCitationKey(undefined)
  }, [])

  const switchTab = useCallback((newTab: PapersTab) => {
    const params = new URLSearchParams(window.location.search)
    params.delete('doc')
    params.delete('pkg')
    params.delete('projectId')
    params.delete('documentId')
    params.delete('sectionId')
    params.delete('sectionTitle')
    params.delete('section')
    params.delete('table')
    params.delete('figure')
    params.delete('attachCitation')
    if (newTab === 'docs') params.delete('tab')
    else params.set('tab', newTab)
    const qs = params.toString()
    window.history.replaceState({}, '', `/papers${qs ? `?${qs}` : ''}`)
    setTab(newTab)
    setDocId(null)
    setDocSectionId(undefined)
    setDocTableId(undefined)
    setDocFigureId(undefined)
    setDocAttachCitationKey(undefined)
    setPkgId(null)
  }, [])

  const handleOpenLiterature = useCallback((projectId?: string) => {
    if (!projectId) {
      switchTab('literature')
      return
    }

    const params = new URLSearchParams(window.location.search)
    params.delete('doc')
    params.delete('pkg')
    params.delete('projectId')
    params.delete('documentId')
    params.delete('sectionId')
    params.delete('sectionTitle')
    params.delete('section')
    params.delete('table')
    params.delete('figure')
    params.delete('attachCitation')
    params.set('tab', 'literature')
    params.set('project', projectId)
    window.history.replaceState({}, '', `/papers?${params.toString()}`)
    setTab('literature')
    setDocId(null)
    setDocSectionId(undefined)
    setDocTableId(undefined)
    setDocFigureId(undefined)
    setDocAttachCitationKey(undefined)
    setPkgId(null)
  }, [switchTab])

  const handleReturnFromLiterature = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const sourceDocumentId = params.get('documentId')
    const sourceSectionId = params.get('sectionId')
    if (!sourceDocumentId) {
      switchTab('docs')
      return
    }

    const nextParams = new URLSearchParams({
      doc: sourceDocumentId,
    })
    if (sourceSectionId) {
      nextParams.set('section', sourceSectionId)
    }
    window.history.replaceState({}, '', `/papers?${nextParams.toString()}`)
    setTab('docs')
    setDocId(sourceDocumentId)
    setDocSectionId(sourceSectionId ?? undefined)
    setDocTableId(undefined)
    setDocFigureId(undefined)
    setDocAttachCitationKey(undefined)
    setPkgId(null)
  }, [switchTab])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  if (docId) {
    return (
      <DocumentEditor
        documentId={docId}
        initialSectionId={docSectionId}
        initialTableId={docTableId}
        initialFigureId={docFigureId}
        initialAttachCitationKey={docAttachCitationKey}
        onBack={handleBack}
      />
    )
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

  if (tab === 'literature') {
    return (
      <div className="flex h-full flex-col bg-surface">
        <div className="px-6 pt-6">
          <section className="rounded-[28px] bg-surface-container p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant">
                  <Search className="h-3.5 w-3.5" />
                  자료 작성 보조 도구
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-on-surface">문헌 검색</h1>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    자료 작성에 참고할 문헌을 찾고 정리하는 보조 화면입니다. 문서 작성과 편집은 기본 허브에서 계속 진행합니다.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleReturnFromLiterature}
                className="gap-2 self-start bg-surface-container-lowest"
              >
                <ArrowLeft className="h-4 w-4" />
                문서 작업으로 돌아가기
              </Button>
            </div>
          </section>
        </div>
        <div className="min-h-0 flex-1 pt-4">
          <LiteratureSearchContent />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PapersHub
        onOpenDocument={handleOpenDocument}
        onOpenPackage={handleOpenPackage}
        onOpenLiterature={handleOpenLiterature}
      />
    </div>
  )
}
