/**
 * 공용 ID 생성 유틸
 * 패턴: `{prefix}_{timestamp}_{random}`
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
