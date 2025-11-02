#!/usr/bin/env node

/**
 * sql.js WASM 파일 다운로드 스크립트 (Node.js 크로스플랫폼)
 *
 * 사용법:
 *   node scripts/download-sql-wasm.js
 *
 * 또는 package.json에 추가:
 *   "scripts": { "setup:sql-wasm": "node scripts/download-sql-wasm.js" }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SQL_JS_CDN = 'https://sql.js.org/dist';
const OUTPUT_DIR = path.join(__dirname, '../public/sql-wasm');

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
 * HTTPS에서 파일 다운로드
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const file = fs.createWriteStream(outputPath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ 다운로드 완료: ${path.basename(outputPath)} (${sizeMB}MB)`);
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * 메인 함수
 */
async function main() {
  console.log('📥 sql.js WASM 파일 준비 중...\n');

  try {
    // 디렉토리 생성
    ensureDir(OUTPUT_DIR);

    // 파일 다운로드
    for (const file of FILES) {
      const filePath = path.join(OUTPUT_DIR, file);
      const url = `${SQL_JS_CDN}/${file}`;

      // 파일이 이미 있으면 확인
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`⏭️  이미 존재: ${file} (${sizeMB}MB)`);
        continue;
      }

      console.log(`📥 다운로드 중: ${file}`);
      await downloadFile(url, filePath);
    }

    console.log('\n✅ sql.js WASM 파일 준비 완료!');
    console.log(`📍 위치: ${OUTPUT_DIR}\n`);

    // 다운로드된 파일 목록
    console.log('📂 다운로드된 파일 목록:');
    fs.readdirSync(OUTPUT_DIR).forEach((file) => {
      const filePath = path.join(OUTPUT_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   - ${file} (${sizeMB}MB)`);
    });

    console.log('\n📋 다음 단계:');
    console.log('   1. git add public/sql-wasm/');
    console.log('   2. npm run build');
    console.log('   3. 배포 테스트\n');

  } catch (error) {
    console.error('❌ 다운로드 실패:', error.message);
    process.exit(1);
  }
}

main();
