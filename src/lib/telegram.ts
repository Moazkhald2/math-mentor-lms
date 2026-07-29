const TELEGRAM_API = 'https://api.telegram.org/bot'

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram send failed: ${res.status} ${body}`)
  }
  return res.json()
}

export function buildWeeklyReport(name: string, stats: {
  examsTaken: number
  avgScore: number
  bestExam: string
  bestScore: number
  practiceCount: number
  totalTimeMin: number
}) {
  const passed = stats.avgScore >= 60 ? '✅' : '⚠️'
  return `<b>📊 Weekly Report — ${name}</b>

Exams taken: ${stats.examsTaken}
Avg score: ${stats.avgScore}% ${passed}
Best: ${stats.bestExam} (${stats.bestScore}%)
Practice sessions: ${stats.practiceCount}
⏱ Total time: ${Math.floor(stats.totalTimeMin / 60)}h ${stats.totalTimeMin % 60}m`
}

export function buildMonthlyReport(name: string, stats: {
  examsTaken: number
  avgScore: number
  bestExam: string
  bestScore: number
  practiceCount: number
  totalTimeMin: number
  scoreTrend: string
}) {
  const passed = stats.avgScore >= 60 ? '✅' : '⚠️'
  return `<b>📈 Monthly Report — ${name}</b>

Exams taken this month: ${stats.examsTaken}
Average score: ${stats.avgScore}% ${passed}
Best performance: ${stats.bestExam} (${stats.bestScore}%)
Practice sessions: ${stats.practiceCount}
⏱ Total time: ${Math.floor(stats.totalTimeMin / 60)}h ${stats.totalTimeMin % 60}m
📉 Trend: ${stats.scoreTrend}`
}
