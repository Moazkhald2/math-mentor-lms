// Print-only watermark: invisible during normal screen use.
// Appears when the page is printed (Ctrl+P) to discourage unauthorized distribution.
// Screenshot detection is not reliably possible in browsers; the anti-cheat
// blur + violation system covers off-focus capture attempts during exams.
export default function Watermark({ label }: { label: string }) {
  return (
    <>
      {/* Screen: fully hidden. Print: tiled diagonal overlay. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden select-none print:block print:opacity-[0.06]"
        style={{ transform: 'rotate(-28deg) scale(1.5)' }}
      >
        <div className="flex h-full w-full flex-wrap content-center justify-center gap-10 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="whitespace-nowrap text-sm font-bold tracking-widest text-ink">
              © The Math Mentor · {label} · Unauthorized distribution prohibited
            </span>
          ))}
        </div>
      </div>
      <style>{`@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </>
  )
}
