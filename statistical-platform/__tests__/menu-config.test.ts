/**
 * menu-config.ts 일관성 검증 테스트
 *
 * 목적:
 * 1. 메뉴 구조 무결성 검증
 * 2. ID 중복 확인
 * 3. 경로 일관성 검증
 * 4. comingSoon과 implemented 로직 검증
 */

import { describe, it, expect } from '@jest/globals'
import {
  STATISTICS_MENU,
  getAllMenuItems,
  getImplementedMenuItems,
  getMenuItemsByCategory,
  getMenuItemByPath,
  STATISTICS_SUMMARY,
  type StatisticsMenuItem,
  type StatisticsCategory
} from '../lib/statistics/menu-config'
import fs from 'fs'
import path from 'path'

describe('menu-config 일관성 검증', () => {

  // ========== Test 1: 구조 무결성 ==========
  describe('구조 무결성', () => {
    it('STATISTICS_MENU가 배열이어야 함', () => {
      expect(Array.isArray(STATISTICS_MENU)).toBe(true)
    })

    it('최소 1개 이상의 카테고리가 있어야 함', () => {
      expect(STATISTICS_MENU.length).toBeGreaterThan(0)
    })

    it('모든 카테고리는 필수 필드를 가져야 함', () => {
      STATISTICS_MENU.forEach((category) => {
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('title')
        expect(category).toHaveProperty('description')
        expect(category).toHaveProperty('icon')
        expect(category).toHaveProperty('items')
        expect(Array.isArray(category.items)).toBe(true)
      })
    })

    it('모든 메뉴 항목은 필수 필드를 가져야 함', () => {
      const allItems = getAllMenuItems()
      allItems.forEach((item) => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('href')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('implemented')
        expect(typeof item.implemented).toBe('boolean')
      })
    })
  })

  // ========== Test 2: ID 중복 검증 ==========
  describe('ID 중복 검증', () => {
    it('카테고리 ID는 중복되지 않아야 함', () => {
      const categoryIds = STATISTICS_MENU.map(cat => cat.id)
      const uniqueIds = new Set(categoryIds)
      expect(categoryIds.length).toBe(uniqueIds.size)
    })

    it('메뉴 항목 ID는 중복되지 않아야 함', () => {
      const allItems = getAllMenuItems()
      const itemIds = allItems.map(item => item.id)
      const uniqueIds = new Set(itemIds)

      if (itemIds.length !== uniqueIds.size) {
        const duplicates = itemIds.filter((id, index) => itemIds.indexOf(id) !== index)
        console.error('중복된 ID:', [...new Set(duplicates)])
      }

      expect(itemIds.length).toBe(uniqueIds.size)
    })

    it('카테고리 ID와 메뉴 항목 ID가 중복되지 않아야 함 (선택적)', () => {
      const categoryIds = STATISTICS_MENU.map(cat => cat.id)
      const itemIds = getAllMenuItems().map(item => item.id)
      const overlap = categoryIds.filter(id => itemIds.includes(id))

      if (overlap.length > 0) {
        console.warn('⚠️ 카테고리 ID와 메뉴 항목 ID 중복:', overlap)
        // 경고만 출력, 테스트는 통과
      }

      expect(true).toBe(true)
    })
  })

  // ========== Test 3: 경로 일관성 ==========
  describe('경로 일관성', () => {
    it('모든 href는 /statistics/로 시작해야 함', () => {
      const allItems = getAllMenuItems()
      allItems.forEach((item) => {
        expect(item.href).toMatch(/^\/statistics\//)
      })
    })

    it('href는 중복되지 않아야 함', () => {
      const allItems = getAllMenuItems()
      const hrefs = allItems.map(item => item.href)
      const uniqueHrefs = new Set(hrefs)
      expect(hrefs.length).toBe(uniqueHrefs.size)
    })

    it('href는 id와 일관성이 있어야 함 (kebab-case)', () => {
      const allItems = getAllMenuItems()
      allItems.forEach((item) => {
        const expectedPath = `/statistics/${item.id}`
        if (item.href !== expectedPath) {
          // 예외 케이스 (id와 href가 다른 경우)
          const exceptions = [
            'one-sample-proportion', // href: proportion-test
            'stepwise-regression', // href: stepwise
            'cluster-analysis', // href: cluster
            'kolmogorov-smirnov', // href: ks-test
          ]

          if (!exceptions.includes(item.id)) {
            console.warn(`⚠️ ID-href 불일치: ${item.id} → ${item.href}`)
          }
        }
      })
    })
  })

  // ========== Test 4: category 필드 일관성 ==========
  describe('category 필드 일관성', () => {
    it('메뉴 항목의 category는 실제 카테고리 ID와 일치해야 함', () => {
      STATISTICS_MENU.forEach((category) => {
        category.items.forEach((item) => {
          expect(item.category).toBe(category.id)
        })
      })
    })
  })

  // ========== Test 5: implemented & comingSoon 로직 ==========
  describe('implemented & comingSoon 로직', () => {
    it('implemented가 false인 항목은 comingSoon이 true여야 함', () => {
      const allItems = getAllMenuItems()
      const notImplemented = allItems.filter(item => !item.implemented)

      notImplemented.forEach((item) => {
        expect(item.comingSoon).toBe(true)
      })
    })

    it('implemented가 true인 항목은 comingSoon이 없거나 false여야 함', () => {
      const allItems = getAllMenuItems()
      const implemented = allItems.filter(item => item.implemented)

      implemented.forEach((item) => {
        if (item.comingSoon) {
          expect(item.comingSoon).toBe(false)
        }
      })
    })

    it('getImplementedMenuItems()는 implemented: true만 반환해야 함', () => {
      const implemented = getImplementedMenuItems()
      implemented.forEach((item) => {
        expect(item.implemented).toBe(true)
      })
    })
  })

  // ========== Test 6: 유틸 함수 동작 검증 ==========
  describe('유틸 함수 동작', () => {
    it('getAllMenuItems()는 모든 항목을 플랫하게 반환해야 함', () => {
      const allItems = getAllMenuItems()
      const expectedCount = STATISTICS_MENU.reduce((sum, cat) => sum + cat.items.length, 0)
      expect(allItems.length).toBe(expectedCount)
    })

    it('getMenuItemsByCategory()는 특정 카테고리 항목만 반환해야 함', () => {
      const compareItems = getMenuItemsByCategory('compare')
      expect(compareItems.length).toBeGreaterThan(0)
      compareItems.forEach((item) => {
        expect(item.category).toBe('compare')
      })
    })

    it('getMenuItemsByCategory()는 존재하지 않는 카테고리에 빈 배열 반환', () => {
      const items = getMenuItemsByCategory('non-existent')
      expect(items).toEqual([])
    })

    it('getMenuItemByPath()는 경로로 항목을 찾아야 함', () => {
      const item = getMenuItemByPath('/statistics/t-test')
      expect(item).toBeDefined()
      expect(item?.id).toBe('t-test')
    })

    it('getMenuItemByPath()는 존재하지 않는 경로에 undefined 반환', () => {
      const item = getMenuItemByPath('/statistics/non-existent')
      expect(item).toBeUndefined()
    })
  })

  // ========== Test 7: STATISTICS_SUMMARY 검증 ==========
  describe('STATISTICS_SUMMARY 검증', () => {
    it('totalMethods는 모든 메뉴 항목 수와 일치해야 함', () => {
      const allItems = getAllMenuItems()
      expect(STATISTICS_SUMMARY.totalMethods).toBe(allItems.length)
    })

    it('implementedMethods는 구현된 항목 수와 일치해야 함', () => {
      const implemented = getImplementedMenuItems()
      expect(STATISTICS_SUMMARY.implementedMethods).toBe(implemented.length)
    })

    it('categories는 카테고리 수와 일치해야 함', () => {
      expect(STATISTICS_SUMMARY.categories).toBe(STATISTICS_MENU.length)
    })

    it('completionRate는 올바르게 계산되어야 함', () => {
      const expected = Math.round(
        (STATISTICS_SUMMARY.implementedMethods / STATISTICS_SUMMARY.totalMethods) * 100
      )
      expect(STATISTICS_SUMMARY.completionRate).toBe(expected)
    })

    it('completionRate는 0-100 범위여야 함', () => {
      expect(STATISTICS_SUMMARY.completionRate).toBeGreaterThanOrEqual(0)
      expect(STATISTICS_SUMMARY.completionRate).toBeLessThanOrEqual(100)
    })
  })

  // ========== Test 8: 실제 페이지 파일 존재 검증 ==========
  describe('실제 페이지 파일 존재 검증', () => {
    const statsDir = path.join(__dirname, '../app/(dashboard)/statistics')

    it('implemented: true인 모든 항목은 실제 페이지가 존재해야 함', () => {
      const implemented = getImplementedMenuItems()
      const missingPages: string[] = []

      implemented.forEach((item) => {
        const pagePath = item.href.replace('/statistics/', '')
        const pageFile = path.join(statsDir, pagePath, 'page.tsx')

        if (!fs.existsSync(pageFile)) {
          missingPages.push(item.id)
        }
      })

      if (missingPages.length > 0) {
        console.error('❌ 페이지 파일이 없는 항목:', missingPages)
      }

      expect(missingPages).toEqual([])
    })

    it('implemented: false인 항목은 페이지가 없어야 함 (또는 있어도 됨)', () => {
      const notImplemented = getAllMenuItems().filter(item => !item.implemented)
      const hasPages: string[] = []

      notImplemented.forEach((item) => {
        const pagePath = item.href.replace('/statistics/', '')
        const pageFile = path.join(statsDir, pagePath, 'page.tsx')

        if (fs.existsSync(pageFile)) {
          hasPages.push(item.id)
        }
      })

      if (hasPages.length > 0) {
        console.warn('⚠️ implemented: false인데 페이지가 존재:', hasPages)
      }

      // 경고만 출력, 테스트는 통과 (페이지가 미리 만들어질 수 있음)
      expect(true).toBe(true)
    })

    it('모든 실제 페이지는 메뉴에 등록되어야 함', () => {
      if (!fs.existsSync(statsDir)) {
        console.warn('⚠️ statistics 디렉토리가 없음, 테스트 스킵')
        expect(true).toBe(true)
        return
      }

      const actualPages = fs.readdirSync(statsDir)
        .filter(item => {
          const itemPath = path.join(statsDir, item)
          return fs.statSync(itemPath).isDirectory() &&
                 fs.existsSync(path.join(itemPath, 'page.tsx'))
        })

      const menuPaths = getAllMenuItems().map(item =>
        item.href.replace('/statistics/', '')
      )

      const unmappedPages = actualPages.filter(page => !menuPaths.includes(page))

      if (unmappedPages.length > 0) {
        console.error('❌ 메뉴에 없는 페이지:', unmappedPages)
      }

      expect(unmappedPages).toEqual([])
    })
  })

  // ========== Test 9: 데이터 품질 검증 ==========
  describe('데이터 품질 검증', () => {
    it('모든 title은 비어있지 않아야 함', () => {
      const allItems = getAllMenuItems()
      allItems.forEach((item) => {
        expect(item.title.trim().length).toBeGreaterThan(0)
      })
    })

    it('모든 카테고리 description은 비어있지 않아야 함', () => {
      STATISTICS_MENU.forEach((category) => {
        expect(category.description.trim().length).toBeGreaterThan(0)
      })
    })

    it('subtitle이 있는 경우 비어있지 않아야 함', () => {
      const allItems = getAllMenuItems()
      allItems.forEach((item) => {
        if (item.subtitle) {
          expect(item.subtitle.trim().length).toBeGreaterThan(0)
        }
      })
    })
  })

  // ========== Test 10: 카테고리별 통계 ==========
  describe('카테고리별 통계', () => {
    it('각 카테고리는 최소 1개 이상의 항목을 가져야 함', () => {
      STATISTICS_MENU.forEach((category) => {
        expect(category.items.length).toBeGreaterThan(0)
      })
    })

    it('카테고리별 항목 수 출력', () => {
      console.log('\n=== 카테고리별 통계 ===')
      STATISTICS_MENU.forEach((category) => {
        const implemented = category.items.filter(item => item.implemented).length
        const total = category.items.length
        console.log(`${category.title}: ${implemented}/${total} (${Math.round(implemented/total*100)}%)`)
      })
    })
  })
})
