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
  ok = (await checkAnonBlocked('/rest/v1/questions?select=id,correct_answer,explanation&limit=5', 'GET /rest/v1/questions')) && ok
  ok = (await checkAnonBlocked('/rest/v1/exam_questions?select=*&limit=5', 'GET /rest/v1/exam_questions')) && ok

  // Verify anon cannot invoke get_exam_questions_safe
  const rpcRes = await fetch(`${url}/rest/v1/rpc/get_exam_questions_safe`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_exam_id: '00000000-0000-0000-0000-000000000000',
      p_attempt_id: '00000000-0000-0000-0000-000000000000',
    }),
  })
  if (!rpcRes.ok) {
    console.log(`PASS [anon] POST /rpc/get_exam_questions_safe: rejected (${rpcRes.status})`)
  } else {
    console.error('FAIL [anon] POST /rpc/get_exam_questions_safe succeeded unexpectedly!')
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

  console.log(ok ? '\nALL LIVE RLS PROBES PASSED!' : '\nLIVE RLS PROBE FAILED — APPLY migration-2026-11-20-answer-key-lock.sql IN SUPABASE SQL EDITOR!')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
