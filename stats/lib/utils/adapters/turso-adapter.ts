/**
 * Turso Storage Adapter
 *
 * Turso (LibSQL) 클라우드 데이터베이스를 사용하는 저장소 어댑터
 * 외부망(인터넷) 환경에서 사용
 *
 * 환경변수:
 * - NEXT_PUBLIC_TURSO_URL: Turso 데이터베이스 URL
 * - TURSO_AUTH_TOKEN: 인증 토큰
 */

import type { StorageAdapter } from './storage-adapter'
import type {
  HistoryRecord,
  StorageType,
  StorageStatus
} from '../storage-types'

// Turso 클라이언트 타입 (동적 import용)
import type { Client as LibSQLClient, InValue } from '@libsql/client'
type TursoClient = LibSQLClient

const MAX_HISTORY = 100

/**
 * Turso Adapter 클래스
 */
export class TursoAdapter implements StorageAdapter {
  private client: TursoClient | null = null
  private initPromise: Promise<void> | null = null
  private lastSyncAt: number | undefined

  constructor() {
    // 클라이언트 초기화는 지연 로딩
  }

  /**
   * Turso 클라이언트 초기화 (지연 로딩)
   */
  private async initClient(): Promise<TursoClient> {
    if (this.client) return this.client

    if (this.initPromise) {
      await this.initPromise
      if (this.client) return this.client
    }

    this.initPromise = (async () => {
      const url = process.env.NEXT_PUBLIC_TURSO_URL
      const authToken = process.env.TURSO_AUTH_TOKEN

      if (!url) {
        throw new Error('[Turso] NEXT_PUBLIC_TURSO_URL is not configured')
      }

      try {
        // 동적 import (번들 크기 최적화)
        const { createClient } = await import('@libsql/client')
        this.client = createClient({
          url,
          authToken
        })

        // 테이블 초기화
        await this.initTables()
      } catch (error) {
        console.error('[Turso] Failed to initialize client:', error)
        throw error
      }
    })()

    await this.initPromise
    return this.client!
  }

  /**
   * 테이블 초기화
   */
  private async initTables(): Promise<void> {
    if (!this.client) return

    await this.client.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          name TEXT NOT NULL,
          purpose TEXT,
          analysisPurpose TEXT,
          method TEXT,
          variableMapping TEXT,
          analysisOptions TEXT,
          dataFileName TEXT,
          dataRowCount INTEGER,
          columnInfo TEXT,
          results TEXT,
          aiInterpretation TEXT,
          apaFormat TEXT,
          aiRecommendation TEXT,
          deviceId TEXT,
          syncedAt INTEGER,
          updatedAt INTEGER
        )`
      },
      {
        sql: `CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC)`
      },
      {
        sql: `CREATE INDEX IF NOT EXISTS idx_history_device ON history(deviceId)`
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY DEFAULT 'default',
          methodIds TEXT
        )`
      }
    ])

    // Existing DB migration safety: add columns if legacy schema is already present.
    await this.ensureColumn('history', 'aiInterpretation', 'TEXT')
    await this.ensureColumn('history', 'apaFormat', 'TEXT')
    await this.ensureColumn('history', 'aiRecommendation', 'TEXT')
  }

  private async ensureColumn(table: string, column: string, type: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.execute({
        sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        return
      }
      throw error
    }
  }

  // === History CRUD ===

  async saveHistory(record: HistoryRecord, isUpdate = false): Promise<void> {
    const client = await this.initClient()

    // 최대 개수 체크 (업데이트 모드에서는 건너뜀)
    if (!isUpdate) {
      const count = await this.getHistoryCount()
      if (count >= MAX_HISTORY) {
        // 가장 오래된 레코드 삭제
        const oldestResult = await client.execute({
          sql: 'SELECT id FROM history ORDER BY timestamp ASC LIMIT 1'
        })
        if (oldestResult.rows.length > 0) {
          const oldestRow = oldestResult.rows[0] as unknown as { id: string }
          await this.deleteHistory(oldestRow.id)
        }
      }
    }

    const now = Date.now()
    await client.execute({
      sql: `INSERT OR REPLACE INTO history
            (id, timestamp, name, purpose, analysisPurpose, method,
             variableMapping, analysisOptions, dataFileName, dataRowCount,
             columnInfo, results, aiInterpretation, apaFormat, aiRecommendation,
             deviceId, syncedAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.timestamp,
        record.name,
        record.purpose || '',
        record.analysisPurpose || '',
        record.method ? JSON.stringify(record.method) : null,
        record.variableMapping ? JSON.stringify(record.variableMapping) : null,
        record.analysisOptions ? JSON.stringify(record.analysisOptions) : null,
        record.dataFileName || '',
        record.dataRowCount || 0,
        record.columnInfo ? JSON.stringify(record.columnInfo) : null,
        record.results ? JSON.stringify(record.results) : null,
        record.aiInterpretation ?? null,
        record.apaFormat ?? null,
        record.aiRecommendation ? JSON.stringify(record.aiRecommendation) : null,
        record.deviceId || this.getDeviceId(),
        now,
        record.updatedAt || now
      ] as InValue[]
    })

    this.lastSyncAt = now
  }

  async getAllHistory(): Promise<HistoryRecord[]> {
    const client = await this.initClient()

    const result = await client.execute({
      sql: 'SELECT * FROM history ORDER BY timestamp DESC'
    })

    return result.rows.map(row => this.rowToRecord(row as Record<string, unknown>))
  }

  async getHistory(id: string): Promise<HistoryRecord | null> {
    const client = await this.initClient()

    const result = await client.execute({
      sql: 'SELECT * FROM history WHERE id = ?',
      args: [id]
    })

    if (result.rows.length === 0) return null
    return this.rowToRecord(result.rows[0] as Record<string, unknown>)
  }

  async deleteHistory(id: string): Promise<void> {
    const client = await this.initClient()

    await client.execute({
      sql: 'DELETE FROM history WHERE id = ?',
      args: [id]
    })
  }

  async clearAllHistory(): Promise<void> {
    const client = await this.initClient()

    await client.execute({
      sql: 'DELETE FROM history'
    })
  }

  async getHistoryCount(): Promise<number> {
    const client = await this.initClient()

    const result = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM history'
    })

    const row = result.rows[0] as unknown as { count: number }
    return row?.count || 0
  }

  // === Favorites ===

  async saveFavorites(methodIds: string[]): Promise<void> {
    const client = await this.initClient()

    await client.execute({
      sql: 'INSERT OR REPLACE INTO favorites (id, methodIds) VALUES (?, ?)',
      args: ['default', JSON.stringify(methodIds)]
    })
  }

  async getFavorites(): Promise<string[]> {
    const client = await this.initClient()

    const result = await client.execute({
      sql: 'SELECT methodIds FROM favorites WHERE id = ?',
      args: ['default']
    })

    if (result.rows.length === 0) return []

    const row = result.rows[0] as unknown as { methodIds: string }
    try {
      return JSON.parse(row.methodIds || '[]')
    } catch {
      return []
    }
  }

  // === Helper Methods ===

  /**
   * DB 행을 HistoryRecord로 변환
   */
  private rowToRecord(row: Record<string, unknown>): HistoryRecord {
    return {
      id: row.id as string,
      timestamp: row.timestamp as number,
      name: row.name as string,
      purpose: row.purpose as string || '',
      analysisPurpose: row.analysisPurpose as string | undefined,
      method: row.method ? JSON.parse(row.method as string) : null,
      variableMapping: row.variableMapping ? JSON.parse(row.variableMapping as string) : null,
      analysisOptions: row.analysisOptions ? JSON.parse(row.analysisOptions as string) : undefined,
      dataFileName: row.dataFileName as string || '',
      dataRowCount: row.dataRowCount as number || 0,
      columnInfo: row.columnInfo ? JSON.parse(row.columnInfo as string) : undefined,
      results: row.results ? JSON.parse(row.results as string) : null,
      aiInterpretation: (row.aiInterpretation as string | null) ?? null,
      apaFormat: (row.apaFormat as string | null) ?? null,
      aiRecommendation: row.aiRecommendation ? JSON.parse(row.aiRecommendation as string) : null,
      deviceId: row.deviceId as string | undefined,
      syncedAt: row.syncedAt as number | undefined,
      updatedAt: row.updatedAt as number | undefined
    }
  }

  /**
   * 기기 ID 생성/조회
   */
  private getDeviceId(): string {
    if (typeof localStorage === 'undefined') return 'unknown'

    let deviceId = localStorage.getItem('statPlatform_deviceId')
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem('statPlatform_deviceId', deviceId)
    }
    return deviceId
  }

  // === Metadata ===

  getStorageType(): StorageType {
    return 'turso'
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : false
  }

  isAvailable(): boolean {
    return !!process.env.NEXT_PUBLIC_TURSO_URL && this.isOnline()
  }

  async getStatus(): Promise<StorageStatus> {
    return {
      type: 'turso',
      isOnline: this.isOnline(),
      pendingSyncCount: 0,  // Turso는 항상 동기화됨
      lastSyncAt: this.lastSyncAt
    }
  }
}
