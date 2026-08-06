export default function Watermark({ label }: { label: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="absolute whitespace-nowrap text-2xl font-black tracking-wider text-ink/10"
          style={{ transform: `rotate(-30deg) translateY(${(i - 1) * 90}px)` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}