// Live external HTTP verification probe for Step 3 RLS Lock
// Usage: node scripts/verify-rls-live.mjs
// Optional student test: TEST_STUDENT_EMAIL=... TEST_STUDENT_PASSWORD=... node scripts/verify-rls-live.mjs

import fs from 'fs'

function loadEnv() {
  if (!fs.existsSync('.env')) return
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv()

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

async function checkAnonBlocked(path, label) {
  const res = await fetch(`${url}${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  })
  const text = await res.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch {}

  if (Array.isArray(parsed) && parsed.length === 0) {
    console.log(`PASS [anon] ${label}: 0 rows exposed`)
    return true
  }
  if (!res.ok) {
    console.log(`PASS [anon] ${label}: rejected (${res.status})`)
    return true
  }
  console.error(`FAIL [anon] ${label}: EXPOSED ${Array.isArray(parsed) ? parsed.length : 'data'} rows!`)
  return false
}

async function main() {
  console.log(`Probing live Supabase RLS at ${url}...\n`)
  let ok = true
  const protectedTables = [
    ['/rest/v1/exams?select=id,title&limit=5', 'GET /rest/v1/exams'],
    ['/rest/v1/questions?select=id,correct_answer,explanation&limit=5', 'GET /rest/v1/questions'],
    ['/rest/v1/exam_questions?select=*&limit=5', 'GET /rest/v1/exam_questions'],
    ['/rest/v1/exam_attempts?select=*&limit=5', 'GET /rest/v1/exam_attempts'],
    ['/rest/v1/answers?select=*&limit=5', 'GET /rest/v1/answers'],
    ['/rest/v1/exam_submissions?select=*&limit=5', 'GET /rest/v1/exam_submissions'],
    ['/rest/v1/profiles?select=id,email,full_name,role&limit=5', 'GET /rest/v1/profiles'],
    ['/rest/v1/classes?select=*&limit=5', 'GET /rest/v1/classes'],
    ['/rest/v1/class_members?select=*&limit=5', 'GET /rest/v1/class_members'],
    ['/rest/v1/exam_assignments?select=*&limit=5', 'GET /rest/v1/exam_assignments'],
    ['/rest/v1/activity_logs?select=*&limit=5', 'GET /rest/v1/activity_logs'],
    ['/rest/v1/question_bookmarks?select=*&limit=5', 'GET /rest/v1/question_bookmarks'],
    ['/rest/v1/question_feedback?select=*&limit=5', 'GET /rest/v1/question_feedback'],
    ['/rest/v1/system_settings?select=*&limit=5', 'GET /rest/v1/system_settings'],
    ['/rest/v1/rpc_rate_limits?select=*&limit=5', 'GET /rest/v1/rpc_rate_limits'],
    ['/rest/v1/concepts?select=*&limit=5', 'GET /rest/v1/concepts'],
    ['/rest/v1/curricula?select=*&limit=5', 'GET /rest/v1/curricula'],
    ['/rest/v1/curriculum_outcomes?select=*&limit=5', 'GET /rest/v1/curriculum_outcomes'],
    ['/rest/v1/curriculum_outcome_concepts?select=*&limit=5', 'GET /rest/v1/curriculum_outcome_concepts'],
    ['/rest/v1/question_concepts?select=*&limit=5', 'GET /rest/v1/question_concepts'],
    ['/rest/v1/consent_records?select=*&limit=5', 'GET /rest/v1/consent_records'],
  ]
  for (const [path, label] of protectedTables) {
    ok = (await checkAnonBlocked(path, label)) && ok
  }

  // Verify anon cannot invoke get_exam_questions_safe or redeem_group_invite
  for (const [rpcName, payload] of [
    ['get_exam_questions_safe', { p_exam_id: '00000000-0000-0000-0000-000000000000', p_attempt_id: '00000000-0000-0000-0000-000000000000' }],
    ['get_practice_questions_safe', { p_exam_id: '00000000-0000-0000-0000-000000000000' }],
    ['redeem_group_invite', { p_code: 'INVALID-CODE' }],
  ]) {
    const rpcRes = await fetch(`${url}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!rpcRes.ok) {
      console.log(`PASS [anon] POST /rpc/${rpcName}: rejected (${rpcRes.status})`)
    } else {
      console.error(`FAIL [anon] POST /rpc/${rpcName} succeeded unexpectedly!`)
      ok = false
    }
  }

  // Verify Step 7 public preview_group_invite RPC returns safe non-enumerating response
  const previewRes = await fetch(`${url}/rest/v1/rpc/preview_group_invite`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_code: 'NONEXISTENT-CODE' }),
  })
  const previewBody = await previewRes.json().catch(() => null)
  if (previewRes.ok && previewBody && previewBody.valid === false && previewBody.reason === 'invalid_or_disabled') {
    console.log('PASS [anon] POST /rpc/preview_group_invite: safe non-enumerating response')
  } else {
    console.error('FAIL [anon] POST /rpc/preview_group_invite unexpected response:', previewRes.status, previewBody)
    ok = false
  }

  // Optional authenticated student check
  const email = process.env.TEST_STUDENT_EMAIL
  const password = process.env.TEST_STUDENT_PASSWORD
  if (email && password) {
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const authData = await authRes.json()
    if (!authData.access_token) {
      console.error('Student login failed:', authData.error_description || authData.msg)
      process.exit(1)
    }
    const stuRes = await fetch(`${url}/rest/v1/questions?select=id,correct_answer&limit=5`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${authData.access_token}` },
    })
    const stuRows = await stuRes.json()
    if (Array.isArray(stuRows) && stuRows.length === 0) {
      console.log('PASS [student] GET /rest/v1/questions: 0 rows exposed')
    } else {
      console.error('FAIL [student] GET /rest/v1/questions exposed rows!', stuRows)
      ok = false
    }
  }

  console.log(ok ? '\nALL LIVE RLS PROBES PASSED!' : '\nLIVE RLS PROBE FAILED — APPLY migration-2026-11-20-require-auth-content.sql IN SUPABASE SQL EDITOR!')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
