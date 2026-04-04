import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const PRIMARY_DEVICE_ID_KEY = STORAGE_KEYS.device.id
const LEGACY_DEVICE_ID_KEY = STORAGE_KEYS.device.legacyId

function makeDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * MVP 인증 대체용 기기 식별자.
 * 기존 stats 키가 있으면 재사용하고, 새 키에도 복제한다.
 */
export function getClientDeviceId(): string {
  if (typeof window === 'undefined') {
    throw new Error('client device id is unavailable outside the browser')
  }

  const existing = localStorage.getItem(PRIMARY_DEVICE_ID_KEY) || localStorage.getItem(LEGACY_DEVICE_ID_KEY)
  if (existing) {
    if (!localStorage.getItem(PRIMARY_DEVICE_ID_KEY)) {
      localStorage.setItem(PRIMARY_DEVICE_ID_KEY, existing)
    }
    return existing
  }

  const created = makeDeviceId()
  localStorage.setItem(PRIMARY_DEVICE_ID_KEY, created)
  localStorage.setItem(LEGACY_DEVICE_ID_KEY, created)
  return created
}
