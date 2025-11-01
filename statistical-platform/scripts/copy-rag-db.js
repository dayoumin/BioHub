/**
 * RAG DB 복사 스크립트 (빌드 전 실행)
 *
 * rag-system/data/rag.db → public/rag-data/rag.db
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '../rag-system/data/rag.db');
const TARGET_DIR = path.join(__dirname, '../public/rag-data');
const TARGET = path.join(TARGET_DIR, 'rag.db');

try {
  // 대상 디렉토리 생성
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log('✓ Created directory:', TARGET_DIR);
  }

  // DB 파일 존재 확인
  if (!fs.existsSync(SOURCE)) {
    console.warn('⚠️ Warning: rag.db not found at', SOURCE);
    console.log('   Build DB first: cd rag-system && python scripts/build_sqlite_db.py');
    process.exit(0); // 경고만 표시하고 계속 진행
  }

  // 파일 복사
  fs.copyFileSync(SOURCE, TARGET);
  const stats = fs.statSync(TARGET);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`✓ Copied rag.db (${sizeMB} MB)`);
  console.log(`  ${SOURCE} → ${TARGET}`);
} catch (error) {
  console.error('✗ Error copying rag.db:', error.message);
  process.exit(1);
}
