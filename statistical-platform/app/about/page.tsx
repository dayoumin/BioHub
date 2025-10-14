"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Brain,
  CheckCircle2,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowRight,
  FileText,
  Database,
  Shield,
  Users,
  Award,
  Code2,
  GitBranch,
  Cpu
} from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <Badge className="inline-flex items-center gap-1" variant="outline">
              <Code2 className="h-3 w-3" />
              오픈소스 통계 분석 플랫폼
            </Badge>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              과학적 정확성과 편의성을
              <span className="text-primary block mt-2">동시에 제공하는 통계 플랫폼</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Python SciPy 기반의 검증된 통계 엔진과 AI 지원으로
              연구자와 학생 모두가 신뢰할 수 있는 통계 분석을 수행할 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="text-lg px-8 py-6 group"
                asChild
              >
                <Link href="/">
                  <Brain className="mr-2 h-5 w-5" />
                  스마트 분석 시작하기
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                asChild
              >
                <Link href="/statistics">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  전통적 분석 도구
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Technology Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">SciPy</div>
              <div className="text-sm text-muted-foreground">검증된 통계 엔진</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">29+</div>
              <div className="text-sm text-muted-foreground">통계 분석 방법</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">100,000</div>
              <div className="text-sm text-muted-foreground">행 처리 가능</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">오픈소스</div>
              <div className="text-sm text-muted-foreground">완전 무료</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Technology */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">과학적 정확성을 보장하는 기술</h2>
            <p className="text-muted-foreground text-lg">
              전 세계 연구자들이 신뢰하는 Python 과학 계산 라이브러리 기반
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Python SciPy 엔진</CardTitle>
                <CardDescription className="text-base">
                  NumPy, SciPy, Pandas 등 검증된 과학 계산 라이브러리를 WebAssembly로
                  브라우저에서 직접 실행. 서버 없이도 정확한 통계 계산을 보장합니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI 가이드 시스템</CardTitle>
                <CardDescription className="text-base">
                  데이터 특성을 분석하여 적절한 통계 방법을 추천.
                  정규성, 등분산성 등을 자동 검정하여 가정 위반 시 대안을 제시합니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>학술적 신뢰성</CardTitle>
                <CardDescription className="text-base">
                  모든 통계 계산은 peer-reviewed 알고리즘 사용.
                  p-value, 신뢰구간, 효과크기 등 논문에 필요한 모든 통계량을 제공합니다.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Statistical Methods Detail */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">구현된 통계 분석 방법</h2>
            <p className="text-muted-foreground text-lg">
              scipy.stats 라이브러리 기반의 정확한 통계 계산
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  파라메트릭 검정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.ttest_*</span>
                  <Badge variant="outline">t-검정 (3종)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.f_oneway</span>
                  <Badge variant="outline">일원분산분석</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.pearsonr</span>
                  <Badge variant="outline">Pearson 상관</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.linregress</span>
                  <Badge variant="outline">선형회귀</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  비모수 검정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.mannwhitneyu</span>
                  <Badge variant="outline">Mann-Whitney U</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.wilcoxon</span>
                  <Badge variant="outline">Wilcoxon</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.kruskal</span>
                  <Badge variant="outline">Kruskal-Wallis</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">scipy.stats.spearmanr</span>
                  <Badge variant="outline">Spearman 상관</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                가정 검정 및 사후분석
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Shapiro-Wilk 정규성 검정</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Levene 등분산성 검정</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Tukey HSD 사후검정</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Bonferroni 보정</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Smart Flow Feature */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">스마트 분석 플로우</h2>
              <p className="text-muted-foreground text-lg mb-8">
                통계 지식이 부족해도 AI가 단계별로 가이드하여
                올바른 통계 분석을 수행할 수 있도록 돕습니다.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">데이터 자동 검증</h4>
                    <p className="text-sm text-muted-foreground">
                      업로드된 데이터의 타입, 분포, 이상치를 자동으로 분석
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">목적 기반 방법 추천</h4>
                    <p className="text-sm text-muted-foreground">
                      &quot;그룹 간 차이를 보고 싶어요&quot; → t-test 또는 ANOVA 자동 선택
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">가정 검정 자동화</h4>
                    <p className="text-sm text-muted-foreground">
                      정규성, 등분산성 검정 후 위반 시 비모수 검정 자동 전환
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">해석 가능한 결과</h4>
                    <p className="text-sm text-muted-foreground">
                      통계량뿐만 아니라 의미 해석과 다음 단계 제안
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <Database className="h-8 w-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">100,000+</div>
                  <div className="text-sm text-muted-foreground">행 처리</div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">PDF</div>
                  <div className="text-sm text-muted-foreground">보고서 생성</div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">초보자</div>
                  <div className="text-sm text-muted-foreground">친화적</div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <Award className="h-8 w-8 text-primary mb-2" />
                  <div className="text-2xl font-bold">학술용</div>
                  <div className="text-sm text-muted-foreground">품질 보장</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specs */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">기술 사양</h2>
            <p className="text-muted-foreground text-lg">
              최신 웹 기술과 검증된 통계 라이브러리의 결합
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>프론트엔드</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Next.js 15 (React 19)</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS</li>
                  <li>• shadcn/ui 컴포넌트</li>
                  <li>• Recharts 시각화</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>통계 엔진</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Pyodide (Python in WASM)</li>
                  <li>• SciPy 1.11+</li>
                  <li>• NumPy 1.24+</li>
                  <li>• Pandas 2.0+</li>
                  <li>• Statsmodels</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>데이터 처리</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 청크 기반 대용량 처리</li>
                  <li>• Web Workers 병렬 처리</li>
                  <li>• 실시간 진행률 표시</li>
                  <li>• 메모리 효율 최적화</li>
                  <li>• CSV/Excel 파서</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold">연구의 시작, 여기서부터</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  SPSS 라이선스 비용 부담 없이, R 프로그래밍 지식 없이도
                  전문가 수준의 통계 분석을 수행하세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6"
                    asChild
                  >
                    <Link href="/">
                      <Sparkles className="mr-2 h-5 w-5" />
                      스마트 분석 시작
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-6"
                    asChild
                  >
                    <a href="https://github.com/yourusername/statistical-platform" target="_blank">
                      <Code2 className="mr-2 h-5 w-5" />
                      GitHub 소스코드
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}