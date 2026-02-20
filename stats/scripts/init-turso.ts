/**
 * Turso Database Initialization Script
 *
 * Usage:
 *   npx tsx scripts/init-turso.ts
 *
 * Environment Variables:
 *   NEXT_PUBLIC_TURSO_URL - Turso database URL
 *   TURSO_AUTH_TOKEN - Authentication token
 *
 * This script creates the necessary tables in Turso
 * for the statistical analysis history storage.
 */

import { createClient } from '@libsql/client'

async function initTursoDatabase() {
  const url = process.env.NEXT_PUBLIC_TURSO_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    console.error('Error: NEXT_PUBLIC_TURSO_URL environment variable is not set')
    console.log('\nUsage:')
    console.log('  export NEXT_PUBLIC_TURSO_URL=libsql://your-db.turso.io')
    console.log('  export TURSO_AUTH_TOKEN=your-token')
    console.log('  npx tsx scripts/init-turso.ts')
    process.exit(1)
  }

  console.log('Connecting to Turso database...')
  console.log(`URL: ${url}`)

  const client = createClient({
    url,
    authToken
  })

  try {
    console.log('\nCreating tables...')

    // History table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        name TEXT NOT NULL,
        purpose TEXT,
        analysisPurpose TEXT,
        method TEXT,
        variableMapping TEXT,
        analysisOptions TEXT,
        dataFileName TEXT,
        dataRowCount INTEGER,
        columnInfo TEXT,
        results TEXT,
        deviceId TEXT,
        syncedAt INTEGER,
        updatedAt INTEGER
      )`
    })
    console.log('  - history table created')

    // Indexes
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC)`
    })
    console.log('  - idx_history_timestamp index created')

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_history_device ON history(deviceId)`
    })
    console.log('  - idx_history_device index created')

    // Favorites table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY DEFAULT 'default',
        methodIds TEXT
      )`
    })
    console.log('  - favorites table created')

    // Verify tables
    console.log('\nVerifying tables...')
    const tables = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    })

    console.log('Tables in database:')
    for (const row of tables.rows) {
      console.log(`  - ${row.name}`)
    }

    // Count existing records
    const historyCount = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM history'
    })
    const countRow = historyCount.rows[0] as unknown as { count: number }
    const count = countRow?.count || 0
    console.log(`\nExisting history records: ${count}`)

    console.log('\n✅ Turso database initialized successfully!')
  } catch (error) {
    console.error('\n❌ Failed to initialize Turso database:')
    console.error(error)
    process.exit(1)
  }
}

initTursoDatabase()
