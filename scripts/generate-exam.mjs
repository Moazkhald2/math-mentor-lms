// Generates an exam from the question bank: N questions per skill,
// each skill partitioned into variant slots so the site swaps variants
// per attempt (same skill, different question).
//
// Usage:
//   $env:SUPABASE_SERVICE_KEY="..." ; node scripts/generate-exam.mjs `
//     --title "Factorization Midterm" --type exam --time-limit 45 --passing 50 `
//     --skills "common-factor:2,difference-of-squares:2,trinomial-x2bxc:3,perfect-square-trinomial:2,sum-difference-of-cubes:1,grouping:2"
//
// Optional: --subject Algebra --grade 7 --dry-run

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const args = process.argv.slice(2)
function flag(name, def = null) {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? def : args[i + 1]
}
function has(name) {
  return args.includes(`--${name}`)
}

const title = flag('title')
const type = flag('type', 'exam')
const timeLimit = parseInt(flag('time-limit', '30'), 10)
const passing = parseInt(flag('passing', '50'), 10)
const skillsSpec = flag('skills', '')
const subject = flag('subject', null)
const grade = flag('grade', null)
const dryRun = has('dry-run')
const shuffleQuestions = !has('no-shuffle')

if (!title || !skillsSpec) {
  console.error('--title and --skills required')
  console.error('example: node scripts/generate-exam.mjs --title "Factorization Quiz" --skills "common-factor:2,difference-of-squares:1"')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vjhzbqtoktktrjevcodq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('set SUPABASE_SERVICE_KEY first')
  process.exit(1)
}

const skills = skillsSpec.split(',').map(s => {
  const [skill, count] = s.split(':').map(x => x.trim())
  return { skill, count: parseInt(count || '1', 10) }
})

async function fetchQuestions(skill) {
  let q = supabase.from('questions').select('id, variant_group_id').eq('variant_group_id', skill)
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function main() {
  const examQuestions = []
  let totalPoints = 0

  for (const { skill, count } of skills) {
    const pool = shuffle(await fetchQuestions(skill))
    if (pool.length === 0) {
      console.warn(`SKIP ${skill}: no questions in bank`)
      continue
    }
    // Partition into `count` slots so the site swaps within-slot variants.
    const slots = Array.from({ length: count }, () => [])
    pool.forEach((q, i) => slots[i % count].push(q))
    const baseQuestions = slots.map(slot => shuffle(slot)[0])

    baseQuestions.forEach((base, i) => {
      examQuestions.push({ question_id: base.id, points: 1 })
      totalPoints += 1
    })

    // Persist per-slot group ids so exam-time variant resolution pools
    // only the equivalent questions of each slot.
    if (!dryRun) {
      for (let i = 0; i < slots.length; i++) {
        const slotGroup = `${skill}@${i}`
        for (const q of slots[i]) {
          const { error } = await supabase
            .from('questions')
            .update({ variant_group_id: slotGroup })
            .eq('id', q.id)
          if (error) throw new Error(`questions update: ${error.message}`)
        }
      }
    }
  }

  if (examQuestions.length === 0) {
    console.error('no questions selected — check skill names')
    process.exit(1)
  }

  console.log(`selected ${examQuestions.length} questions (${totalPoints} pts) for "${title}"`)

  if (dryRun) {
    console.log('DRY RUN — exam not created. Example:')
    console.log(JSON.stringify({ title, type, time_limit_minutes: timeLimit, passing_score: passing, shuffle_questions: shuffleQuestions, grade, skills }, null, 2))
    return
  }

  // Update variant_group_id to per-slot ids so the site swaps per attempt.
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      title,
      type,
      time_limit_minutes: timeLimit,
      passing_score: passing,
      shuffle_questions: shuffleQuestions,
      grade: grade ? parseInt(grade, 10) : null,
      description: `Generated from bank: ${skills.map(s => `${s.skill} x${s.count}`).join(', ')}`,
      max_attempts: 3,
      cooldown_hours: 24,
      is_published: false,
    })
    .select()
    .single()
  if (examError) throw new Error(`exam insert: ${examError.message}`)

  let orderIndex = 0
  for (const { question_id, points } of examQuestions) {
    const { error } = await supabase.from('exam_questions').insert({
      exam_id: exam.id,
      question_id,
      order_index: orderIndex++,
      points,
    })
    if (error) throw new Error(`exam_questions insert: ${error.message}`)
  }

  console.log(`EXAM CREATED: ${exam.id} (${exam.title}) — ${orderIndex} questions, not published`)
  console.log('publish via admin UI or: supabase update exams set is_published=true where id=...')
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})