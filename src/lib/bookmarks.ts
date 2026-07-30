import { supabase } from './supabase'

export async function toggleBookmark(userId: string, questionId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('question_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('question_bookmarks')
      .delete()
      .eq('id', existing.id)
    if (error) throw error
    return false
  }

  const { error } = await supabase
    .from('question_bookmarks')
    .insert({ user_id: userId, question_id: questionId })
  if (error) throw error
  return true
}

export async function fetchBookmarkedIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('question_bookmarks')
    .select('question_id')
    .eq('user_id', userId)

  if (error) throw error
  return new Set(data?.map(b => b.question_id) ?? [])
}

export async function fetchBookmarkedQuestions(userId: string) {
  const { data, error } = await supabase
    .from('question_bookmarks')
    .select('created_at, question:questions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as { created_at: string; question: import('../types').Question }[]
}

export async function submitFeedback(
  userId: string,
  questionId: string,
  feedbackType: 'bug' | 'confusing' | 'typo' | 'other',
  comment: string
) {
  const { error } = await supabase
    .from('question_feedback')
    .upsert({ user_id: userId, question_id: questionId, feedback_type: feedbackType, comment })
    .select()

  if (error) throw error
}
