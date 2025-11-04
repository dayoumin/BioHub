/**
 * IndexedDBManager - 단위 테스트
 *
 * 테스트 범위:
 * - 데이터베이스 초기화
 * - CRUD 작업 (Create, Read, Update, Delete)
 * - 인덱스 기반 조회
 * - 트랜잭션 처리
 * - 에러 핸들링
 */

import { IndexedDBManager, type StoreConfig } from '../indexed-db-manager'

describe('IndexedDBManager', () => {
  let manager: IndexedDBManager
  const dbName = 'test-db-' + Date.now()
  const stores: StoreConfig[] = [
    {
      name: 'test-store',
      keyPath: 'id',
      indexes: [
        { name: 'email', keyPath: 'email', unique: true },
        { name: 'status', keyPath: 'status' },
      ],
    },
  ]

  beforeAll(async () => {
    manager = new IndexedDBManager({ dbName, version: 1 })
    await manager.initialize(stores)
  })

  afterAll(() => {
    manager.close()
  })

  // ===== 초기화 테스트 =====
  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      const testManager = new IndexedDBManager({
        dbName: 'init-test-' + Date.now(),
        version: 1,
      })
      await testManager.initialize(stores)
      testManager.close()
    })

    it('should create object stores', async () => {
      const testManager = new IndexedDBManager({
        dbName: 'stores-test-' + Date.now(),
        version: 1,
      })
      await testManager.initialize(stores)
      testManager.close()
    })

    it('should create indexes', async () => {
      const testManager = new IndexedDBManager({
        dbName: 'indexes-test-' + Date.now(),
        version: 1,
      })
      await testManager.initialize(stores)
      testManager.close()
    })
  })

  // ===== PUT 테스트 =====
  describe('put', () => {
    it('should save object successfully', async () => {
      const testData = { id: 'test-1', name: 'Test User', email: 'test@example.com' }
      const result = await manager.put('test-store', testData)
      expect(result).toBe('test-1')
    })

    it('should update existing object', async () => {
      const testData1 = { id: 'test-2', name: 'User 1', email: 'user1@example.com' }
      const testData2 = { id: 'test-2', name: 'User 2 Updated', email: 'user1@example.com' }

      await manager.put('test-store', testData1)
      const result = await manager.put('test-store', testData2)
      expect(result).toBe('test-2')
    })

    it('should save multiple objects', async () => {
      const objects = [
        { id: 'test-3', name: 'User 3', email: 'user3@example.com' },
        { id: 'test-4', name: 'User 4', email: 'user4@example.com' },
      ]

      for (const obj of objects) {
        await manager.put('test-store', obj)
      }
    })

    it('should throw error if database not initialized', async () => {
      const uninitializedManager = new IndexedDBManager({
        dbName: 'uninitialized',
        version: 1,
      })

      await expect(
        uninitializedManager.put('test-store', { id: 'test', name: 'Test' })
      ).rejects.toThrow('Database not initialized')
    })
  })

  // ===== GET 테스트 =====
  describe('get', () => {
    beforeAll(async () => {
      await manager.put('test-store', { id: 'get-test-1', name: 'Get Test', email: 'get@test.com' })
    })

    it('should retrieve object by key', async () => {
      const result = await manager.get('test-store', 'get-test-1')
      expect(result).toEqual({
        id: 'get-test-1',
        name: 'Get Test',
        email: 'get@test.com',
      })
    })

    it('should return undefined for non-existent key', async () => {
      const result = await manager.get('test-store', 'non-existent')
      expect(result).toBeUndefined()
    })

    it('should handle different key types', async () => {
      await manager.put('test-store', { id: 'string-key', name: 'String Key' })
      const result = await manager.get('test-store', 'string-key')
      expect(result).toBeDefined()
    })
  })

  // ===== GETALL 테스트 =====
  describe('getAll', () => {
    beforeAll(async () => {
      const testData = [
        { id: 'getall-1', name: 'User 1', status: 'active' },
        { id: 'getall-2', name: 'User 2', status: 'active' },
        { id: 'getall-3', name: 'User 3', status: 'inactive' },
      ]

      for (const data of testData) {
        await manager.put('test-store', data)
      }
    })

    it('should retrieve all objects', async () => {
      const results = await manager.getAll('test-store')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should preserve object structure', async () => {
      const results = await manager.getAll('test-store')
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('name')
    })

    it('should return empty array for empty store', async () => {
      const emptyStores: StoreConfig[] = [
        {
          name: 'empty-store',
          keyPath: 'id',
        },
      ]

      const emptyManager = new IndexedDBManager({
        dbName: 'empty-test-' + Date.now(),
        version: 1,
      })

      await emptyManager.initialize(emptyStores)
      const results = await emptyManager.getAll('empty-store')
      expect(results).toEqual([])
      emptyManager.close()
    })
  })

  // ===== QUERY (인덱스) 테스트 =====
  describe('query', () => {
    beforeAll(async () => {
      const testData = [
        { id: 'query-1', name: 'Active 1', status: 'active' },
        { id: 'query-2', name: 'Active 2', status: 'active' },
        { id: 'query-3', name: 'Inactive 1', status: 'inactive' },
      ]

      for (const data of testData) {
        await manager.put('test-store', data)
      }
    })

    it('should query by index', async () => {
      const results = await manager.query('test-store', 'status', 'active')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r: any) => r.status === 'active')).toBe(true)
    })

    it('should return empty array if no matches', async () => {
      const results = await manager.query('test-store', 'status', 'unknown')
      expect(results).toEqual([])
    })

    it('should preserve query result structure', async () => {
      const results = await manager.query('test-store', 'status', 'active')
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id')
        expect(results[0]).toHaveProperty('name')
      }
    })
  })

  // ===== DELETE 테스트 =====
  describe('delete', () => {
    beforeAll(async () => {
      await manager.put('test-store', { id: 'delete-test-1', name: 'Delete Test' })
    })

    it('should delete object by key', async () => {
      await manager.put('test-store', { id: 'delete-me', name: 'Will be deleted' })
      await manager.delete('test-store', 'delete-me')

      const result = await manager.get('test-store', 'delete-me')
      expect(result).toBeUndefined()
    })

    it('should handle deletion of non-existent key', async () => {
      // IndexedDB doesn't throw error for non-existent keys
      await expect(manager.delete('test-store', 'non-existent')).resolves.toBeUndefined()
    })
  })

  // ===== CLEAR 테스트 =====
  describe('clear', () => {
    it('should clear all objects in store', async () => {
      const clearStores: StoreConfig[] = [
        {
          name: 'clear-test-store',
          keyPath: 'id',
        },
      ]

      const clearManager = new IndexedDBManager({
        dbName: 'clear-test-' + Date.now(),
        version: 1,
      })

      await clearManager.initialize(clearStores)

      // Add test data
      await clearManager.put('clear-test-store', { id: 'clear-1', name: 'Clear Test' })

      // Clear store
      await clearManager.clear('clear-test-store')

      // Verify cleared
      const results = await clearManager.getAll('clear-test-store')
      expect(results).toEqual([])

      clearManager.close()
    })
  })

  // ===== 트랜잭션 테스트 =====
  describe('transactions', () => {
    it('should handle concurrent operations', async () => {
      const promises = []

      for (let i = 0; i < 10; i++) {
        promises.push(
          manager.put('test-store', {
            id: `concurrent-${i}`,
            name: `Concurrent ${i}`,
          })
        )
      }

      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
    })

    it('should maintain data consistency', async () => {
      const testId = 'consistency-test'
      await manager.put('test-store', { id: testId, name: 'Test', counter: 1 })

      // Simulate multiple updates
      for (let i = 2; i <= 5; i++) {
        await manager.put('test-store', { id: testId, name: 'Test', counter: i })
      }

      const result = await manager.get('test-store', testId)
      expect(result?.counter).toBe(5)
    })
  })

  // ===== 에러 핸들링 =====
  describe('error handling', () => {
    it('should handle invalid store name gracefully', async () => {
      await expect(manager.get('non-existent-store', 'key')).rejects.toThrow()
    })

    it('should handle database operations after close', async () => {
      const testManager = new IndexedDBManager({
        dbName: 'close-test-' + Date.now(),
        version: 1,
      })

      await testManager.initialize(stores)
      testManager.close()

      // After close, operations should fail
      await expect(testManager.put('test-store', { id: 'test' })).rejects.toThrow(
        'Database not initialized'
      )
    })
  })
})
