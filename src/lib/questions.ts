import { supabase } from './supabase'
import type { Question, Difficulty } from '../types'

type QuestionInput = Omit<Question, 'id' | 'created_at' | 'created_by'>

let filtersCache: { subjects: string[]; topics: string[] } | null = null

export async function fetchQuestionFilters() {
  if (filtersCache) return filtersCache
  const [subRes, topRes] = await Promise.all([
    supabase.from('questions').select('subject'),
    supabase.from('questions').select('topic'),
  ])
  const subjects = [...new Set((subRes.data ?? []).map(r => r.subject).filter(Boolean))].sort() as string[]
  const topics = [...new Set((topRes.data ?? []).map(r => r.topic).filter(Boolean))].sort() as string[]
  filtersCache = { subjects, topics }
  return filtersCache
}

export async function fetchQuestions(filters?: { subject?: string; topic?: string; difficulty?: Difficulty }) {
  let query = supabase.from('questions').select('*')
  if (filters?.subject) query = query.eq('subject', filters.subject)
  if (filters?.topic) query = query.eq('topic', filters.topic)
  if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data as Question[]
}

export async function fetchQuestionsByDifficulty(difficulty: Difficulty) {
  return fetchQuestions({ difficulty })
}

export async function createQuestion(input: QuestionInput) {
  filtersCache = null
  const { data, error } = await supabase.from('questions').insert(input).select().single()
  if (error) throw error
  return data as Question
}

export async function updateQuestion(id: string, input: Partial<QuestionInput>) {
  filtersCache = null
  const { data, error } = await supabase.from('questions').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Question
}

export async function deleteQuestion(id: string) {
  filtersCache = null
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}
