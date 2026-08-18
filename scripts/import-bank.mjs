// Imports a question bank (bank.json) into the site's Supabase `questions` table.
// Maps: bank skill -> subject/topic (skills.json), bank type -> QuestionType,
//       bank difficulty (1-4) -> Difficulty, bank latex -> question_text/options/correct_answer.
// Skips questions whose stem already exists (dedup by question_text hash).
//
// Usage: $env:SUPABASE_SERVICE_KEY="..." ; node scripts/import-bank.mjs <bank.json> [<skills.json>]

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const [, , bankPath, skillsPath = 'skills.json'] = process.argv
if (!bankPath) {
  console.error('usage: node scripts/import-bank.mjs <bank.json> [<skills.json>]')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vjhzbqtoktktrjevcodq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('set SUPABASE_SERVICE_KEY first')
  process.exit(1)
}

const bank = JSON.parse(readFileSync(bankPath, 'utf8'))
const skills = JSON.parse(readFileSync(skillsPath, 'utf8'))

const TYPE_MAP = { 'multiple-choice': 'multiple_choice', 'short-answer': 'short_answer', 'true-false': 'true_false' }

function mapQuestion(q) {
  const skill = skills.skills?.[q.skill]
  const options = q.options_latex ?? []
  return {
    type: TYPE_MAP[q.type] ?? 'short_answer',
    subject: skill?.subject ?? skills.subject ?? 'Algebra',
    topic: skill?.topic ?? q.skill,
    difficulty: Math.min(4, Math.max(1, q.difficulty ?? 1)),
    question_text: q.stem_latex,
    options,
    correct_answer: options.length > 1 ? q.answer_latex : (q.answer_latex ?? ''),
    explanation: q.explanation_latex ?? '',
    image_url: '',
    common_mistakes: [],
    variant_group_id: `${q.skill}`,
  }
}

async function main() {
  const { data: existing } = await supabase.from('questions').select('question_text, variant_group_id')
  const seen = new Set((existing ?? []).map(r => r.question_text))
  let inserted = 0, skipped = 0
  for (const q of bank.questions ?? []) {
    const mapped = mapQuestion(q)
    if (seen.has(mapped.question_text)) { skipped++; continue }
    const { error } = await supabase.from('questions').insert(mapped)
    if (error) { console.error('insert failed for', q.id, error.message); continue }
    seen.add(mapped.question_text)
    inserted++
  }
  console.log(`imported ${inserted}, skipped ${skipped} duplicates (of ${bank.count ?? bank.questions.length})`)
}

main()