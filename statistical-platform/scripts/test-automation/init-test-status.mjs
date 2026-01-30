/**
 * Initialize test-status.json with all statistical methods
 *
 * SSOT: lib/test-automation/worker-method-mapping.json
 *
 * Usage: node scripts/test-automation/init-test-status.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '../..')

// Load SSOT from JSON
const mappingJsonPath = join(ROOT, 'lib/test-automation/worker-method-mapping.json')
let mappingData
try {
  mappingData = JSON.parse(readFileSync(mappingJsonPath, 'utf8'))
} catch (err) {
  console.error('Failed to load worker-method-mapping.json:', err.message)
  process.exit(1)
}

// Worker -> Method mappings (from SSOT JSON)
const WORKER_METHOD_MAPPING = Object.fromEntries(
  Object.entries(mappingData.workers).map(([worker, data]) => [worker, data.methods])
)

// All statistics pages (derived from worker mappings)
const ALL_STATISTICS_PAGES = [
  ...new Set(Object.values(WORKER_METHOD_MAPPING).flat())
].sort()

// Get worker for method
function getWorkerForMethod(methodId) {
  for (const [worker, methods] of Object.entries(WORKER_METHOD_MAPPING)) {
    if (methods.includes(methodId)) {
      return worker
    }
  }
  return null
}

// Validate completeness
function validateCompleteness() {
  const mappedMethods = new Set()
  Object.values(WORKER_METHOD_MAPPING).forEach(methods => {
    methods.forEach(m => mappedMethods.add(m))
  })

  const missing = ALL_STATISTICS_PAGES.filter(p => !mappedMethods.has(p))
  const extra = [...mappedMethods].filter(m => !ALL_STATISTICS_PAGES.includes(m))

  console.log('\n=== Mapping Completeness Report ===')
  console.log(`Total Pages: ${ALL_STATISTICS_PAGES.length}`)
  console.log(`Mapped Methods: ${mappedMethods.size}`)

  if (missing.length > 0) {
    console.log(`\n❌ Missing from mapping (${missing.length}):`)
    missing.forEach(m => console.log(`  - ${m}`))
  }

  if (extra.length > 0) {
    console.log(`\n⚠️ Extra in mapping (${extra.length}):`)
    extra.forEach(m => console.log(`  - ${m}`))
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log('\n✅ Mapping is complete!')
  }

  return { missing, extra, isComplete: missing.length === 0 }
}

// Create test-status.json
function createTestStatus() {
  const testResultsDir = join(ROOT, 'test-results')
  const statusPath = join(testResultsDir, 'test-status.json')

  // Ensure directory exists
  if (!existsSync(testResultsDir)) {
    mkdirSync(testResultsDir, { recursive: true })
  }

  const now = new Date().toISOString()

  const methods = {}
  for (const methodId of ALL_STATISTICS_PAGES) {
    methods[methodId] = {
      methodId,
      status: 'untested',
      lastTested: null,
      needsRevalidation: false,
      worker: getWorkerForMethod(methodId),
      notes: '',
    }
  }

  const testStatus = {
    version: '1.0.0',
    created: now,
    lastUpdated: now,
    methods,
    summary: {
      total: ALL_STATISTICS_PAGES.length,
      pass: 0,
      fail: 0,
      untested: ALL_STATISTICS_PAGES.length,
      needsRevalidation: 0,
    },
  }

  writeFileSync(statusPath, JSON.stringify(testStatus, null, 2))
  console.log(`\n✅ Created: ${statusPath}`)
  console.log(`   Total methods: ${ALL_STATISTICS_PAGES.length}`)

  return statusPath
}

// Update .gitignore
function updateGitignore() {
  const gitignorePath = join(ROOT, '.gitignore')
  const entry = '\n# Test status (local only)\ntest-results/test-status.json\n'

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf8')
    if (!content.includes('test-status.json')) {
      writeFileSync(gitignorePath, content + entry)
      console.log('✅ Added test-status.json to .gitignore')
    } else {
      console.log('ℹ️ test-status.json already in .gitignore')
    }
  }
}

// Main
console.log('🔧 Initializing Test Status...\n')

const { isComplete } = validateCompleteness()

if (!isComplete) {
  console.log('\n⚠️ Warning: Mapping is incomplete. Proceeding anyway...')
}

createTestStatus()
updateGitignore()

console.log('\n✨ Done!')
