#!/usr/bin/env node
/**
 * Jest to Vitest Migration Script
 *
 * Converts Jest API calls to Vitest equivalents:
 * - jest.fn() → vi.fn()
 * - jest.mock() → vi.mock()
 * - jest.spyOn() → vi.spyOn()
 * - jest.useFakeTimers() → vi.useFakeTimers()
 * - jest.useRealTimers() → vi.useRealTimers()
 * - jest.clearAllMocks() → vi.clearAllMocks()
 * - jest.resetAllMocks() → vi.resetAllMocks()
 * - jest.restoreAllMocks() → vi.restoreAllMocks()
 * - jest.requireMock() → vi.importMock() (approximate)
 * - Adds `import { vi } from 'vitest'` when needed
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const TEST_DIRS = [
  '__tests__',
  'lib',
  'components',
  'hooks',
  'app'
];

const JEST_TO_VITEST = [
  // Core mock functions
  [/\bjest\.fn\(/g, 'vi.fn('],
  [/\bjest\.mock\(/g, 'vi.mock('],
  [/\bjest\.spyOn\(/g, 'vi.spyOn('],
  [/\bjest\.unmock\(/g, 'vi.unmock('],

  // Timers
  [/\bjest\.useFakeTimers\(/g, 'vi.useFakeTimers('],
  [/\bjest\.useRealTimers\(/g, 'vi.useRealTimers('],
  [/\bjest\.advanceTimersByTime\(/g, 'vi.advanceTimersByTime('],
  [/\bjest\.runAllTimers\(/g, 'vi.runAllTimers('],
  [/\bjest\.runOnlyPendingTimers\(/g, 'vi.runOnlyPendingTimers('],

  // Mock management
  [/\bjest\.clearAllMocks\(/g, 'vi.clearAllMocks('],
  [/\bjest\.resetAllMocks\(/g, 'vi.resetAllMocks('],
  [/\bjest\.restoreAllMocks\(/g, 'vi.restoreAllMocks('],

  // Module mocking
  [/\bjest\.requireMock\(/g, 'vi.importMock('],
  [/\bjest\.doMock\(/g, 'vi.doMock('],
  [/\bjest\.dontMock\(/g, 'vi.dontMock('],

  // Other
  [/\bjest\.setTimeout\(/g, 'vi.setConfig({ testTimeout: '],  // Needs manual fix
  [/\bjest\.mocked\(/g, 'vi.mocked('],
];

// Replace @jest/globals imports with vitest imports
const IMPORT_REPLACEMENTS = [
  // Full @jest/globals import with jest
  [
    /import\s*{\s*jest\s*,?\s*([^}]*)\s*}\s*from\s*['"]@jest\/globals['"]/g,
    (match, rest) => {
      const items = rest.split(',').map(s => s.trim()).filter(Boolean);
      if (items.length > 0) {
        return `import { vi, ${items.join(', ')} } from 'vitest'`;
      }
      return `import { vi } from 'vitest'`;
    }
  ],
  // @jest/globals without jest (just describe, it, expect, etc)
  [
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@jest\/globals['"]/g,
    (match, items) => {
      // Check if items contains 'jest'
      if (items.includes('jest')) {
        const parsed = items.split(',').map(s => s.trim()).filter(Boolean);
        const newItems = parsed.map(item => item === 'jest' ? 'vi' : item).join(', ');
        return `import { ${newItems} } from 'vitest'`;
      }
      return `import { ${items.trim()} } from 'vitest'`;
    }
  ],
];

// Patterns that indicate vi is already imported
const VI_IMPORT_PATTERNS = [
  /import\s+{\s*vi\s*}\s+from\s+['"]vitest['"]/,
  /import\s+{\s*[^}]*\bvi\b[^}]*}\s+from\s+['"]vitest['"]/,
  /import\s+\*\s+as\s+vi\s+from\s+['"]vitest['"]/,
];

function needsViImport(content) {
  // Check if file uses vi. methods
  if (!/\bvi\./g.test(content)) {
    return false;
  }

  // Check if vi is already imported
  for (const pattern of VI_IMPORT_PATTERNS) {
    if (pattern.test(content)) {
      return false;
    }
  }

  return true;
}

function addViImport(content) {
  // If there's already a vitest import, add vi to it
  const vitestImportMatch = content.match(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]vitest['"]/);

  if (vitestImportMatch) {
    const existingImports = vitestImportMatch[1];
    if (!existingImports.includes('vi')) {
      return content.replace(
        /import\s+{\s*([^}]+)\s*}\s+from\s+['"]vitest['"]/,
        `import { $1, vi } from 'vitest'`
      );
    }
    return content;
  }

  // Find the first import statement and add vi import after it
  const firstImportMatch = content.match(/^(import\s+.+?['"];?\s*\n)/m);
  if (firstImportMatch) {
    const insertPosition = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
    return content.slice(0, insertPosition) +
           "import { vi } from 'vitest'\n" +
           content.slice(insertPosition);
  }

  // No imports found, add at the beginning
  return "import { vi } from 'vitest'\n\n" + content;
}

function migrateFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // First, replace @jest/globals imports
  for (const [pattern, replacement] of IMPORT_REPLACEMENTS) {
    if (pattern.test(content)) {
      // Reset regex lastIndex since we're testing and then using replace
      pattern.lastIndex = 0;
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  // Apply all jest.* -> vi.* replacements
  for (const [pattern, replacement] of JEST_TO_VITEST) {
    if (pattern.test(content)) {
      pattern.lastIndex = 0;
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  // Add vi import if needed (and not already added by import replacement)
  if (modified && needsViImport(content)) {
    content = addViImport(content);
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function findTestFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and e2e
          if (item === 'node_modules' || item === 'e2e' || item === '.next') {
            continue;
          }
          findTestFiles(fullPath, files);
        } else if (stat.isFile()) {
          const ext = extname(item);
          if ((ext === '.ts' || ext === '.tsx' || ext === '.js') &&
              (item.includes('.test.') || item.includes('.spec.'))) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Skip files we can't access
      }
    }
  } catch (e) {
    // Skip directories we can't access
  }

  return files;
}

// Main execution
console.log('🔄 Jest to Vitest Migration\n');

const baseDir = process.cwd();
let totalFiles = 0;
let modifiedFiles = 0;

for (const testDir of TEST_DIRS) {
  const dirPath = join(baseDir, testDir);
  try {
    const files = findTestFiles(dirPath);

    for (const file of files) {
      totalFiles++;
      const relativePath = file.replace(baseDir + '\\', '').replace(baseDir + '/', '');

      if (migrateFile(file)) {
        modifiedFiles++;
        console.log(`✅ ${relativePath}`);
      }
    }
  } catch (e) {
    // Directory doesn't exist, skip
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total test files: ${totalFiles}`);
console.log(`   Modified files: ${modifiedFiles}`);
console.log(`   Unchanged files: ${totalFiles - modifiedFiles}`);

if (modifiedFiles > 0) {
  console.log('\n⚠️  Note: Some migrations may need manual review:');
  console.log('   - jest.setTimeout() → vi.setConfig({ testTimeout: ... })');
  console.log('   - jest.requireMock() → vi.importMock() (check async usage)');
  console.log('   - Complex mock patterns may need adjustment');
}
