const CROSS_TAB_STORAGE_PREFIX = 'biohub-cross-tab-event'
const MAX_SEEN_EVENT_IDS = 200

interface CrossTabCustomEventEnvelope<TDetail> {
  id: string
  sourceId: string
  eventName: string
  detail: TDetail
}

const bridgeRegistry = new Set<string>()
const seenEventIds: string[] = []
const seenEventIdSet = new Set<string>()
const tabSourceId = (() => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`
})()

function rememberSeenEvent(eventId: string): boolean {
  if (seenEventIdSet.has(eventId)) {
    return false
  }

  seenEventIds.push(eventId)
  seenEventIdSet.add(eventId)

  if (seenEventIds.length > MAX_SEEN_EVENT_IDS) {
    const evictedId = seenEventIds.shift()
    if (evictedId) {
      seenEventIdSet.delete(evictedId)
    }
  }

  return true
}

function storageKey(channelName: string): string {
  return `${CROSS_TAB_STORAGE_PREFIX}:${channelName}`
}

function dispatchWindowEvent<TDetail>(eventName: string, detail: TDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<TDetail>(eventName, { detail }))
}

function parseEnvelope<TDetail>(
  raw: string | null,
): CrossTabCustomEventEnvelope<TDetail> | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CrossTabCustomEventEnvelope<TDetail>>
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.sourceId !== 'string' ||
      typeof parsed.eventName !== 'string'
    ) {
      return null
    }

    return parsed as CrossTabCustomEventEnvelope<TDetail>
  } catch {
    return null
  }
}

function handleIncomingEnvelope<TDetail>(
  expectedEventName: string,
  envelope: CrossTabCustomEventEnvelope<TDetail> | null,
): void {
  if (!envelope || envelope.eventName !== expectedEventName || envelope.sourceId === tabSourceId) {
    return
  }

  if (!rememberSeenEvent(envelope.id)) {
    return
  }

  dispatchWindowEvent(envelope.eventName, envelope.detail)
}

export function registerCrossTabCustomEventBridge<TDetail>(
  channelName: string,
  eventName: string,
): void {
  if (typeof window === 'undefined') return

  const bridgeKey = `${channelName}:${eventName}`
  if (bridgeRegistry.has(bridgeKey)) {
    return
  }
  bridgeRegistry.add(bridgeKey)

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(channelName)
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      const payload = event.data as CrossTabCustomEventEnvelope<TDetail> | null
      handleIncomingEnvelope(eventName, payload)
    })
  }

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== storageKey(channelName)) {
      return
    }
    handleIncomingEnvelope(eventName, parseEnvelope<TDetail>(event.newValue))
  })
}

export function emitCrossTabCustomEvent<TDetail>(
  channelName: string,
  eventName: string,
  detail: TDetail,
): void {
  if (typeof window === 'undefined') return

  const envelope: CrossTabCustomEventEnvelope<TDetail> = {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceId: tabSourceId,
    eventName,
    detail,
  }

  rememberSeenEvent(envelope.id)
  dispatchWindowEvent(eventName, detail)

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(channelName)
    channel.postMessage(envelope)
    channel.close()
  }

  try {
    const key = storageKey(channelName)
    localStorage.setItem(key, JSON.stringify(envelope))
    localStorage.removeItem(key)
  } catch {
    // localStorage unavailable 시 BroadcastChannel 또는 동일 탭 이벤트로만 동작
  }
}
