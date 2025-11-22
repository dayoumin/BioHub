#!/usr/bin/env node

/**
 * Next.js 캐시 클린 스크립트
 *
 * 삭제 대상:
 * - .next 폴더 (빌드 캐시)
 * - node_modules/.cache (패키지 캐시)
 * - TypeScript 빌드 정보
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const CACHE_DIRS = [
  '.next',
  'node_modules/.cache',
  '.turbo',
  'out',
];

const CACHE_FILES = [
  'tsconfig.tsbuildinfo',
  '.eslintcache',
];

/**
 * 디렉토리 삭제 (재귀)
 */
function removeDir(dir) {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`✅ 삭제됨: ${dir}`);
    return true;
  }
  return false;
}

/**
 * 파일 삭제
 */
function removeFile(file) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`✅ 삭제됨: ${file}`);
    return true;
  }
  return false;
}

console.log('🧹 Next.js 캐시 클린 시작...\n');

let cleaned = 0;

// 디렉토리 삭제
CACHE_DIRS.forEach(dir => {
  if (removeDir(dir)) cleaned++;
});

// 파일 삭제
CACHE_FILES.forEach(file => {
  if (removeFile(file)) cleaned++;
});

console.log(`\n✨ 완료! ${cleaned}개 항목 삭제됨\n`);