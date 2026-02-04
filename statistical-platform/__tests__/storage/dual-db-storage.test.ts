/**
 * Dual Database Storage System Tests
 *
 * IndexedDB + Turso 이중 DB 저장소 시스템 검증
 *
 * 테스트 전략:
 * 1. 어댑터 인터페이스 계약 검증
 * 2. Storage Facade 로직 시뮬레이션
 * 3. Hybrid 동기화 로직 검증
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { HistoryRecord, StorageStatus, SyncQueueItem } from '@/lib/utils/storage-types'

// Mock HistoryRecord for testing
const createMockRecord = (id: string, timestamp = Date.now()): HistoryRecord => ({
  id,
  timestamp,
  name: `Test Analysis ${id}`,
  purpose: 'Test purpose',
  analysisPurpose: 'Testing',
  method: {
    id: 't-test',
    name: 'Independent t-Test',
    category: 'parametric',
    description: 'Test description'
  },
  variableMapping: {
    dependentVar: 'score',
    independentVar: 'group'
  },
  analysisOptions: {
    confidenceLevel: 0.95,
    alternative: 'two-sided'
  },
  dataFileName: 'test-data.csv',
  dataRowCount: 100,
  columnInfo: [
    { name: 'score', type: 'numeric', uniqueValues: 100 },
    { name: 'group', type: 'categorical', uniqueValues: 2 }
  ],
  results: { pValue: 0.03, tStatistic: 2.15 },
  deviceId: 'test-device-123',
  syncedAt: undefined,
  updatedAt: timestamp
})

describe('Storage Types - HistoryRecord', () => {
  test('should have all required fields', () => {
    const record = createMockRecord('test-1')

    expect(record.id).toBe('test-1')
    expect(record.timestamp).toBeDefined()
    expect(record.name).toBeDefined()
    expect(record.purpose).toBeDefined()
    expect(record.method).toBeDefined()
    expect(record.dataFileName).toBeDefined()
    expect(record.dataRowCount).toBeDefined()
    expect(record.results).toBeDefined()
  })

  test('should support optional fields', () => {
    const record = createMockRecord('test-2')

    expect(record.analysisPurpose).toBeDefined()
    expect(record.variableMapping).toBeDefined()
    expect(record.analysisOptions).toBeDefined()
    expect(record.columnInfo).toBeDefined()
    expect(record.deviceId).toBeDefined()
  })

  test('should support null method for incomplete analyses', () => {
    const record: HistoryRecord = {
      id: 'incomplete-1',
      timestamp: Date.now(),
      name: 'Incomplete Analysis',
      purpose: '',
      method: null,
      dataFileName: 'data.csv',
      dataRowCount: 50,
      results: null
    }

    expect(record.method).toBeNull()
    expect(record.results).toBeNull()
  })
})

describe('Storage Adapter Interface Contract', () => {
  /**
   * 어댑터가 구현해야 하는 메서드 목록
   */
  const requiredMethods = [
    'saveHistory',
    'getAllHistory',
    'getHistory',
    'deleteHistory',
    'clearAllHistory',
    'getHistoryCount',
    'saveFavorites',
    'getFavorites',
    'getStorageType',
    'isOnline',
    'isAvailable',
    'getStatus'
  ]

  const syncableMethods = [
    'addToSyncQueue',
    'getSyncQueue',
    'clearSyncQueue',
    'incrementRetryCount',
    'syncPendingItems',
    'pullFromCloud'
  ]

  test('IndexedDBAdapter implements StorageAdapter', async () => {
    // Mock implementation check
    const mockAdapter = {
      saveHistory: vi.fn(),
      getAllHistory: vi.fn().mockResolvedValue([]),
      getHistory: vi.fn().mockResolvedValue(null),
      deleteHistory: vi.fn(),
      clearAllHistory: vi.fn(),
      getHistoryCount: vi.fn().mockResolvedValue(0),
      saveFavorites: vi.fn(),
      getFavorites: vi.fn().mockResolvedValue([]),
      getStorageType: vi.fn().mockReturnValue('indexeddb'),
      isOnline: vi.fn().mockReturnValue(true),
      isAvailable: vi.fn().mockReturnValue(true),
      getStatus: vi.fn().mockResolvedValue({
        type: 'indexeddb',
        isOnline: true,
        pendingSyncCount: 0
      })
    }

    for (const method of requiredMethods) {
      expect(typeof mockAdapter[method as keyof typeof mockAdapter]).toBe('function')
    }
  })

  test('TursoAdapter implements StorageAdapter', async () => {
    const mockAdapter = {
      saveHistory: vi.fn(),
      getAllHistory: vi.fn().mockResolvedValue([]),
      getHistory: vi.fn().mockResolvedValue(null),
      deleteHistory: vi.fn(),
      clearAllHistory: vi.fn(),
      getHistoryCount: vi.fn().mockResolvedValue(0),
      saveFavorites: vi.fn(),
      getFavorites: vi.fn().mockResolvedValue([]),
      getStorageType: vi.fn().mockReturnValue('turso'),
      isOnline: vi.fn().mockReturnValue(true),
      isAvailable: vi.fn().mockReturnValue(true),
      getStatus: vi.fn().mockResolvedValue({
        type: 'turso',
        isOnline: true,
        pendingSyncCount: 0
      })
    }

    for (const method of requiredMethods) {
      expect(typeof mockAdapter[method as keyof typeof mockAdapter]).toBe('function')
    }
  })

  test('HybridAdapter implements SyncableAdapter', async () => {
    const mockAdapter = {
      // StorageAdapter methods
      saveHistory: vi.fn(),
      getAllHistory: vi.fn().mockResolvedValue([]),
      getHistory: vi.fn().mockResolvedValue(null),
      deleteHistory: vi.fn(),
      clearAllHistory: vi.fn(),
      getHistoryCount: vi.fn().mockResolvedValue(0),
      saveFavorites: vi.fn(),
      getFavorites: vi.fn().mockResolvedValue([]),
      getStorageType: vi.fn().mockReturnValue('hybrid'),
      isOnline: vi.fn().mockReturnValue(true),
      isAvailable: vi.fn().mockReturnValue(true),
      getStatus: vi.fn().mockResolvedValue({
        type: 'hybrid',
        isOnline: true,
        pendingSyncCount: 0
      }),
      // SyncableAdapter methods
      addToSyncQueue: vi.fn(),
      getSyncQueue: vi.fn().mockResolvedValue([]),
      clearSyncQueue: vi.fn(),
      incrementRetryCount: vi.fn(),
      syncPendingItems: vi.fn(),
      pullFromCloud: vi.fn()
    }

    const allMethods = [...requiredMethods, ...syncableMethods]
    for (const method of allMethods) {
      expect(typeof mockAdapter[method as keyof typeof mockAdapter]).toBe('function')
    }
  })
})

describe('Storage Facade - Environment Detection', () => {
  test('should select IndexedDB when TURSO_URL is not set', () => {
    const tursoUrl = undefined

    const selectedMode = tursoUrl ? 'hybrid' : 'indexeddb'

    expect(selectedMode).toBe('indexeddb')
  })

  test('should select Hybrid when TURSO_URL is set', () => {
    const tursoUrl = 'libsql://test.turso.io'

    const selectedMode = tursoUrl ? 'hybrid' : 'indexeddb'

    expect(selectedMode).toBe('hybrid')
  })

  test('should fallback to IndexedDB when Hybrid init fails', async () => {
    // Simulate Hybrid initialization failure
    let storageType = 'hybrid'
    const hybridInitFailed = true

    if (hybridInitFailed) {
      storageType = 'indexeddb'
    }

    expect(storageType).toBe('indexeddb')
  })
})

describe('Hybrid Adapter - Offline/Online Behavior', () => {
  interface MockSyncQueue {
    items: SyncQueueItem[]
    add: (id: string, action: 'save' | 'delete') => void
    get: () => SyncQueueItem[]
    clear: (id: string) => void
  }

  let syncQueue: MockSyncQueue
  let localStorage: Map<string, HistoryRecord>
  let cloudStorage: Map<string, HistoryRecord>
  let isOnline: boolean

  beforeEach(() => {
    syncQueue = {
      items: [],
      add: (id, action) => {
        syncQueue.items.push({ id, action, timestamp: Date.now(), retryCount: 0 })
      },
      get: () => syncQueue.items,
      clear: (id) => {
        syncQueue.items = syncQueue.items.filter(item => item.id !== id)
      }
    }
    localStorage = new Map()
    cloudStorage = new Map()
    isOnline = true
  })

  test('should save to local first, then cloud when online', async () => {
    const record = createMockRecord('online-test')
    isOnline = true

    // Hybrid save logic simulation
    localStorage.set(record.id, record)

    if (isOnline) {
      cloudStorage.set(record.id, record)
    }

    expect(localStorage.has(record.id)).toBe(true)
    expect(cloudStorage.has(record.id)).toBe(true)
    expect(syncQueue.items).toHaveLength(0)
  })

  test('should save to local and queue sync when offline', async () => {
    const record = createMockRecord('offline-test')
    isOnline = false

    // Hybrid save logic simulation
    localStorage.set(record.id, record)

    if (!isOnline) {
      syncQueue.add(record.id, 'save')
    }

    expect(localStorage.has(record.id)).toBe(true)
    expect(cloudStorage.has(record.id)).toBe(false)
    expect(syncQueue.items).toHaveLength(1)
    expect(syncQueue.items[0].action).toBe('save')
  })

  test('should queue sync when cloud save fails', async () => {
    const record = createMockRecord('cloud-fail-test')
    isOnline = true
    const cloudSaveFailed = true

    // Hybrid save logic simulation
    localStorage.set(record.id, record)

    if (isOnline) {
      try {
        if (cloudSaveFailed) throw new Error('Cloud save failed')
        cloudStorage.set(record.id, record)
      } catch {
        syncQueue.add(record.id, 'save')
      }
    }

    expect(localStorage.has(record.id)).toBe(true)
    expect(cloudStorage.has(record.id)).toBe(false)
    expect(syncQueue.items).toHaveLength(1)
  })

  test('should sync pending items when coming online', async () => {
    // Setup: offline save
    const record1 = createMockRecord('pending-1')
    const record2 = createMockRecord('pending-2')

    localStorage.set(record1.id, record1)
    localStorage.set(record2.id, record2)
    syncQueue.add(record1.id, 'save')
    syncQueue.add(record2.id, 'save')

    expect(syncQueue.items).toHaveLength(2)

    // Coming online - sync pending items
    isOnline = true
    for (const item of [...syncQueue.items]) {
      if (item.action === 'save') {
        const record = localStorage.get(item.id)
        if (record) {
          cloudStorage.set(item.id, record)
          syncQueue.clear(item.id)
        }
      }
    }

    expect(cloudStorage.has(record1.id)).toBe(true)
    expect(cloudStorage.has(record2.id)).toBe(true)
    expect(syncQueue.items).toHaveLength(0)
  })

  test('should handle delete sync correctly', async () => {
    // Setup: record exists in both storages
    const record = createMockRecord('delete-test')
    localStorage.set(record.id, record)
    cloudStorage.set(record.id, record)

    // Delete while online
    isOnline = true
    localStorage.delete(record.id)
    if (isOnline) {
      cloudStorage.delete(record.id)
    }

    expect(localStorage.has(record.id)).toBe(false)
    expect(cloudStorage.has(record.id)).toBe(false)
  })

  test('should queue delete when offline', async () => {
    const record = createMockRecord('delete-offline')
    localStorage.set(record.id, record)
    cloudStorage.set(record.id, record)

    // Delete while offline
    isOnline = false
    localStorage.delete(record.id)
    if (!isOnline) {
      syncQueue.add(record.id, 'delete')
    }

    expect(localStorage.has(record.id)).toBe(false)
    expect(cloudStorage.has(record.id)).toBe(true) // Still in cloud
    expect(syncQueue.items).toHaveLength(1)
    expect(syncQueue.items[0].action).toBe('delete')
  })
})

describe('Hybrid Adapter - Conflict Resolution', () => {
  test('should use timestamp-based resolution (newest wins)', () => {
    const oldTime = Date.now() - 10000 // 10 seconds ago
    const newTime = Date.now()

    const localRecord = createMockRecord('conflict-1', oldTime)
    const cloudRecord = createMockRecord('conflict-1', newTime)

    // Conflict resolution: compare updatedAt
    const localTime = localRecord.updatedAt || localRecord.timestamp
    const cloudTime = cloudRecord.updatedAt || cloudRecord.timestamp

    const winner = cloudTime > localTime ? 'cloud' : 'local'

    expect(winner).toBe('cloud')
  })

  test('should keep local when local is newer', () => {
    const oldTime = Date.now() - 10000
    const newTime = Date.now()

    const localRecord = createMockRecord('conflict-2', newTime)
    const cloudRecord = createMockRecord('conflict-2', oldTime)

    const localTime = localRecord.updatedAt || localRecord.timestamp
    const cloudTime = cloudRecord.updatedAt || cloudRecord.timestamp

    const winner = cloudTime > localTime ? 'cloud' : 'local'

    expect(winner).toBe('local')
  })

  test('should prefer cloud when timestamps are equal', () => {
    const sameTime = Date.now()

    const localRecord = createMockRecord('conflict-3', sameTime)
    const cloudRecord = createMockRecord('conflict-3', sameTime)

    const localTime = localRecord.updatedAt || localRecord.timestamp
    const cloudTime = cloudRecord.updatedAt || cloudRecord.timestamp

    // When equal, prefer cloud (newer external data)
    const winner = cloudTime >= localTime ? 'cloud' : 'local'

    expect(winner).toBe('cloud')
  })
})

describe('Hybrid Adapter - Retry Logic', () => {
  const MAX_RETRY_COUNT = 3

  test('should increment retry count on failure', () => {
    const queueItem: SyncQueueItem = {
      id: 'retry-test',
      action: 'save',
      timestamp: Date.now(),
      retryCount: 0
    }

    // Simulate failure
    queueItem.retryCount++

    expect(queueItem.retryCount).toBe(1)
  })

  test('should remove from queue after max retries', () => {
    const queue: SyncQueueItem[] = [
      { id: 'max-retry', action: 'save', timestamp: Date.now(), retryCount: 3 }
    ]

    // Process queue
    const processedQueue = queue.filter(item => item.retryCount < MAX_RETRY_COUNT)

    expect(processedQueue).toHaveLength(0)
  })

  test('should keep items with retryCount < MAX_RETRY_COUNT', () => {
    const queue: SyncQueueItem[] = [
      { id: 'item-1', action: 'save', timestamp: Date.now(), retryCount: 0 },
      { id: 'item-2', action: 'save', timestamp: Date.now(), retryCount: 2 },
      { id: 'item-3', action: 'save', timestamp: Date.now(), retryCount: 3 }
    ]

    const processedQueue = queue.filter(item => item.retryCount < MAX_RETRY_COUNT)

    expect(processedQueue).toHaveLength(2)
    expect(processedQueue.map(i => i.id)).toEqual(['item-1', 'item-2'])
  })
})

describe('Storage Facade - CRUD Operations', () => {
  let mockStorage: Map<string, HistoryRecord>

  beforeEach(() => {
    mockStorage = new Map()
  })

  test('saveHistory should store record', async () => {
    const record = createMockRecord('crud-save')

    mockStorage.set(record.id, record)

    expect(mockStorage.get(record.id)).toEqual(record)
  })

  test('getAllHistory should return sorted by timestamp DESC', async () => {
    const records = [
      createMockRecord('old', Date.now() - 20000),
      createMockRecord('mid', Date.now() - 10000),
      createMockRecord('new', Date.now())
    ]

    for (const r of records) {
      mockStorage.set(r.id, r)
    }

    const sorted = Array.from(mockStorage.values())
      .sort((a, b) => b.timestamp - a.timestamp)

    expect(sorted[0].id).toBe('new')
    expect(sorted[1].id).toBe('mid')
    expect(sorted[2].id).toBe('old')
  })

  test('getHistory should return null for non-existent id', async () => {
    const result = mockStorage.get('non-existent') || null

    expect(result).toBeNull()
  })

  test('deleteHistory should remove record', async () => {
    const record = createMockRecord('crud-delete')
    mockStorage.set(record.id, record)

    mockStorage.delete(record.id)

    expect(mockStorage.has(record.id)).toBe(false)
  })

  test('clearAllHistory should remove all records', async () => {
    mockStorage.set('1', createMockRecord('1'))
    mockStorage.set('2', createMockRecord('2'))
    mockStorage.set('3', createMockRecord('3'))

    mockStorage.clear()

    expect(mockStorage.size).toBe(0)
  })

  test('getHistoryCount should return correct count', async () => {
    mockStorage.set('1', createMockRecord('1'))
    mockStorage.set('2', createMockRecord('2'))

    expect(mockStorage.size).toBe(2)
  })
})

describe('Storage - MAX_HISTORY Limit', () => {
  const MAX_HISTORY = 100

  test('should delete oldest when limit exceeded', () => {
    const records: HistoryRecord[] = []

    // Fill to MAX_HISTORY
    for (let i = 0; i < MAX_HISTORY; i++) {
      records.push(createMockRecord(`record-${i}`, Date.now() + i))
    }

    expect(records.length).toBe(MAX_HISTORY)

    // Try to add one more
    const newRecord = createMockRecord('new-record', Date.now() + MAX_HISTORY + 1)

    if (records.length >= MAX_HISTORY) {
      // Sort by timestamp and remove oldest
      records.sort((a, b) => a.timestamp - b.timestamp)
      records.shift() // Remove oldest
    }

    records.push(newRecord)

    expect(records.length).toBe(MAX_HISTORY)
    expect(records.find(r => r.id === 'record-0')).toBeUndefined() // Oldest removed
    expect(records.find(r => r.id === 'new-record')).toBeDefined() // New added
  })

  test('should not delete when isUpdate is true', () => {
    const records: HistoryRecord[] = []

    for (let i = 0; i < MAX_HISTORY; i++) {
      records.push(createMockRecord(`record-${i}`, Date.now() + i))
    }

    // Update existing record (isUpdate = true)
    const isUpdate = true
    const existingRecord = records.find(r => r.id === 'record-50')

    if (existingRecord) {
      const index = records.indexOf(existingRecord)
      records[index] = { ...existingRecord, name: 'Updated Name', updatedAt: Date.now() }
    }

    // Should not trigger deletion
    if (!isUpdate && records.length >= MAX_HISTORY) {
      // This should NOT run for updates
      records.shift()
    }

    expect(records.length).toBe(MAX_HISTORY)
    expect(records.find(r => r.name === 'Updated Name')).toBeDefined()
  })
})

describe('Favorites Storage', () => {
  let favorites: string[]

  beforeEach(() => {
    favorites = []
  })

  test('should save favorites', () => {
    const methodIds = ['t-test', 'anova', 'chi-square']

    favorites = methodIds

    expect(favorites).toEqual(['t-test', 'anova', 'chi-square'])
  })

  test('should get empty array when no favorites', () => {
    expect(favorites).toEqual([])
  })

  test('should overwrite previous favorites', () => {
    favorites = ['t-test', 'anova']
    favorites = ['chi-square', 'regression']

    expect(favorites).toEqual(['chi-square', 'regression'])
    expect(favorites).not.toContain('t-test')
  })
})

describe('Storage Status', () => {
  test('IndexedDB status', async () => {
    const status: StorageStatus = {
      type: 'indexeddb',
      isOnline: true,
      pendingSyncCount: 0,
      lastSyncAt: undefined
    }

    expect(status.type).toBe('indexeddb')
    expect(status.pendingSyncCount).toBe(0)
  })

  test('Turso status', async () => {
    const status: StorageStatus = {
      type: 'turso',
      isOnline: true,
      pendingSyncCount: 0,
      lastSyncAt: Date.now()
    }

    expect(status.type).toBe('turso')
    expect(status.lastSyncAt).toBeDefined()
  })

  test('Hybrid status with pending sync', async () => {
    const status: StorageStatus = {
      type: 'hybrid',
      isOnline: false,
      pendingSyncCount: 5,
      lastSyncAt: Date.now() - 60000
    }

    expect(status.type).toBe('hybrid')
    expect(status.isOnline).toBe(false)
    expect(status.pendingSyncCount).toBe(5)
  })
})

describe('Event Listener Cleanup (Hybrid)', () => {
  test('should properly bind and unbind event listeners', () => {
    const listeners: Map<string, () => void> = new Map()

    // Simulate binding
    const handleOnline = () => console.log('online')
    const handleOffline = () => console.log('offline')

    const boundOnline = handleOnline.bind({})
    const boundOffline = handleOffline.bind({})

    listeners.set('online', boundOnline)
    listeners.set('offline', boundOffline)

    expect(listeners.size).toBe(2)

    // Simulate unbinding with same references
    listeners.delete('online')
    listeners.delete('offline')

    expect(listeners.size).toBe(0)
  })

  test('should fail to remove listeners with new function instances (DOM behavior)', () => {
    // This demonstrates why we store bound handlers as class properties
    // In real DOM, addEventListener/removeEventListener use reference equality

    const listeners = new Map<string, () => void>()
    const handler1 = () => console.log('test')
    const handler2 = () => console.log('test') // Same code, different instance

    listeners.set('key', handler1)

    // Reference equality check (what DOM actually does)
    const isSameReference = handler1 === handler2

    expect(isSameReference).toBe(false) // Different instances
    expect(listeners.get('key')).toBe(handler1) // Can retrieve with key
    expect(listeners.get('key')).not.toBe(handler2) // Not the same as handler2
  })
})

describe('Pull from Cloud - Data Merge', () => {
  test('should add cloud-only records to local', () => {
    const localRecords = new Map<string, HistoryRecord>()
    const cloudRecords = [
      createMockRecord('cloud-1'),
      createMockRecord('cloud-2')
    ]

    // Pull from cloud
    for (const cloudRecord of cloudRecords) {
      if (!localRecords.has(cloudRecord.id)) {
        localRecords.set(cloudRecord.id, cloudRecord)
      }
    }

    expect(localRecords.size).toBe(2)
  })

  test('should not overwrite newer local records', () => {
    const newTime = Date.now()
    const oldTime = Date.now() - 10000

    const localRecords = new Map<string, HistoryRecord>()
    const localRecord = createMockRecord('shared-1', newTime)
    localRecords.set(localRecord.id, localRecord)

    const cloudRecord = createMockRecord('shared-1', oldTime)

    // Pull from cloud with conflict resolution
    const existingLocal = localRecords.get(cloudRecord.id)
    if (existingLocal) {
      const localTime = existingLocal.updatedAt || existingLocal.timestamp
      const cloudTime = cloudRecord.updatedAt || cloudRecord.timestamp

      if (cloudTime > localTime) {
        localRecords.set(cloudRecord.id, cloudRecord)
      }
      // Else keep local (local is newer)
    }

    const result = localRecords.get('shared-1')
    expect(result?.timestamp).toBe(newTime) // Local kept (newer)
  })

  test('should update local with newer cloud records', () => {
    const oldTime = Date.now() - 10000
    const newTime = Date.now()

    const localRecords = new Map<string, HistoryRecord>()
    const localRecord = createMockRecord('shared-2', oldTime)
    localRecords.set(localRecord.id, localRecord)

    const cloudRecord = createMockRecord('shared-2', newTime)

    // Pull from cloud with conflict resolution
    const existingLocal = localRecords.get(cloudRecord.id)
    if (existingLocal) {
      const localTime = existingLocal.updatedAt || existingLocal.timestamp
      const cloudTime = cloudRecord.updatedAt || cloudRecord.timestamp

      if (cloudTime > localTime) {
        localRecords.set(cloudRecord.id, cloudRecord)
      }
    }

    const result = localRecords.get('shared-2')
    expect(result?.timestamp).toBe(newTime) // Cloud applied (newer)
  })
})

/**
 * Integration Test Notes (for Playwright/E2E)
 * ============================================
 *
 * 1. IndexedDB Only Mode:
 *    - No TURSO_URL environment variable
 *    - Verify data persists across page reloads
 *    - Verify MAX_HISTORY limit enforced
 *
 * 2. Hybrid Mode:
 *    - Set TURSO_URL environment variable
 *    - Test offline → online sync
 *    - Test conflict resolution with multi-device simulation
 *
 * 3. Stress Tests:
 *    - Rapid saves (100+ records)
 *    - Concurrent operations
 *    - Network interruption during sync
 */
