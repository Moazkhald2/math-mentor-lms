// Runs SQL migration files against Supabase
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate.mjs
// Or with connection string: SUPABASE_DATABASE_URL=... node scripts/migrate.mjs

import pg from 'pg'
import fs from 'fs'

const connectionString = process.env.SUPABASE_DATABASE_URL

if (!connectionString) {
  console.error('SUPABASE_DATABASE_URL environment variable is required')
  console.error('Get it from: Supabase Dashboard → Settings → Database → Connection string')
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

// Migration files in order
const migrationFiles = [
  'supabase/schema.sql',
  'supabase/migration-003-answers-upsert.sql',
  'supabase/migration-004-rls-update-policies.sql',
  'supabase/migration-005-bookmarks-feedback.sql',
  'supabase/migration-2026-07-28.sql',
  'supabase/migrate-2026-07-28.sql',
  'supabase/migrate-2026-07-28b-graded-exams.sql',
  'supabase/migration-2026-07-29-all-in-one.sql',
  'supabase/migration-2026-07-29-fix-profiles.sql',
  'supabase/migration-2026-07-29-geometry-exam.sql',
  'supabase/migration-2026-07-29-image-url.sql',
  'supabase/migration-2026-07-29-parent-telegram.sql',
  'supabase/migration-006-question-params.sql',
]

async function runMigrations() {
  await client.connect()
  console.log('Starting migrations...\n')

  for (const file of migrationFiles) {
    try {
      const sql = fs.readFileSync(file, 'utf-8')
      // Split by semicolon to handle multiple statements
      const statements = sql.split(';').filter(s => s.trim()).map(s => s.trim() + ';')

      console.log(`Running ${file}...`)
      for (const statement of statements) {
        try {
          await client.query(statement)
        } catch (err) {
          // Some statements might fail if already applied (CREATE POLICY IF NOT EXISTS etc.)
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.error(`  Statement failed: ${err.message}`)
          }
        }
      }
      console.log(`  ✓ ${file}`)
    } catch (e) {
      console.error(`  Failed to read ${file}:`, e.message)
    }
  }

  console.log('\n✅ Migrations complete!')
  await client.end()
}

runMigrations().catch(async (e) => {
  console.error(e)
  await client.end()
  process.exit(1)
})
