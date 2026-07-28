import { supabase } from './supabase'
import type { Question, Difficulty } from '../types'

type QuestionInput = Omit<Question, 'id' | 'created_at' | 'created_by'>

export async function fetchQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Question[]
}

export async function fetchQuestionsByDifficulty(difficulty: Difficulty) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('difficulty', difficulty)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Question[]
}

export async function createQuestion(input: QuestionInput) {
  const { data, error } = await supabase
    .from('questions')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Question
}

export async function updateQuestion(id: string, input: Partial<QuestionInput>) {
  const { data, error } = await supabase
    .from('questions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Question
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) throw error
}
