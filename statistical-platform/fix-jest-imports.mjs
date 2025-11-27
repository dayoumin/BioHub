import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern: import { describe, it, expect, ... } from '@jest/globals'
  // -> import { describe, it, ... } from '@jest/globals' (expect 제거)
  const importRegex = /import\s*\{([^}]*)\}\s*from\s*['"]@jest\/globals['"]/g;

  content = content.replace(importRegex, (match, imports) => {
    const importList = imports.split(',').map(i => i.trim()).filter(i => i);

    // expect가 있는지 확인
    if (importList.includes('expect')) {
      modified = true;
      const newImports = importList.filter(i => i !== 'expect');

      if (newImports.length === 0) {
        return '// expect is used from global scope (for @testing-library/jest-dom matchers)';
      }
      return `import { ${newImports.join(', ')} } from '@jest/globals'`;
    }
    return match;
  });

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + filePath);
  }
}

function walkDir(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.test.tsx') || file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Fix all test files
const testFiles = walkDir('__tests__');
for (const file of testFiles) {
  try {
    fixFile(file);
  } catch (e) {
    console.error('Error processing:', file, e.message);
  }
}

console.log('Done! Fixed ' + testFiles.length + ' files checked.');
