/**
 * Vector Store 검증 스크립트
 *
 * 실행: node scripts/verify-vector-stores.js
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const RAG_DATA_DIR = path.join(__dirname, '../../rag-system/data');

console.log('='.repeat(60));
console.log('Vector Store 검증 시작');
console.log('='.repeat(60));
console.log();

// 1. DB 파일 목록 확인
const dbFiles = fs.readdirSync(RAG_DATA_DIR).filter(f => f.endsWith('.db') && f.startsWith('rag-'));
console.log(`[1/4] DB 파일 발견: ${dbFiles.length}개`);
dbFiles.forEach((file, i) => {
  const stats = fs.statSync(path.join(RAG_DATA_DIR, file));
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`  ${i + 1}. ${file} (${sizeMB} MB)`);
});
console.log();

// 2. parseVectorStoreFilename 함수 테스트
function parseVectorStoreFilename(filename) {
  const match = filename.match(/^rag-(.+)\.db$/);
  if (!match) return null;

  const id = match[1];
  // 파일명의 마지막 '-숫자' → 모델명의 ':숫자'로 변환
  const model = id.replace(/-(\d+(?:\.\d+)?[a-z]?)$/, ':$1');

  return { id, model };
}

console.log('[2/4] parseVectorStoreFilename() 테스트');
dbFiles.forEach(file => {
  const result = parseVectorStoreFilename(file);
  if (result) {
    console.log(`  ${file}`);
    console.log(`    → id: ${result.id}`);
    console.log(`    → model: ${result.model}`);
  }
});
console.log();

// 3. DB 내용 검증
console.log('[3/4] DB 내용 검증');
dbFiles.forEach(file => {
  const dbPath = path.join(RAG_DATA_DIR, file);
  const db = new Database(dbPath, { readonly: true });

  try {
    // 문서 수
    const { count: docCount } = db.prepare('SELECT COUNT(*) as count FROM documents').get();

    // 임베딩 있는 문서 수
    const { count: embeddedCount } = db.prepare(
      'SELECT COUNT(*) as count FROM documents WHERE embedding IS NOT NULL'
    ).get();

    // 임베딩 모델
    const modelRow = db.prepare(
      'SELECT DISTINCT embedding_model FROM documents WHERE embedding IS NOT NULL LIMIT 1'
    ).get();
    const embeddingModel = modelRow ? modelRow.embedding_model : null;

    // 임베딩 차원 (첫 번째 문서)
    let dimensions = null;
    if (embeddedCount > 0) {
      const { embedding } = db.prepare(
        'SELECT embedding FROM documents WHERE embedding IS NOT NULL LIMIT 1'
      ).get();
      if (embedding) {
        dimensions = embedding.length / 4; // float32 = 4 bytes
      }
    }

    console.log(`  ${file}:`);
    console.log(`    문서 수: ${docCount}개`);
    console.log(`    임베딩 있는 문서: ${embeddedCount}개`);
    console.log(`    임베딩 모델: ${embeddingModel || 'N/A'}`);
    console.log(`    임베딩 차원: ${dimensions || 'N/A'}`);

    // 경고 체크
    if (docCount !== 111) {
      console.log(`    ⚠️ 경고: 문서 수가 111개가 아닙니다!`);
    }
    if (embeddedCount !== docCount) {
      console.log(`    ⚠️ 경고: 일부 문서에 임베딩이 없습니다!`);
    }
    if (dimensions && dimensions !== 1024) {
      console.log(`    ⚠️ 경고: 임베딩 차원이 1024가 아닙니다!`);
    }

  } catch (err) {
    console.log(`  ${file}: ❌ 에러 - ${err.message}`);
  } finally {
    db.close();
  }
});
console.log();

// 4. Vector Space 일치성 검증 (ollama-provider.ts 로직 시뮬레이션)
console.log('[4/4] Vector Space 일치성 검증');
dbFiles.forEach(file => {
  const parsed = parseVectorStoreFilename(file);
  if (!parsed) return;

  const dbPath = path.join(RAG_DATA_DIR, file);
  const db = new Database(dbPath, { readonly: true });

  try {
    const modelRow = db.prepare(
      'SELECT DISTINCT embedding_model FROM documents WHERE embedding IS NOT NULL LIMIT 1'
    ).get();
    const dbEmbeddingModel = modelRow ? modelRow.embedding_model : null;

    if (dbEmbeddingModel) {
      const isMatch = parsed.model === dbEmbeddingModel;
      const status = isMatch ? '✓' : '✗';
      console.log(`  ${file}:`);
      console.log(`    파일명에서 추출: ${parsed.model}`);
      console.log(`    DB 저장 모델: ${dbEmbeddingModel}`);
      console.log(`    일치 여부: ${status} ${isMatch ? 'OK' : 'MISMATCH!'}`);

      if (!isMatch) {
        console.log(`    🔧 조치: parseVectorStoreFilename() 정규식 수정 필요`);
      }
    }
  } finally {
    db.close();
  }
});

console.log();
console.log('='.repeat(60));
console.log('✅ 검증 완료');
console.log('='.repeat(60));