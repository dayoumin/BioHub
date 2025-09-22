"use client"

import { useEffect, useMemo, useState, memo, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { STATISTICAL_ANALYSIS_CONFIG, type AnalysisCategory, type StatisticalTest } from "@/lib/statistics/ui-config"
import { useDebounce } from "@/hooks/useDebounce"

// 메모이제이션을 통한 컴포넌트 최적화
const CategoryTab = memo(({ category }: { category: AnalysisCategory }) => (
  <TabsContent value={category.id}>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{category.title}</CardTitle>
            <CardDescription>{category.tests.length}개 분석 도구</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/analysis?category=${category.id}`}>
              전체 보기
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {category.tests.map((test, i) => (
            <Button
              key={test.id}
              variant="outline"
              className="justify-start h-auto p-4"
              asChild
            >
              <Link href={`/analysis/${category.id}/${encodeURIComponent(test.id)}`}>
                <div className="text-left">
                  <div className="font-medium">{test.name}</div>
                  <div className="text-sm text-muted-foreground">{test.description}</div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  </TabsContent>
))
CategoryTab.displayName = 'CategoryTab'

export const AnalysisInterface = memo(() => {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("descriptive")

  useEffect(() => {
    const initial = searchParams.get("category")
    if (initial) setSelectedCategory(initial)
  }, [searchParams])

  const categories = useMemo(() => STATISTICAL_ANALYSIS_CONFIG, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value)
  }, [])

  function getCanonicalCategoryIdFor(testId: string): string | null {
    // 테스트가 속한 카테고리 찾기
    for (const c of categories) {
      if (c.tests.some(t => t.id === testId)) return c.id
    }
    return null
  }

  // 검색 쿼리 디바운싱 (300ms 지연)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const filteredTests = useMemo(() => {
    if (!debouncedSearchQuery) return [] as Array<{ test: StatisticalTest; categoryId: string; categoryTitle: string; categoryColor: string }>
    const lower = debouncedSearchQuery.toLowerCase()
    const results: Array<{ test: StatisticalTest; categoryId: string; categoryTitle: string; categoryColor: string }> = []
    for (const cat of categories) {
      for (const test of cat.tests) {
        const hay = `${test.name} ${test.nameEn} ${test.description}`.toLowerCase()
        if (hay.includes(lower)) {
          const canonical = getCanonicalCategoryIdFor(test.id) || cat.id
          const canonicalCat = categories.find(c => c.id === canonical) as AnalysisCategory
          results.push({ test, categoryId: canonicalCat.id, categoryTitle: canonicalCat.title, categoryColor: canonicalCat.color })
        }
      }
    }
    return results
  }, [debouncedSearchQuery, categories])

  return (
    <div className="space-y-6">
      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="통계 분석 방법 검색 (예: t-검정, 회귀분석, ANOVA)"
          className="pl-10 pr-4"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* 검색 결과 */}
      {debouncedSearchQuery && filteredTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            검색 결과 ({filteredTests.length}개)
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredTests.map(({ test, categoryId, categoryTitle, categoryColor }, i) => (
              <Link key={i} href={`/analysis/${categoryId}/${encodeURIComponent(test.id)}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{test.name}</CardTitle>
                        <CardDescription className="text-sm">{test.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className={`text-${categoryColor}-600`}>
                        {categoryTitle}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 탭 */}
      {!debouncedSearchQuery && (
        <Tabs defaultValue={selectedCategory} onValueChange={handleCategoryChange}>
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8">
            {categories.map(cat => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="text-xs sm:text-sm"
                title={cat.title}
              >
                <span className="hidden sm:inline">{cat.title}</span>
                <span className="sm:hidden">
                  {cat.title.length > 5 ? cat.title.slice(0, 4) + '..' : cat.title}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <CategoryTab key={category.id} category={category} />
          ))}
        </Tabs>
      )}
    </div>
  )
})
AnalysisInterface.displayName = 'AnalysisInterface'