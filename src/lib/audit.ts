import { supabase } from './supabase'

export async function logAudit(action: string, details: string, userId?: string) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details,
      ip_address: '',
    })
  } catch {}
}
