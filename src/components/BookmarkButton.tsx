import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleBookmark, fetchBookmarkedIds } from '../lib/bookmarks'
import { Bookmark } from 'lucide-react'

export default function BookmarkButton({ questionId }: { questionId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: bookmarkedIds } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: () => fetchBookmarkedIds(user!.id),
    enabled: !!user,
  })

  const toggle = useMutation({
    mutationFn: () => toggleBookmark(user!.id, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] })
    },
  })

  const isBookmarked = bookmarkedIds?.has(questionId)

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className={`rounded-lg border p-2 transition ${
        isBookmarked ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-border text-text-muted hover:border-accent-gold/50 hover:text-accent-gold'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
    >
      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-accent-gold' : ''}`} />
    </button>
  )
}
