/**
 * sessionStorage 기반 서열 전달 유틸
 *
 * GenBank -> Barcoding / BLAST 등 genetics 도구 간 서열 데이터를 1회성으로 전달한다.
 * consumeTransferredSequence()는 읽으면서 삭제하므로 자동으로 cleanup 된다.
 */

import { SESSION_STORAGE_KEYS } from '@/lib/constants/storage-keys'

const STORAGE_KEY = SESSION_STORAGE_KEYS.genetics.sequenceTransfer

export interface TransferPayload {
  sequence: string
  source: string
  sequenceType?: 'DNA' | 'protein'
  accession?: string
}

/** 서열을 sessionStorage에 저장한다. */
export function storeSequenceForTransfer(
  sequence: string,
  source: string,
  options?: { sequenceType?: 'DNA' | 'protein'; accession?: string }
): void {
  try {
    const payload: TransferPayload = {
      sequence,
      source,
      ...(options?.sequenceType && { sequenceType: options.sequenceType }),
      ...(options?.accession && { accession: options.accession }),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // storage quota 초과 등 — 무시 (전달 실패해도 치명적이지 않음)
  }
}

/** 저장된 서열을 읽고 즉시 삭제한다 (1회성). 없으면 null 반환. */
export function consumeTransferredSequence(): TransferPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'sequence' in parsed &&
      'source' in parsed &&
      typeof (parsed as TransferPayload).sequence === 'string' &&
      typeof (parsed as TransferPayload).source === 'string'
    ) {
      return parsed as TransferPayload
    }
    return null
  } catch {
    return null
  }
}

const SOURCE_LABELS: Record<string, string> = {
  genbank: 'GenBank',
  barcoding: '바코딩',
  blast: 'BLAST',
  translation: 'Translation',
  protein: 'Protein',
}

/** 전달 출처명을 한글 표시용으로 변환 */
export function formatTransferSource(source: string): string {
  return SOURCE_LABELS[source] ?? source
}
