#!/usr/bin/env node
/**
 * 모든 검증 스크립트를 순차적으로 실행하는 마스터 스크립트
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(colorize(`\n🚀 Running: ${command} ${args.join(' ')}`, 'cyan'));
    console.log(colorize('─'.repeat(60), 'blue'));

    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(colorize('✅ Success\n', 'green'));
        resolve({ success: true, code });
      } else {
        console.log(colorize(`❌ Failed with code ${code}\n`, 'red'));
        resolve({ success: false, code });
      }
    });

    proc.on('error', (err) => {
      console.error(colorize(`❌ Error: ${err.message}\n`, 'red'));
      reject(err);
    });
  });
}

async function main() {
  console.log(colorize('╔════════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║     45개 통계 페이지 전체 검증 시스템                     ║', 'cyan'));
  console.log(colorize('╚════════════════════════════════════════════════════════════╝', 'cyan'));
  console.log('');

  const startTime = Date.now();
  const results = [];

  // 테스트 결과 디렉토리 생성
  const resultsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // 1. TypeScript 컴파일 체크
  console.log(colorize('╔════════════════════════════════════════════════════════════╗', 'blue'));
  console.log(colorize('║  Phase 1: TypeScript Compilation Check                    ║', 'blue'));
  console.log(colorize('╚════════════════════════════════════════════════════════════╝', 'blue'));

  const tscResult = await runCommand('npx', ['tsc', '--noEmit'], {
    cwd: path.join(__dirname, '..'),
  });
  results.push({ name: 'TypeScript Compilation', ...tscResult });

  // 2. 페이지 구조 검증
  console.log(colorize('╔════════════════════════════════════════════════════════════╗', 'blue'));
  console.log(colorize('║  Phase 2: Page Structure Validation                       ║', 'blue'));
  console.log(colorize('╚════════════════════════════════════════════════════════════╝', 'blue'));

  const structureResult = await runCommand('node', [
    path.join(__dirname, 'validate-page-structure.js'),
  ]);
  results.push({ name: 'Page Structure Validation', ...structureResult });

  // 3. Worker 메서드 매핑 검증
  console.log(colorize('╔════════════════════════════════════════════════════════════╗', 'blue'));
  console.log(colorize('║  Phase 3: Worker Method Mapping Validation                ║', 'blue'));
  console.log(colorize('╚════════════════════════════════════════════════════════════╝', 'blue'));

  const workerResult = await runCommand('node', [
    path.join(__dirname, 'validate-worker-mapping.js'),
  ]);
  results.push({ name: 'Worker Mapping Validation', ...workerResult });

  // 4. 빌드 테스트 (선택적)
  if (process.argv.includes('--with-build')) {
    console.log(colorize('╔════════════════════════════════════════════════════════════╗', 'blue'));
    console.log(colorize('║  Phase 4: Build Test                                       ║', 'blue'));
    console.log(colorize('╚════════════════════════════════════════════════════════════╝', 'blue'));

    const buildResult = await runCommand('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '..'),
    });
    results.push({ name: 'Build Test', ...buildResult });
  }

  // 5. 최종 요약
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(colorize('\n╔════════════════════════════════════════════════════════════╗', 'magenta'));
  console.log(colorize('║                    FINAL SUMMARY                           ║', 'magenta'));
  console.log(colorize('╚════════════════════════════════════════════════════════════╝', 'magenta'));
  console.log('');

  results.forEach(({ name, success, code }) => {
    const status = success ? colorize('✅ PASS', 'green') : colorize('❌ FAIL', 'red');
    console.log(`${status}  ${name} (exit code: ${code})`);
  });

  console.log('');
  console.log(colorize(`⏱️  Total duration: ${duration}s`, 'cyan'));

  const allPassed = results.every(r => r.success);
  const passRate = ((results.filter(r => r.success).length / results.length) * 100).toFixed(1);

  console.log(colorize(`📊 Pass rate: ${passRate}% (${results.filter(r => r.success).length}/${results.length})`, 'cyan'));
  console.log('');

  // 최종 리포트 저장
  const finalReport = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      passRate: `${passRate}%`,
    },
    results,
    // 개별 검증 결과 링크
    reports: {
      structure: 'test-results/structure-validation.json',
      workerMapping: 'test-results/worker-mapping.json',
    },
  };

  const finalReportPath = path.join(resultsDir, 'final-validation-report.json');
  fs.writeFileSync(finalReportPath, JSON.stringify(finalReport, null, 2));

  console.log(colorize(`📄 Final report saved to: ${finalReportPath}`, 'cyan'));
  console.log('');

  if (allPassed) {
    console.log(colorize('🎉 ALL VALIDATIONS PASSED! 🎉', 'green'));
    console.log('');
    console.log(colorize('Next steps:', 'cyan'));
    console.log('  1. Review test reports in test-results/');
    console.log('  2. Start dev server: npm run dev');
    console.log('  3. Run manual UI tests');
    console.log('');
    process.exit(0);
  } else {
    console.log(colorize('❌ SOME VALIDATIONS FAILED', 'red'));
    console.log('');
    console.log(colorize('Please fix the errors and run again.', 'yellow'));
    console.log('');
    process.exit(1);
  }
}

// 에러 핸들링
process.on('unhandledRejection', (err) => {
  console.error(colorize(`\n❌ Unhandled error: ${err.message}`, 'red'));
  console.error(err.stack);
  process.exit(1);
});

// 실행
main().catch((err) => {
  console.error(colorize(`\n❌ Fatal error: ${err.message}`, 'red'));
  console.error(err.stack);
  process.exit(1);
});
