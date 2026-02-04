'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle, XCircle, AlertTriangle, Zap, Package, Server,
  BookOpen, ChevronDown, ChevronUp, Utensils, ChefHat, Building2
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { PYODIDE } from '@/lib/constants'

export function TechStackSection() {
  const [conceptsOpen, setConceptsOpen] = useState(false)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 헤더 */}
      <div>
        <h1 className="text-4xl font-bold mb-2">기술 스택</h1>
        <p className="text-muted-foreground">
          이 프로젝트의 기술 스택과 선택 이유
        </p>
      </div>

      {/* 개념 설명 (접이식) */}
      <Collapsible open={conceptsOpen} onOpenChange={setConceptsOpen}>
        <Card className="border-blue-200 dark:border-blue-800">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  프레임워크 vs 빌드 도구 - 뭐가 다른거야?
                </div>
                {conceptsOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
              <CardDescription className="text-left">
                React, Vite, Next.js... 헷갈리면 클릭해서 개념 정리
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 border-t pt-6">
              {/* 비유로 설명 */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-5 h-5 text-orange-600" />
                    <span className="font-bold text-orange-800 dark:text-orange-300">재료 + 레시피</span>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-400 mb-2">
                    쌀, 고기, 양념 + 김치찌개 레시피
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-sky-500">React</Badge>
                    <Badge className="bg-green-500">Vue</Badge>
                    <Badge className="bg-orange-500">Svelte</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">= 프레임워크 (UI 라이브러리)</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ChefHat className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-purple-800 dark:text-purple-300">요리사 + 주방도구</span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-400 mb-2">
                    요리사 + 압력밥솥 + 가스레인지
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-yellow-500 text-black">Vite</Badge>
                    <Badge className="bg-blue-600">Webpack</Badge>
                    <Badge className="bg-red-500">Turbopack</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">= 빌드 도구 (번들러)</p>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-800 dark:text-green-300">완성된 식당</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-2">
                    메뉴 + 주문 + 서빙 다 해줌
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-black">Next.js</Badge>
                    <Badge className="bg-green-600">Nuxt</Badge>
                    <Badge className="bg-orange-600">SvelteKit</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">= 메타 프레임워크</p>
                </div>
              </div>

              {/* 정리 테이블 */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium border-b">이름</th>
                      <th className="text-left p-3 font-medium border-b border-l">종류</th>
                      <th className="text-left p-3 font-medium border-b border-l">한 줄 정의</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 font-medium">React, Vue, Svelte</td>
                      <td className="p-3 border-l">프레임워크</td>
                      <td className="p-3 border-l text-muted-foreground">"화면을 어떻게 만들까?" - 컴포넌트, 상태 관리</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Vite, Webpack, Turbopack</td>
                      <td className="p-3 border-l">빌드 도구</td>
                      <td className="p-3 border-l text-muted-foreground">"브라우저가 먹을 수 있게 요리해주는 요리사"</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Next.js, Nuxt, SvelteKit</td>
                      <td className="p-3 border-l">메타 프레임워크</td>
                      <td className="p-3 border-l text-muted-foreground">"다 알아서 해드릴게요" - 풀스택 프레임워크</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 실무 조합 */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-3">2025년 많이 쓰는 조합</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">★★★★★</span>
                    <Badge variant="outline">Vite + React</Badge>
                    <span className="text-muted-foreground">빠른 개발, SPA, 포트폴리오</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">★★★★★</span>
                    <Badge variant="outline">Next.js</Badge>
                    <span className="text-muted-foreground">대형 프로젝트, SEO, 풀스택 ← 이 프로젝트</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">★★★★</span>
                    <Badge variant="outline">Vite + Vue</Badge>
                    <span className="text-muted-foreground">Vue 진영 표준</span>
                  </div>
                </div>
              </div>

              {/* 결론 */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>결론:</strong> 이 프로젝트는 <Badge className="bg-black mx-1">Next.js</Badge> 사용
                  = React(재료) + Webpack/Turbopack(요리사) + 라우팅/SSR(서빙)이 한 번에 제공되는 완성된 식당
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 메인 탭 */}
      <Tabs defaultValue="stack" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stack">현재 스택</TabsTrigger>
          <TabsTrigger value="bundler">번들러 비교</TabsTrigger>
          <TabsTrigger value="why-not">선택 이유</TabsTrigger>
          <TabsTrigger value="warnings">자주 보는 경고</TabsTrigger>
        </TabsList>

        {/* 현재 스택 탭 */}
        <TabsContent value="stack" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                핵심 기술 스택
              </CardTitle>
              <CardDescription>프로덕션급 통계 분석 플랫폼</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { name: 'Next.js', version: '15.5.2', color: 'bg-black text-white' },
                  { name: 'React', version: '19.1.0', color: 'bg-sky-500 text-white' },
                  { name: 'TypeScript', version: '5.x', color: 'bg-blue-600 text-white' },
                  { name: 'Tailwind CSS', version: '4.x', color: 'bg-cyan-500 text-white' },
                  { name: 'shadcn/ui', version: 'latest', color: 'bg-zinc-800 text-white' },
                  { name: 'Pyodide', version: PYODIDE.VERSION.replace('v', ''), color: 'bg-yellow-500 text-black' },
                  { name: 'Zustand', version: '5.x', color: 'bg-orange-500 text-white' },
                  { name: 'LangChain', version: '1.x', color: 'bg-green-600 text-white' },
                ].map((tech) => (
                  <div
                    key={tech.name}
                    className={`${tech.color} rounded-lg p-3 text-center`}
                  >
                    <div className="font-semibold text-sm">{tech.name}</div>
                    <div className="text-xs opacity-80">{tech.version}</div>
                  </div>
                ))}
              </div>

              {/* 현재 선택 */}
              <div className="mt-6 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-300">
                    현재 선택: webpack (Next.js 기본)
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <code className="bg-green-200 dark:bg-green-900 px-1 rounded">npm run dev</code> - 안정적, 프로덕션 준비 완료
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 번들러 비교 탭 */}
        <TabsContent value="bundler" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                번들러: webpack vs Turbopack vs Vite
              </CardTitle>
              <CardDescription>이 프로젝트가 webpack을 사용하는 이유</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium border-b">기능</th>
                      <th className="text-center p-3 font-medium border-b border-l">webpack</th>
                      <th className="text-center p-3 font-medium border-b border-l">Turbopack</th>
                      <th className="text-center p-3 font-medium border-b border-l">Vite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3">콜드 스타트</td>
                      <td className="p-3 border-l text-center">3-5s</td>
                      <td className="p-3 border-l text-center text-green-600">1-2s</td>
                      <td className="p-3 border-l text-center text-green-600">1-2s</td>
                    </tr>
                    <tr>
                      <td className="p-3">HMR 속도</td>
                      <td className="p-3 border-l text-center">Fast</td>
                      <td className="p-3 border-l text-center text-green-600">Very Fast</td>
                      <td className="p-3 border-l text-center text-green-600">Very Fast</td>
                    </tr>
                    <tr>
                      <td className="p-3">WASM 지원</td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Stable</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="secondary">Partial</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Stable</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">웹 워커</td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Stable</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="secondary">Partial</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Stable</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">App Router</td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Native</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Native</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="destructive">N/A</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">생태계</td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Mature</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="secondary">Growing</Badge>
                      </td>
                      <td className="p-3 border-l text-center">
                        <Badge variant="default" className="bg-green-600">Mature</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 선택 이유 탭 */}
        <TabsContent value="why-not" className="mt-6 space-y-6">
          {/* Why Not Turbopack */}
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="w-5 h-5" />
                왜 Turbopack이 아닌가?
              </CardTitle>
              <CardDescription>
                <code className="bg-muted px-1 rounded">npm run dev:turbo</code> 사용 가능하지만 권장하지 않음
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { issue: 'Pyodide (WASM)', desc: '복잡한 WASM 바이너리 로딩 문제' },
                  { issue: 'sql.js / absurd-sql', desc: 'SQLite WASM 워커 환경 불안정' },
                  { issue: '@langchain/*', desc: '동적 임포트와 모듈 해석 문제' },
                  { issue: 'plotly.js', desc: '대용량 번들과 동적 청크 로딩' },
                ].map((item) => (
                  <div key={item.issue} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800 dark:text-yellow-300">{item.issue}</div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why Not Vite */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Server className="w-5 h-5" />
                왜 Vite가 아닌가?
              </CardTitle>
              <CardDescription>Vite는 훌륭하지만, 이 프로젝트에는 Next.js가 더 적합</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    이 프로젝트에 필요한 것:
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>+ <strong>45개 페이지</strong> 파일 기반 라우팅</li>
                    <li>+ <strong>SSR/SSG</strong> SEO 지원</li>
                    <li>+ <strong>shadcn/ui</strong> Next.js 최적화</li>
                    <li>+ <strong>대규모 프로덕션</strong> 안정성</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Vite 사용 시 필요한 것:
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- 수동 React Router 설정</li>
                    <li>- SSR 플러그인 설정</li>
                    <li>- 45개 페이지 빌드 설정</li>
                    <li>- 더 많은 보일러플레이트</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-1">
                  Vite가 더 나은 경우:
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  순수 SPA, 소규모 프로젝트, Vue/Svelte 사용, 라이브러리 개발
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 자주 보는 경고 탭 */}
        <TabsContent value="warnings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                자주 보는 경고: webpack.cache.PackFileCacheStrategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                <code className="text-yellow-600">[webpack.cache.PackFileCacheStrategy]</code>{' '}
                <span className="text-muted-foreground">
                  Caching failed for pack: Error: ENOENT...
                </span>
              </div>

              <div className="space-y-3">
                <div className="font-medium">발생 원인:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Windows 파일 잠금 동작</li>
                  <li>- 여러 개발 서버 동시 실행</li>
                  <li>- VSCode가 .next 폴더 감시</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="text-sm">
                  <strong className="text-green-800 dark:text-green-300">무시해도 안전</strong>
                  <span className="text-green-700 dark:text-green-400"> - 빌드는 정상 완료됨</span>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">계속 발생 시:</div>
                <code className="text-xs font-mono">npm run dev:clean</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
