/**
 * IndexedDB Template Storage
 * 분석 템플릿을 영구 저장합니다.
 *
 * 특징:
 * - 브라우저 종료 후에도 템플릿 유지
 * - 데이터 없이 분석 설정만 저장 (용량 최소화)
 * - 최대 50개 템플릿 저장
 * - 사용 빈도/최근 사용 기준 정렬 지원
 */

import type { AnalysisTemplate, TemplateListOptions } from '@/types/smart-flow'

const DB_NAME = 'smart-flow-templates'
const DB_VERSION = 1
const STORE_NAME = 'templates'
const MAX_TEMPLATES = 50

/**
 * IndexedDB 사용 가능 여부 체크
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/**
 * IndexedDB 연결 초기화
 */
function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 템플릿 스토어 생성
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        // 인덱스 생성 (정렬용)
        objectStore.createIndex('createdAt', 'createdAt', { unique: false })
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        objectStore.createIndex('usageCount', 'usageCount', { unique: false })
        objectStore.createIndex('lastUsedAt', 'lastUsedAt', { unique: false })
        objectStore.createIndex('name', 'name', { unique: false })
        objectStore.createIndex('methodId', ['method', 'id'], { unique: false })
      }
    }
  })
}

/**
 * 템플릿 저장
 */
export async function saveTemplate(template: AnalysisTemplate): Promise<void> {
  // 최대 개수 체크
  const allTemplates = await getAllTemplates()
  const existingTemplate = allTemplates.find(t => t.id === template.id)

  if (!existingTemplate && allTemplates.length >= MAX_TEMPLATES) {
    // 가장 오래되고 사용 빈도가 낮은 템플릿 삭제
    const sortedByUsage = [...allTemplates].sort((a, b) => {
      // 사용 횟수가 같으면 생성일 기준
      if (a.usageCount === b.usageCount) {
        return a.createdAt - b.createdAt
      }
      return a.usageCount - b.usageCount
    })
    await deleteTemplate(sortedByUsage[0].id)
  }

  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.put(template)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 모든 템플릿 가져오기
 */
export async function getAllTemplates(options?: TemplateListOptions): Promise<AnalysisTemplate[]> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      let templates = request.result as AnalysisTemplate[]

      // 필터링
      if (options?.categoryFilter) {
        templates = templates.filter(t => t.method.category === options.categoryFilter)
      }
      if (options?.searchQuery) {
        const query = options.searchQuery.toLowerCase()
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.method.name.toLowerCase().includes(query)
        )
      }

      // 정렬
      const sortBy = options?.sortBy || 'recent'
      const sortOrder = options?.sortOrder || 'desc'

      templates.sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case 'recent':
            comparison = (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt)
            break
          case 'usage':
            comparison = b.usageCount - a.usageCount
            break
          case 'name':
            comparison = a.name.localeCompare(b.name, 'ko')
            break
          case 'created':
            comparison = b.createdAt - a.createdAt
            break
        }
        return sortOrder === 'asc' ? -comparison : comparison
      })

      resolve(templates)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 특정 템플릿 가져오기
 */
export async function getTemplate(id: string): Promise<AnalysisTemplate | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 템플릿 사용 횟수 증가 및 마지막 사용 시간 업데이트
 */
export async function incrementTemplateUsage(id: string): Promise<void> {
  const template = await getTemplate(id)
  if (!template) return

  template.usageCount += 1
  template.lastUsedAt = Date.now()

  await saveTemplate(template)
}

/**
 * 템플릿 수정 (이름, 설명)
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<AnalysisTemplate, 'name' | 'description'>>
): Promise<void> {
  const template = await getTemplate(id)
  if (!template) return

  if (updates.name !== undefined) template.name = updates.name
  if (updates.description !== undefined) template.description = updates.description
  template.updatedAt = Date.now()

  await saveTemplate(template)
}

/**
 * 템플릿 삭제
 */
export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 모든 템플릿 삭제
 */
export async function clearAllTemplates(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 템플릿 개수 가져오기
 */
export async function getTemplateCount(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 카테고리별 템플릿 개수 가져오기
 */
export async function getTemplateCounts(): Promise<Record<string, number>> {
  const templates = await getAllTemplates()
  const counts: Record<string, number> = {}

  for (const template of templates) {
    const category = template.method.category
    counts[category] = (counts[category] || 0) + 1
  }

  return counts
}

/**
 * 최근 사용 템플릿 가져오기 (상위 N개)
 */
export async function getRecentTemplates(limit = 5): Promise<AnalysisTemplate[]> {
  const templates = await getAllTemplates({ sortBy: 'recent', sortOrder: 'desc' })
  return templates.slice(0, limit)
}

/**
 * 자주 사용하는 템플릿 가져오기 (상위 N개)
 */
export async function getFrequentTemplates(limit = 5): Promise<AnalysisTemplate[]> {
  const templates = await getAllTemplates({ sortBy: 'usage', sortOrder: 'desc' })
  return templates.filter(t => t.usageCount > 0).slice(0, limit)
}
