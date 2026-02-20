#!/usr/bin/env node
/**
 * Effect Size Converter - Pyodide integration check
 *
 * Validates that the Python worker implementation (`convert_effect_sizes`) matches
 * the documented formulas by executing the real worker code inside Pyodide (Node).
 *
 * Run:
 *   node --experimental-vm-modules scripts/run-effect-size-converter-pyodide.mjs
 *   npm run test:effect-size-converter-pyodide
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const workerPath = join(projectRoot, 'public', 'workers', 'python', 'worker1-descriptive.py')
const helpersPath = join(projectRoot, 'public', 'workers', 'python', 'helpers.py')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
}
const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`

function approxEqual(actual, expected, tol = 1e-3) {
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    throw new Error(`actual is not a finite number: ${actual}`)
  }
  if (typeof expected !== 'number' || !Number.isFinite(expected)) {
    throw new Error(`expected is not a finite number: ${expected}`)
  }
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`expected ${expected}, got ${actual} (tol=${tol})`)
  }
}

async function main() {
  console.log(colorize('\nEffect Size Converter - Pyodide integration check', 'cyan'))

  const { loadPyodide } = await import('pyodide')
  const pyodide = await loadPyodide()
  await pyodide.loadPackage(['numpy', 'scipy'])

  const helpers = readFileSync(helpersPath, 'utf-8')
  const worker = readFileSync(workerPath, 'utf-8')

  // Make `helpers` importable for the worker code.
  pyodide.FS.writeFile('helpers.py', helpers)

  // Load worker definitions.
  await pyodide.runPythonAsync(worker)

  const run = async (name, pythonExpr, validateFn) => {
    try {
      const code = `
import json
result = ${pythonExpr}
json.dumps(result)
`
      const out = await pyodide.runPythonAsync(code)
      const parsed = JSON.parse(out)
      validateFn(parsed)
      console.log(colorize(`  ✓ ${name}`, 'green'))
    } catch (err) {
      console.log(colorize(`  ✗ ${name}`, 'red'))
      throw err
    }
  }

  await run(
    't -> d, r, eta^2 (independent)',
    "convert_effect_sizes('t', 2.5, df=58, n1=30, n2=30)",
    (r) => {
      approxEqual(r.cohensD, 2.5 * Math.sqrt(1 / 30 + 1 / 30), 1e-4)
      approxEqual(r.etaSquared, (2.5 * 2.5) / (2.5 * 2.5 + 58), 1e-4)
      approxEqual(r.r, 2.5 / Math.sqrt(2.5 * 2.5 + 58), 1e-4)
    }
  )

  await run(
    'F -> eta^2, omega^2, f',
    "convert_effect_sizes('f', 5.0, dfBetween=2, dfWithin=57)",
    (r) => {
      const eta2 = (2 * 5.0) / (2 * 5.0 + 57)
      approxEqual(r.etaSquared, eta2, 1e-4)
      approxEqual(r.omegaSquared, (2 * (5.0 - 1)) / (2 * 5.0 + 57 + 1), 1e-4)
      approxEqual(r.cohensF, Math.sqrt(eta2 / (1 - eta2)), 1e-3)
    }
  )

  await run(
    'chi-square -> phi, V, w (df as min(r-1,c-1))',
    "convert_effect_sizes('chi-square', 15, n=200, df=2)",
    (r) => {
      approxEqual(r.phi, Math.sqrt(15 / 200), 1e-4)
      approxEqual(r.cohensW, Math.sqrt(15 / 200), 1e-4)
      approxEqual(r.cramersV, Math.sqrt(15 / (200 * 2)), 1e-4)
    }
  )

  await run(
    'r -> d, r^2, Fisher z',
    "convert_effect_sizes('r', 0.3, n=50)",
    (r) => {
      approxEqual(r.cohensD, (2 * 0.3) / Math.sqrt(1 - 0.3 * 0.3), 1e-4)
      approxEqual(r.rSquared, 0.3 * 0.3, 1e-6)
      approxEqual(r.fishersZ, 0.5 * Math.log((1 + 0.3) / (1 - 0.3)), 1e-4)
    }
  )

  await run(
    'd -> r, eta^2, g, OR',
    "convert_effect_sizes('d', 0.8, n1=15, n2=15)",
    (r) => {
      const rr = 0.8 / Math.sqrt(0.8 * 0.8 + 4)
      approxEqual(r.r, rr, 1e-4)
      approxEqual(r.etaSquared, rr * rr, 1e-4)
      const df = 15 + 15 - 2
      const J = 1 - 3 / (4 * df - 1)
      approxEqual(r.hedgesG, 0.8 * J, 1e-3)
      approxEqual(r.oddsRatio, Math.exp(0.8 * Math.PI / Math.sqrt(3)), 1e-3)
    }
  )

  await run(
    'OR -> d, r, log(OR)',
    "convert_effect_sizes('odds-ratio', 2.0)",
    (r) => {
      const d = Math.log(2.0) * Math.sqrt(3) / Math.PI
      approxEqual(r.cohensD, d, 1e-4)
      approxEqual(r.logOddsRatio, Math.log(2.0), 1e-6)
      approxEqual(r.r, d / Math.sqrt(d * d + 4), 1e-4)
    }
  )

  await run(
    'means -> d, g, r, CI',
    "convert_effect_sizes('means', 105, std1=10, n1=30, mean2=100, std2=12, n2=30)",
    (r) => {
      const pooledVar = ((30 - 1) * 10 * 10 + (30 - 1) * 12 * 12) / (30 + 30 - 2)
      const pooledStd = Math.sqrt(pooledVar)
      const d = (105 - 100) / pooledStd
      approxEqual(r.cohensD, d, 1e-3)
      approxEqual(r.pooledStd, pooledStd, 1e-3)
      approxEqual(r.r, d / Math.sqrt(d * d + ((60 * 60) / (30 * 30))), 1e-3)
      if (typeof r.dCiLower !== 'number' || typeof r.dCiUpper !== 'number') {
        throw new Error('expected dCiLower/dCiUpper to be numbers')
      }
      if (!(r.dCiLower <= r.cohensD && r.cohensD <= r.dCiUpper)) {
        throw new Error(`expected CI to contain d: [${r.dCiLower}, ${r.dCiUpper}] does not contain ${r.cohensD}`)
      }
    }
  )

  console.log(colorize('\nAll integration checks passed.\n', 'green'))
}

main().catch((err) => {
  console.error(colorize(`\nFAILED: ${err?.message ?? String(err)}\n`, 'red'))
  process.exit(1)
})

