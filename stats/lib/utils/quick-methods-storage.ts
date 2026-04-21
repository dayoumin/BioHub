import { getMethodByAlias } from '@/lib/constants/statistical-methods'

/**
 * localStorage에서 빠른 분석 메서드 목록 로드 (compat ID → canonical 마이그레이션 포함)
 */
export function loadQuickMethods(storageKey: string, defaults: string[]): string[] {
  if (typeof window === 'undefined') return defaults
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id: string) => getMethodByAlias(id)?.id ?? id)
      }
    }
  } catch {
    // ignore
  }
  return defaults
}

/**
 * localStorage에 빠른 분석 메서드 목록 저장
 */
export function saveQuickMethods(storageKey: string, methods: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey, JSON.stringify(methods))
  } catch {
    // ignore
  }
}
