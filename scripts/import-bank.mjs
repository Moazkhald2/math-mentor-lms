// Imports vault-exported question packs + optional exam manifest into Supabase.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/import-bank.mjs
// Reads: content/bank-import/*.json (question arrays) + content/bank-import/exam-manifest.json (optional)
// Dedupes questions by (topic, question_text). Never prints secrets.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const URL_ = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
if (!URL_ || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}
const supabase = createClient(URL_, KEY)

const dir = path.resolve('content/bank-import')
const manifestPath = path.join(dir, 'exam-manifest.json')

async function importQuestions() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'exam-manifest.json')
  let inserted = 0
  let skipped = 0
  const importedIds = []

  for (const file of files) {
    const pack = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
    for (const q of Array.isArray(pack) ? pack : [pack]) {
      const { data: existing } = await supabase
        .from('questions')
        .select('id')
        .eq('topic', q.topic)
        .eq('question_text', q.question_text)
        .limit(1)
      if (existing && existing.length > 0) {
        skipped++
        importedIds.push(existing[0].id)
        continue
      }
      const row = {
        subject: q.subject,
        topic: q.topic,
        type: q.type,
        difficulty: q.difficulty,
        grade: q.grade,
        question_text: q.question_text,
        options: q.options ?? [],
        correct_answer: String(q.correct_answer),
        explanation: q.explanation ?? '',
        common_mistakes: q.common_mistakes ?? [],
        params: q.params ?? null,
      }
      const { data, error } = await supabase.from('questions').insert(row).select('id').single()
      if (error) {
        console.error(`  insert failed for [${q.topic}] ${q.question_text.slice(0, 40)}... : ${error.message}`)
        continue
      }
      inserted++
      importedIds.push(data.id)
    }
  }
  console.log(`Questions: ${inserted} inserted, ${skipped} skipped (already present)`)
  return importedIds
}

async function ensureExam(importedIds) {
  if (!fs.existsSync(manifestPath)) return
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  const { data: existingExam } = await supabase
    .from('exams')
    .select('id')
    .eq('title', m.title)
    .limit(1)
  if (existingExam && existingExam.length > 0) {
    console.log(`Exam "${m.title}" already exists (${existingExam[0].id}) — skipping creation`)
    return
  }

  const { data: teacher } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['teacher', 'admin'])
    .limit(1)

  const examRow = {
    title: m.title,
    description: m.description ?? '',
    grade: m.grade ?? null,
    type: m.type ?? 'exam',
    time_limit_minutes: m.time_limit_minutes ?? 30,
    passing_score: m.passing_score ?? 60,
    shuffle_questions: m.shuffle_questions ?? true,
    max_attempts: m.max_attempts ?? 3,
    cooldown_hours: m.cooldown_hours ?? 0,
    is_published: m.is_published ?? false,
    created_by: teacher?.[0]?.id ?? null,
  }
  const { data: examIns, error: examErr } = await supabase
    .from('exams')
    .insert(examRow)
    .select('id')
    .single()
  if (examErr) {
    console.error(`Exam creation failed: ${examErr.message}`)
    return
  }
  console.log(`Exam created: ${m.title} (${examIns.id})`)

  // Link questions matching the manifest topics, in bank order
  let order = 1
  for (const qid of importedIds) {
    const q = await supabase.from('questions').select('topic').eq('id', qid).single()
    if (m.topics && !m.topics.includes(q.data?.topic)) continue
    const { error } = await supabase
      .from('exam_questions')
      .insert({ exam_id: examIns.id, question_id: qid, order_index: order++, points: 1 })
    if (error && !error.message.includes('duplicate')) {
      console.error(`  link failed q=${qid}: ${error.message}`)
    }
  }
  console.log(`Linked ${order - 1} questions into the exam`)
}

const ids = await importQuestions()
await ensureExam(ids)
console.log('Import complete.')
