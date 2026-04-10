/**
 * Statistical Methods Section
 * Smart Flow 전체 흐름과 메서드 ID 매핑 표시
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search, ArrowRight, CheckCircle2, AlertCircle, Info,
  FileQuestion, GitBranch, Route, Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STATISTICAL_METHODS,
  METHOD_CATEGORIES,
  getMethodByIdOrAlias,
  getMethodRoute,
  getAllMethods,
  type StatisticalMethodEntry,
} from '@/lib/constants/statistical-methods'

// DecisionTree가 직접 추천하거나 대안으로 제시하는 page IDs.
const DECISION_TREE_SUPPORTED_PAGE_IDS = new Set([
  // T-Test
  't-test', 'welch-t', 'one-sample-t',
  // ANOVA
  'anova', 'repeated-measures-anova', 'ancova', 'manova', 'mixed-model',
  // Nonparametric (12) - non-parametric overview excluded
  'wilcoxon', 'mann-whitney', 'friedman', 'kruskal-wallis',
  'sign-test', 'mcnemar', 'cochran-q', 'binomial-test', 'runs-test', 'ks-test', 'mood-median', 'proportion-test',
  // Correlation (2)
  'correlation', 'partial-correlation',
  // Regression
  'regression', 'logistic-regression', 'ordinal-regression', 'stepwise', 'dose-response', 'response-surface',
  // Chi-Square (2) - chi-square overview excluded
  'chi-square-independence', 'chi-square-goodness',
  // Descriptive
  'descriptive', 'normality-test', 'explore-data', 'means-plot',
  // Time Series
  'arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall',
  // Survival (2)
  'kaplan-meier', 'cox-regression',
  // Multivariate (4)
  'pca', 'factor-analysis', 'cluster', 'discriminant',
  // Other
  'power-analysis',
])

// ============================================
// Flow Diagram Component
// ============================================

function FlowDiagram() {
  const steps = [
    {
      id: 1,
      title: 'Data Upload',
      icon: Database,
      description: 'CSV/Excel',
      output: 'ValidationResults',
      color: 'bg-blue-500',
    },
    {
      id: 2,
      title: 'Purpose Selection',
      icon: FileQuestion,
      description: '6 purposes',
      output: 'AnalysisPurpose',
      color: 'bg-green-500',
    },
    {
      id: 3,
      title: 'Guided Questions',
      icon: GitBranch,
      description: 'Auto-answer',
      output: 'answers: Record<string, string>',
      color: 'bg-yellow-500',
    },
    {
      id: 4,
      title: 'Decision Tree',
      icon: GitBranch,
      description: 'decideCompare()',
      output: 'DecisionResult',
      color: 'bg-orange-500',
    },
    {
      id: 5,
      title: 'Method Mapping',
      icon: Route,
      description: 'getMethodByIdOrAlias()',
      output: 'StatisticalMethod',
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-white",
              step.color
            )}>
              <step.icon className="w-6 h-6" />
            </div>
            <div className="text-center mt-2">
              <p className="text-xs font-semibold">{step.title}</p>
              <p className="text-[10px] text-muted-foreground">{step.description}</p>
            </div>
            <code className="text-[9px] text-muted-foreground mt-1 bg-muted px-1 rounded">
              {step.output}
            </code>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================
// Alias Lookup Tester
// ============================================

function AliasLookupTester() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{
    found: boolean
    canonicalId?: string
    route?: string
    name?: string
    category?: string
  } | null>(null)

  const handleLookup = useCallback(() => {
    if (!input.trim()) {
      setResult(null)
      return
    }

    const method = getMethodByIdOrAlias(input.trim())
    if (method) {
      setResult({
        found: true,
        canonicalId: method.id,
        route: getMethodRoute(input.trim()) ?? undefined,
        name: method.name,
        category: method.category,
      })
    } else {
      setResult({
        found: false,
      })
    }
  }, [input])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="w-4 h-4" />
          ID/Alias Lookup Tester
        </CardTitle>
        <CardDescription>
          Test getMethodByIdOrAlias() with any ID
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter method ID or alias (e.g., t-test)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1"
          />
          <Button onClick={handleLookup} size="sm">
            Lookup
          </Button>
        </div>

        {result && (
          <div className={cn(
            "p-3 rounded-lg border",
            result.found ? "bg-green-50 border-green-200 dark:bg-green-950/20" : "bg-red-50 border-red-200 dark:bg-red-950/20"
          )}>
            {result.found ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">Found!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Canonical ID:</span>
                    <code className="ml-2 bg-muted px-1 rounded">{result.canonicalId}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Route:</span>
                    <code className="ml-2 bg-muted px-1 rounded">{result.route}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2">{result.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <Badge variant="outline" className="ml-2">{result.category}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 dark:text-red-400">Not found. Check if the ID exists in STATISTICAL_METHODS.</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Try these examples:</p>
          <div className="flex flex-wrap gap-1">
            {['t-test', 'anova', 'pearson', 'linear-regression', 'reliability', 'chi-squared'].map(ex => (
              <button
                key={ex}
                onClick={() => { setInput(ex); }}
                className="px-2 py-0.5 bg-muted rounded hover:bg-muted/80"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// All Methods Table
// ============================================

function AllMethodsTable() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const allMethods = useMemo(() => getAllMethods(), [])
  const categories = useMemo(() => Object.keys(METHOD_CATEGORIES), [])

  const filteredMethods = useMemo(() => {
    return allMethods.filter(method => {
      const matchesSearch = search === '' ||
        method.id.toLowerCase().includes(search.toLowerCase()) ||
        method.name.toLowerCase().includes(search.toLowerCase()) ||
        (STATISTICAL_METHODS[method.id]?.aliases?.some(a =>
          a.toLowerCase().includes(search.toLowerCase())
        ))

      const matchesCategory = categoryFilter === 'all' || method.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [allMethods, search, categoryFilter])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">All Statistical Methods ({allMethods.length})</CardTitle>
        <CardDescription>Complete list from lib/constants/statistical-methods.ts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, or alias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[140px]">Canonical ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]">Category</TableHead>
                <TableHead>Aliases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMethods.map(method => {
                const fullMethod = STATISTICAL_METHODS[method.id]
                const aliases = fullMethod?.aliases ?? []

                return (
                  <TableRow key={method.id}>
                    <TableCell className="font-mono text-xs">
                      <code className="bg-muted px-1 rounded">{method.id}</code>
                    </TableCell>
                    <TableCell className="text-sm">{method.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{method.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {aliases.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {aliases.map(alias => (
                            <code key={alias} className="bg-muted/50 px-1 rounded">{alias}</code>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filteredMethods.length} of {allMethods.length} methods
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================
// Compatibility ID Mapping Table
// ============================================

function CompatibilityIdMappingTable() {
  const compatibilityMappings = [
    { compatibility: 't-test', canonical: 'two-sample-t', source: 'statistical-methods.ts' },
    { compatibility: 'anova', canonical: 'one-way-anova', source: 'statistical-methods.ts' },
    { compatibility: 'pearson', canonical: 'pearson-correlation', source: 'statistical-methods.ts' },
    { compatibility: 'spearman', canonical: 'pearson-correlation', source: 'statistical-methods.ts' },
    { compatibility: 'linear-regression', canonical: 'simple-regression', source: 'statistical-methods.ts' },
    { compatibility: 'multiple-regression', canonical: 'simple-regression', source: 'statistical-methods.ts' },
    { compatibility: 'poisson', canonical: 'poisson-regression', source: 'statistical-methods.ts' },
    { compatibility: 'reliability', canonical: 'reliability-analysis', source: 'statistical-methods.ts' },
    { compatibility: 'chi-squared', canonical: 'chi-square-goodness', source: 'statistical-methods.ts' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4" />
          Compatibility ID Mapping
        </CardTitle>
        <CardDescription>
          Page IDs and compatibility aliases resolve to canonical method IDs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compatibility ID</TableHead>
                <TableHead>
                  <ArrowRight className="w-4 h-4 inline mr-1" />
                  Canonical ID
                </TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compatibilityMappings.map(mapping => (
                <TableRow key={mapping.compatibility}>
                  <TableCell className="font-mono text-xs">
                    <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">{mapping.compatibility}</code>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <code className="bg-green-100 dark:bg-green-900/30 px-1 rounded">{mapping.canonical}</code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {mapping.source}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// ID Naming Rules
// ============================================

function IdNamingRules() {
  const rules = [
    {
      rule: 'ID = Page Route',
      example: 'pageId=t-test → /statistics/t-test',
      correct: 'Keep route slug in pageId',
      wrong: 'Assume route slug is always the canonical ID',
    },
    {
      rule: 'Canonical ID = internal method key',
      example: 'two-sample-t → /statistics/t-test',
      correct: 'Use canonical IDs in runtime state',
      wrong: 'Store page IDs as canonical IDs',
    },
    {
      rule: 'kebab-case only',
      example: 'mann-whitney',
      correct: 'mann-whitney',
      wrong: 'mann_whitney, mannWhitney',
    },
    {
      rule: 'Use aliases for compatibility',
      example: "aliases: ['independent-t', 'student-t']",
      correct: 'Add to aliases array',
      wrong: 'Create new ID',
    },
    {
      rule: 'Single source of truth',
      example: 'lib/constants/statistical-methods.ts',
      correct: 'Import from common file',
      wrong: 'Define locally in component',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ID Naming Rules</CardTitle>
        <CardDescription>Follow these rules when adding new methods</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-2">{rule.rule}</div>
              <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">{rule.example}</code>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  {rule.correct}
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  {rule.wrong}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// DecisionTree Coverage Table (NEW)
// ============================================

function DecisionTreeCoverageTable() {
  const allMethods = useMemo(() => getAllMethods(), [])

  const pageEntries = useMemo(() => {
    const byPage = new Map<string, StatisticalMethodEntry>()

    for (const method of allMethods) {
      const current = byPage.get(method.pageId)
      if (!current || method.id === method.pageId) {
        byPage.set(method.pageId, method)
      }
    }

    return Array.from(byPage.values())
  }, [allMethods])

  const methodsByCategory = useMemo(() => {
    const grouped: Record<string, StatisticalMethodEntry[]> = {}
    for (const method of pageEntries) {
      const cat = method.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(STATISTICAL_METHODS[method.id])
    }
    return grouped
  }, [pageEntries])

  const stats = useMemo(() => {
    const total = pageEntries.length
    const supported = pageEntries.filter(m => DECISION_TREE_SUPPORTED_PAGE_IDS.has(m.pageId)).length
    const missing = total - supported
    return { total, supported, missing, percent: Math.round((supported / total) * 100) }
  }, [pageEntries])

  // 카테고리 순서 및 한글 이름
  const categoryOrder = [
    { key: 't-test', name: 'T-Test', korean: 'T-검정' },
    { key: 'anova', name: 'ANOVA', korean: '분산분석' },
    { key: 'nonparametric', name: 'Nonparametric', korean: '비모수' },
    { key: 'correlation', name: 'Correlation', korean: '상관분석' },
    { key: 'regression', name: 'Regression', korean: '회귀분석' },
    { key: 'chi-square', name: 'Chi-Square', korean: '카이제곱' },
    { key: 'descriptive', name: 'Descriptive', korean: '기술통계' },
    { key: 'timeseries', name: 'Time Series', korean: '시계열' },
    { key: 'survival', name: 'Survival', korean: '생존분석' },
    { key: 'multivariate', name: 'Multivariate', korean: '다변량분석' },
    { key: 'design', name: 'Design', korean: '실험설계' },
    { key: 'psychometrics', name: 'Psychometrics', korean: '심리측정' },
  ]

  let globalIndex = 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">DecisionTree Coverage</CardTitle>
            <CardDescription>{stats.total}개 통계 페이지 중 DecisionTree 안내 가능 여부</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.supported}</div>
              <div className="text-xs text-muted-foreground">지원</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
              <div className="text-xs text-muted-foreground">미지원</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.percent}%</div>
              <div className="text-xs text-muted-foreground">커버리지</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>{stats.total} pages</span>
          </div>
        </div>

        {/* Category Tables */}
        <div className="space-y-6 max-h-[600px] overflow-y-auto">
          {categoryOrder.map(cat => {
            const methods = methodsByCategory[cat.key]
            if (!methods || methods.length === 0) return null

            const supportedInCat = methods.filter(m => DECISION_TREE_SUPPORTED_PAGE_IDS.has(m.pageId)).length

            return (
              <div key={cat.key} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">({cat.korean})</span>
                  </div>
                  <Badge variant={supportedInCat === methods.length ? 'default' : 'secondary'}>
                    {supportedInCat}/{methods.length}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[180px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[100px] text-center">DecisionTree</TableHead>
                      <TableHead className="w-[100px] text-center">Page</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methods.map(method => {
                      globalIndex++
                      const isSupported = DECISION_TREE_SUPPORTED_PAGE_IDS.has(method.pageId)

                      return (
                        <TableRow key={method.id} className={!isSupported ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {String(globalIndex).padStart(2, '0')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <code className="bg-muted px-1 rounded">{method.pageId}</code>
                          </TableCell>
                          <TableCell className="text-sm">{method.name}</TableCell>
                          <TableCell className="text-center">
                            {isSupported ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <a
                              href={`/statistics/${method.pageId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Open
                            </a>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          })}
        </div>

        {/* Missing Methods Summary */}
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            미지원 메서드 ({stats.missing}개)
          </h4>
          <div className="flex flex-wrap gap-2">
            {pageEntries
              .filter(m => !DECISION_TREE_SUPPORTED_PAGE_IDS.has(m.pageId))
              .map(m => (
                <code key={m.pageId} className="text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                  {m.pageId}
                </code>
              ))
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Main Export
// ============================================

export function StatisticalMethodsSection() {
  const allMethods = useMemo(() => getAllMethods(), [])
  const totalPages = useMemo(() => new Set(allMethods.map(method => method.pageId)).size, [allMethods])
  const embeddedMethods = useMemo(
    () => allMethods.filter(method => method.id !== method.pageId),
    [allMethods],
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">Statistical Methods</h1>
        <p className="text-muted-foreground">
          Smart Flow processing pipeline and method ID mapping system
        </p>
      </div>

      {/* Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Flow Processing Pipeline</CardTitle>
          <CardDescription>
            From data upload to method recommendation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlowDiagram />
        </CardContent>
      </Card>

      {/* DecisionTree Coverage - NEW */}
      <DecisionTreeCoverageTable />

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        <AliasLookupTester />
        <IdNamingRules />
      </div>

      {/* Compatibility ID Mapping */}
      <CompatibilityIdMappingTable />

      {/* All Methods Table */}
      <AllMethodsTable />

      {/* Method Count Summary */}
      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Method Count Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold">{allMethods.length}</div>
              <div className="text-xs text-muted-foreground">Total Definitions</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{totalPages}</div>
              <div className="text-xs text-muted-foreground">Page Routes</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-amber-600">{embeddedMethods.length}</div>
              <div className="text-xs text-muted-foreground">Embedded Methods</div>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-medium mb-2">Embedded Methods (pageId !== id):</p>
            <div className="space-y-1 text-muted-foreground">
              {embeddedMethods.map(method => (
                <div key={method.id} className="flex items-center gap-2">
                  <code className="bg-muted px-1 rounded text-xs">{method.id}</code>
                  <ArrowRight className="w-3 h-3" />
                  <code className="bg-muted px-1 rounded text-xs">{method.pageId}</code>
                  <span className="text-xs">page</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source File Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Source Files:</p>
              <ul className="text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">lib/constants/statistical-methods.ts</code> - Single source of truth for canonical IDs, page IDs, and compatibility aliases</li>
                <li><code className="bg-muted px-1 rounded">components/analysis/steps/purpose/DecisionTree.ts</code> - Decision logic</li>
                <li><code className="bg-muted px-1 rounded">components/analysis/steps/purpose/auto-answer.ts</code> - Auto-answer from data</li>
                <li><code className="bg-muted px-1 rounded">components/analysis/steps/purpose/guided-flow-questions.ts</code> - Questions per purpose</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
