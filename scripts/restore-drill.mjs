// Backup Integrity & Restore Readiness Verification Drill
// Usage:
//   node scripts/restore-drill.mjs backups/2026-11-20
// Verifies manifest structure, SHA-256 checksums, valid JSON arrays, and required core tables.

import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import path from 'path'

const CORE_TABLES = ['profiles', 'questions', 'exams', 'exam_questions', 'exam_attempts', 'answers']

function verifyBackupDir(dirPath) {
  const manifestPath = path.join(dirPath, 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing manifest.json in ${dirPath}`)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!manifest || !Array.isArray(manifest.tables)) {
    throw new Error('Invalid manifest format: missing tables array')
  }

  let totalRows = 0
  const presentTables = new Set()

  for (const entry of manifest.tables) {
    if (entry.skipped) {
      console.log(`  - ${entry.table}: skipped (${entry.reason})`)
      continue
    }
    if (entry.error) {
      throw new Error(`Backup recorded an error for table ${entry.table}: ${entry.error}`)
    }
    const filePath = path.join(dirPath, entry.file || `${entry.table}.json`)
    if (!existsSync(filePath)) {
      throw new Error(`Missing table dump file: ${filePath}`)
    }
    const raw = readFileSync(filePath, 'utf8')
    const actualHash = createHash('sha256').update(raw, 'utf8').digest('hex')
    if (actualHash !== entry.sha256) {
      throw new Error(`Checksum mismatch for ${entry.table}: expected ${entry.sha256}, got ${actualHash}`)
    }
    const rows = JSON.parse(raw)
    if (!Array.isArray(rows) || rows.length !== entry.rows) {
      throw new Error(`Row count mismatch for ${entry.table}: manifest=${entry.rows}, actual=${Array.isArray(rows) ? rows.length : 'non-array'}`)
    }
    presentTables.add(entry.table)
    totalRows += rows.length
    console.log(`  ✓ ${entry.table}: ${rows.length} rows verified (SHA-256 OK)`)
  }

  for (const core of CORE_TABLES) {
    if (!presentTables.has(core)) {
      throw new Error(`Core table missing from backup snapshot: ${core}`)
    }
  }

  return { totalRows, verifiedTables: presentTables.size, createdAt: manifest.created_at }
}

const targetDir = process.argv[2]
if (!targetDir) {
  console.error('Usage: node scripts/restore-drill.mjs <backup-directory>')
  process.exit(1)
}

try {
  console.log(`Running restore-readiness verification on ${targetDir}...\n`)
  const summary = verifyBackupDir(targetDir)
  console.log(`\nPASS: ${summary.verifiedTables} tables (${summary.totalRows} total rows, snapshot ${summary.createdAt}) verified intact.`)
} catch (err) {
  console.error(`\nFAIL: ${err.message}`)
  process.exit(1)
}
