import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { fetchBookmarkedQuestions } from '../lib/bookmarks'
import LatexRenderer from '../components/LatexRenderer'
import BookmarkButton from '../components/BookmarkButton'
import { Link } from 'react-router-dom'

export default function Bookmarks() {
  const { user } = useAuth()

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarked-questions', user?.id],
    queryFn: () => fetchBookmarkedQuestions(user!.id),
    enabled: !!user,
  })

  if (!user) return <p className="text-text-muted">Sign in to view your bookmarks.</p>

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black text-text">Bookmarked Questions</h1>

      {!bookmarks?.length ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-muted">No bookmarked questions yet.</p>
          <p className="mt-2 text-sm text-text-muted">Bookmark questions from exam results to review them later.</p>
          <Link to="/exams" className="mt-4 inline-block text-sm text-brand hover:underline">Browse Exams →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map(b => (
            <div key={b.question.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1 font-medium text-text">
                  <LatexRenderer content={b.question.question_text} />
                </div>
                <BookmarkButton questionId={b.question.id} />
              </div>
              <div className="flex gap-2 text-xs text-text-muted">
                <span className="rounded bg-brand/10 px-2 py-0.5 text-brand">{b.question.subject}</span>
                <span className="rounded bg-border px-2 py-0.5">{b.question.topic || 'General'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
