// Send weekly/monthly Telegram reports to students with chat IDs
// Usage: node scripts/send-reports.mjs <weekly|monthly>
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN

import { createClient } from '@supabase/supabase-js'

const PERIOD = process.argv[2] // 'weekly' or 'monthly'
if (!PERIOD || !['weekly', 'monthly'].includes(PERIOD)) {
  console.error('Usage: node send-reports.mjs <weekly|monthly>')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CUTOFF_DAYS = PERIOD === 'weekly' ? 7 : 30

async function sendTelegram(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) console.error(`  ❌ Failed to send to ${chatId}: ${await res.text()}`)
  else console.log(`  ✅ Sent to ${chatId}`)
}

async function main() {
  const cutoff = new Date(Date.now() - CUTOFF_DAYS * 86400000).toISOString()

  // Get all students with telegram chat IDs
  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, telegram_chat_id')
    .not('telegram_chat_id', 'eq', '')
    .eq('role', 'student')

  if (error) { console.error('Query failed:', error); process.exit(1) }
  if (!students?.length) { console.log('No students with Telegram chat IDs'); return }

  console.log(`Found ${students.length} students with Telegram. Sending ${PERIOD} reports...`)

  for (const s of students) {
    console.log(`\n📋 ${s.full_name} (${s.email})`)

    // Get completed attempts in the period
    const { data: attempts } = await supabase
      .from('exam_attempts')
      .select('*, exam:exams(title, type)')
      .eq('user_id', s.id)
      .eq('status', 'completed')
      .gte('completed_at', cutoff)
      .order('completed_at', { ascending: false })

    const exams = (attempts || []).filter(a => a.exam?.type === 'exam')
    const practices = (attempts || []).filter(a => a.exam?.type === 'practice')

    if (exams.length === 0 && practices.length === 0) {
      console.log('  No activity in this period')
      continue
    }

    const scores = exams.map(a => a.score ?? 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const bestIdx = scores.indexOf(Math.max(...scores))
    const bestExam = exams[bestIdx]?.exam?.title ?? '—'
    const bestScore = scores[bestIdx] ?? 0
    const totalTimeMin = (attempts || []).reduce((sum, a) => {
      if (!a.completed_at || !a.started_at) return sum
      return sum + Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 60000)
    }, 0)

    const header = `<b>${PERIOD === 'weekly' ? '📊 Weekly' : '📈 Monthly'} Report — ${s.full_name}</b>`
    const body = `
Exams taken: ${exams.length}
Average score: ${avgScore}% ${avgScore >= 60 ? '✅' : '⚠️'}
Best: ${bestExam} (${bestScore}%)
Practice sessions: ${practices.length}
⏱ Total time: ${Math.floor(totalTimeMin / 60)}h ${totalTimeMin % 60}m`

    // Trend: compare last 2 periods
    const olderCutoff = new Date(Date.now() - CUTOFF_DAYS * 2 * 86400000).toISOString()
    const { data: olderAttempts } = await supabase
      .from('exam_attempts')
      .select('score, exam:exams(type)')
      .eq('user_id', s.id)
      .eq('status', 'completed')
      .eq('exam.type', 'exam')
      .gte('completed_at', olderCutoff)
      .lt('completed_at', cutoff)

    const olderScores = (olderAttempts || []).map(a => a.score ?? 0)
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0
    let trend = '📊 Stable'
    if (olderAvg > 0 && avgScore > olderAvg + 5) trend = '📈 Improving'
    else if (olderAvg > 0 && avgScore < olderAvg - 5) trend = '📉 Needs improvement'

    const message = header + body + `\n📉 Trend: ${trend}`
    await sendTelegram(s.telegram_chat_id, message)
  }

  console.log('\n✅ All reports sent')
}

main()
