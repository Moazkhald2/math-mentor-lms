// Local Database Backup Script with SHA-256 Integrity Manifest
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/backup.mjs
// Output:
//   backups/<YYYY-MM-DD>/<table>.json
//   backups/<YYYY-MM-DD>/manifest.json (row counts + SHA-256 checksums)

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import path from 'path'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('ERROR: Both SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_KEY are required.')
  console.error('Never commit SUPABASE_SERVICE_KEY to .env or Git — pass it in your shell only.')
  process.exit(1)
}

const TABLES = [
  'profiles',
  'classes',
  'class_members',
  'questions',
  'exams',
  'exam_questions',
  'exam_attempts',
  'exam_submissions',
  'answers',
  'question_bookmarks',
  'question_feedback',
  'activity_logs',
  'audit_logs',
]

const PAGE_SIZE = 1000
const supabase = createClient(url, key, { auth: { persistSession: false } })
const date = new Date().toISOString().slice(0, 10)
const outDir = path.join('backups', date)
mkdirSync(outDir, { recursive: true })

async function dumpTable(table) {
  const allRows = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      if (error.code === '42P01' || String(error.message).includes('does not exist')) {
        return { table, skipped: true, reason: 'table_not_present', rows: 0, sha256: null }
      }
      throw new Error(`${table}: ${error.message}`)
    }
    const batch = data ?? []
    allRows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  const serialized = JSON.stringify(allRows, null, 2)
  const sha256 = createHash('sha256').update(serialized, 'utf8').digest('hex')
  const filePath = path.join(outDir, `${table}.json`)
  writeFileSync(filePath, serialized, 'utf8')
  console.log(`  ✓ ${table}: ${allRows.length} rows (sha256:${sha256.slice(0, 12)}...)`)
  return { table, skipped: false, rows: allRows.length, sha256, file: `${table}.json` }
}

async function main() {
  console.log(`Starting verified backup to ${outDir}...\n`)
  const results = []
  let hadFailure = false

  for (const table of TABLES) {
    try {
      results.push(await dumpTable(table))
    } catch (err) {
      hadFailure = true
      console.error(`  ✗ ${err.message}`)
      results.push({ table, skipped: false, error: err.message, rows: 0, sha256: null })
    }
  }

  const manifest = {
    created_at: new Date().toISOString(),
    source_url: url,
    tables: results,
    ok: !hadFailure,
  }
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`\nManifest written to ${path.join(outDir, 'manifest.json')}`)

  if (hadFailure) {
    console.error('\nBackup completed with errors — inspect logs before relying on this snapshot.')
    process.exit(1)
  }
  console.log('\nBackup completed cleanly. Run `node scripts/restore-drill.mjs ' + outDir + '` to verify integrity.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
