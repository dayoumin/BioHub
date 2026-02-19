/**
 * Storage Types
 *
 * IndexedDB / Turso / Hybrid 어댑터가 공유하는 타입 정의
 */

import type { VariableMapping } from '@/lib/statistics/variable-mapping'

/**
 * 분석 히스토리 레코드
 * IndexedDB와 Turso 모두에서 동일한 구조 사용
 */
export interface HistoryRecord {
  // === 기본 정보 ===
  id: string
  timestamp: number
  name: string

  // === 분석 설정 ===
  purpose: string
  analysisPurpose?: string
  method: {
    id: string
    name: string
    category: string
    description?: string
  } | null

  // === 변수 설정 ===
  variableMapping?: VariableMapping | null

  // === 분석 옵션 ===
  analysisOptions?: {
    confidenceLevel?: number        // 0.95
    alternative?: 'two-sided' | 'less' | 'greater'
    postHocMethod?: string          // 'tukey', 'bonferroni'
    [key: string]: unknown
  }

  // === 데이터 메타 ===
  dataFileName: string
  dataRowCount: number
  columnInfo?: Array<{
    name: string
    type: 'numeric' | 'categorical' | 'date'
    uniqueValues?: number
  }>

  // === 결과 ===
  results: Record<string, unknown> | null
  aiInterpretation?: string | null
  apaFormat?: string | null

  // === 동기화 ===
  deviceId?: string
  syncedAt?: number
  updatedAt?: number
}

/**
 * 동기화 큐 항목
 * 오프라인 → 온라인 전환 시 동기화할 레코드 추적
 */
export interface SyncQueueItem {
  id: string                        // history record id
  action: 'save' | 'delete'
  timestamp: number
  retryCount: number
}

/**
 * 저장소 타입
 */
export type StorageType = 'indexeddb' | 'turso' | 'hybrid'

/**
 * 즐겨찾기 레코드
 */
export interface FavoritesRecord {
  id: string                        // 'default' (단일 레코드)
  methodIds: string[]
}

/**
 * 저장소 상태 정보
 */
export interface StorageStatus {
  type: StorageType
  isOnline: boolean
  pendingSyncCount: number
  lastSyncAt?: number
}
