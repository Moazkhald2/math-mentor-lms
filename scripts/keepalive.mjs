// Daily keep-alive ping - prevents Supabase free pause
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY')
  process.exit(0)
}

const supabase = createClient(url, key)

try {
  const { error, count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  if (error) throw error
  console.log(`Keep-alive OK - profiles count: ${count}`)
} catch (e) {
  console.error('Keep-alive failed:', e.message)
  // Notify via Telegram if configured
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
      if (chatId) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `Supabase keep-alive failed: ${e.message}` })
        })
      }
    } catch {}
  }
}
