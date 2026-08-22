export default function Watermark({ label }: { label: string }) {
  return (
    <>
      <div
        className="pointer-events-none fixed top-4 right-4 z-40 rounded bg-white/80 px-2 py-1 text-xs font-semibold text-ink/60 shadow-sm select-none backdrop-blur"
        aria-hidden="true"
      >
        {label}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex flex-wrap content-center justify-center gap-16 overflow-hidden opacity-[0.04] select-none"
        style={{ transform: 'rotate(-28deg) scale(1.5)' }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="text-sm font-bold tracking-widest whitespace-nowrap">
            {label} &middot; The Math Mentor
          </span>
        ))}
      </div>
    </>
  )
}