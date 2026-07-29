// Generates comprehensive seed data: 100 students, 50 exams, 1000+ questions, attempts
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-data.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vjhzbqtoktktrjevcodq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

const GRADES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const STUDENTS_PER_GRADE = 10
const EXAMS_PER_GRADE = 5

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

const subjectConfig = {
  3: { subjects: ['Arithmetic', 'Basic Geometry'], topics: ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Shapes', 'Fractions'] },
  4: { subjects: ['Arithmetic', 'Fractions', 'Geometry'], topics: ['Multiplication', 'Division', 'Fractions', 'Decimals', 'Perimeter', 'Area'] },
  5: { subjects: ['Pre-Algebra', 'Geometry', 'Fractions'], topics: ['Variables', 'Order of Operations', 'Decimals', 'Volume', 'Coordinate Plane'] },
  6: { subjects: ['Pre-Algebra', 'Ratios', 'Geometry'], topics: ['Ratios', 'Percentages', 'Equations', 'Integers', 'Surface Area'] },
  7: { subjects: ['Algebra', 'Geometry', 'Statistics'], topics: ['Linear Equations', 'Inequalities', 'Angles', 'Triangles', 'Probability'] },
  8: { subjects: ['Algebra', 'Geometry', 'Functions'], topics: ['Systems', 'Pythagorean', 'Slope', 'Transformations', 'Scatter Plots'] },
  9: { subjects: ['Algebra I', 'Geometry', 'Trigonometry'], topics: ['Quadratics', 'Proofs', 'Circles', 'Trig Ratios', 'Polynomials'] },
  10: { subjects: ['Algebra II', 'Trigonometry', 'Analytic Geometry'], topics: ['Exponentials', 'Logarithms', 'Unit Circle', 'Conics', 'Sequences'] },
  11: { subjects: ['Pre-Calculus', 'Trigonometry', 'Statistics'], topics: ['Functions', 'Identities', 'Polar', 'Vectors', 'Probability Distributions'] },
  12: { subjects: ['Calculus', 'Advanced Algebra', 'Statistics'], topics: ['Limits', 'Derivatives', 'Integrals', 'Matrices', 'Hypothesis Testing'] },
}

function genQuestionText(subject, topic, grade) {
  const a = rng(2, 12), b = rng(1, 20), c = rng(1, 10)
  const templates = {
    'Addition': [`What is $${a} + ${b}$?`, `Add: $${a} + ${b} + ${c}$`, `Find the sum of $${a}$ and $${b}$`],
    'Subtraction': [`What is $${a + b} - ${b}$?`, `Subtract: $${a + b} - ${a}$`, `Find the difference: $${a * 2} - ${a}$`],
    'Multiplication': [`What is $${a} \\times ${b}$?`, `Multiply: $${a} \\times ${b}$`, `Find the product of $${a}$ and $${b}$`],
    'Division': [`What is $${a * b} \\div ${b}$?`, `Divide: $${a * b} \\div ${a}$`],
    'Fractions': [`What is $\\frac{${a}}{${b}} + \\frac{${c}}{${b}}$?`, `Simplify $\\frac{${a * 2}}{${b * 2}}$`, `Convert $\\frac{${a}}{${b}}$ to a decimal`],
    'Decimals': [`What is $${a}.${b} + ${c}.${a}$?`, `Multiply: $${a}.${b} \\times ${c}$`],
    'Geometry': [`Find the area of a rectangle with width $${a}$ and height $${b}$`, `What is the perimeter of a square with side $${a}$?`],
    'Linear Equations': [`Solve for $x$: $${a}x + ${b} = ${a * c + b}$`, `Solve: $${a}x - ${b} = ${a * c - b}$`],
    'Pythagorean': [`A right triangle has legs $${a}$ and $${b}$. Find the hypotenuse.`, `Find the missing side: leg = $${a}$, hypotenuse = $${Math.round(Math.sqrt(a*a + b*b))}$`],
    'Quadratics': [`Solve: $x^2 - ${a * 2}x + ${a * a} = 0$`, `Factor: $x^2 + ${a + b}x + ${a * b}$`],
    'Derivatives': [`Find $\\frac{d}{dx}(${a}x^3 + ${b}x)$`, `If $f(x) = ${a}x^2 + ${b}x + ${c}$, find $f'(x)$`],
    'Integrals': [`Evaluate $\\int_0^${a} ${b}x \\, dx$`, `Find $\\int (${a}x^${b % 3 + 1} + ${c})\\, dx$`],
    'Limits': [`Find $\\lim_{x \\to ${a}} \\frac{x^2 - ${a*a}}{x - ${a}}$`],
  }
  const pool = templates[topic] || [`Solve the ${topic} problem: $${a} \\oplus ${b}$`]
  return pick(pool)
}

function genOptions(subject, topic, grade, qText) {
  const correct = rng(10, 99)
  const opts = new Set([correct])
  while (opts.size < 4) opts.add(correct + rng(-5, 5) * rng(1, 3))
  const arr = [...opts].sort(() => Math.random() - 0.5)
  return { options: arr.map(o => `$${o}$`), correctAnswer: String(arr.indexOf(correct)) }
}

function genAnswer(q) {
  if (q.type === 'multiple_choice') {
    const idx = rng(0, 3)
    return { answer: String(idx), is_correct: idx === Number(q.correct_answer), points_earned: idx === Number(q.correct_answer) ? 1 : 0 }
  }
  if (q.type === 'short_answer') {
    const val = String(rng(1, 50))
    return { answer: val, is_correct: Math.random() > 0.4, points_earned: Math.random() > 0.4 ? 2 : 0 }
  }
  const val = Math.random() > 0.5 ? 'true' : 'false'
  return { answer: val, is_correct: val === q.correct_answer, points_earned: val === q.correct_answer ? 1 : 0 }
}

async function main() {
  console.log('Starting seed...\n')
  
  // Step 1: Create student accounts
  const studentIds = []
  for (const grade of GRADES) {
    for (let n = 1; n <= STUDENTS_PER_GRADE; n++) {
      const email = `student${grade}_${n}@test.com`
      const { data: user, error } = await supabase.auth.admin.createUser({
        email,
        password: 'test123',
        email_confirm: true,
        user_metadata: { full_name: `Student ${grade}.${n}`, grade, role: 'student', parent_phone: `+2010${String(rng(10000000, 99999999))}` }
      })
      if (error) { console.error(`  Failed to create ${email}:`, error.message); continue }
      // Ensure profile exists
      await supabase.from('profiles').upsert({
        id: user.user.id, email, full_name: `Student ${grade}.${n}`, role: 'student',
        grade, parent_phone: `+2010${String(rng(10000000, 99999999))}`,
        telegram_chat_id: '',
      })
      studentIds.push({ id: user.user.id, grade, email })
      console.log(`  ✓ Created: ${email}`)
    }
  }
  console.log(`\nCreated ${studentIds.length} students\n`)

  // Step 2: Create 5 exams per grade
  const examIds = []
  const allQuestionIds = []
  for (const grade of GRADES) {
    const config = subjectConfig[grade]
    for (let e = 1; e <= EXAMS_PER_GRADE; e++) {
      const subject = config.subjects[(e - 1) % config.subjects.length]
      const topics = config.topics.filter(t => t !== subject).slice(0, 4)
      const isPractice = e === 5
      const { data: exam, error } = await supabase.from('exams').insert({
        title: isPractice ? `Grade ${grade} Practice Sheet ${e}` : `Grade ${grade} ${subject} Quiz ${e}`,
        description: `${subject} assessment for grade ${grade} — covers ${topics.slice(0, 2).join(', ') || subject}`,
        time_limit_minutes: isPractice ? 0 : 30,
        passing_score: 60,
        shuffle_questions: true,
        type: isPractice ? 'practice' : 'exam',
        grade,
        is_published: true,
        is_template: false,
        created_by: 'ddb7f264-8402-45de-9d59-de4657101482',
      }).select().single()
      if (error) { console.error(`  Failed exam ${grade}-${e}:`, error.message); continue }

      // Create 20 questions per exam
      const qIds = []
      for (let q = 0; q < 20; q++) {
        const topic = pick(config.topics)
        const difficulty = rng(1, 4)
        const qType = Math.random() > 0.7 ? 'short_answer' : 'multiple_choice'
        const qText = genQuestionText(subject, topic, grade)
        const { options, correctAnswer } = qType === 'multiple_choice' ? genOptions(subject, topic, grade, qText) : { options: [], correctAnswer: String(rng(1, 50)) }
        const isGeo = subject === 'Geometry' || topic === 'Geometry'
        const isCalc = subject === 'Calculus' || topic === 'Limits' || topic === 'Derivatives' || topic === 'Integrals'
        let imageUrl = ''
        if (isGeo) imageUrl = pick(['/images/triangle.svg', '/images/coordinate-grid.svg', '/images/circle.svg'])
        else if (isCalc) imageUrl = '/images/parabola.svg'

        const { data: question, error: qErr } = await supabase.from('questions').insert({
          type: qType, subject, topic, difficulty,
          question_text: qText,
          options, correct_answer: correctAnswer,
          explanation: `The correct answer is option ${String.fromCharCode(65 + Number(correctAnswer))}. Review the topic ${topic} for more practice.`,
          image_url: imageUrl,
          common_mistakes: [{ mistake: 'Common calculation error', why: 'Check your arithmetic', correct: correctAnswer }],
          created_by: 'ddb7f264-8402-45de-9d59-de4657101482',
          grade,
        }).select().single()
        if (qErr) continue
        qIds.push(question.id)
        allQuestionIds.push(question.id)
      }

      // Link questions to exam
      if (qIds.length > 0) {
        await supabase.from('exam_questions').insert(qIds.map((qid, i) => ({
          exam_id: exam.id, question_id: qid, order_index: i, points: 1
        })))
      }
      examIds.push({ id: exam.id, grade })
      console.log(`  ✓ Created: ${exam.title} (${qIds.length} questions)`)
    }
  }
  console.log(`\nCreated ${examIds.length} exams\n`)

  // Step 3: Create exam attempts for each student
  let attemptCount = 0
  for (const student of studentIds) {
    const gradeExams = examIds.filter(e => e.grade === student.grade)
    for (const exam of gradeExams) {
      // Each student takes 2-4 of the 5 exams per grade
      if (Math.random() > 0.6) continue
      
      const startedAt = new Date(Date.now() - rng(1, 30) * 86400000)
      const completedAt = new Date(startedAt.getTime() + rng(10, 50) * 60000)
      const totalPoints = 20
      const earnedPoints = rng(8, 20)
      const score = Math.round(earnedPoints / totalPoints * 100)

      const { data: attempt, error: aErr } = await supabase.from('exam_attempts').insert({
        user_id: student.id, exam_id: exam.id,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        score, total_points: totalPoints,
        status: 'completed',
      }).select().single()
      if (aErr) continue

      // Get the exam's questions for answers
      const { data: eqs } = await supabase.from('exam_questions').select('*').eq('exam_id', exam.id)
      if (!eqs?.length) continue

      for (const eq of eqs) {
        const { data: q } = await supabase.from('questions').select('*').eq('id', eq.question_id).single()
        if (!q) continue
        const ans = genAnswer(q)
        await supabase.from('answers').insert({
          attempt_id: attempt.id, question_id: eq.question_id,
          answer: ans.answer, is_correct: ans.is_correct,
          points_earned: ans.points_earned, max_points: 1,
        })
      }
      attemptCount++
    }
  }
  console.log(`Created ${attemptCount} exam attempts\n`)
  console.log('✅ Seed complete!')

  // Print test accounts
  console.log('\n=== TEST ACCOUNTS ===')
  console.log('Admin: admin@mathmentor.com / (use Google sign-in or set password)')
  for (const grade of GRADES) {
    console.log(`\nGrade ${grade} students (password: test123):`)
    for (let n = 1; n <= STUDENTS_PER_GRADE; n++) {
      console.log(`  student${grade}_${n}@test.com`)
    }
  }
  console.log('\n=== Login at https://math-mentor-lms.pages.dev ===')
}

main().catch(console.error)
