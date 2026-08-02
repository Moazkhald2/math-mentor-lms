// Seed only exam attempts + answers, tied to existing student profiles
// Run after initial seed: $env:SUPABASE_SERVICE_KEY="..." ; node scripts/seed-attempts.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vjhzbqtoktktrjevcodq.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_KEY. Aborting.')
  console.log('Usage: set SUPABASE_SERVICE_KEY env var, then run this script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

async function main() {
  console.log('Seeding exam attempts for existing student profiles...\n')

  // Fetch all student profiles with grades
  const { data: students, error: sErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, grade')
    .eq('role', 'student')
    .not('grade', 'is', null)

  if (sErr) { console.error('Error fetching students:', sErr.message); process.exit(1) }
  if (!students.length) { console.log('No student profiles with grades found.'); process.exit(0) }
  console.log(`Found ${students.length} student profiles (grades ${[...new Set(students.map(s => s.grade))].join(', ')})`)

  // Group students by grade
  const byGrade = {}
  for (const s of students) {
    if (!byGrade[s.grade]) byGrade[s.grade] = []
    byGrade[s.grade].push(s)
  }

  // Fetch all published exams grouped by grade
  const { data: exams, error: eErr } = await supabase
    .from('exams')
    .select('id, title, grade')
    .eq('is_published', true)
  if (eErr) { console.error('Error fetching exams:', eErr.message); process.exit(1) }
  const examsByGrade = {}
  for (const e of exams) {
    if (!examsByGrade[e.grade]) examsByGrade[e.grade] = []
    examsByGrade[e.grade].push(e)
  }
  console.log(`Found ${exams.length} published exams across grades.`)
  for (const g of Object.keys(examsByGrade)) console.log(`  Grade ${g}: ${examsByGrade[g].length} exams`)

  const now = new Date()
  let totalAttempts = 0
  let totalAnswers = 0

  for (const s of students) {
    const gradeExams = examsByGrade[s.grade] || []
    if (!gradeExams.length) continue

    // 1-2 attempts per student
    const attemptCount = rng(1, 2)

    for (let a = 1; a <= attemptCount; a++) {
      const exam = gradeExams[(s.id.charCodeAt(0) + a) % gradeExams.length]

      // Fetch questions for this exam
      const { data: examQs, error: eqErr } = await supabase
        .from('exam_questions')
        .select('question_id, points')
        .eq('exam_id', exam.id)
        .order('order_index')

      if (eqErr || !examQs?.length) continue

      const totalPoints = examQs.reduce((sum, eq) => sum + (eq.points || 0), 0)
      const daysAgo = (rng(1, 45))
      const hoursAgo = rng(0, 23)
      const startTs = new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString()
      const endTs = new Date(now.getTime() - daysAgo * 86400000 - (hoursAgo - 1) * 3600000).toISOString()

      // Create attempt
      const { data: attempt, error: aErr } = await supabase
        .from('exam_attempts')
        .insert({
          user_id: s.id,
          exam_id: exam.id,
          started_at: startTs,
          completed_at: endTs,
          status: 'completed',
          score: 0,
          total_points: totalPoints,
          time_spent: rng(600, 3600),
        })
        .select('id')
        .single()

      if (aErr) {
        console.error(`  Failed attempt for ${s.email}:`, aErr.message)
        continue
      }
      totalAttempts++

      // Deterministic score: varies by student + attempt, between 25-98
      const scorePct = 25 + ((a * 37 + s.grade * 7 + attemptCount * 13 + a * 31) % 74)
      const scorePoints = Math.round((scorePct / 100) * totalPoints)
      const targetCorrect = Math.round((scorePoints / totalPoints) * examQs.length)

      const inserts = []
      let correct = 0
      for (const eq of examQs) {
        const isCorrect = correct < targetCorrect
        if (isCorrect) correct++
        const questionPoints = eq.points || 1
        inserts.push({
          attempt_id: attempt.id,
          question_id: eq.question_id,
          answer: isCorrect ? '0' : '1',
          is_correct: isCorrect,
          points_earned: isCorrect ? questionPoints : 0,
          time_spent: rng(15, 180),
        })
      }

      // Batch insert answers
      const { error: ansErr } = await supabase.from('answers').insert(inserts)
      if (ansErr) {
        console.error(`  Failed answers for ${s.email}:`, ansErr.message)
      } else {
        totalAnswers += inserts.length
      }

      // Update attempt score
      const { error: uErr } = await supabase
        .from('exam_attempts')
        .update({ score: scorePct })
        .eq('id', attempt.id)
      if (uErr) console.error(`  Failed updating score for ${s.email}:`, uErr.message)

      // Log activity
      const { error: actErr } = await supabase.from('activity_logs').insert({
        user_id: s.id,
        exam_id: exam.id,
        action: scorePct >= 60 ? 'exam_completed' : 'exam_failed',
        details: { score: scorePct, total: totalPoints, correct, time_spent: rng(600, 3600) },
      })
      if (actErr) console.error(`  Activity log failed:`, actErr.message)
    }

    if (totalAttempts % 20 === 0) {
      console.log(`Progress: ${totalAttempts} attempts, ${totalAnswers} answers so far...`)
    }
  }

  console.log(`\n=== Seed Complete ===`)
  console.log(`Students processed: ${students.length}`)
  console.log(`Attempts created: ${totalAttempts}`)
  console.log(`Answers created: ${totalAnswers}`)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
