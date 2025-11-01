#!/usr/bin/env node

/**
 * Generate Vector Store Metadata
 *
 * Scans public/rag-data/ for vector-*.db files and generates metadata JSON
 * Runs at build time to create static vector-stores.json
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const RAG_DATA_DIR = path.join(__dirname, '../public/rag-data');
const OUTPUT_FILE = path.join(RAG_DATA_DIR, 'vector-stores.json');

/**
 * Parse Vector Store filename
 * Example: 'vector-qwen3-embedding-0.6b.db' → { id: 'qwen3-embedding-0.6b', model: 'qwen3-embedding:0.6b' }
 */
function parseFilename(filename) {
  const match = filename.match(/^vector-(.+)\.db$/);
  if (!match) return null;

  const id = match[1];
  // Convert last '-number' to ':number' for model name
  // 'qwen3-embedding-0.6b' → 'qwen3-embedding:0.6b'
  // 'mxbai-embed-large' → 'mxbai-embed-large' (no conversion)
  const model = id.replace(/-([\d.]+[a-z]?)$/, ':$1');

  return { id, model };
}

/**
 * Get human-readable model name
 */
function getModelDisplayName(modelName) {
  const names = {
    'qwen3-embedding:0.6b': 'Qwen3 Embedding (0.6B)',
    'mxbai-embed-large': 'MixedBread AI Embed Large',
    'nomic-embed-text': 'Nomic Embed Text',
    'snowflake-arctic-embed:110m': 'Snowflake Arctic Embed (110M)',
  };
  return names[modelName] || modelName;
}

/**
 * Get file size in human-readable format
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Query SQLite database for metadata
 * @returns {Object|null} Metadata object or null if database is corrupted
 */
function getDatabaseMetadata(dbPath) {
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true });

    // Get document count
    const docCountResult = db.prepare('SELECT COUNT(*) as count FROM documents').get();
    const docCount = docCountResult?.count || 0;

    // Get embedding dimensions (from first document's embedding)
    let dimensions = 0;
    try {
      const embeddingResult = db.prepare('SELECT embedding FROM embeddings LIMIT 1').get();
      if (embeddingResult?.embedding) {
        if (Buffer.isBuffer(embeddingResult.embedding)) {
          // BLOB format: determine bytes per float from buffer size
          const bufferSize = embeddingResult.embedding.length;

          // Try to detect precision from embedding_model metadata
          const modelResult = db.prepare('SELECT embedding_model FROM embeddings LIMIT 1').get();
          const isQuantized = modelResult?.embedding_model?.toLowerCase().includes('quantized');
          const bytesPerFloat = isQuantized ? 1 : 4; // int8 quantized = 1 byte, float32 = 4 bytes

          dimensions = Math.floor(bufferSize / bytesPerFloat);
        } else if (typeof embeddingResult.embedding === 'string') {
          // JSON format
          const embedding = JSON.parse(embeddingResult.embedding);
          dimensions = Array.isArray(embedding) ? embedding.length : 0;
        }
      }
    } catch (err) {
      console.warn(`  ⚠️  Could not read embedding dimensions: ${err.message}`);
    }

    // Fallback to default if dimensions not found
    if (dimensions === 0) {
      dimensions = 1024; // Default fallback
    }

    db.close();

    return { docCount, dimensions };
  } catch (err) {
    console.error(`  ❌ Error reading database: ${err.message}`);
    console.error(`  ⚠️  This database file appears to be corrupted and will be skipped`);

    // Close database connection if it was opened
    if (db) {
      try {
        db.close();
      } catch (closeErr) {
        // Ignore close errors for corrupted databases
      }
    }

    return null; // Return null to indicate corrupted database
  }
}

/**
 * Scan directory and generate metadata
 */
async function generateMetadata() {
  console.log('🔍 Scanning Vector Store files...\n');

  // Check if directory exists
  if (!fs.existsSync(RAG_DATA_DIR)) {
    console.error(`❌ Directory not found: ${RAG_DATA_DIR}`);
    process.exit(1);
  }

  // Read all files
  const files = fs.readdirSync(RAG_DATA_DIR);
  const dbFiles = files.filter(f => f.startsWith('vector-') && f.endsWith('.db'));

  if (dbFiles.length === 0) {
    console.warn('⚠️  No vector-*.db files found');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));
    return;
  }

  console.log(`Found ${dbFiles.length} Vector Store files:\n`);

  const stores = [];

  for (const filename of dbFiles) {
    const dbPath = path.join(RAG_DATA_DIR, filename);
    const parsed = parseFilename(filename);

    if (!parsed) {
      console.warn(`  ⚠️  Skipping invalid filename: ${filename}`);
      continue;
    }

    console.log(`📦 ${filename}`);

    // Get file stats
    const stats = fs.statSync(dbPath);
    const fileSize = formatFileSize(stats.size);

    // Get database metadata
    const metadata = getDatabaseMetadata(dbPath);

    // Skip corrupted databases
    if (metadata === null) {
      console.warn(`  ⚠️  Skipping ${filename} due to database errors\n`);
      continue;
    }

    const { docCount, dimensions } = metadata;

    const store = {
      id: parsed.id,
      name: getModelDisplayName(parsed.model),
      dbPath: `/rag-data/${filename}`,
      embeddingModel: parsed.model,
      dimensions,
      docCount,
      fileSize,
      createdAt: Math.floor(stats.mtimeMs),
    };

    stores.push(store);

    console.log(`   📊 Documents: ${docCount}`);
    console.log(`   📏 Dimensions: ${dimensions}`);
    console.log(`   💾 Size: ${fileSize}`);
    console.log(`   📅 Modified: ${new Date(stats.mtime).toLocaleString()}\n`);
  }

  // Sort by document count (descending)
  stores.sort((a, b) => b.docCount - a.docCount);

  // Write JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stores, null, 2));

  console.log(`✅ Generated metadata: ${OUTPUT_FILE}`);
  console.log(`   Total stores: ${stores.length}\n`);
}

// Run
generateMetadata().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
