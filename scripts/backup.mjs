// Daily backup - dumps key tables to backups/ folder
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.log('Missing SUPABASE_URL or SERVICE_KEY - skip backup')
  process.exit(0)
}

const supabase = createClient(url, key)
mkdirSync('backups', { recursive: true })
const date = new Date().toISOString().slice(0, 10)

async function dump(table) {
  try {
    const { data, error } = await supabase.from(table).select('*').limit(10000)
    if (error) throw error
    writeFileSync(`backups/backup-${table}-${date}.json`, JSON.stringify(data, null, 2))
    console.log(`Backed up ${table}: ${data.length} rows`)
  } catch (e) {
    console.error(`Backup ${table} failed:`, e.message)
  }
}

for (const t of ['profiles', 'questions', 'exams', 'exam_questions', 'exam_attempts', 'answers', 'activity_logs']) {
  await dump(t)
}
console.log('Daily backup done')
