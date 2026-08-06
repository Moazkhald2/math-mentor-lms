export default function Watermark({ label }: { label: string }) {
  return (
    <div
      className="pointer-events-none fixed top-6 right-6 z-40 text-sm font-medium text-ink/20 select-none"
      aria-hidden="true"
    >
      {label}
    </div>
  )
}