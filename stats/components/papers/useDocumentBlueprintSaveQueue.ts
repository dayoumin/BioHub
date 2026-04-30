'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DocumentBlueprintConflictError,
  saveDocumentBlueprint,
} from '@/lib/research/document-blueprint-storage'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'

export type DocumentBlueprintSaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict'

interface UseDocumentBlueprintSaveQueueParams {
  autosaveDelay: number
  documentRef: {
    current: DocumentBlueprint | null
  }
}

interface UseDocumentBlueprintSaveQueueResult {
  documentConflict: DocumentBlueprint | null
  documentConflictRef: {
    current: DocumentBlueprint | null
  }
  saveStatus: DocumentBlueprintSaveStatus
  scheduleSave: (updated: DocumentBlueprint) => void
  scheduleImmediateSave: (updated: DocumentBlueprint) => Promise<void>
  resetSavedDocumentState: (loaded: DocumentBlueprint | null) => void
  markDocumentConflict: (latestDocument: DocumentBlueprint) => void
  clearDocumentConflict: () => void
  getLocalEditRevision: () => number
  hasPendingSave: () => boolean
  hasPendingSaveOrConflict: () => boolean
  waitForSaveQueue: () => Promise<void>
  getLastSavedUpdatedAt: () => string | null
  isSavedUpdateCurrent: (updatedAt: string | undefined) => boolean
  hasLocalChanges: () => boolean
}

function isDocumentConflictError(error: unknown): error is DocumentBlueprintConflictError {
  return (
    error instanceof DocumentBlueprintConflictError
    || (
      error instanceof Error
      && error.name === 'DocumentBlueprintConflictError'
      && 'latestDocument' in error
    )
  )
}

export function useDocumentBlueprintSaveQueue({
  autosaveDelay,
  documentRef,
}: UseDocumentBlueprintSaveQueueParams): UseDocumentBlueprintSaveQueueResult {
  const [saveStatus, setSaveStatus] = useState<DocumentBlueprintSaveStatus>('saved')
  const [documentConflict, setDocumentConflict] = useState<DocumentBlueprint | null>(null)
  const mountedRef = useRef(true)
  const documentConflictRef = useRef<DocumentBlueprint | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const latestScheduledSaveRevisionRef = useRef(0)
  const localEditRevisionRef = useRef(0)
  const pendingSaveRevisionRef = useRef<number | null>(null)
  const lastSavedUpdatedAtRef = useRef<string | null>(null)
  const hasLocalChangesRef = useRef(false)
  const pendingDocRef = useRef<DocumentBlueprint | null>(null)

  const setMountedSaveStatus = useCallback((status: DocumentBlueprintSaveStatus): void => {
    if (mountedRef.current) {
      setSaveStatus(status)
    }
  }, [])

  const setMountedDocumentConflict = useCallback((latestDocument: DocumentBlueprint | null): void => {
    if (mountedRef.current) {
      setDocumentConflict(latestDocument)
    }
  }, [])

  const clearDocumentConflict = useCallback((): void => {
    documentConflictRef.current = null
    setMountedDocumentConflict(null)
  }, [setMountedDocumentConflict])

  const markDocumentConflict = useCallback((latestDocument: DocumentBlueprint): void => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    pendingSaveRevisionRef.current = null
    documentConflictRef.current = latestDocument
    setMountedDocumentConflict(latestDocument)
    setMountedSaveStatus('conflict')
  }, [setMountedDocumentConflict, setMountedSaveStatus])

  const resetSavedDocumentState = useCallback((loaded: DocumentBlueprint | null): void => {
    lastSavedUpdatedAtRef.current = loaded?.updatedAt ?? null
    hasLocalChangesRef.current = false
    pendingDocRef.current = null
    pendingSaveRevisionRef.current = null
    latestScheduledSaveRevisionRef.current = 0
    clearDocumentConflict()
    setMountedSaveStatus('saved')
  }, [clearDocumentConflict, setMountedSaveStatus])

  const queueDocumentSave = useCallback((updated: DocumentBlueprint, revision: number): Promise<void> => {
    const saveTask = async (): Promise<void> => {
      if (latestScheduledSaveRevisionRef.current === revision) {
        setMountedSaveStatus('saving')
      }

      try {
        const saved = await saveDocumentBlueprint(updated, {
          expectedUpdatedAt: lastSavedUpdatedAtRef.current ?? undefined,
        })
        lastSavedUpdatedAtRef.current = saved.updatedAt

        if (pendingSaveRevisionRef.current === revision) {
          pendingDocRef.current = null
          pendingSaveRevisionRef.current = null
          hasLocalChangesRef.current = false
        }

        if (latestScheduledSaveRevisionRef.current === revision && documentConflictRef.current === null) {
          setMountedSaveStatus('saved')
        }
      } catch (error) {
        if (isDocumentConflictError(error)) {
          markDocumentConflict(error.latestDocument)
          return
        }
        throw error
      }
    }

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(saveTask)

    return saveQueueRef.current
  }, [markDocumentConflict, setMountedSaveStatus])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      const pendingDoc = pendingDocRef.current
      const pendingRevision = pendingSaveRevisionRef.current
      if (pendingDoc && pendingRevision !== null) {
        void queueDocumentSave(pendingDoc, pendingRevision)
      }
    }
  }, [queueDocumentSave])

  const scheduleSave = useCallback((updated: DocumentBlueprint): void => {
    documentRef.current = updated
    pendingDocRef.current = updated
    hasLocalChangesRef.current = true
    localEditRevisionRef.current += 1
    clearDocumentConflict()
    const revision = latestScheduledSaveRevisionRef.current + 1
    latestScheduledSaveRevisionRef.current = revision
    pendingSaveRevisionRef.current = revision
    setMountedSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void queueDocumentSave(updated, revision)
    }, autosaveDelay)
  }, [autosaveDelay, clearDocumentConflict, documentRef, queueDocumentSave, setMountedSaveStatus])

  const scheduleImmediateSave = useCallback((updated: DocumentBlueprint): Promise<void> => {
    documentRef.current = updated
    pendingDocRef.current = updated
    hasLocalChangesRef.current = true
    localEditRevisionRef.current += 1
    clearDocumentConflict()
    const revision = latestScheduledSaveRevisionRef.current + 1
    latestScheduledSaveRevisionRef.current = revision
    pendingSaveRevisionRef.current = revision
    setMountedSaveStatus('unsaved')
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    return queueDocumentSave(updated, revision)
  }, [clearDocumentConflict, documentRef, queueDocumentSave, setMountedSaveStatus])

  const getLocalEditRevision = useCallback((): number => (
    localEditRevisionRef.current
  ), [])

  const hasPendingSaveOrConflict = useCallback((): boolean => (
    pendingSaveRevisionRef.current !== null || documentConflictRef.current !== null
  ), [])

  const hasPendingSave = useCallback((): boolean => (
    pendingSaveRevisionRef.current !== null
  ), [])

  const waitForSaveQueue = useCallback((): Promise<void> => (
    saveQueueRef.current
  ), [])

  const getLastSavedUpdatedAt = useCallback((): string | null => (
    lastSavedUpdatedAtRef.current
  ), [])

  const isSavedUpdateCurrent = useCallback((updatedAt: string | undefined): boolean => (
    Boolean(updatedAt && updatedAt === lastSavedUpdatedAtRef.current)
  ), [])

  const hasLocalChanges = useCallback((): boolean => (
    hasLocalChangesRef.current
  ), [])

  return {
    documentConflict,
    documentConflictRef,
    saveStatus,
    scheduleSave,
    scheduleImmediateSave,
    resetSavedDocumentState,
    markDocumentConflict,
    clearDocumentConflict,
    getLocalEditRevision,
    hasPendingSave,
    hasPendingSaveOrConflict,
    waitForSaveQueue,
    getLastSavedUpdatedAt,
    isSavedUpdateCurrent,
    hasLocalChanges,
  }
}
