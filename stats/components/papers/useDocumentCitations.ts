'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { CitationRecord } from '@/lib/research/citation-types'
import { listCitationsByProject } from '@/lib/research/citation-storage'

interface UseDocumentCitationsInput {
  projectId: string | null
}

interface UseDocumentCitationsResult {
  citations: CitationRecord[]
  latestCitationsRef: MutableRefObject<CitationRecord[]>
  pendingCitationReloadRef: MutableRefObject<Promise<void> | null>
  reloadCitations: (projectId: string, requestSeq?: number) => Promise<void>
  resetCitations: () => void
}

export function useDocumentCitations({
  projectId,
}: UseDocumentCitationsInput): UseDocumentCitationsResult {
  const [citations, setCitations] = useState<CitationRecord[]>([])
  const latestCitationsRef = useRef<CitationRecord[]>([])
  const citationRequestSeqRef = useRef(0)
  const pendingCitationReloadRef = useRef<Promise<void> | null>(null)
  const projectIdRef = useRef<string | null>(projectId)

  const resetCitations = useCallback((): void => {
    citationRequestSeqRef.current += 1
    latestCitationsRef.current = []
    setCitations([])
  }, [])

  const reloadCitations = useCallback(async (targetProjectId: string, requestSeq?: number): Promise<void> => {
    const seq = requestSeq ?? ++citationRequestSeqRef.current
    let task: Promise<void> | null = null

    task = (async () => {
      try {
        const records = await listCitationsByProject(targetProjectId)
        if (citationRequestSeqRef.current === seq && projectIdRef.current === targetProjectId) {
          latestCitationsRef.current = records
          setCitations(records)
        }
      } catch {
        if (citationRequestSeqRef.current === seq && projectIdRef.current === targetProjectId) {
          latestCitationsRef.current = []
          setCitations([])
        }
      }
    })().finally(() => {
      if (pendingCitationReloadRef.current === task) {
        pendingCitationReloadRef.current = null
      }
    })

    pendingCitationReloadRef.current = task
    await task
  }, [])

  useEffect(() => {
    projectIdRef.current = projectId
    citationRequestSeqRef.current += 1
    const requestSeq = citationRequestSeqRef.current

    if (!projectId) {
      latestCitationsRef.current = []
      setCitations([])
      return () => {
        citationRequestSeqRef.current += 1
      }
    }

    latestCitationsRef.current = []
    setCitations([])
    void reloadCitations(projectId, requestSeq)

    return () => {
      citationRequestSeqRef.current += 1
    }
  }, [projectId, reloadCitations])

  return {
    citations,
    latestCitationsRef,
    pendingCitationReloadRef,
    reloadCitations,
    resetCitations,
  }
}
