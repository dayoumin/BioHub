import { STATISTICAL_ANALYSIS_CONFIG } from "@/lib/statistics/ui-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Star } from "lucide-react"
import Link from "next/link"

export function StatisticalToolsSection() {
  // 인기 카테고리와 주요 도구들만 표시 (우선순위 기준)
  const mainCategories = STATISTICAL_ANALYSIS_CONFIG
    .filter(cat => cat.priority <= 6)
    .sort((a, b) => a.priority - b.priority)

  return (
    <section className="space-y-12 border-t pt-16">
      {/* 섹션 헤더 */}
      <div className="text-center space-y-4">
        <Badge variant="outline" className="mb-2">전문가 직접 접근</Badge>
        <h2 className="text-3xl font-bold">
          개별 분석 도구에 직접 접근하기
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          위 스마트 분석 플로우를 권장하지만, 특정 분석 도구에 직접 접근할 수도 있습니다.
          각 도구는 Python의 SciPy와 NumPy를 기반으로 정확한 결과를 보장합니다.
        </p>
      </div>

      {/* 카테고리별 도구 그리드 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mainCategories.map((category) => {
          const Icon = category.icon
          const topTests = category.tests.slice(0, 3) // 상위 3개만 표시
          
          return (
            <Card key={category.id} className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl bg-${category.color}-50 dark:bg-${category.color}-950/30`}>
                    <Icon className={`h-6 w-6 text-${category.color}-600 dark:text-${category.color}-400`} />
                  </div>
                  <Badge variant="secondary">
                    {category.tests.length}개 도구
                  </Badge>
                </div>
                <CardTitle className="mt-4">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 주요 도구 목록 */}
                <div className="space-y-2">
                  {topTests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{test.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: test.popularity }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  ))}
                  {category.tests.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{category.tests.length - 3}개 더 보기
                    </p>
                  )}
                </div>

                {/* 카테고리 링크 */}
                <Button
                  variant="outline"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  asChild
                >
                  <Link href={`/statistics?category=${category.id}`}>
                    {category.title} 도구 보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 전체 도구 보기 버튼 */}
      <div className="text-center">
        <Button size="lg" variant="outline" asChild>
          <Link href="/statistics">
            전체 통계 도구 보기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}