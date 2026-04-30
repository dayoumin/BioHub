'use client'

import { useCallback, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { toast } from 'sonner'
import { regenerateDocumentSection } from '@/lib/research/document-writing-orchestrator'
import {
  DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE,
  DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE,
  isDocumentSectionRegenerationSectionId,
  type DocumentSectionRegenerationMode,
} from '@/lib/research/document-section-regeneration-contract'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'

interface UseDocumentSectionRegenerationInput {
  documentId: string
  activeSectionId: string | null
  getCurrentDocumentId: () => string | null
  getLocalEditRevision: () => number
  hasPendingSaveOrConflict: () => boolean
  persistLatestDocument: () => Promise<boolean>
  applyRegeneratedDocument: (document: DocumentBlueprint) => void
}

interface UseDocumentSectionRegenerationResult {
  sectionRegenerationMode: DocumentSectionRegenerationMode | null
  sectionRegenerationModeRef: MutableRefObject<DocumentSectionRegenerationMode | null>
  refreshActiveSectionSources: () => Promise<void>
  regenerateActiveSection: () => Promise<void>
}

function getModeMessages(mode: DocumentSectionRegenerationMode): {
  conflict: string
  concurrentEdit: string
  success: string
  failure: string
  finalFailure: string
} {
  switch (mode) {
    case DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE:
      return {
        conflict: '저장 충돌을 먼저 해결한 뒤 섹션을 다시 생성하세요.',
        concurrentEdit: '섹션 재생성 중 문서 편집이 감지되어 자동 반영을 중단했습니다.',
        success: '섹션 초안을 다시 생성했습니다.',
        failure: '섹션 재생성에 실패했습니다.',
        finalFailure: '섹션 재생성에 실패했습니다.',
      }
    case DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE:
      return {
        conflict: '저장 충돌을 먼저 해결한 뒤 연결 자료를 갱신하세요.',
        concurrentEdit: '연결 자료 갱신 중 문서 편집이 감지되어 자동 반영을 중단했습니다.',
        success: '본문은 유지하고 연결 자료를 갱신했습니다.',
        failure: '연결 자료 갱신에 실패했습니다.',
        finalFailure: '연결 자료 갱신에 실패했습니다.',
      }
  }
}

export function useDocumentSectionRegeneration({
  documentId,
  activeSectionId,
  getCurrentDocumentId,
  getLocalEditRevision,
  hasPendingSaveOrConflict,
  persistLatestDocument,
  applyRegeneratedDocument,
}: UseDocumentSectionRegenerationInput): UseDocumentSectionRegenerationResult {
  const [sectionRegenerationMode, setSectionRegenerationMode] = useState<DocumentSectionRegenerationMode | null>(null)
  const sectionRegenerationModeRef = useRef<DocumentSectionRegenerationMode | null>(null)

  const runSectionRegeneration = useCallback(async (mode: DocumentSectionRegenerationMode): Promise<void> => {
    if (!activeSectionId || !isDocumentSectionRegenerationSectionId(activeSectionId)) {
      return
    }

    const messages = getModeMessages(mode)
    sectionRegenerationModeRef.current = mode
    setSectionRegenerationMode(mode)
    try {
      const canContinue = await persistLatestDocument()
      if (!canContinue) {
        toast.error(messages.conflict)
        return
      }

      const savedLocalEditRevision = getLocalEditRevision()
      const updated = await regenerateDocumentSection(
        getCurrentDocumentId() ?? documentId,
        activeSectionId,
        mode,
      )
      if (
        getLocalEditRevision() !== savedLocalEditRevision
        || hasPendingSaveOrConflict()
      ) {
        toast.error(messages.concurrentEdit)
        return
      }
      if (updated) {
        applyRegeneratedDocument(updated)
        toast.success(messages.success)
        return
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : messages.failure)
      return
    } finally {
      sectionRegenerationModeRef.current = null
      setSectionRegenerationMode(null)
    }

    toast.error(messages.finalFailure)
  }, [
    activeSectionId,
    applyRegeneratedDocument,
    documentId,
    getCurrentDocumentId,
    getLocalEditRevision,
    hasPendingSaveOrConflict,
    persistLatestDocument,
  ])

  const regenerateActiveSection = useCallback(async (): Promise<void> => {
    await runSectionRegeneration(DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE)
  }, [runSectionRegeneration])

  const refreshActiveSectionSources = useCallback(async (): Promise<void> => {
    await runSectionRegeneration(DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE)
  }, [runSectionRegeneration])

  return {
    sectionRegenerationMode,
    sectionRegenerationModeRef,
    refreshActiveSectionSources,
    regenerateActiveSection,
  }
}
