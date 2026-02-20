'use client'

/**
 * Test Automation Dashboard Section
 *
 * Shows test automation coverage by phase/tool for all 48 statistics methods.
 * Visual representation of testing pipeline status.
 *
 * Phase structure:
 * - Phase 0: Static Analysis (ESLint, TypeScript)
 * - Phase 1: Unit Tests (Jest)
 * - Phase 2: Interpretation Engine Tests (Jest)
 * - Phase 2.5: Python Calculation Tests (Pyodide Golden Values)
 * - Phase 3: Integration Tests (Jest + JSDOM)
 * - Phase 4: E2E Tests (Playwright) - IN PROGRESS
 * - Phase 5: Compatibility Layer
 * - Methods Registry SSOT (NEW 2025-12-17)
 *
 * Updated: 2025-12-17
 */

import type { ComponentType, ReactNode } from 'react'
import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2, XCircle, AlertCircle, Clock,
  ChevronDown, ChevronRight, Terminal, FileCode, FlaskConical,
  TestTube2, Monitor, Layers, ExternalLink, Calculator, FileJson, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Database, FolderOpen } from 'lucide-react'

// Test phase definitions
interface TestPhase {
  id: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
  tool: string
  command: string
  status: 'complete' | 'partial' | 'planned' | 'not-started'
  coverage: {
    total: number
    covered: number
  }
  color: string
}

// Statistics method test coverage
interface MethodCoverage {
  id: string
  name: string
  phases: {
    phase0: boolean // Static Analysis
    phase1: boolean // Unit Tests
    phase2: boolean // Interpretation Engine
    phase25: boolean // Python Calculation (Golden Values)
    phase3: boolean // Integration Tests
    phase4: boolean // E2E Tests
  }
}

// Test phases configuration
const TEST_PHASES: TestPhase[] = [
  {
    id: 'phase0',
    name: 'Phase 0: Static Analysis',
    description: 'TypeScript type checking and ESLint',
    icon: Terminal,
    tool: 'TypeScript + ESLint',
    command: 'npx tsc --noEmit && npm run lint',
    status: 'complete',
    coverage: { total: 48, covered: 48 },
    color: 'bg-green-500'
  },
  {
    id: 'phase1',
    name: 'Phase 1: Unit Tests',
    description: 'Jest unit tests for utilities, hooks, and components',
    icon: FlaskConical,
    tool: 'Jest',
    command: 'npm test',
    status: 'complete',
    coverage: { total: 48, covered: 48 },
    color: 'bg-green-500'
  },
  {
    id: 'phase2',
    name: 'Phase 2: Interpretation Engine',
    description: 'Tests for statistical result interpretation templates',
    icon: FileCode,
    tool: 'Jest',
    command: 'npm test -- __tests__/lib/interpretation/',
    status: 'complete',
    coverage: { total: 48, covered: 48 },
    color: 'bg-green-500'
  },
  {
    id: 'phase25',
    name: 'Phase 2.5: Python Calculation',
    description: 'Golden values verification via SciPy, statsmodels, sklearn, lifelines, pingouin',
    icon: Calculator,
    tool: 'Pyodide + Multiple Libraries',
    command: 'npm run test:pyodide-golden',
    status: 'complete',
    coverage: { total: 48, covered: 45 },
    color: 'bg-green-500'
  },
  {
    id: 'phase3',
    name: 'Phase 3: Integration Tests',
    description: 'Component integration tests with mocked services',
    icon: Layers,
    tool: 'Jest + JSDOM',
    command: 'npm test -- __tests__/integration/',
    status: 'partial',
    coverage: { total: 48, covered: 15 },
    color: 'bg-orange-500'
  },
  {
    id: 'phase4',
    name: 'Phase 4: E2E Tests',
    description: 'Full end-to-end browser testing with Playwright',
    icon: Monitor,
    tool: 'Playwright',
    command: 'npx playwright test',
    status: 'partial',
    coverage: { total: 48, covered: 2 },
    color: 'bg-orange-500'
  },
  {
    id: 'compatibility',
    name: 'Phase 5: Compatibility Layer',
    description: 'Data-method compatibility filtering (53 methods)',
    icon: Database,
    tool: 'Jest + Compatibility Engine',
    command: 'npm test -- data-method-compatibility',
    status: 'complete',
    coverage: { total: 53, covered: 53 },
    color: 'bg-blue-500'
  }
]

// Golden values test cases by category (from statistical-golden-values.json)
// Updated 2025-12-02: Extended to support multiple Python libraries
const GOLDEN_VALUES_COVERAGE = {
  // === SciPy ===
  'T-Test (SciPy)': { methods: ['t-test', 'one-sample-t', 'welch-t'], tests: 7, status: 'complete', library: 'scipy' },
  'ANOVA (SciPy)': { methods: ['anova'], tests: 2, status: 'complete', library: 'scipy' },
  'Correlation (SciPy)': { methods: ['correlation'], tests: 5, status: 'complete', library: 'scipy' },
  'Chi-Square (SciPy)': { methods: ['chi-square-independence', 'chi-square-goodness'], tests: 4, status: 'complete', library: 'scipy' },
  'Non-Parametric (SciPy)': { methods: ['mann-whitney', 'wilcoxon', 'kruskal-wallis', 'mood-median', 'runs-test', 'cochran-q'], tests: 7, status: 'complete', library: 'scipy' },
  'Regression (SciPy)': { methods: ['regression'], tests: 2, status: 'complete', library: 'scipy' },
  'Normality (SciPy)': { methods: ['normality-test'], tests: 4, status: 'complete', library: 'scipy' },
  'Binomial (SciPy)': { methods: ['binomial-test'], tests: 2, status: 'complete', library: 'scipy' },
  'Sign Test (SciPy)': { methods: ['sign-test'], tests: 2, status: 'complete', library: 'scipy' },
  'Friedman (SciPy)': { methods: ['friedman'], tests: 1, status: 'complete', library: 'scipy' },
  'Levene/Bartlett (SciPy)': { methods: ['normality-test'], tests: 3, status: 'complete', library: 'scipy' },
  'Descriptive (SciPy)': { methods: ['descriptive'], tests: 2, status: 'complete', library: 'scipy' },
  // === statsmodels ===
  'ANOVA Advanced (statsmodels)': { methods: ['repeated-measures-anova', 'ancova', 'manova', 'mixed-model'], tests: 4, status: 'complete', library: 'statsmodels' },
  'Regression Advanced (statsmodels)': { methods: ['stepwise', 'poisson', 'ordinal-regression'], tests: 4, status: 'complete', library: 'statsmodels' },
  'Time Series (statsmodels)': { methods: ['arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall'], tests: 5, status: 'complete', library: 'statsmodels' },
  'Power Analysis (statsmodels)': { methods: ['power-analysis'], tests: 1, status: 'complete', library: 'statsmodels' },
  // === lifelines ===
  'Survival (lifelines)': { methods: ['kaplan-meier', 'cox-regression'], tests: 3, status: 'complete', library: 'lifelines' },
  // === sklearn ===
  'Multivariate (sklearn)': { methods: ['pca', 'factor-analysis', 'cluster', 'discriminant'], tests: 5, status: 'complete', library: 'sklearn' },
  // === pingouin ===
  'Effect Size (pingouin)': { methods: ['t-test', 'anova'], tests: 3, status: 'complete', library: 'pingouin' },
  'Partial Correlation (pingouin)': { methods: ['partial-correlation'], tests: 1, status: 'complete', library: 'pingouin' },
  // === Additional ===
  'Dose-Response (SciPy)': { methods: ['dose-response'], tests: 1, status: 'complete', library: 'scipy' },
  'Response Surface (statsmodels)': { methods: ['response-surface'], tests: 1, status: 'complete', library: 'statsmodels' }
}


// Data-Method Compatibility test coverage (2025-12-03)
const COMPATIBILITY_COVERAGE = {
  'Variable Requirements': { 
    tests: 12, 
    status: 'complete',
    description: 'Variable type/count validation for each method'
  },
  'Sample Size Checks': { 
    tests: 5, 
    status: 'complete',
    description: 'Minimum sample size requirements'
  },
  'Group Structure': { 
    tests: 8, 
    status: 'complete',
    description: 'Factor levels, paired design detection'
  },
  'Assumption Tests': { 
    tests: 15, 
    status: 'complete',
    description: 'Normality, homogeneity, linearity, etc.'
  },
  'DecisionTree Integration': { 
    tests: 8, 
    status: 'complete',
    description: 'recommendWithCompatibility function'
  }
}

// Test data files info (2025-12-03)
const TEST_DATA_INFO = {
  location: 'test-data/',
  datasets: {
    'standard-datasets.ts': {
      description: 'Iris, mtcars, Anscombe, ANOVA, paired, timeseries, etc.',
      count: 9,
      purpose: 'Standard statistical test datasets'
    },
    'r-reference-results.ts': {
      description: 'R-calculated golden values for 18 test cases',
      count: 18,
      purpose: 'Reference values for accuracy verification'
    },
    'CSV files (28)': {
      description: 'Korean-named sample datasets',
      count: 28,
      purpose: 'Real-world usage examples'
    }
  },
  referenceResults: [
    'tTest (oneSample, independent, paired, welch)',
    'anova (oneWay, tukeyHSD)',
    'correlation (pearson, spearman)',
    'regression (simple)',
    'normality (shapiroWilk, levene)',
    'nonparametric (mannWhitneyU, wilcoxonSignedRank, kruskalWallis)',
    'chiSquare (independence)',
    'effectSizes (cohensD, etaSquared)',
    'descriptive (basic)'
  ]
}

// Playwright MCP Settings for Claude Code
const PLAYWRIGHT_MCP_SETTINGS = {
  description: 'Claude Code settings for Playwright auto-approval',
  settingsPath: {
    user: '~/.claude/settings.json',
    project: '.claude/settings.json',
    local: '.claude/settings.local.json'
  },
  tools: {
    safe: [
      { name: 'playwright_navigate', desc: 'URL navigation', risk: 'low' },
      { name: 'playwright_screenshot', desc: 'Screen capture', risk: 'low' },
      { name: 'playwright_click', desc: 'Element click', risk: 'low' },
      { name: 'playwright_iframe_click', desc: 'Click in iframe', risk: 'low' },
      { name: 'playwright_fill', desc: 'Form input', risk: 'medium' },
      { name: 'playwright_select', desc: 'Select option', risk: 'low' },
      { name: 'playwright_hover', desc: 'Hover element', risk: 'low' },
      { name: 'playwright_console_logs', desc: 'View logs', risk: 'low' },
      { name: 'playwright_close', desc: 'Close browser', risk: 'low' },
      { name: 'playwright_expect_response', desc: 'Wait for response', risk: 'low' },
      { name: 'playwright_assert_response', desc: 'Verify response', risk: 'low' },
    ],
    risky: [
      { name: 'playwright_evaluate', desc: 'Execute arbitrary JS', risk: 'high' },
      { name: 'playwright_get', desc: 'HTTP GET request', risk: 'medium' },
      { name: 'playwright_post', desc: 'HTTP POST (data send)', risk: 'high' },
      { name: 'playwright_put', desc: 'HTTP PUT (data modify)', risk: 'high' },
      { name: 'playwright_patch', desc: 'HTTP PATCH (data modify)', risk: 'high' },
      { name: 'playwright_delete', desc: 'HTTP DELETE (data delete)', risk: 'high' },
      { name: 'playwright_custom_user_agent', desc: 'Spoof identity', risk: 'medium' },
    ]
  },
  recommendedConfig: `{
  "allowedTools": [
    "mcp__playwright__playwright_navigate",
    "mcp__playwright__playwright_screenshot",
    "mcp__playwright__playwright_click",
    "mcp__playwright__playwright_iframe_click",
    "mcp__playwright__playwright_fill",
    "mcp__playwright__playwright_select",
    "mcp__playwright__playwright_hover",
    "mcp__playwright__playwright_console_logs",
    "mcp__playwright__playwright_close",
    "mcp__playwright__playwright_expect_response",
    "mcp__playwright__playwright_assert_response"
  ]
}`
}



// Methods Registry SSOT Info (2025-12-17)
const METHODS_REGISTRY_INFO = {
  description: 'Single Source of Truth for Python Worker methods',
  version: '1.0.0',
  updated: '2025-12-17',
  files: {
    registry: 'lib/constants/methods-registry.json',
    schema: 'lib/constants/methods-registry.schema.json',
    types: 'lib/constants/methods-registry.types.ts',
    generated: 'lib/generated/method-types.generated.ts',
    generator: 'scripts/generate-method-types.mjs'
  },
  workers: [
    { id: 1, name: 'descriptive', methods: 13, packages: ['numpy', 'scipy'] },
    { id: 2, name: 'hypothesis', methods: 14, packages: ['numpy', 'scipy', 'statsmodels', 'pandas'] },
    { id: 3, name: 'nonparametric-anova', methods: 18, packages: ['numpy', 'scipy', 'statsmodels', 'pandas', 'scikit-learn'] },
    { id: 4, name: 'regression-advanced', methods: 19, packages: ['numpy', 'scipy', 'statsmodels', 'scikit-learn'] }
  ],
  totalMethods: 64,
  features: [
    'TypeScript-Python contract definition',
    'Auto-generated type-safe wrapper functions',
    'Parameter validation at compile time',
    'camelCase naming convention enforced'
  ],
  testFiles: [
    { file: '__tests__/lib/methods-registry.test.ts', tests: 25, desc: 'Registry API tests' },
    { file: '__tests__/lib/methods-registry-sync.test.ts', tests: 12, desc: 'Python-TS sync validation' },
    { file: '__tests__/pyodide/worker-function-mapping.test.ts', tests: 64, desc: 'Worker method existence' }
  ]
}

// E2E Test Files Info (2025-12-17)
const E2E_TEST_FILES = {
  status: 'in-progress',
  files: [
    { file: 'e2e/comprehensive/run-all.spec.ts', tests: 2, status: 'working', desc: 'ANOVA + T-Test full flow' },
    { file: 'e2e/comprehensive/anova.spec.ts', tests: 1, status: 'working', desc: 'ANOVA dedicated test' },
    { file: 'e2e/core-calculation.spec.ts', tests: 2, status: 'debug', desc: 'Core calculation verification' },
    { file: 'e2e/pyodide-worker.spec.ts', tests: 3, status: 'debug', desc: 'Pyodide worker tests' },
    { file: 'e2e/workers-validation.spec.ts', tests: 4, status: 'planned', desc: 'All workers validation' }
  ],
  totalTests: 12,
  workingTests: 3
}
// E2E Test scenarios for other AI assistants
const E2E_TEST_SCENARIOS = {
  description: 'Browser-based E2E test scenarios for Playwright',
  status: 'planned',
  scenarios: [
    {
      id: 'smart-flow-basic',
      name: 'Smart Flow Basic Workflow',
      steps: [
        '1. Navigate to /smart-flow',
        '2. Upload CSV file (test-data/t-test.csv)',
        '3. Select analysis purpose: "Compare groups"',
        '4. Verify compatible methods shown (t-test, Mann-Whitney)',
        '5. Select t-test method',
        '6. Configure variables (group, value)',
        '7. Run analysis',
        '8. Verify results display (p-value, effect size)'
      ],
      expectedResult: 'Analysis completes with valid statistics'
    },
    {
      id: 'compatibility-filter',
      name: 'Compatibility Filter Test',
      steps: [
        '1. Navigate to /smart-flow',
        '2. Upload small sample CSV (n < 30)',
        '3. Verify non-parametric methods highlighted',
        '4. Upload normal distribution CSV',
        '5. Verify parametric methods available'
      ],
      expectedResult: 'Methods filtered based on data characteristics'
    },
    {
      id: 'statistics-page-direct',
      name: 'Direct Statistics Page Access',
      steps: [
        '1. Navigate to /statistics/t-test',
        '2. Upload test-data/t-test.csv',
        '3. Select group variable',
        '4. Select value variable',
        '5. Click Analyze button',
        '6. Verify results table appears',
        '7. Verify interpretation text generated'
      ],
      expectedResult: 'Page renders results without errors'
    },
    {
      id: 'anova-posthoc',
      name: 'ANOVA with Post-hoc Tests',
      steps: [
        '1. Navigate to /statistics/anova',
        '2. Upload test-data/anova data (3+ groups)',
        '3. Run one-way ANOVA',
        '4. Verify F-statistic and p-value',
        '5. If significant, verify post-hoc options appear',
        '6. Run Tukey HSD',
        '7. Verify pairwise comparisons displayed'
      ],
      expectedResult: 'ANOVA + post-hoc results complete'
    },
    {
      id: 'regression-analysis',
      name: 'Regression Analysis Flow',
      steps: [
        '1. Navigate to /statistics/regression',
        '2. Upload dataset with numeric variables',
        '3. Select dependent variable (Y)',
        '4. Select independent variable(s) (X)',
        '5. Run regression',
        '6. Verify coefficients table',
        '7. Verify R-squared displayed',
        '8. Verify scatter plot with regression line'
      ],
      expectedResult: 'Regression model with diagnostics'
    }
  ]
}

// All 48 statistics methods with their test coverage
// Updated 2025-12-02: Extended Golden Values coverage with multiple libraries
const STATISTICS_METHODS: MethodCoverage[] = [
  // T-Test category (4)
  { id: 't-test', name: 'Independent t-Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: true, phase4: false } },
  { id: 'one-sample-t', name: 'One-Sample t-Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: true, phase4: false } },
  { id: 'welch-t', name: 'Welch t-Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // ANOVA category (7) - statsmodels/pingouin for advanced
  { id: 'anova', name: 'One-Way ANOVA', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: true, phase4: false } },
  { id: 'repeated-measures-anova', name: 'Repeated Measures ANOVA', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: true, phase4: false } },
  { id: 'ancova', name: 'ANCOVA', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'manova', name: 'MANOVA', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'mixed-model', name: 'Mixed Model', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Correlation (3) - pingouin for partial
  { id: 'correlation', name: 'Pearson Correlation', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'partial-correlation', name: 'Partial Correlation', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Chi-Square (3)
  { id: 'chi-square', name: 'Chi-Square Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'chi-square-independence', name: 'Chi-Square Independence', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'chi-square-goodness', name: 'Chi-Square Goodness', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Non-Parametric (11)
  { id: 'mann-whitney', name: 'Mann-Whitney U', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'kruskal-wallis', name: 'Kruskal-Wallis', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'friedman', name: 'Friedman Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'sign-test', name: 'Sign Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'runs-test', name: 'Runs Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'binomial-test', name: 'Binomial Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'mcnemar', name: "McNemar's Test", phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'cochran-q', name: 'Cochran Q Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'mood-median', name: 'Mood Median Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'ks-test', name: 'K-S Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Regression (6) - statsmodels for advanced
  { id: 'regression', name: 'Linear Regression', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: true, phase4: false } },
  { id: 'stepwise', name: 'Stepwise Regression', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'ordinal-regression', name: 'Ordinal Regression', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'poisson', name: 'Poisson Regression', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'dose-response', name: 'Dose-Response', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'response-surface', name: 'Response Surface', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Multivariate (5) - sklearn
  { id: 'pca', name: 'PCA', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'factor-analysis', name: 'Factor Analysis', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'cluster', name: 'Cluster Analysis', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'discriminant', name: 'Discriminant Analysis', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Descriptive & Normality (3)
  { id: 'descriptive', name: 'Descriptive Statistics', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: true, phase4: false } },
  { id: 'normality-test', name: 'Normality Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'explore-data', name: 'Data Exploration', phases: { phase0: true, phase1: true, phase2: true, phase25: false, phase3: false, phase4: false } },
  // Time Series (5) - statsmodels
  { id: 'arima', name: 'ARIMA', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'seasonal-decompose', name: 'Seasonal Decomposition', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'stationarity-test', name: 'Stationarity Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'mann-kendall', name: 'Mann-Kendall Trend', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Survival Analysis (3) - lifelines
  { id: 'kaplan-meier', name: 'Kaplan-Meier', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'cox-regression', name: 'Cox Regression', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  // Other (5)
  { id: 'reliability', name: 'Reliability Analysis', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'power-analysis', name: 'Power Analysis', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'proportion-test', name: 'Proportion Test', phases: { phase0: true, phase1: true, phase2: true, phase25: true, phase3: false, phase4: false } },
  { id: 'means-plot', name: 'Means Plot', phases: { phase0: true, phase1: true, phase2: true, phase25: false, phase3: true, phase4: false } },
  { id: 'non-parametric', name: 'Non-Parametric Tests', phases: { phase0: true, phase1: true, phase2: true, phase25: false, phase3: false, phase4: false } },
]

export function TestAutomationDashboardSection() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'phases']))
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Calculate overall coverage
  const overallStats = useMemo(() => {
    const phases = TEST_PHASES.map(phase => ({
      ...phase,
      percentage: Math.round((phase.coverage.covered / phase.coverage.total) * 100)
    }))

    const totalTests = phases.reduce((sum, p) => sum + p.coverage.covered, 0)
    const maxTests = phases.reduce((sum, p) => sum + p.coverage.total, 0)

    return {
      phases,
      totalTests,
      maxTests,
      overallPercentage: Math.round((totalTests / maxTests) * 100)
    }
  }, [])

  // Filter methods by phase coverage
  const getMethodsByPhase = useCallback((phaseId: string) => {
    const phaseKey = phaseId as keyof MethodCoverage['phases']
    return STATISTICS_METHODS.filter(m => m.phases[phaseKey])
  }, [])

  const getMissingMethodsByPhase = useCallback((phaseId: string) => {
    const phaseKey = phaseId as keyof MethodCoverage['phases']
    return STATISTICS_METHODS.filter(m => !m.phases[phaseKey])
  }, [])

  // Section header component
  const SectionHeader = ({
    id,
    title,
    icon: Icon,
    badge
  }: {
    id: string
    title: string
    icon: ComponentType<{ className?: string }>
    badge?: ReactNode
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">{title}</span>
        {badge}
      </div>
      {expandedSections.has(id) ? (
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      ) : (
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">Statistics pages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Testing stages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Golden Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-green-600">45</span>
              <span className="text-lg text-muted-foreground">/ 48</span>
            </div>
            <p className="text-xs text-muted-foreground">Multi-library verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">E2E Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <span className="text-3xl font-bold text-orange-600">2</span>
              <span className="text-lg text-muted-foreground">/ 48</span>
            </div>
            <p className="text-xs text-muted-foreground">Playwright (in progress)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registry Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileJson className="w-6 h-6 text-purple-500" />
              <span className="text-3xl font-bold text-purple-600">64</span>
            </div>
            <p className="text-xs text-muted-foreground">SSOT defined</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compatibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
              <span className="text-3xl font-bold text-blue-600">53</span>
            </div>
            <p className="text-xs text-muted-foreground">Methods filtered</p>
          </CardContent>
        </Card>
      </div>

      {/* Test Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="w-5 h-5" />
            Test Automation Pipeline
          </CardTitle>
          <CardDescription>
            Phase-by-phase testing coverage for 48 statistics methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SectionHeader
              id="phases"
              title="Test Phases Overview"
              icon={Layers}
              badge={<Badge variant="outline">{overallStats.overallPercentage}% overall</Badge>}
            />

            {expandedSections.has('phases') && (
              <div className="space-y-4 pl-2">
                {overallStats.phases.map((phase) => {
                  const Icon = phase.icon
                  const isSelected = selectedPhase === phase.id

                  return (
                    <div
                      key={phase.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer",
                        isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                      )}
                      onClick={() => setSelectedPhase(isSelected ? null : phase.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", phase.color.replace('bg-', 'bg-').replace('500', '100'))}>
                            <Icon className={cn("w-5 h-5", phase.color.replace('bg-', 'text-'))} />
                          </div>
                          <div>
                            <h4 className="font-medium">{phase.name}</h4>
                            <p className="text-xs text-muted-foreground">{phase.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {phase.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {phase.status === 'partial' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                            {phase.status === 'planned' && <Clock className="w-4 h-4 text-gray-400" />}
                            <span className={cn(
                              "font-bold",
                              phase.percentage === 100 ? "text-green-600" :
                              phase.percentage > 0 ? "text-yellow-600" : "text-gray-400"
                            )}>
                              {phase.percentage}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {phase.coverage.covered}/{phase.coverage.total} methods
                          </p>
                        </div>
                      </div>

                      <Progress value={phase.percentage} className="h-2" />

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {phase.tool}
                          </Badge>
                        </div>
                        <code className="text-xs text-muted-foreground font-mono">
                          {phase.command}
                        </code>
                      </div>

                      {/* Expanded details */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-green-600 mb-2">
                              Covered ({getMethodsByPhase(phase.id).length})
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {getMethodsByPhase(phase.id).map(m => (
                                <Badge key={m.id} variant="outline" className="text-xs font-mono">
                                  {m.id}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {getMissingMethodsByPhase(phase.id).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-red-600 mb-2">
                                Missing ({getMissingMethodsByPhase(phase.id).length})
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {getMissingMethodsByPhase(phase.id).map(m => (
                                  <Badge key={m.id} variant="destructive" className="text-xs font-mono opacity-60">
                                    {m.id}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Golden Values Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Python Calculation Tests (Phase 2.5)
          </CardTitle>
          <CardDescription>
            SciPy 1.14.1 via Pyodide - Golden values verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SectionHeader
              id="golden-values"
              title="Test Categories (45 methods covered)"
              icon={FlaskConical}
              badge={<Badge className="bg-green-500">45/48</Badge>}
            />

            {expandedSections.has('golden-values') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                {Object.entries(GOLDEN_VALUES_COVERAGE).map(([category, data]) => (
                  <div
                    key={category}
                    className="p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{category}</span>
                      </div>
                      <Badge variant="secondary">{data.tests} tests</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.methods.map(m => (
                        <Badge key={m} variant="outline" className="text-xs font-mono">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Missing from golden values */}
            <SectionHeader
              id="golden-missing"
              title="Not Yet Covered (3 methods)"
              icon={AlertCircle}
              badge={<Badge variant="destructive">TODO</Badge>}
            />

            {expandedSections.has('golden-missing') && (
              <div className="pl-4">
                <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                  <p className="text-sm text-muted-foreground mb-3">
                    The following methods need golden value tests added to <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">statistical-golden-values.json</code>:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {STATISTICS_METHODS
                      .filter(m => !m.phases.phase25)
                      .map(m => (
                        <Badge key={m.id} variant="outline" className="text-xs font-mono opacity-70">
                          {m.id}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Compatibility Layer Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data-Method Compatibility (Phase 5)
          </CardTitle>
          <CardDescription>
            Pre-filters 53 statistical methods based on data characteristics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SectionHeader
              id="compatibility-tests"
              title="Compatibility Test Coverage (83 tests total)"
              icon={Database}
              badge={<Badge className="bg-blue-500">NEW</Badge>}
            />

            {expandedSections.has('compatibility-tests') && (
              <div className="space-y-4 pl-4">
                {/* Architecture */}
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                  <h4 className="font-medium mb-2">2-Stage Compatibility Check</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-white dark:bg-background rounded border">
                      <div className="font-medium text-blue-600">Stage 1: Structural</div>
                      <p className="text-xs text-muted-foreground">Variable types, sample size, group structure</p>
                      <Badge variant="outline" className="mt-1 text-xs">Instant (no Pyodide)</Badge>
                    </div>
                    <div className="p-3 bg-white dark:bg-background rounded border">
                      <div className="font-medium text-purple-600">Stage 2: Assumptions</div>
                      <p className="text-xs text-muted-foreground">Normality, homogeneity, linearity</p>
                      <Badge variant="outline" className="mt-1 text-xs">After Pyodide tests</Badge>
                    </div>
                  </div>
                </div>

                {/* Test Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(COMPATIBILITY_COVERAGE).map(([category, data]) => (
                    <div
                      key={category}
                      className="p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{category}</span>
                        </div>
                        <Badge variant="secondary">{data.tests} tests</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
                    </div>
                  ))}
                </div>

                {/* Test Files */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h5 className="text-sm font-medium mb-2">Test Files</h5>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <code>__tests__/lib/statistics/data-method-compatibility.test.ts</code>
                      <Badge variant="outline">83 tests</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <code>__tests__/lib/services/decision-tree-recommender.test.ts</code>
                      <Badge variant="outline">29 tests</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Test Data Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Test Data Files
          </CardTitle>
          <CardDescription>
            Standard datasets and R reference values for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SectionHeader
              id="test-data"
              title="test-data/ Directory"
              icon={FolderOpen}
              badge={<Badge variant="outline">55 files</Badge>}
            />

            {expandedSections.has('test-data') && (
              <div className="space-y-4 pl-4">
                {/* Dataset Files */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(TEST_DATA_INFO.datasets).map(([file, info]) => (
                    <div
                      key={file}
                      className="p-3 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FolderOpen className="w-4 h-4 text-amber-600" />
                        <code className="text-xs font-mono font-medium">{file}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">{info.count} items</Badge>
                    </div>
                  ))}
                </div>

                {/* Reference Results */}
                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    R Reference Results (Golden Values)
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {TEST_DATA_INFO.referenceResults.map(item => (
                      <Badge key={item} variant="outline" className="text-xs font-mono">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* File Locations */}
                <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs">
                  <p><span className="text-muted-foreground">Datasets:</span> test-data/datasets/standard-datasets.ts</p>
                  <p><span className="text-muted-foreground">Golden Values:</span> test-data/reference-results/r-reference-results.ts</p>
                  <p><span className="text-muted-foreground">R Script:</span> test-data/reference-results/generate-r-references.R</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* E2E Test Guide with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            E2E Test & Playwright Setup (Phase 4)
          </CardTitle>
          <CardDescription>
            Browser-based test scenarios and Claude Code MCP settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scenarios" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
              <TabsTrigger value="settings">Claude Code Settings</TabsTrigger>
            </TabsList>

            {/* Test Scenarios Tab */}
            <TabsContent value="scenarios" className="space-y-4 mt-4">
              {E2E_TEST_SCENARIOS.scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{scenario.name}</h4>
                    <Badge variant="outline" className="text-xs">{scenario.id}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {scenario.steps.map((step, idx) => (
                        <p key={idx} className="font-mono text-xs">{step}</p>
                      ))}
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-xs font-medium text-green-600">Expected: </span>
                      <span className="text-xs text-muted-foreground">{scenario.expectedResult}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* AI Testing Instructions */}
              <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                <h4 className="font-medium mb-2">AI-Assisted E2E Testing</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  These scenarios can be executed by AI assistants with browser automation capabilities:
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <p>1. Open browser to http://localhost:3000</p>
                  <p>2. Follow scenario steps sequentially</p>
                  <p>3. Take screenshots at key steps</p>
                  <p>4. Verify expected results</p>
                  <p>5. Report pass/fail status</p>
                </div>
              </div>
            </TabsContent>

            {/* Claude Code Settings Tab */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              {/* Settings File Locations */}
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                <h4 className="font-medium mb-3">Settings File Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-white dark:bg-background rounded border">
                    <div className="font-medium text-blue-600">User (PC-wide)</div>
                    <code className="text-xs text-muted-foreground">~/.claude/settings.json</code>
                    <p className="text-xs text-muted-foreground mt-1">All projects on this PC</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-background rounded border">
                    <div className="font-medium text-green-600">Project</div>
                    <code className="text-xs text-muted-foreground">.claude/settings.json</code>
                    <p className="text-xs text-muted-foreground mt-1">Git tracked, team shared</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-background rounded border">
                    <div className="font-medium text-purple-600">Local</div>
                    <code className="text-xs text-muted-foreground">.claude/settings.local.json</code>
                    <p className="text-xs text-muted-foreground mt-1">Git ignored, personal</p>
                  </div>
                </div>
              </div>

              {/* Safe Tools */}
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Safe Tools (Recommended)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PLAYWRIGHT_MCP_SETTINGS.tools.safe.map((tool) => (
                    <div key={tool.name} className="flex items-center gap-2 p-2 bg-white dark:bg-background rounded border">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        tool.risk === 'low' ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'
                      )}>
                        {tool.risk}
                      </Badge>
                      <div>
                        <code className="text-xs font-mono">{tool.name}</code>
                        <p className="text-xs text-muted-foreground">{tool.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risky Tools */}
              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Risky Tools (Use with Caution)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PLAYWRIGHT_MCP_SETTINGS.tools.risky.map((tool) => (
                    <div key={tool.name} className="flex items-center gap-2 p-2 bg-white dark:bg-background rounded border">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        tool.risk === 'high' ? 'border-red-500 text-red-600' : 'border-yellow-500 text-yellow-600'
                      )}>
                        {tool.risk}
                      </Badge>
                      <div>
                        <code className="text-xs font-mono">{tool.name}</code>
                        <p className="text-xs text-muted-foreground">{tool.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Config */}
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-3">Recommended Configuration</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Add to <code className="bg-muted px-1 py-0.5 rounded text-xs">~/.claude/settings.json</code> for auto-approval:
                </p>
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                  {PLAYWRIGHT_MCP_SETTINGS.recommendedConfig}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* Methods Registry SSOT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            Methods Registry (SSOT)
            <Badge className="bg-purple-500">NEW</Badge>
          </CardTitle>
          <CardDescription>
            Single Source of Truth for TypeScript-Python Worker contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SectionHeader
              id="methods-registry"
              title="Registry Overview (64 methods across 4 workers)"
              icon={FileJson}
              badge={<Badge variant="outline">v{METHODS_REGISTRY_INFO.version}</Badge>}
            />

            {expandedSections.has('methods-registry') && (
              <div className="space-y-4 pl-4">
                {/* Architecture */}
                <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                  <h4 className="font-medium mb-3">SSOT Architecture</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-white dark:bg-background rounded border">
                      <div className="font-medium text-purple-600">1. Registry JSON</div>
                      <code className="text-xs text-muted-foreground block mt-1">methods-registry.json</code>
                      <p className="text-xs text-muted-foreground mt-1">Method definitions, params, returns</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-background rounded border">
                      <div className="font-medium text-blue-600">2. Type Generator</div>
                      <code className="text-xs text-muted-foreground block mt-1">generate-method-types.mjs</code>
                      <p className="text-xs text-muted-foreground mt-1">Auto-generates TypeScript types</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-background rounded border">
                      <div className="font-medium text-green-600">3. Generated Types</div>
                      <code className="text-xs text-muted-foreground block mt-1">method-types.generated.ts</code>
                      <p className="text-xs text-muted-foreground mt-1">Type-safe wrapper functions</p>
                    </div>
                  </div>
                </div>

                {/* Workers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {METHODS_REGISTRY_INFO.workers.map((worker) => (
                    <div
                      key={worker.id}
                      className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-950/20"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">Worker {worker.id}</span>
                        <Badge variant="secondary" className="text-xs">{worker.methods}</Badge>
                      </div>
                      <code className="text-xs text-muted-foreground">{worker.name}</code>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {worker.packages.slice(0, 2).map(pkg => (
                          <Badge key={pkg} variant="outline" className="text-[10px]">{pkg}</Badge>
                        ))}
                        {worker.packages.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">+{worker.packages.length - 2}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    Key Features
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {METHODS_REGISTRY_INFO.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Test Files */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h5 className="text-sm font-medium mb-2">Test Coverage</h5>
                  <div className="space-y-1 font-mono text-xs">
                    {METHODS_REGISTRY_INFO.testFiles.map((tf) => (
                      <div key={tf.file} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <code>{tf.file}</code>
                        <Badge variant="outline">{tf.tests} tests</Badge>
                        <span className="text-muted-foreground">- {tf.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commands */}
                <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs">
                  <p className="text-slate-400"># Generate types from registry</p>
                  <p>node scripts/generate-method-types.mjs</p>
                  <p className="text-slate-400 mt-2"># Run registry tests</p>
                  <p>npm test -- methods-registry</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Method Coverage Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Method Coverage Matrix
          </CardTitle>
          <CardDescription>
            All 48 methods with their test coverage by phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SectionHeader
              id="matrix"
              title="Coverage Matrix (48 methods)"
              icon={Layers}
            />

            {expandedSections.has('matrix') && (
              <div className="pl-4">
                <div className="max-h-96 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2 font-medium min-w-[150px]">Method</th>
                        <th className="text-center p-2 font-medium w-16" title="Phase 0: Static Analysis">P0</th>
                        <th className="text-center p-2 font-medium w-16" title="Phase 1: Unit Tests">P1</th>
                        <th className="text-center p-2 font-medium w-16" title="Phase 2: Interpretation">P2</th>
                        <th className="text-center p-2 font-medium w-16" title="Phase 2.5: Golden Values">P2.5</th>
                        <th className="text-center p-2 font-medium w-16" title="Phase 3: Integration">P3</th>
                        <th className="text-center p-2 font-medium w-16" title="Phase 4: E2E">P4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATISTICS_METHODS.map(method => (
                        <tr key={method.id} className="border-t hover:bg-muted/50">
                          <td className="p-2">
                            <code className="text-xs font-mono">{method.id}</code>
                          </td>
                          {(['phase0', 'phase1', 'phase2', 'phase25', 'phase3', 'phase4'] as const).map(phase => (
                            <td key={phase} className="text-center p-2">
                              {method.phases[phase] ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-300 inline" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  P0: Static Analysis | P1: Unit Tests | P2: Interpretation | P2.5: Golden Values | P3: Integration | P4: E2E
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Impact Analysis Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Test Impact Analysis
          </CardTitle>
          <CardDescription>
            Track which methods need revalidation after code changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
              <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code className="text-xs bg-muted px-1 rounded">git commit</code> triggers impact analysis via pre-commit hook</li>
                <li>• Changed files are mapped to affected statistical methods</li>
                <li>• Console shows which methods may need revalidation</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">4</div>
                <div className="text-xs text-muted-foreground">Python Workers</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">47</div>
                <div className="text-xs text-muted-foreground">Methods Mapped</div>
              </div>
            </div>

            <div className="text-sm">
              <h5 className="font-medium mb-2">Worker Coverage</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-mono">worker1-descriptive</span>
                  <span className="text-muted-foreground">4 methods</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-mono">worker2-hypothesis</span>
                  <span className="text-muted-foreground">8 methods</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-mono">worker3-nonparametric-anova</span>
                  <span className="text-muted-foreground">16 methods</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-mono">worker4-regression-advanced</span>
                  <span className="text-muted-foreground">19 methods</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>Files:</strong><br />
              • <code>lib/test-automation/file-method-mapping.ts</code><br />
              • <code>test-results/test-status.json</code> (local)<br />
              • <code>scripts/check-test-impact.js</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Run Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Run Tests</CardTitle>
          <CardDescription>Test commands by phase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-sm overflow-x-auto">
              <p className="text-slate-400"># Phase 0: Static Analysis</p>
              <p>npx tsc --noEmit && npm run lint</p>
              <p className="text-slate-400 mt-3"># Phase 1 & 2: Unit Tests + Interpretation Engine</p>
              <p>npm test</p>
              <p className="text-slate-400 mt-3"># Phase 2.5: Golden Values (SciPy verification)</p>
              <p>npm run test:golden-values      <span className="text-slate-400"># Schema validation</span></p>
              <p>npm run test:pyodide-golden     <span className="text-slate-400"># Actual Pyodide tests</span></p>
              <p className="text-slate-400 mt-3"># Phase 3: Integration Tests</p>
              <p>npm test -- __tests__/integration/</p>
              <p className="text-slate-400 mt-3"># Phase 4: E2E (Playwright)</p>
              <p>npm run e2e                     <span className="text-slate-400"># Planned</span></p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="/design-system"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Back to Design System
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
