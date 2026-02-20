'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Server,
  FolderTree,
  GitBranch,
  Lightbulb,
  BookOpen,
  Terminal,
  FileCode,
  Cpu
} from 'lucide-react'

/**
 * Deployment Guide Section
 *
 * Vercel 배포 과정에서 배운 핵심 개념들을 정리한 학습 자료입니다.
 * 단순한 트러블슈팅 로그가 아닌, 개념 중심의 가이드로 구성되어 있습니다.
 */

// ===========================================
// 1. 핵심 개념 정리
// ===========================================

const CORE_CONCEPTS = [
  {
    id: 'native-binaries',
    title: 'Native Binaries (네이티브 바이너리)',
    icon: Cpu,
    summary: 'C/C++/Rust로 컴파일된 플랫폼별 실행 파일',
    description: `
JavaScript는 인터프리터 언어라서 어디서든 실행되지만, 일부 패키지는 성능을 위해
C/C++이나 Rust로 작성된 네이티브 코드를 포함합니다. 이 코드는 플랫폼(OS + CPU)별로
다르게 컴파일되어야 합니다.
    `.trim(),
    examples: [
      { name: 'lightningcss', files: ['.win32-x64-msvc.node', '.linux-x64-gnu.node', '.darwin-x64.node'] },
      { name: '@tailwindcss/oxide', files: ['oxide-win32-x64-msvc', 'oxide-linux-x64-gnu'] },
      { name: 'esbuild', files: ['esbuild-windows-64', 'esbuild-linux-64'] },
    ],
    keyPoints: [
      'Windows에서 개발 → Linux에서 배포 시 다른 바이너리 필요',
      'npm이 자동으로 현재 플랫폼에 맞는 바이너리 설치',
      'package-lock.json이 없으면 버전 불일치로 잘못된 바이너리 설치 가능',
    ],
    relatedError: "Cannot find module '../lightningcss.linux-x64-gnu.node'"
  },
  {
    id: 'package-lock',
    title: 'package.json vs package-lock.json',
    icon: FileCode,
    summary: '의존성 선언 vs 정확한 버전 고정',
    description: `
package.json은 "이 정도 버전이면 됨"을 선언하고,
package-lock.json은 "정확히 이 버전을 사용함"을 기록합니다.
    `.trim(),
    comparison: {
      packageJson: {
        title: 'package.json',
        purpose: '의존성 범위 선언',
        example: '"tailwindcss": "^4.0.0"',
        meaning: '4.0.0 이상, 5.0.0 미만 어떤 버전이든 OK',
        problem: '오늘은 4.0.15, 내일은 4.1.0이 설치될 수 있음'
      },
      lockFile: {
        title: 'package-lock.json',
        purpose: '정확한 버전 고정',
        example: '"tailwindcss": "4.0.15"',
        meaning: '항상 정확히 4.0.15만 설치',
        benefit: '모든 환경에서 동일한 버전 보장'
      }
    },
    keyPoints: [
      'package-lock.json은 반드시 Git에 커밋해야 함',
      'npm ci는 lock 파일 기준으로 설치 (CI/CD에 적합)',
      'npm install은 package.json 기준으로 설치 후 lock 파일 업데이트',
    ],
    relatedError: '매 빌드마다 다른 버전 설치 → 네이티브 바이너리 불일치'
  },
  {
    id: 'static-vs-server',
    title: 'Static Export vs Server Mode',
    icon: Server,
    summary: 'Next.js의 두 가지 빌드 방식',
    description: `
Next.js는 정적 HTML 파일을 생성하거나, Node.js 서버로 동작할 수 있습니다.
배포 환경과 필요한 기능에 따라 선택합니다.
    `.trim(),
    comparison: {
      static: {
        title: 'Static Export',
        config: "output: 'export'",
        outputDir: 'out/',
        features: ['HTML/CSS/JS 파일만 생성', '어떤 웹서버에서든 호스팅 가능', 'CDN에 직접 배포 가능'],
        limitations: ['API Routes 사용 불가', '서버사이드 렌더링 불가', '동적 라우팅 제한'],
        useCase: '정적 사이트, 문서, 블로그'
      },
      server: {
        title: 'Server Mode',
        config: '기본값 (output 미설정)',
        outputDir: '.next/',
        features: ['API Routes 사용 가능', 'SSR/ISR 지원', '동적 기능 모두 사용'],
        limitations: ['Node.js 서버 필요', 'Vercel/AWS 등 서버리스 플랫폼 필요'],
        useCase: '동적 웹앱, API 서버, 풀스택 앱'
      }
    },
    keyPoints: [
      '이 프로젝트는 Static Export 사용 (Pyodide가 클라이언트에서 실행)',
      'API Routes가 필요하면 별도 백엔드 서버 구축 필요',
      'Vercel에서 Static Export 시 outputDirectory 설정 필수',
    ],
    relatedError: 'export const dynamic = "force-static" not configured'
  },
  {
    id: 'monorepo',
    title: 'Monorepo 구조와 배포',
    icon: FolderTree,
    summary: '여러 프로젝트를 하나의 저장소에서 관리',
    description: `
이 프로젝트는 루트에 여러 폴더가 있고, Next.js 앱은 stats/ 하위에 있습니다.
Vercel은 기본적으로 루트에서 Next.js를 찾으므로, 별도 설정이 필요합니다.
    `.trim(),
    structure: `
Statistics/                    # Git 루트
├── stats/      # Next.js 앱 (여기서 빌드)
│   ├── app/
│   ├── package.json
│   └── next.config.ts
├── rag-system/               # Python RAG 시스템
├── docs/
└── vercel.json               # 빌드 설정 (루트에 위치)
    `.trim(),
    vercelConfig: {
      installCommand: 'cd stats && npm install --legacy-peer-deps',
      buildCommand: 'cd stats && npm run build',
      outputDirectory: 'stats/out'
    },
    keyPoints: [
      'vercel.json은 Git 루트에 위치',
      'framework: "nextjs"는 루트에서 Next.js를 찾으므로 사용 불가',
      'outputDirectory는 루트 기준 상대 경로로 지정',
    ],
    relatedError: 'No Next.js version detected'
  }
]

// ===========================================
// 2. 트러블슈팅 체크리스트
// ===========================================

const TROUBLESHOOTING_CHECKLIST = {
  beforeDeploy: [
    { check: 'package-lock.json이 Git에 커밋되어 있는가?', critical: true },
    { check: 'npm run build가 로컬에서 성공하는가?', critical: true },
    { check: 'vercel.json의 outputDirectory가 올바른가?', critical: true },
    { check: 'API Routes를 사용한다면 Static Export가 아닌지 확인', critical: false },
  ],
  commonErrors: [
    {
      error: "Cannot find module '...node'",
      cause: '네이티브 바이너리 누락',
      solution: 'package-lock.json 커밋 확인'
    },
    {
      error: '404 NOT_FOUND',
      cause: 'outputDirectory 불일치',
      solution: 'vercel.json의 outputDirectory 확인 (static: out/, server: .next/)'
    },
    {
      error: 'No Next.js version detected',
      cause: 'Monorepo에서 framework: nextjs 사용',
      solution: 'framework 필드 제거, buildCommand로 직접 지정'
    },
    {
      error: 'dynamic = "force-static" not configured',
      cause: 'Static Export에서 API Routes 사용',
      solution: 'API Routes 제거 또는 Server Mode로 전환'
    }
  ]
}

// ===========================================
// 3. 현재 프로젝트 설정
// ===========================================

const CURRENT_CONFIG = {
  mode: 'Static Export',
  nextConfig: `// next.config.ts
...(process.env.NODE_ENV === 'production' && {
  output: 'export',
  trailingSlash: true,
}),`,
  vercelJson: `{
  "version": 2,
  "installCommand": "cd stats && npm install --legacy-peer-deps",
  "buildCommand": "cd stats && npm run build",
  "outputDirectory": "stats/out"
}`,
  requirements: [
    { item: 'package-lock.json 커밋', status: 'required' },
    { item: 'Static Export 활성화', status: 'required' },
    { item: 'API Routes 제거됨', status: 'done' },
    { item: 'outputDirectory: out/', status: 'configured' },
  ]
}

// ===========================================
// 컴포넌트
// ===========================================

function ConceptCard({ concept }: { concept: typeof CORE_CONCEPTS[0] }) {
  const Icon = concept.icon

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="w-5 h-5 text-primary" />
          {concept.title}
        </CardTitle>
        <CardDescription>{concept.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {concept.description}
        </p>

        {concept.examples && (
          <div>
            <h4 className="text-sm font-medium mb-2">예시 패키지</h4>
            <div className="space-y-2">
              {concept.examples.map((ex, i) => (
                <div key={i} className="text-xs">
                  <span className="font-mono font-medium">{ex.name}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.files.map((f, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">{f}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {concept.comparison && (
          <div className="grid grid-cols-2 gap-3">
            {Object.values(concept.comparison).map((item, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-xs">
                <h5 className="font-medium mb-1">{item.title}</h5>
                {'example' in item && (
                  <code className="block bg-background px-2 py-1 rounded text-[10px] mb-1">
                    {item.example}
                  </code>
                )}
                {'meaning' in item && (
                  <p className="text-muted-foreground">{item.meaning}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            핵심 포인트
          </h4>
          <ul className="text-xs space-y-1">
            {concept.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {concept.relatedError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
            <p className="text-xs text-red-600 font-mono">{concept.relatedError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DeploymentLogSection() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Deployment Guide</h1>
        <p className="text-muted-foreground">
          Vercel 배포 과정에서 배운 핵심 개념들을 정리한 학습 자료
        </p>
        <div className="flex gap-2 mt-3">
          <Badge variant="outline" className="text-xs">Last Updated: 2025-11-28</Badge>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            배포 성공
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="concepts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="concepts" className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            핵심 개념
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            체크리스트
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1">
            <Terminal className="w-4 h-4" />
            현재 설정
          </TabsTrigger>
        </TabsList>

        {/* 핵심 개념 탭 */}
        <TabsContent value="concepts" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {CORE_CONCEPTS.map(concept => (
              <ConceptCard key={concept.id} concept={concept} />
            ))}
          </div>
        </TabsContent>

        {/* 체크리스트 탭 */}
        <TabsContent value="checklist" className="mt-6 space-y-6">
          {/* 배포 전 체크리스트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                배포 전 체크리스트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {TROUBLESHOOTING_CHECKLIST.beforeDeploy.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      item.critical ? 'border-red-500' : 'border-muted-foreground'
                    }`}>
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    </div>
                    <span className="text-sm">{item.check}</span>
                    {item.critical && (
                      <Badge variant="destructive" className="text-[10px]">필수</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 자주 발생하는 에러 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                자주 발생하는 에러
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {TROUBLESHOOTING_CHECKLIST.commonErrors.map((item, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <code className="text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-1 rounded block mb-2">
                      {item.error}
                    </code>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">원인:</span>
                        <p className="font-medium">{item.cause}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">해결:</span>
                        <p className="font-medium text-green-600">{item.solution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 현재 설정 탭 */}
        <TabsContent value="config" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">현재 프로젝트 설정</CardTitle>
              <CardDescription>
                이 프로젝트는 <Badge variant="secondary">{CURRENT_CONFIG.mode}</Badge> 방식으로 배포됩니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* vercel.json */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  vercel.json
                </h4>
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  {CURRENT_CONFIG.vercelJson}
                </pre>
              </div>

              {/* next.config.ts */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  next.config.ts (핵심 부분)
                </h4>
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  {CURRENT_CONFIG.nextConfig}
                </pre>
              </div>

              {/* 요구사항 */}
              <div>
                <h4 className="text-sm font-medium mb-3">배포 요구사항</h4>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENT_CONFIG.requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{req.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 폴더 구조 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderTree className="w-5 h-5" />
                프로젝트 구조
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`Statistics/                    # Git 루트
├── vercel.json               # Vercel 빌드 설정
├── stats/      # Next.js 앱
│   ├── app/                  # App Router
│   ├── package.json
│   ├── package-lock.json     # ⚠️ 반드시 커밋!
│   ├── next.config.ts
│   └── out/                  # 빌드 결과물 (Static Export)
├── rag-system/               # Python RAG 시스템
└── docs/                     # 문서`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
