import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMutation } from '@tanstack/react-query'
import { submitFeedback } from '../lib/bookmarks'
import { Flag } from 'lucide-react'

export default function FeedbackButton({ questionId }: { questionId: string }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'bug' | 'confusing' | 'typo' | 'other'>('bug')
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)

  const submit = useMutation({
    mutationFn: () => submitFeedback(user!.id, questionId, type, comment),
    onSuccess: () => {
      setSent(true)
      setTimeout(() => { setOpen(false); setSent(false); setComment('') }, 2000)
    },
  })

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-lg border border-border p-2 text-muted transition hover:border-danger/50 hover:text-danger" title="Report issue">
        <Flag className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-border bg-secondary p-4 shadow-xl">
          {sent ? (
            <p className="text-sm text-success font-semibold">Thanks for your feedback!</p>
          ) : (
            <>
              <h3 className="mb-3 text-sm font-bold text-primary">Report Issue</h3>
              <select value={type} onChange={e => setType(e.target.value as any)}
                className="mb-2 w-full rounded-lg border border-border bg-primary px-3 py-2 text-sm text-primary">
                <option value="bug">Bug / Wrong answer</option>
                <option value="confusing">Confusing question</option>
                <option value="typo">Typo / Formatting</option>
                <option value="other">Other</option>
              </select>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional details..."
                className="mb-3 w-full rounded-lg border border-border bg-primary px-3 py-2 text-sm text-primary" rows={3} />
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted">Cancel</button>
                <button onClick={() => submit.mutate()} disabled={submit.isPending}
                  className="flex-1 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-50">
                  {submit.isPending ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
