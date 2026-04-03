import type { GeneticsToolType } from '@/lib/genetics/analysis-history'
import { getClientDeviceId } from '@/lib/utils/client-device-id'

const GENETICS_HISTORY_API = '/api/history/genetics'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function buildHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {
    'X-User-Id': getClientDeviceId(),
  }
  if (includeJson) headers['Content-Type'] = 'application/json'
  return headers
}

export async function loadCloudGeneticsHistoryRaw(filter?: GeneticsToolType): Promise<unknown[]> {
  if (!isBrowser()) return []

  const url = new URL(GENETICS_HISTORY_API, window.location.origin)
  if (filter) url.searchParams.set('type', filter)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!res.ok) {
    throw new Error(`failed to load genetics history (${res.status})`)
  }

  const data = await res.json() as { entries?: unknown[] }
  return Array.isArray(data.entries) ? data.entries : []
}

export async function upsertCloudGeneticsHistory(entry: unknown): Promise<void> {
  if (!isBrowser()) return

  const res = await fetch(GENETICS_HISTORY_API, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ entry }),
  })

  if (!res.ok) {
    throw new Error(`failed to save genetics history (${res.status})`)
  }
}

export async function deleteCloudGeneticsHistory(id: string): Promise<void> {
  if (!isBrowser()) return

  const res = await fetch(`${GENETICS_HISTORY_API}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })

  if (!res.ok && res.status !== 404) {
    throw new Error(`failed to delete genetics history (${res.status})`)
  }
}

export async function setCloudGeneticsHistoryPin(id: string, pinned: boolean): Promise<void> {
  if (!isBrowser()) return

  const res = await fetch(`${GENETICS_HISTORY_API}/${encodeURIComponent(id)}/pin`, {
    method: 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify({ pinned }),
  })

  if (!res.ok) {
    throw new Error(`failed to update genetics history pin (${res.status})`)
  }
}
