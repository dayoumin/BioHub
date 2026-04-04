/** Abort 가능한 sleep — BLAST/BOLD 등 폴링 훅 공용 */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = (): void => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** 폴링 훅 공유 phase 타입 */
export type AnalysisPhase =
  | 'submitting'
  | 'polling'
  | 'fetching'
  | 'done'
  | 'error'
