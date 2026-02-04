#!/usr/bin/env node

/**
 * Pyodide 다운로드 및 복사 스크립트 (오프라인 배포용)
 *
 * 사용법:
 *   node scripts/build/download-pyodide.js
 *
 * 또는 package.json에서:
 *   npm run setup:pyodide
 *
 * 환경 변수:
 *   PYODIDE_VERSION - Pyodide 버전 (기본값: v0.29.3)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// 설정
const PYODIDE_VERSION = process.env.PYODIDE_VERSION || '0.29.3';
const PYODIDE_BASE_URL = 'https://github.com/pyodide/pyodide/releases/download';
const OUTPUT_DIR = path.join(__dirname, '../../public/pyodide');
const TEMP_DIR = path.join(__dirname, '../../.temp');
const ARCHIVE_NAME = `pyodide-${PYODIDE_VERSION}.tar.bz2`;
const ARCHIVE_PATH = path.join(TEMP_DIR, ARCHIVE_NAME);
const DOWNLOAD_URL = `${PYODIDE_BASE_URL}/${PYODIDE_VERSION}/pyodide-${PYODIDE_VERSION}.tar.bz2`;

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
 * 디렉토리 정리
 */
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🗑️  디렉토리 삭제: ${dir}`);
  }
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * HTTPS에서 파일 다운로드 (진행률 표시)
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 다운로드 시작: ${url}`);

    https.get(url, (response) => {
      // 리다이렉트 처리
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        console.log(`🔄 리다이렉트: ${redirectUrl}`);
        return downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      let lastProgress = 0;

      const file = fs.createWriteStream(outputPath);
      response.pipe(file);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = Math.floor((downloadedBytes / totalBytes) * 100);

        // 5% 단위로 진행률 표시
        if (progress >= lastProgress + 5) {
          lastProgress = progress;
          console.log(`   진행률: ${progress}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
        }
      });

      file.on('finish', () => {
        file.close();
        console.log(`✅ 다운로드 완료: ${formatBytes(totalBytes)}`);
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
 * tar.bz2 압축 해제
 */
function extractArchive(archivePath, outputDir) {
  console.log(`📦 압축 해제 중: ${archivePath}`);

  try {
    // Windows와 Unix 모두 지원
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Windows: tar 명령어 사용 (Windows 10+ 기본 제공)
      try {
        execSync(`tar -xjf "${archivePath}" -C "${path.dirname(outputDir)}"`, { stdio: 'inherit' });
        console.log(`✅ 압축 해제 완료 (tar)`);
      } catch {
        console.log('⚠️  tar 명령어 실패, 대체 방법 시도 중...');
        console.log('💡 수동 압축 해제 필요:');
        console.log(`   1. ${archivePath} 파일을 7-Zip 또는 WinRAR로 열기`);
        console.log(`   2. public/ 폴더로 압축 해제`);
        console.log(`   3. pyodide-${PYODIDE_VERSION} 폴더를 pyodide로 이름 변경`);
        throw new Error('자동 압축 해제 실패 - 수동 압축 해제 필요');
      }
    } else {
      // Unix: tar 명령어
      execSync(`tar -xjf "${archivePath}" -C "${path.dirname(outputDir)}"`, { stdio: 'inherit' });
      console.log(`✅ 압축 해제 완료`);
    }
  } catch (error) {
    throw new Error(`압축 해제 실패: ${error.message}`);
  }
}

/**
 * 폴더 이름 변경
 */
function renameExtractedFolder() {
  const extractedFolder = path.join(__dirname, '../../public', `pyodide-${PYODIDE_VERSION}`);
  const targetFolder = OUTPUT_DIR;

  if (fs.existsSync(extractedFolder)) {
    if (fs.existsSync(targetFolder)) {
      fs.rmSync(targetFolder, { recursive: true });
    }
    fs.renameSync(extractedFolder, targetFolder);
    console.log(`✅ 폴더 이름 변경: pyodide-${PYODIDE_VERSION} → pyodide`);
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  📦 Pyodide 다운로드 및 설치 (오프라인 배포용)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`📌 버전: ${PYODIDE_VERSION}`);
  console.log(`📌 URL: ${DOWNLOAD_URL}`);
  console.log(`📌 출력 경로: ${OUTPUT_DIR}`);
  console.log('');

  try {
    // 1. 이미 Pyodide가 있는지 확인
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      if (files.includes('pyodide.js') && files.includes('pyodide.asm.wasm')) {
        console.log('✅ Pyodide가 이미 설치되어 있습니다.');
        console.log('');
        console.log('📂 설치된 파일:');

        let totalSize = 0;
        files.forEach((file) => {
          const filePath = path.join(OUTPUT_DIR, file);
          if (fs.statSync(filePath).isFile()) {
            const size = fs.statSync(filePath).size;
            totalSize += size;
            console.log(`   - ${file} (${formatBytes(size)})`);
          }
        });

        console.log('');
        console.log(`📊 총 크기: ${formatBytes(totalSize)}`);
        console.log('');
        console.log('💡 재설치하려면 public/pyodide/ 폴더를 먼저 삭제하세요.');
        console.log('');
        return;
      }
    }

    // 2. 임시 디렉토리 생성
    ensureDir(TEMP_DIR);

    // 3. 아카이브 다운로드
    if (!fs.existsSync(ARCHIVE_PATH)) {
      await downloadFile(DOWNLOAD_URL, ARCHIVE_PATH);
    } else {
      const size = fs.statSync(ARCHIVE_PATH).size;
      console.log(`⏭️  이미 다운로드됨: ${ARCHIVE_NAME} (${formatBytes(size)})`);
    }

    // 4. 압축 해제
    console.log('');
    extractArchive(ARCHIVE_PATH, OUTPUT_DIR);

    // 5. 폴더 이름 변경
    renameExtractedFolder();

    // 6. 임시 파일 정리
    console.log('');
    console.log('🗑️  임시 파일 정리 중...');
    cleanDir(TEMP_DIR);

    // 7. 설치 완료 메시지
    console.log('');
    console.log('✅ Pyodide 설치 완료!');
    console.log('');

    // 8. 설치된 파일 목록
    if (fs.existsSync(OUTPUT_DIR)) {
      console.log('📂 설치된 파일:');
      const files = fs.readdirSync(OUTPUT_DIR);
      let totalSize = 0;

      files.forEach((file) => {
        const filePath = path.join(OUTPUT_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          totalSize += stats.size;
          console.log(`   - ${file} (${formatBytes(stats.size)})`);
        } else if (stats.isDirectory()) {
          const dirSize = getDirSize(filePath);
          totalSize += dirSize;
          console.log(`   - ${file}/ (${formatBytes(dirSize)})`);
        }
      });

      console.log('');
      console.log(`📊 총 크기: ${formatBytes(totalSize)}`);
    }

    console.log('');
    console.log('📋 다음 단계:');
    console.log('   1. 환경 변수 설정:');
    console.log('      echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local');
    console.log('');
    console.log('   2. 빌드:');
    console.log('      npm run build');
    console.log('      (또는 npm run build:offline)');
    console.log('');
    console.log('   3. 빌드 검증:');
    console.log('      npm run verify:offline');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 오류 발생:', error.message);
    console.error('');

    if (error.message.includes('수동 압축 해제')) {
      console.error('💡 문제 해결 방법:');
      console.error('   - 7-Zip 설치: https://www.7-zip.org/');
      console.error('   - 또는 수동으로 압축 해제 후 스크립트 재실행');
      console.error('');
    }

    process.exit(1);
  }
}

/**
 * 디렉토리 크기 계산 (재귀)
 */
function getDirSize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stats.size;
    }
  });

  return size;
}

main();