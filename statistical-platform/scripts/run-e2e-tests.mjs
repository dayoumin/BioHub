#!/usr/bin/env node
/**
 * E2E Test Automation Script
 *
 * Usage:
 *   node scripts/run-e2e-tests.mjs [options]
 *
 * Options:
 *   --method <name>   Run tests for specific method (e.g., t-test, anova)
 *   --all             Run all E2E tests
 *   --headed          Run with browser visible
 *   --report          Open HTML report after tests
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
const options = {
  method: null,
  all: args.includes('--all'),
  headed: args.includes('--headed'),
  report: args.includes('--report'),
};

const methodIndex = args.indexOf('--method');
if (methodIndex !== -1 && args[methodIndex + 1]) {
  options.method = args[methodIndex + 1];
}

// Ensure results directories exist
const resultsDir = path.join(rootDir, 'e2e/results');
const dirs = ['artifacts', 'reports', 'logs', 'screenshots'];
dirs.forEach(dir => {
  const fullPath = path.join(resultsDir, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
});

// Build test command
let testCommand = 'npx playwright test';

if (options.method) {
  testCommand += ` e2e/statistics/${options.method}.spec.ts`;
} else if (!options.all) {
  // Default: run statistics tests
  testCommand += ' e2e/statistics/';
}

if (options.headed) {
  testCommand += ' --headed';
}

console.log('========================================');
console.log('🧪 E2E Test Runner');
console.log('========================================');
console.log(`Method: ${options.method || 'all'}`);
console.log(`Headed: ${options.headed}`);
console.log(`Command: ${testCommand}`);
console.log('----------------------------------------');

// Run tests
const startTime = Date.now();

try {
  execSync(testCommand, {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('----------------------------------------');
  console.log(`✅ Tests completed in ${duration}s`);

} catch (error) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('----------------------------------------');
  console.log(`❌ Tests failed after ${duration}s`);
  process.exitCode = 1;
}

// Log summary
const logFile = path.join(resultsDir, 'logs', `run-${new Date().toISOString().slice(0,10)}.log`);
const logEntry = `[${new Date().toISOString()}] Method: ${options.method || 'all'}, Status: ${process.exitCode === 1 ? 'FAILED' : 'PASSED'}\n`;
writeFileSync(logFile, logEntry, { flag: 'a' });

// Open report if requested
if (options.report) {
  console.log('Opening HTML report...');
  execSync('npx playwright show-report e2e/results/reports', {
    cwd: rootDir,
    stdio: 'inherit'
  });
}

console.log('========================================');
console.log('📊 Results saved to: e2e/results/');
console.log('   - reports/index.html (HTML report)');
console.log('   - reports/results.json (JSON data)');
console.log('   - artifacts/ (screenshots, traces)');
console.log('========================================');
