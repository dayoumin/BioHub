#!/usr/bin/env node

/**
 * sql.js WASM 파일 복사 스크립트 (npm 패키지에서 복사)
 *
 * 사용법:
 *   node scripts/build/download-sql-wasm.js
 *
 * 또는 package.json에 추가:
 *   "scripts": { "setup:sql-wasm": "node scripts/build/download-sql-wasm.js" }
 */

const fs = require('fs');
const path = require('path');

// absurd-sql은 @jlongster/sql.js 빌드에서만 IndexedDB 백엔드를 지원하므로 해당 패키지를 사용한다.
const SOURCE_DIR = path.join(__dirname, '../../node_modules/@jlongster/sql.js/dist');
const OUTPUT_DIR = path.join(__dirname, '../../public/sql-wasm');

const FILES = [
  'sql-wasm.js',
  'sql-wasm.wasm'
];

/**
 * 디렉토리 생성 (필요시)
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ 디렉토리 생성: ${dir}`);
  }
}

/**
 * 파일 복사
 */
function copyFile(sourcePath, destPath) {
  fs.copyFileSync(sourcePath, destPath);
  const stats = fs.statSync(destPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`✅ 복사 완료: ${path.basename(destPath)} (${sizeKB}KB)`);
}

/**
 * 메인 함수
 */
function main() {
  console.log('📥 sql.js WASM 파일 준비 중...\n');

  try {
    // npm 패키지 확인
    if (!fs.existsSync(SOURCE_DIR)) {
      throw new Error('@jlongster/sql.js npm 패키지를 찾을 수 없습니다. npm install을 먼저 실행하세요.');
    }

    // 디렉토리 생성
    ensureDir(OUTPUT_DIR);

    // 파일 복사
    for (const file of FILES) {
      const sourcePath = path.join(SOURCE_DIR, file);
      const destPath = path.join(OUTPUT_DIR, file);

      if (!fs.existsSync(sourcePath)) {
        throw new Error(`소스 파일을 찾을 수 없습니다: ${sourcePath}`);
      }

      console.log(`📥 복사 중: ${file}`);
      copyFile(sourcePath, destPath);
    }

    console.log('\n✅ sql.js WASM 파일 준비 완료!');
    console.log(`📍 위치: ${OUTPUT_DIR}\n`);

    // 복사된 파일 목록
    console.log('📂 복사된 파일 목록:');
    fs.readdirSync(OUTPUT_DIR).forEach((file) => {
      const filePath = path.join(OUTPUT_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   - ${file} (${sizeKB}KB)`);
    });

    console.log('\n📋 다음 단계:');
    console.log('   1. git add public/sql-wasm/');
    console.log('   2. npm run build');
    console.log('   3. 배포 테스트\n');

  } catch (error) {
    console.error('❌ 복사 실패:', error.message);
    process.exit(1);
  }
}

main();
