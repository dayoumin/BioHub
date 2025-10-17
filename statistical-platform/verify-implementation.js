#!/usr/bin/env node
/**
 * Phase 5-2 구현 검증 스크립트
 *
 * Registry 메타데이터 vs pyodide-statistics.ts vs Python Worker
 * 3-way 매핑을 검증하고 누락된 메서드를 찾습니다.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 1. Registry 메타데이터 추출
// ============================================================================
function extractRegistryMethods() {
  const filePath = path.join(__dirname, 'lib/statistics/registry/method-metadata.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  // METHOD_METADATA 객체에서 키 추출
  const regex = /^\s+(\w+):\s*\{/gm;
  const methods = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]);
  }

  return methods.sort();
}

// ============================================================================
// 2. pyodide-statistics.ts 메서드 추출
// ============================================================================
function extractPyodideMethods() {
  const filePath = path.join(__dirname, 'lib/services/pyodide-statistics.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  // async 메서드 추출 (private 제외)
  const regex = /^\s+(?:public\s+)?async\s+(\w+)\(/gm;
  const methods = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const methodName = match[1];
    // private, initialize, ensureWorker 제외
    if (!methodName.startsWith('_') &&
        methodName !== 'initialize' &&
        !methodName.startsWith('ensureWorker') &&
        !methodName.startsWith('load') &&
        methodName !== 'dispose') {
      methods.push(methodName);
    }
  }

  return methods.sort();
}

// ============================================================================
// 3. Python Worker 함수 추출
// ============================================================================
function extractPythonWorkerFunctions() {
  const workerDir = path.join(__dirname, 'public/workers/python');
  const workerFiles = fs.readdirSync(workerDir).filter(f => f.startsWith('worker') && f.endsWith('.py'));

  const workerFunctions = {};

  workerFiles.forEach(file => {
    const workerNum = file.match(/worker(\d+)/)[1];
    const content = fs.readFileSync(path.join(workerDir, file), 'utf-8');

    // def 함수 추출
    const regex = /^def\s+(\w+)\(/gm;
    const functions = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    workerFunctions[workerNum] = functions.sort();
  });

  return workerFunctions;
}

// ============================================================================
// 4. 매핑 검증
// ============================================================================
function verifyMapping() {
  console.log('='.repeat(80));
  console.log('Phase 5-2 Implementation Verification');
  console.log('='.repeat(80));
  console.log();

  const registryMethods = extractRegistryMethods();
  const pyodideMethods = extractPyodideMethods();
  const pythonWorkers = extractPythonWorkerFunctions();

  // Python Worker 전체 함수 목록
  const allPythonFunctions = [];
  Object.values(pythonWorkers).forEach(funcs => {
    allPythonFunctions.push(...funcs);
  });

  console.log('📊 Summary');
  console.log('-'.repeat(80));
  console.log(`Registry Methods:           ${registryMethods.length}`);
  console.log(`pyodide-statistics Methods: ${pyodideMethods.length}`);
  console.log(`Python Worker Functions:    ${allPythonFunctions.length}`);
  console.log();

  Object.keys(pythonWorkers).forEach(workerNum => {
    console.log(`  Worker ${workerNum}: ${pythonWorkers[workerNum].length} functions`);
  });
  console.log();

  // Registry 메서드별 검증
  console.log('🔍 Registry Method Verification');
  console.log('-'.repeat(80));

  const missingInPyodide = [];
  const missingInPython = [];
  const fullyCovered = [];

  registryMethods.forEach(method => {
    // pyodide-statistics.ts에서 찾기 (다양한 네이밍 패턴 고려)
    const possibleNames = [
      method,
      `${method}Worker`,
      `${method}Test`,
      // camelCase 변환
      method.charAt(0).toLowerCase() + method.slice(1),
    ];

    const foundInPyodide = possibleNames.some(name => pyodideMethods.includes(name));

    // Python Worker에서 찾기 (snake_case 변환)
    const snakeCase = method.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    const possiblePythonNames = [
      snakeCase,
      `${snakeCase}_test`,
      `${snakeCase}_worker`,
    ];

    const foundInPython = possiblePythonNames.some(name => allPythonFunctions.includes(name));

    if (foundInPyodide && foundInPython) {
      fullyCovered.push(method);
      console.log(`✅ ${method}`);
    } else if (!foundInPyodide && !foundInPython) {
      missingInPyodide.push(method);
      missingInPython.push(method);
      console.log(`❌ ${method} - Missing in both pyodide-statistics AND Python Worker`);
    } else if (!foundInPyodide) {
      missingInPyodide.push(method);
      console.log(`⚠️  ${method} - Missing in pyodide-statistics (but exists in Python)`);
    } else if (!foundInPython) {
      missingInPython.push(method);
      console.log(`⚠️  ${method} - Missing in Python Worker (but exists in pyodide-statistics)`);
    }
  });

  console.log();
  console.log('📈 Coverage Statistics');
  console.log('-'.repeat(80));
  console.log(`✅ Fully Covered:              ${fullyCovered.length}/${registryMethods.length} (${Math.round(fullyCovered.length/registryMethods.length*100)}%)`);
  console.log(`⚠️  Missing in pyodide-statistics: ${missingInPyodide.length}`);
  console.log(`⚠️  Missing in Python Worker:      ${missingInPython.length}`);
  console.log();

  // 누락된 메서드 상세
  if (missingInPyodide.length > 0 || missingInPython.length > 0) {
    console.log('❌ Missing Methods (Need Implementation)');
    console.log('-'.repeat(80));

    const completelyMissing = missingInPyodide.filter(m => missingInPython.includes(m));
    const pyodideOnly = missingInPyodide.filter(m => !missingInPython.includes(m));
    const pythonOnly = missingInPython.filter(m => !missingInPyodide.includes(m));

    if (completelyMissing.length > 0) {
      console.log('\n🚨 Completely Missing (need both Python + TypeScript):');
      completelyMissing.forEach(m => console.log(`   - ${m}`));
    }

    if (pyodideOnly.length > 0) {
      console.log('\n⚠️  Need TypeScript wrapper only (Python exists):');
      pyodideOnly.forEach(m => console.log(`   - ${m}`));
    }

    if (pythonOnly.length > 0) {
      console.log('\n⚠️  Need Python implementation only (TypeScript exists):');
      pythonOnly.forEach(m => console.log(`   - ${m}`));
    }
    console.log();
  }

  // Worker별 Python 함수 상세
  console.log('🐍 Python Worker Functions Detail');
  console.log('-'.repeat(80));
  Object.keys(pythonWorkers).sort().forEach(workerNum => {
    console.log(`\nWorker ${workerNum}:`);
    pythonWorkers[workerNum].forEach(func => {
      console.log(`  - ${func}()`);
    });
  });
  console.log();

  // pyodide-statistics.ts 메서드 샘플
  console.log('📦 pyodide-statistics.ts Methods (first 30)');
  console.log('-'.repeat(80));
  pyodideMethods.slice(0, 30).forEach(method => {
    console.log(`  - ${method}()`);
  });
  if (pyodideMethods.length > 30) {
    console.log(`  ... and ${pyodideMethods.length - 30} more`);
  }
  console.log();

  console.log('='.repeat(80));
  console.log('Verification Complete!');
  console.log('='.repeat(80));

  // 결과 반환
  return {
    registry: registryMethods,
    pyodide: pyodideMethods,
    python: pythonWorkers,
    coverage: {
      fullyCovered,
      missingInPyodide,
      missingInPython
    }
  };
}

// ============================================================================
// 실행
// ============================================================================
try {
  const results = verifyMapping();

  // JSON 파일로 저장
  const outputPath = path.join(__dirname, 'verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${outputPath}`);

  // 종료 코드 (누락이 있으면 1)
  const hasGaps = results.coverage.missingInPyodide.length > 0 ||
                  results.coverage.missingInPython.length > 0;
  process.exit(hasGaps ? 1 : 0);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}