import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/__tests__/pyodide/pyodide-worker-package-loading.test.ts';
let content = readFileSync(filePath, 'utf8');

// Fix 1: jest.fn() → jest.fn() as jest.MockedFunction<...>
content = content.replace(
  /loadPackage: jest\.fn\(\)\.mockResolvedValue\(undefined\)/g,
  'loadPackage: jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>'
);

content = content.replace(
  /runPython: jest\.fn\(\)\.mockReturnValue\(undefined\)/g,
  'runPython: jest.fn() as jest.MockedFunction<(code: string) => unknown>'
);

content = content.replace(
  /runPythonAsync: jest\.fn\(\)\.mockResolvedValue\(''\)/g,
  "runPythonAsync: jest.fn() as jest.MockedFunction<(code: string) => Promise<unknown>>"
);

content = content.replace(
  /readFile: jest\.fn\(\)\.mockReturnValue\(''\)/g,
  "readFile: jest.fn() as jest.MockedFunction<(path: string, options?: { encoding?: string }) => string | Uint8Array>"
);

content = content.replace(
  /writeFile: jest\.fn\(\)/g,
  'writeFile: jest.fn() as jest.MockedFunction<(path: string, data: string | Uint8Array) => void>'
);

content = content.replace(
  /unlink: jest\.fn\(\)/g,
  'unlink: jest.fn() as jest.MockedFunction<(path: string) => void>'
);

content = content.replace(
  /mkdir: jest\.fn\(\)/g,
  'mkdir: jest.fn() as jest.MockedFunction<(path: string) => void>'
);

// Fix 2: mockRejectedValue(new Error(...)) 타입 명시
// pyodide.loadPackage = jest.fn().mockRejectedValue(new Error('...'))
// → pyodide.loadPackage = jest.fn<(packages: string | string[]) => Promise<void>>().mockRejectedValue(new Error('...'))

const mockRejectedValuePattern = /(\w+)\.loadPackage = jest\.fn\(\)\.mockRejectedValue\(/g;
content = content.replace(
  mockRejectedValuePattern,
  '$1.loadPackage = (jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>).mockRejectedValue('
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Pyodide Mock 타입 에러 수정 완료');
