import { STATISTICAL_ANALYSIS_CONFIG } from "@/lib/statistics/ui-config"

describe("UI 설정 정합성", () => {
  test("고유 테스트 id 중복 없음 (popular 제외)", () => {
    const canonicalCategories = STATISTICAL_ANALYSIS_CONFIG.filter(c => c.id !== "popular")
    const ids = canonicalCategories.flatMap(c => c.tests.map(t => t.id))
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  test("각 카테고리 필드 유효성", () => {
    for (const c of STATISTICAL_ANALYSIS_CONFIG) {
      expect(typeof c.id).toBe("string")
      expect(typeof c.title).toBe("string")
      expect(typeof c.description).toBe("string")
      expect(Array.isArray(c.tests)).toBe(true)
    }
  })

  test("각 테스트 필드 유효성 (샘플)", () => {
    for (const t of STATISTICAL_ANALYSIS_CONFIG.flatMap(c => c.tests)) {
      expect(typeof t.id).toBe("string")
      expect(typeof t.name).toBe("string")
      expect(typeof t.description).toBe("string")
      expect(Array.isArray(t.dataTypes)).toBe(true)
    }
  })
})


