// Daily keep-alive ping - prevents Supabase free pause and keeps the site live
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const siteUrl = process.env.SITE_URL || 'https://math-mentor-lms.pages.dev'

let supabaseOk = false
let siteOk = false

// 1. Keep Supabase awake (free tier pauses after inactivity)
if (supabaseUrl && supabaseKey) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error, count } = await supabase.from('profiles').select('id', {
      count: 'exact',
      head: true,
    })
    if (error) throw error
    console.log(`Keep-alive OK - Supabase profiles count: ${count}`)
    supabaseOk = true
  } catch (e) {
    console.error('Supabase keep-alive failed:', e.message)
  }
} else {
  console.warn('Skipping Supabase ping: missing SUPABASE_URL or SERVICE_KEY')
}

// 2. Keep the live site warm (hit the production URL daily)
try {
  const res = await fetch(siteUrl)
  console.log(`Site keep-alive ${siteUrl}: HTTP ${res.status}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  siteOk = true
} catch (e) {
  console.error('Site keep-alive failed:', e.message)
}

// 3. Notify via Telegram if either failed and a bot is configured
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
  if (!supabaseOk || !siteOk) {
    try {
      const text =
        `Math Mentor keep-alive failed:\n` +
        `- Supabase: ${supabaseOk ? 'OK' : 'FAILED'}\n` +
        `- Site (${siteUrl}): ${siteOk ? 'OK' : 'FAILED'}`
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text }),
      })
    } catch {}
  }
}

process.exit(supabaseOk && siteOk ? 0 : 1)
