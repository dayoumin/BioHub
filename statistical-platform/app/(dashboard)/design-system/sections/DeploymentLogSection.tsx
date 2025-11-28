'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Server,
  Package,
  FileCode,
  Terminal,
  ExternalLink
} from 'lucide-react'

// Deployment issues data - manually synced with VERCEL_DEPLOYMENT_LOG.md
const deploymentIssues = [
  {
    id: 1,
    title: 'lightningcss Native Binary Not Found',
    date: '2025-11-28',
    status: 'solved',
    error: "Error: Cannot find module '../lightningcss.linux-x64-gnu.node'",
    cause: 'Tailwind CSS v4 requires platform-specific native binaries. Without package-lock.json, npm installs different versions each time.',
    solution: 'Commit package-lock.json to lock dependency versions',
    attempts: [
      { action: 'rm -rf node_modules', result: 'failed' },
      { action: 'CSS_TRANSFORMER_WASM=1 env var', result: 'failed' },
      { action: 'Install lightningcss-linux-x64-gnu', result: 'failed' },
      { action: 'optionalDependencies', result: 'failed' },
      { action: 'Clear Vercel build cache', result: 'failed' },
      { action: 'Commit package-lock.json', result: 'success' },
    ]
  },
  {
    id: 2,
    title: 'EBADPLATFORM for oxide-wasm32-wasi',
    date: '2025-11-28',
    status: 'solved',
    error: 'npm error code EBADPLATFORM - Unsupported platform for @tailwindcss/oxide-wasm32-wasi',
    cause: 'Added Linux-specific packages to optionalDependencies, but npm tried to install wasm32-wasi package.',
    solution: 'Remove optionalDependencies from package.json',
    attempts: [
      { action: 'Remove optionalDependencies', result: 'success' },
    ]
  },
  {
    id: 3,
    title: '404 NOT_FOUND After Successful Build',
    date: '2025-11-28',
    status: 'in_progress',
    error: '404: NOT_FOUND - Code: NOT_FOUND',
    cause: 'Server mode with monorepo structure confuses Vercel. outputDirectory mismatch between .next and out folders.',
    solution: 'Use static export with outputDirectory: statistical-platform/out',
    attempts: [
      { action: 'outputDirectory: .next', result: 'failed' },
      { action: 'Add framework: nextjs', result: 'failed' },
      { action: 'Static export + out directory', result: 'partial' },
    ]
  },
  {
    id: 4,
    title: 'API Routes Incompatible with Static Export',
    date: '2025-11-28',
    status: 'in_progress',
    error: 'export const dynamic = "force-static" not configured on route "/api/feedback"',
    cause: 'Static export (output: export) does not support dynamic API routes.',
    solution: 'Remove API routes or convert to static, or use server mode',
    attempts: []
  }
]

const keyLearnings = [
  {
    title: 'Native Binaries in Cross-Platform Builds',
    icon: Package,
    content: 'Packages like lightningcss, @tailwindcss/oxide use platform-specific binaries (.win32-x64-msvc.node, .linux-x64-gnu.node). Always commit package-lock.json.'
  },
  {
    title: 'package.json vs package-lock.json',
    icon: FileCode,
    content: 'package.json uses version ranges (^4.0.0), lock file pins exact versions (4.0.15). Without lock file, different installs may get different versions.'
  },
  {
    title: 'Static Export vs Server Mode',
    icon: Server,
    content: 'Static export outputs to out/, no API routes. Server mode outputs to .next/, supports API routes but needs Node.js hosting.'
  },
  {
    title: 'Monorepo Considerations',
    icon: Terminal,
    content: 'When Next.js is in subdirectory, framework: nextjs fails. Use custom buildCommand with cd, and outputDirectory must include subdirectory path.'
  }
]

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'solved':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Solved</Badge>
    case 'in_progress':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>
    case 'failed':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
    default:
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> Unknown</Badge>
  }
}

function AttemptResult({ result }: { result: string }) {
  if (result === 'success') {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />
  } else if (result === 'partial') {
    return <AlertCircle className="w-4 h-4 text-yellow-500" />
  }
  return <XCircle className="w-4 h-4 text-red-500" />
}

export function DeploymentLogSection() {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Deployment Troubleshooting Log</h1>
        <p className="text-muted-foreground">
          Vercel deployment issues and solutions for future reference
        </p>
        <a
          href="https://github.com/dayoumin/Statistics/blob/master/statistical-platform/docs/VERCEL_DEPLOYMENT_LOG.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-2"
        >
          View full documentation <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Quick Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deploymentIssues.map(issue => (
              <div key={issue.id} className="flex items-center gap-2">
                <StatusBadge status={issue.status} />
                <span className="text-sm truncate">#{issue.id}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Issues</h2>
        {deploymentIssues.map(issue => (
          <Card
            key={issue.id}
            className={`cursor-pointer transition-all ${expandedIssue === issue.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    #{issue.id}: {issue.title}
                    <StatusBadge status={issue.status} />
                  </CardTitle>
                  <CardDescription>{issue.date}</CardDescription>
                </div>
              </div>
            </CardHeader>
            {expandedIssue === issue.id && (
              <CardContent className="space-y-4">
                {/* Error */}
                <div>
                  <h4 className="text-sm font-medium text-red-500 mb-1">Error</h4>
                  <code className="block text-xs bg-red-500/10 p-2 rounded overflow-x-auto">
                    {issue.error}
                  </code>
                </div>

                {/* Cause */}
                <div>
                  <h4 className="text-sm font-medium mb-1">Root Cause</h4>
                  <p className="text-sm text-muted-foreground">{issue.cause}</p>
                </div>

                {/* Solution */}
                <div>
                  <h4 className="text-sm font-medium text-green-500 mb-1">Solution</h4>
                  <p className="text-sm">{issue.solution}</p>
                </div>

                {/* Attempts */}
                {issue.attempts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Attempts</h4>
                    <div className="space-y-1">
                      {issue.attempts.map((attempt, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <AttemptResult result={attempt.result} />
                          <span className={attempt.result === 'success' ? 'font-medium' : 'text-muted-foreground'}>
                            {attempt.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Key Learnings */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Key Learnings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {keyLearnings.map((learning, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <learning.icon className="w-4 h-4" />
                  {learning.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{learning.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Working Config */}
      <Card>
        <CardHeader>
          <CardTitle>Working Configuration</CardTitle>
          <CardDescription>Last known working config (Commit: e776525)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">vercel.json</h4>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`{
  "version": 2,
  "installCommand": "cd statistical-platform && npm install --legacy-peer-deps",
  "buildCommand": "cd statistical-platform && npm run build",
  "outputDirectory": "statistical-platform/out"
}`}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Requirements</h4>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                package-lock.json must be committed
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                No optionalDependencies for platform-specific packages
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                API routes must be removed or made static
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
