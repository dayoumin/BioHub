/**
 * 오프라인 빌드 검증 스크립트
 *
 * 오프라인 배포를 위한 빌드가 올바르게 생성되었는지 검증합니다.
 *
 * 실행:
 * ```bash
 * node scripts/verify-offline-build.js
 * ```
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'out');
const REQUIRED_DIRS = [
  'pyodide',           // Pyodide 런타임 (오프라인 모드 필수)
  'sql-wasm',          // SQL.js WASM 파일
  '_next/static',      // Next.js 정적 파일
];

const REQUIRED_FILES = [
  'index.html',                          // 메인 HTML
  'pyodide/pyodide.js',                  // Pyodide 진입점
  'pyodide/pyodide.asm.wasm',            // Pyodide 런타임
  'sql-wasm/sql-wasm.js',                // SQL.js
  'sql-wasm/sql-wasm.wasm',              // SQL.js WASM
];

const OPTIONAL_FILES = [
  'pyodide/packages/numpy.js',           // NumPy (통계 필수)
  'pyodide/packages/scipy.js',           // SciPy (통계 필수)
  'pyodide/packages/pandas.js',          // Pandas (데이터 처리)
  'pyodide/packages/statsmodels.js',     // statsmodels (고급 통계)
];

console.log('🔍 오프라인 빌드 검증 시작...\n');

// 1. out 디렉토리 존재 확인
if (!fs.existsSync(OUT_DIR)) {
  console.error('❌ out/ 디렉토리가 없습니다. npm run build를 먼저 실행하세요.');
  process.exit(1);
}

console.log('✅ out/ 디렉토리 존재 확인\n');

// 2. 필수 디렉토리 확인
console.log('📁 필수 디렉토리 확인:');
let dirCheckPassed = true;

REQUIRED_DIRS.forEach(dir => {
  const fullPath = path.join(OUT_DIR, dir);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    // 파일 크기 계산
    const stats = getDirectorySize(fullPath);
    console.log(`  ✅ ${dir} (${formatBytes(stats)})`);
  } else {
    console.log(`  ❌ ${dir} - 없음`);
    dirCheckPassed = false;
  }
});

if (!dirCheckPassed) {
  console.error('\n❌ 필수 디렉토리가 없습니다.');
  console.error('   NEXT_PUBLIC_PYODIDE_USE_LOCAL=true 환경 변수를 설정했는지 확인하세요.');
  process.exit(1);
}

console.log('');

// 3. 필수 파일 확인
console.log('📄 필수 파일 확인:');
let fileCheckPassed = true;

REQUIRED_FILES.forEach(file => {
  const fullPath = path.join(OUT_DIR, file);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`  ✅ ${file} (${formatBytes(stats.size)})`);
  } else {
    console.log(`  ❌ ${file} - 없음`);
    fileCheckPassed = false;
  }
});

if (!fileCheckPassed) {
  console.error('\n❌ 필수 파일이 없습니다.');
  process.exit(1);
}

console.log('');

// 4. 선택 파일 확인 (경고만)
console.log('📦 통계 패키지 확인 (선택):');
let optionalWarnings = [];

OPTIONAL_FILES.forEach(file => {
  const fullPath = path.join(OUT_DIR, file);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`  ✅ ${file} (${formatBytes(stats.size)})`);
  } else {
    console.log(`  ⚠️ ${file} - 없음 (일부 통계 기능 제한 가능)`);
    optionalWarnings.push(file);
  }
});

console.log('');

// 5. 환경 변수 확인
console.log('⚙️  환경 변수 확인:');
const envLocalPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const hasLocalPyodide = envContent.includes('NEXT_PUBLIC_PYODIDE_USE_LOCAL=true');

  if (hasLocalPyodide) {
    console.log('  ✅ NEXT_PUBLIC_PYODIDE_USE_LOCAL=true');
  } else {
    console.log('  ⚠️ NEXT_PUBLIC_PYODIDE_USE_LOCAL=true가 설정되지 않음');
    console.log('     오프라인 배포를 위해서는 이 설정이 필요합니다.');
  }
} else {
  console.log('  ⚠️ .env.local 파일 없음');
  console.log('     오프라인 배포를 위해 생성 필요:');
  console.log('     echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local');
}

console.log('');

// 6. 빌드 크기 계산
console.log('📊 빌드 크기:');
const totalSize = getDirectorySize(OUT_DIR);
console.log(`  총 크기: ${formatBytes(totalSize)}`);

if (totalSize < 50 * 1024 * 1024) {
  console.log('  ⚠️ 빌드 크기가 50MB 미만입니다.');
  console.log('     Pyodide가 로컬에 포함되지 않았을 수 있습니다.');
} else if (totalSize > 200 * 1024 * 1024) {
  console.log('  ✅ Pyodide 로컬 번들링 확인 (200MB 이상)');
} else {
  console.log('  ✅ 적정 크기');
}

console.log('');

// 7. 최종 결과
console.log('═══════════════════════════════════════');
if (fileCheckPassed && dirCheckPassed && optionalWarnings.length === 0) {
  console.log('✅ 오프라인 빌드 검증 완료!');
  console.log('');
  console.log('다음 단계:');
  console.log('  1. out/ 폴더를 ZIP으로 압축');
  console.log('  2. Ollama + 모델 파일 준비');
  console.log('  3. USB로 전달');
} else {
  console.log('⚠️ 오프라인 빌드 검증 완료 (경고 있음)');

  if (optionalWarnings.length > 0) {
    console.log('');
    console.log('누락된 패키지:');
    optionalWarnings.forEach(file => {
      console.log(`  - ${file}`);
    });
    console.log('');
    console.log('일부 통계 기능이 제한될 수 있습니다.');
    console.log('전체 패키지를 포함하려면 pyodide/packages/ 전체를 복사하세요.');
  }
}
console.log('═══════════════════════════════════════');

// Helper 함수
function getDirectorySize(dirPath) {
  let totalSize = 0;

  function traverse(currentPath) {
    const stats = fs.statSync(currentPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        traverse(path.join(currentPath, file));
      });
    }
  }

  traverse(dirPath);
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}