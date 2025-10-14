import { STATISTICAL_ANALYSIS_CONFIG } from "@/lib/statistics/ui-config"

describe("링크 무결성 (id 기반)", () => {
  test("모든 테스트가 최소 하나의 비-POPULAR 카테고리에 속한다", () => {
    const nonPopular = STATISTICAL_ANALYSIS_CONFIG.filter(c => c.id !== "popular")
    const allTests = new Map<string, { count: number }>()
    for (const cat of nonPopular) {
      for (const t of cat.tests) {
        const entry = allTests.get(t.id) || { count: 0 }
        entry.count += 1
        allTests.set(t.id, entry)
      }
    }
    const missing = Array.from(STATISTICAL_ANALYSIS_CONFIG.flatMap(c => c.tests)).filter(t => !allTests.has(t.id))
    expect(missing).toHaveLength(0)
  })

  test("카테고리/메서드 id 조합으로 URL을 만들 수 있다", () => {
    for (const cat of STATISTICAL_ANALYSIS_CONFIG) {
      if (cat.id === "popular") continue
      for (const t of cat.tests) {
        const url = `/analysis/${cat.id}/${encodeURIComponent(t.id)}`
        expect(url).toContain(cat.id)
        expect(url).toContain(encodeURIComponent(t.id))
      }
    }
  })
})


