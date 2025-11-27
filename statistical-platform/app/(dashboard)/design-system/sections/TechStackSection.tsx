'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, Zap, Package, Server } from 'lucide-react'

export function TechStackSection() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">Tech Stack</h1>
        <p className="text-muted-foreground">
          This project uses Next.js 15 with webpack. Here is why.
        </p>
      </div>

      {/* Core Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Core Technology Stack
          </CardTitle>
          <CardDescription>
            Production-grade statistical analysis platform
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
            Bundler: webpack vs Turbopack vs Vite
          </CardTitle>
          <CardDescription>
            Why this project uses webpack (not Turbopack or Vite)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Choice */}
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-800 dark:text-green-300">
                Current: webpack (Next.js default)
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">
                npm run dev (stable, production-ready)
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium border-b">Feature</th>
                  <th className="text-center p-3 font-medium border-b border-l">webpack</th>
                  <th className="text-center p-3 font-medium border-b border-l">Turbopack</th>
                  <th className="text-center p-3 font-medium border-b border-l">Vite</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3">Cold Start</td>
                  <td className="p-3 border-l text-center">3-5s</td>
                  <td className="p-3 border-l text-center text-green-600">1-2s</td>
                  <td className="p-3 border-l text-center text-green-600">1-2s</td>
                </tr>
                <tr>
                  <td className="p-3">HMR Speed</td>
                  <td className="p-3 border-l text-center">Fast</td>
                  <td className="p-3 border-l text-center text-green-600">Very Fast</td>
                  <td className="p-3 border-l text-center text-green-600">Very Fast</td>
                </tr>
                <tr>
                  <td className="p-3">WASM Support</td>
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
                  <td className="p-3">Web Worker</td>
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
                  <td className="p-3">Ecosystem</td>
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
            Why Not Turbopack?
          </CardTitle>
          <CardDescription>
            npm run dev:turbo is available but not recommended for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              {
                issue: 'Pyodide (WASM)',
                desc: 'Complex WASM binary loading may fail in edge cases',
              },
              {
                issue: 'sql.js / absurd-sql',
                desc: 'SQLite WASM requires stable worker environment',
              },
              {
                issue: '@langchain/*',
                desc: 'Dynamic imports and complex module resolution',
              },
              {
                issue: 'plotly.js',
                desc: 'Large bundle with dynamic chunk loading',
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
            <div className="text-sm font-medium mb-2">Available Scripts:</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">Recommended</Badge>
                <code>npm run dev</code>
                <span className="text-muted-foreground">- webpack (stable)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Experimental</Badge>
                <code>npm run dev:turbo</code>
                <span className="text-muted-foreground">- Turbopack (faster but risky)</span>
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
            Why Not Vite?
          </CardTitle>
          <CardDescription>
            Vite is excellent, but Next.js is better for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* This Project Needs */}
            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                This Project Needs:
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>45 pages</strong> with file-based routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>SSR/SSG</strong> for SEO (potential)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>shadcn/ui</strong> optimized for Next.js</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>Tauri desktop</strong> export support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">+</span>
                  <span><strong>Production stability</strong> at scale</span>
                </li>
              </ul>
            </div>

            {/* Vite Would Require */}
            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Vite Would Require:
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>Manual <strong>React Router</strong> setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>SSR plugin configuration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>Build config for 45 pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>Manual code splitting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">-</span>
                  <span>More boilerplate code</span>
                </li>
              </ul>
            </div>
          </div>

          {/* When to Use Vite */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">
              When Vite is Better:
            </div>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>- Pure SPA (no SSR needed)</li>
              <li>- Small projects (quick setup)</li>
              <li>- Vue, Svelte, or other frameworks</li>
              <li>- Library development</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Webpack Cache Warning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Common Warning: webpack.cache.PackFileCacheStrategy
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
            <div className="font-medium">Why This Happens:</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Windows file locking behavior</li>
              <li>- Multiple dev servers running</li>
              <li>- VSCode watching .next folder</li>
              <li>- Rapid HMR during development</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <strong className="text-green-800 dark:text-green-300">Safe to ignore</strong>
              <span className="text-green-700 dark:text-green-400"> - Build completes normally. Cache regenerates on next run.</span>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">If persistent, clear cache:</div>
            <code className="text-xs font-mono">npm run dev:clean</code>
            <span className="text-xs text-muted-foreground ml-2">(or manually: rm -rf .next/cache)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}