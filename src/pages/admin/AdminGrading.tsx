import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminGrading() {
  const queryClient = useQueryClient()

  const { data: answers } = useQuery({
    queryKey: ['admin-grading'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          id, answer, is_correct, points_earned, created_at,
          attempt:exam_attempts!inner(user_id, status, student:profiles!user_id(full_name, email)),
          question:questions!inner(question_text, correct_answer, type)
        `)
        .eq('question.type', 'short_answer')
        .eq('attempt.status', 'completed')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })

  const gradeAnswer = useMutation({
    mutationFn: async ({ id, is_correct, points_earned }: { id: string; is_correct: boolean; points_earned: number }) => {
      const { error } = await supabase.from('answers').update({ is_correct, points_earned }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-grading'] }),
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Grade Short Answers</h1>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted"><tr>
            <th className="px-4 py-3">Student</th><th className="px-4 py-3">Question</th><th className="px-4 py-3">Their Answer</th><th className="px-4 py-3">Correct</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Grade</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {(!answers || answers.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No short-answer submissions to grade</td></tr>
            )}
            {answers?.map((a: any) => {
              const alreadyGraded = a.is_correct || a.points_earned > 0
              const student = a.attempt?.student ?? {}
              return (
                <tr key={a.id} className={`text-text ${alreadyGraded ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">{student.full_name || student.email || '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3">{a.question?.question_text}</td>
                  <td className="px-4 py-3 font-medium text-brand">{a.answer || '—'}</td>
                  <td className="px-4 py-3 text-accent-green">{a.question?.correct_answer}</td>
                  <td className="px-4 py-3">
                    {alreadyGraded
                      ? <span className="text-accent-green">✓ Graded</span>
                      : <span className="text-accent-gold">⏳ Pending</span>}
                  </td>
                  <td className="px-4 py-3">
                    {alreadyGraded ? `${a.points_earned}p` : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => gradeAnswer.mutate({ id: a.id, is_correct: true, points_earned: 1 })}
                          className="rounded bg-accent-green px-2 py-1 text-xs text-white hover:bg-accent-green/80">Correct</button>
                        <button onClick={() => gradeAnswer.mutate({ id: a.id, is_correct: false, points_earned: 0 })}
                          className="rounded bg-danger px-2 py-1 text-xs text-white hover:bg-danger/80">Wrong</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
