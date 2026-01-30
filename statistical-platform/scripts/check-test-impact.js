#!/usr/bin/env node
/**
 * Pre-commit hook: Identify affected methods from staged files
 *
 * Outputs console notification only (no JSON update)
 * For manual awareness during development
 *
 * SSOT: lib/test-automation/worker-method-mapping.json
 *
 * Usage: node scripts/check-test-impact.js
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Load SSOT from JSON
const mappingJsonPath = path.join(__dirname, '../lib/test-automation/worker-method-mapping.json')
let mappingData
try {
  mappingData = JSON.parse(fs.readFileSync(mappingJsonPath, 'utf8'))
} catch (err) {
  console.error('Failed to load worker-method-mapping.json:', err.message)
  process.exit(0) // Don't block commit
}

// Worker -> Method mappings (from SSOT JSON)
const WORKER_METHOD_MAPPING = Object.fromEntries(
  Object.entries(mappingData.workers).map(([worker, data]) => [worker, data.methods])
)

// Total method count (calculated from SSOT)
const TOTAL_METHODS = new Set(Object.values(WORKER_METHOD_MAPPING).flat()).size

// Critical files that affect ALL methods (from SSOT JSON)
const CRITICAL_FILES = (mappingData.globalImpactFiles || [])
  .filter(f => f.impactLevel === 'critical')
  .map(f => f.pattern)

// Get staged files
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    return output.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

// Analyze impact
function analyzeImpact(files) {
  const affectedMethods = new Set()
  const criticalChanges = []
  let isAllAffected = false

  for (const file of files) {
    // Check critical files
    for (const critical of CRITICAL_FILES) {
      if (file.includes(critical)) {
        isAllAffected = true
        criticalChanges.push(file)
      }
    }

    // Check worker files
    for (const [worker, methods] of Object.entries(WORKER_METHOD_MAPPING)) {
      if (file.includes(worker)) {
        methods.forEach(m => affectedMethods.add(m))
        criticalChanges.push(file)
      }
    }

    // Check individual page files
    const pageMatch = file.match(/statistics\/([^/]+)\/page\.tsx$/)
    if (pageMatch) {
      affectedMethods.add(pageMatch[1])
    }
  }

  return { affectedMethods, isAllAffected, criticalChanges }
}

// Main
function main() {
  const stagedFiles = getStagedFiles()

  if (stagedFiles.length === 0) {
    return // No staged files, skip
  }

  // Filter to statistical-platform files only
  const relevantFiles = stagedFiles.filter(f =>
    f.startsWith('statistical-platform/') ||
    f.includes('workers/python/') ||
    f.includes('/statistics/')
  )

  if (relevantFiles.length === 0) {
    return // No relevant files
  }

  const { affectedMethods, isAllAffected, criticalChanges } = analyzeImpact(relevantFiles)

  // Output
  if (isAllAffected || affectedMethods.size > 0) {
    console.log('')
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║           📊 Test Impact Analysis                         ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')

    if (criticalChanges.length > 0) {
      console.log('')
      console.log('🔴 Critical changes detected:')
      criticalChanges.forEach(f => console.log(`   • ${f}`))
    }

    if (isAllAffected) {
      console.log('')
      console.log(`⚠️  ALL ${TOTAL_METHODS} statistical methods may be affected!`)
      console.log('   Consider running full test suite before merge.')
    } else if (affectedMethods.size > 0) {
      console.log('')
      console.log(`🟡 ${affectedMethods.size} method(s) may need revalidation:`)
      const methods = Array.from(affectedMethods).sort()
      // Group by 5
      for (let i = 0; i < methods.length; i += 5) {
        const group = methods.slice(i, i + 5).join(', ')
        console.log(`   ${group}`)
      }
    }

    console.log('')
    console.log('💡 Tip: Check /design-system → Test Automation for status')
    console.log('')
  }
}

main()

// Allow commit to proceed (exit 0)
process.exit(0)
