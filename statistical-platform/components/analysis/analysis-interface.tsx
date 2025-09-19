"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { STATISTICAL_ANALYSIS_CONFIG, type AnalysisCategory, type StatisticalTest } from "@/lib/statistics/ui-config"

export function AnalysisInterface() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    const initial = searchParams.get("category")
    if (initial) setSelectedCategory(initial)
  }, [searchParams])

  const categories = useMemo(() => STATISTICAL_ANALYSIS_CONFIG, [])

  function getCanonicalCategoryIdFor(testId: string): string | null {
    // 'popular' 외의 실제 카테고리 우선
    const nonPopular = categories.filter(c => c.id !== "popular")
    for (const c of nonPopular) {
      if (c.tests.some(t => t.id === testId)) return c.id
    }
    // 없으면 popular (표시용)
    return categories.find(c => c.tests.some(t => t.id === testId))?.id ?? null
  }

  const filteredTests = useMemo(() => {
    if (!searchQuery) return [] as Array<{ test: StatisticalTest; categoryId: string; categoryTitle: string; categoryColor: string }>
    const lower = searchQuery.toLowerCase()
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
  }, [searchQuery, categories])

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
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 검색 결과 */}
      {searchQuery && filteredTests.length > 0 && (
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
      {!searchQuery && (
        <Tabs defaultValue={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-7">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.title}
              </TabsTrigger>
            ))}
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {categories.map(category => {
              const Icon = category.icon
              return (
                <Card key={category.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${category.color}-50 dark:bg-${category.color}-950/30`}>
                          <Icon className={`h-5 w-5 text-${category.color}-600 dark:text-${category.color}-400`} />
                        </div>
                        <div>
                          <CardTitle>{category.title}</CardTitle>
                          <CardDescription>{category.tests.length}개 분석 도구</CardDescription>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/analysis?category=${category.id}`}>
                          카테고리 보기
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {category.tests.map((test, i) => {
                        const canonicalCategoryId = category.id === "popular" ? (getCanonicalCategoryIdFor(test.id) || category.id) : category.id
                        return (
                          <Button
                            key={i}
                            variant="outline"
                            className="justify-start h-auto p-4"
                            asChild
                          >
                            <Link href={`/analysis/${canonicalCategoryId}/${encodeURIComponent(test.id)}`}>
                              <div className="text-left">
                                <div className="font-medium">{test.name}</div>
                                <div className="text-sm text-muted-foreground">{test.description}</div>
                              </div>
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {categories.map(category => (
            <TabsContent key={category.id} value={category.id}>
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
                    {category.tests.map((test, i) => {
                      const canonicalCategoryId = category.id === "popular" ? (getCanonicalCategoryIdFor(test.id) || category.id) : category.id
                      return (
                        <Button
                          key={i}
                          variant="outline"
                          className="justify-start h-auto p-4"
                          asChild
                        >
                          <Link href={`/analysis/${canonicalCategoryId}/${encodeURIComponent(test.id)}`}>
                            <div className="text-left">
                              <div className="font-medium">{test.name}</div>
                              <div className="text-sm text-muted-foreground">{test.description}</div>
                            </div>
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}