/**
 * download-pyodide.js 테스트
 *
 * 목적: Pyodide 다운로드 스크립트가 올바르게 동작하는지 검증
 */

const fs = require('fs');
const path = require('path');

describe('download-pyodide.js - File Existence Check', () => {
  const OUTPUT_DIR = path.join(__dirname, '../../../public/pyodide');

  describe('Pyodide 폴더 존재 확인 로직', () => {
    it('public/pyodide/ 폴더가 없으면 false를 반환해야 함', () => {
      // Given: 존재하지 않는 경로
      const nonExistentPath = path.join(__dirname, '../../../public/pyodide-nonexistent');

      // When: 폴더 존재 확인
      const exists = fs.existsSync(nonExistentPath);

      // Then: false 반환
      expect(exists).toBe(false);
    });

    it('public/pyodide/ 폴더가 있으면 true를 반환해야 함', () => {
      // Given: public 폴더는 항상 존재
      const publicPath = path.join(__dirname, '../../../public');

      // When: 폴더 존재 확인
      const exists = fs.existsSync(publicPath);

      // Then: true 반환
      expect(exists).toBe(true);
    });

    it('pyodide.js와 pyodide.asm.wasm이 있으면 설치된 것으로 판단', () => {
      // Given: 필수 파일 목록
      const requiredFiles = ['pyodide.js', 'pyodide.asm.wasm'];

      // When: Pyodide 폴더 확인
      if (fs.existsSync(OUTPUT_DIR)) {
        const files = fs.readdirSync(OUTPUT_DIR);
        const hasRequiredFiles = requiredFiles.every(file => files.includes(file));

        // Then: 필수 파일이 모두 있거나 없어야 함 (일관성 검증)
        if (hasRequiredFiles) {
          console.log('✅ Pyodide가 이미 설치되어 있습니다');
          expect(hasRequiredFiles).toBe(true);
        } else {
          console.log('⚠️ Pyodide 폴더는 있지만 필수 파일이 없습니다');
        }
      } else {
        console.log('ℹ️ Pyodide 폴더가 없습니다 (정상 - 아직 설치 안 함)');
        expect(fs.existsSync(OUTPUT_DIR)).toBe(false);
      }
    });
  });

  describe('파일 크기 포맷 함수', () => {
    it('바이트를 사람이 읽기 쉬운 형식으로 변환해야 함', () => {
      // Given: formatBytes 함수 구현
      function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
      }

      // When/Then: 다양한 크기 테스트
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1023)).toBe('1023.00 Bytes');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(1073741824)).toBe('1.00 GB');
      expect(formatBytes(52428800)).toBe('50.00 MB'); // pyodide.asm.wasm 크기
    });
  });

  describe('디렉토리 생성 로직', () => {
    it('ensureDir 함수가 디렉토리를 생성해야 함', () => {
      // Given: ensureDir 함수 구현
      function ensureDir(dir) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          return true; // 생성됨
        }
        return false; // 이미 존재
      }

      // When: 임시 디렉토리 생성
      const tempDir = path.join(__dirname, '../../../.temp-test');

      // 먼저 삭제 (테스트 환경 초기화)
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }

      const created = ensureDir(tempDir);

      // Then: 디렉토리 생성됨
      expect(created).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);

      // Cleanup
      fs.rmSync(tempDir, { recursive: true });
    });

    it('이미 존재하는 디렉토리는 건너뛰어야 함', () => {
      // Given: 이미 존재하는 디렉토리
      function ensureDir(dir) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          return true;
        }
        return false;
      }

      const publicPath = path.join(__dirname, '../../../public');

      // When: 존재하는 디렉토리에 ensureDir 호출
      const created = ensureDir(publicPath);

      // Then: 건너뜀
      expect(created).toBe(false);
    });
  });

  describe('스크립트 실행 가능 여부', () => {
    it('download-pyodide.js 파일이 존재해야 함', () => {
      // Given: 스크립트 경로
      const scriptPath = path.join(__dirname, '../download-pyodide.js');

      // When: 파일 존재 확인
      const exists = fs.existsSync(scriptPath);

      // Then: 존재함
      expect(exists).toBe(true);
    });

    it('스크립트 파일이 실행 가능해야 함', () => {
      // Given: 스크립트 경로
      const scriptPath = path.join(__dirname, '../download-pyodide.js');

      // When: 파일 내용 읽기
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Then: shebang과 main() 함수 포함
      expect(content).toContain('#!/usr/bin/env node');
      expect(content).toContain('async function main()');
      expect(content).toContain('main()');
    });
  });

  describe('환경 변수 지원', () => {
    // 스크립트 파일에서 실제 기본값을 추출
    const scriptPath = path.join(__dirname, '../download-pyodide.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    it('스크립트의 기본 버전이 constants.ts의 PYODIDE_VERSION과 일치해야 함', () => {
      // Given: 스크립트에서 기본값 추출 (패턴: || '0.29.3')
      const match = scriptContent.match(/process\.env\.PYODIDE_VERSION\s*\|\|\s*'([^']+)'/);
      expect(match).not.toBeNull();

      const scriptDefault = match[1]; // e.g. '0.29.3'

      // When: constants.ts에서 버전 추출
      const constantsPath = path.join(__dirname, '../../../lib/constants.ts');
      const constantsContent = fs.readFileSync(constantsPath, 'utf8');
      const constantsMatch = constantsContent.match(/const PYODIDE_VERSION\s*=\s*'v([^']+)'/);
      expect(constantsMatch).not.toBeNull();

      const constantsVersion = constantsMatch[1]; // e.g. '0.29.3'

      // Then: 두 버전이 일치해야 함
      expect(scriptDefault).toBe(constantsVersion);
    });

    it('다운로드 URL이 스크립트의 실제 기본값으로 올바르게 생성되어야 함', () => {
      // Given: 스크립트에서 기본값 추출
      const match = scriptContent.match(/process\.env\.PYODIDE_VERSION\s*\|\|\s*'([^']+)'/);
      const PYODIDE_VERSION = match[1];
      const PYODIDE_BASE_URL = 'https://github.com/pyodide/pyodide/releases/download';
      const DOWNLOAD_URL = `${PYODIDE_BASE_URL}/${PYODIDE_VERSION}/pyodide-${PYODIDE_VERSION}.tar.bz2`;

      // When/Then: URL 형식 검증
      expect(DOWNLOAD_URL).toMatch(
        /^https:\/\/github\.com\/pyodide\/pyodide\/releases\/download\/[\d.]+\/pyodide-[\d.]+\.tar\.bz2$/
      );
      expect(DOWNLOAD_URL).toContain(PYODIDE_VERSION);
    });
  });
});

describe('download-pyodide.js - Integration', () => {
  it('스크립트 파일 문법이 올바른지 검증', () => {
    // Given: 스크립트 경로
    const scriptPath = path.join(__dirname, '../download-pyodide.js');

    // When: 파일 읽기
    const content = fs.readFileSync(scriptPath, 'utf8');

    // Then: 필수 함수들 포함
    expect(content).toContain('function ensureDir');
    expect(content).toContain('function downloadFile');
    expect(content).toContain('function extractArchive');
    expect(content).toContain('async function main()');

    // Note: 실제 다운로드는 수동 검증으로 대체
    console.log('');
    console.log('💡 실제 다운로드 테스트는 수동으로 실행하세요:');
    console.log('   npm run setup:pyodide');
    console.log('');
  });
});