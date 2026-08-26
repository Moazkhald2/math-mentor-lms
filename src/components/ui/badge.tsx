import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-brand/10 text-brand-light border-brand/20',
  success: 'bg-accent-green/15 text-[#3E5F4A] border-accent-green/30',
  warning: 'bg-accent-gold/20 text-[#8A5A1E] border-accent-gold/40',
  danger: 'bg-[#FDF0ED] text-[#9C3B22] border-[#E76F51]/40',
  outline: 'border-border bg-surface text-ink',
} as const

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
