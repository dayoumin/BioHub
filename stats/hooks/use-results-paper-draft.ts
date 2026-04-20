'use client'

import { useCallback, useEffect, useState } from 'react'
import { generatePaperDraft } from '@/lib/services'
import { useHistoryStore } from '@/lib/stores/history-store'
import type {
  DiscussionState,
  DraftContext,
  ExportContext,
  PaperDraft,
} from '@/lib/services'

interface DraftOptions {
  language: 'ko' | 'en'
  postHocDisplay: 'significant-only' | 'all'
}

interface UseResultsPaperDraftOptions {
  draftExportCtx: ExportContext | null
  selectedMethodId?: string
}

interface UseResultsPaperDraftResult {
  draftEditorOpen: boolean
  paperDraftOpen: boolean
  paperDraft: PaperDraft | null
  discussionState: DiscussionState
  lastDraftContext?: DraftContext
  setDraftEditorOpen: React.Dispatch<React.SetStateAction<boolean>>
  setPaperDraftOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDiscussionState: React.Dispatch<React.SetStateAction<DiscussionState>>
  handlePaperDraftToggle: () => void
  handleDraftConfirm: (context: DraftContext, options: DraftOptions) => void
  handleDraftLanguageChange: (language: 'ko' | 'en') => void
  resetPaperDraftState: () => void
}

const DEFAULT_DRAFT_OPTIONS: DraftOptions = {
  language: 'ko',
  postHocDisplay: 'significant-only',
}

export function useResultsPaperDraft({
  draftExportCtx,
  selectedMethodId,
}: UseResultsPaperDraftOptions): UseResultsPaperDraftResult {
  const [draftEditorOpen, setDraftEditorOpen] = useState(false)
  const [paperDraftOpen, setPaperDraftOpen] = useState(false)
  const [paperDraft, setPaperDraft] = useState<PaperDraft | null>(null)
  const [discussionState, setDiscussionState] = useState<DiscussionState>({ status: 'idle' })
  const [lastDraftContext, setLastDraftContext] = useState<DraftContext | undefined>(undefined)
  const [lastDraftOptions, setLastDraftOptions] = useState<DraftOptions>(DEFAULT_DRAFT_OPTIONS)

  const { currentHistoryId, loadedPaperDraft, patchHistoryPaperDraft, setLoadedPaperDraft } = useHistoryStore()

  useEffect(() => {
    if (!loadedPaperDraft) return
    setPaperDraft(loadedPaperDraft)
    setLastDraftContext(loadedPaperDraft.context)
    setLastDraftOptions({
      language: loadedPaperDraft.language,
      postHocDisplay: loadedPaperDraft.postHocDisplay ?? 'significant-only',
    })
    setLoadedPaperDraft(null)
  }, [loadedPaperDraft, setLoadedPaperDraft])

  const resetPaperDraftState = useCallback(() => {
    setDraftEditorOpen(false)
    setPaperDraftOpen(false)
    setPaperDraft(null)
    setDiscussionState({ status: 'idle' })
    setLastDraftContext(undefined)
    setLastDraftOptions(DEFAULT_DRAFT_OPTIONS)
  }, [])

  const handlePaperDraftToggle = useCallback(() => {
    if (paperDraft) {
      setPaperDraftOpen(true)
      return
    }
    setDraftEditorOpen(true)
  }, [paperDraft])

  const handleDraftConfirm = useCallback((context: DraftContext, options: DraftOptions) => {
    if (!draftExportCtx) return

    setDraftEditorOpen(false)
    setLastDraftContext(context)
    setLastDraftOptions(options)

    const draft = generatePaperDraft(draftExportCtx, context, selectedMethodId ?? '', {
      language: options.language,
      postHocDisplay: options.postHocDisplay,
    })

    setPaperDraft(draft)
    setDiscussionState({ status: 'idle' })
    setPaperDraftOpen(true)

    if (currentHistoryId) {
      patchHistoryPaperDraft(currentHistoryId, draft).catch(console.error)
    }
  }, [draftExportCtx, selectedMethodId, currentHistoryId, patchHistoryPaperDraft])

  const handleDraftLanguageChange = useCallback((language: 'ko' | 'en') => {
    if (!draftExportCtx || !lastDraftContext) return

    const nextOptions: DraftOptions = {
      ...lastDraftOptions,
      language,
    }
    setLastDraftOptions(nextOptions)

    const draft = generatePaperDraft(draftExportCtx, lastDraftContext, selectedMethodId ?? '', {
      language,
      postHocDisplay: nextOptions.postHocDisplay,
    })

    setPaperDraft(draft)
    setDiscussionState({ status: 'idle' })

    if (currentHistoryId) {
      patchHistoryPaperDraft(currentHistoryId, draft).catch(console.error)
    }
  }, [draftExportCtx, lastDraftContext, lastDraftOptions, selectedMethodId, currentHistoryId, patchHistoryPaperDraft])

  return {
    draftEditorOpen,
    paperDraftOpen,
    paperDraft,
    discussionState,
    lastDraftContext,
    setDraftEditorOpen,
    setPaperDraftOpen,
    setDiscussionState,
    handlePaperDraftToggle,
    handleDraftConfirm,
    handleDraftLanguageChange,
    resetPaperDraftState,
  }
}
