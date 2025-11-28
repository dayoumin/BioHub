'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, Zap, Package, Server } from 'lucide-react'

export function TechStackSection() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">기술 스택</h1>
        <p className="text-muted-foreground">
          이 프로젝트는 Next.js 15와 webpack을 사용합니다. 그 이유를 설명합니다.
        </p>
      </div>

      {/* Core Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            핵심 기술 스택
          </CardTitle>
          <CardDescription>
            프로덕션급 통계 분석 플랫폼
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: 'Next.js', version: '15.5.2', color: 'bg-black text-white' },
              { name: 'React', version: '19.1.0', color: 'bg-sky-500 text-white' },
              { name: 'TypeScript', version: '5.x', color: 'bg-blue-600 text-white' },
              { name: 'Tailwind CSS', version: '4.x', color: 'bg-cyan-500 text-white' },
              { name: 'shadcn/ui', version: 'latest', color: 'bg-zinc-800 text-white' },
              { name: 'Pyodide', version: '0.28.3', color: 'bg-yellow-500 text-black' },
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
        </CardContent>
      </Card>

      {/* Bundler Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            번들러: webpack vs Turbopack vs Vite
          </CardTitle>
          <CardDescription>
            이 프로젝트가 webpack을 사용하는 이유 (Turbopack, Vite가 아닌)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Choice */}
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-800 dark:text-green-300">
                현재 선택: webpack (Next.js 기본)
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">
                npm run dev (안정적, 프로덕션 준비)
              </div>
            </div>
          </div>

          {/* Comparison Table */}
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
                  <td className="p-3">SSR/SSG</td>
                  <td className="p-3 border-l text-center">
                    <Badge variant="default" className="bg-green-600">Built-in</Badge>
                  </td>
                  <td className="p-3 border-l text-center">
                    <Badge variant="default" className="bg-green-600">Built-in</Badge>
                  </td>
                  <td className="p-3 border-l text-center">
                    <Badge variant="outline">Plugin</Badge>
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

      {/* Why Not Turbopack */}
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="w-5 h-5" />
            왜 Turbopack이 아닌가?
          </CardTitle>
          <CardDescription>
            npm run dev:turbo 사용 가능하지만 이 프로젝트에는 권장하지 않음
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              {
                issue: 'Pyodide (WASM)',
                desc: '복잡한 WASM 바이너리 로딩이 일부 케이스에서 실패할 수 있음',
              },
              {
                issue: 'sql.js / absurd-sql',
                desc: 'SQLite WASM은 안정적인 워커 환경이 필요함',
              },
              {
                issue: '@langchain/*',
                desc: '동적 임포트와 복잡한 모듈 해석 문제',
              },
              {
                issue: 'plotly.js',
                desc: '대용량 번들과 동적 청크 로딩',
              },
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

          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">사용 가능한 스크립트:</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">권장</Badge>
                <code>npm run dev</code>
                <span className="text-muted-foreground">- webpack (안정적)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">실험적</Badge>
                <code>npm run dev:turbo</code>
                <span className="text-muted-foreground">- Turbopack (빠르지만 위험)</span>
              </div>
            </div>
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
          <CardDescription>
            Vite는 훌륭하지만, 이 프로젝트에는 Next.js가 더 적합함
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* This Project Needs */}
            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                이 프로젝트에 필요한 것:
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>45개 페이지</strong>와 파일 기반 라우팅</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>SSR/SSG</strong> SEO 지원 (잠재적)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>shadcn/ui</strong> Next.js 최적화</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>Tauri 데스크탑</strong> 내보내기 지원</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>대규모 프로덕션</strong> 안정성</span>
                </li>
              </ul>
            </div>

            {/* Vite Would Require */}
            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Vite 사용 시 필요한 것:
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>수동 <strong>React Router</strong> 설정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>SSR 플러그인 설정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>45개 페이지 빌드 설정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>수동 코드 분할</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>더 많은 보일러플레이트 코드</span>
                </li>
              </ul>
            </div>
          </div>

          {/* When to Use Vite */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">
              Vite가 더 나은 경우:
            </div>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>- 순수 SPA (SSR 불필요)</li>
              <li>- 소규모 프로젝트 (빠른 설정)</li>
              <li>- Vue, Svelte 등 다른 프레임워크</li>
              <li>- 라이브러리 개발</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Webpack Cache Warning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            자주 발생하는 경고: webpack.cache.PackFileCacheStrategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
            <code className="text-yellow-600">[webpack.cache.PackFileCacheStrategy]</code>{' '}
            <span className="text-muted-foreground">
              Caching failed for pack: Error: ENOENT: no such file or directory, rename ... .pack.gz_ {'->'} ... .pack.gz
            </span>
          </div>

          <div className="space-y-3">
            <div className="font-medium">발생 원인:</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Windows 파일 잠금 동작</li>
              <li>- 여러 개발 서버 동시 실행</li>
              <li>- VSCode가 .next 폴더 감시</li>
              <li>- 개발 중 빠른 HMR</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <strong className="text-green-800 dark:text-green-300">무시해도 안전</strong>
              <span className="text-green-700 dark:text-green-400"> - 빌드는 정상 완료됨. 다음 실행 시 캐시 재생성됨.</span>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">계속 발생 시 캐시 삭제:</div>
            <code className="text-xs font-mono">npm run dev:clean</code>
            <span className="text-xs text-muted-foreground ml-2">(또는 수동: rm -rf .next/cache)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}