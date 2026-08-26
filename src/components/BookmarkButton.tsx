import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleBookmark, fetchBookmarkedIds } from '../lib/bookmarks'
import { Bookmark } from '@phosphor-icons/react'

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
        isBookmarked ? 'border-warning bg-warning/10 text-warning' : 'border-border text-muted hover:border-warning/50 hover:text-warning'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
    >
      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-warning' : ''}`} />
    </button>
  )
}
