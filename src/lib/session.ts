import { supabase } from './supabase'

const SESSION_TOKEN_KEY = 'mm_client_session_token'

export interface SessionClaimResult {
  status: 'claimed' | 'switched' | 'conflict'
  token?: string
  other_device?: string
  last_seen?: string
}

export interface SessionVerifyResult {
  valid: boolean
  other_device?: string
  last_seen?: string
}

/**
 * Generates or retrieves a stable per-browser 128-bit session token.
 * Sent to server-side exam RPCs so Supabase enforces single active session.
 */
export function getOrCreateClientSessionToken(): string {
  try {
    const existing = localStorage.getItem(SESSION_TOKEN_KEY)
    if (existing && existing.length >= 16) return existing
  } catch {}

  const token =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token)
  } catch {}
  return token
}

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Browser'
  const ua = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const formFactor = isMobile ? 'Mobile' : 'Desktop'
  let browser = 'Browser'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  return `${formFactor} · ${browser}`
}

export async function claimActiveSession(force = false): Promise<SessionClaimResult> {
  if (typeof supabase.rpc !== 'function') {
    return { status: 'claimed', token: getOrCreateClientSessionToken() }
  }
  const token = getOrCreateClientSessionToken()
  const { data, error } = await supabase.rpc('claim_active_session', {
    p_session_token: token,
    p_device_label: getDeviceLabel(),
    p_force: force,
  })
  if (error) throw error
  return data as SessionClaimResult
}

export async function verifyActiveSession(): Promise<SessionVerifyResult> {
  if (typeof supabase.rpc !== 'function') {
    return { valid: true }
  }
  const token = getOrCreateClientSessionToken()
  const { data, error } = await supabase.rpc('verify_active_session', {
    p_session_token: token,
  })
  if (error) throw error
  return data as SessionVerifyResult
}

/**
 * Forgiving device-switch recovery:
 * Claims the server-side active session with p_force=true (recording an audit entry)
 * and asks Supabase Auth to revoke refresh tokens on other devices.
 */
export async function signOutOtherDevicesAndClaim(): Promise<SessionClaimResult> {
  const result = await claimActiveSession(true)
  try {
    if (supabase.auth && typeof supabase.auth.signOut === 'function') {
      await supabase.auth.signOut({ scope: 'others' })
    }
  } catch {
    // Non-fatal: server-side active_session_token already blocks other devices on exam RPCs
  }
  return result
}
