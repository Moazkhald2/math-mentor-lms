const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL ?? 'https://instagram.com/themathmentor'
const INSTAGRAM_HANDLE = import.meta.env.VITE_INSTAGRAM_HANDLE ?? '@themathmentor'

export default function InstagramBanner() {
  return (
    <section className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-brand/5 via-surface to-accent-gold/5 p-6 md:p-8">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold tracking-widest text-accent-gold">FOLLOW ON INSTAGRAM</p>
          <h3 className="mt-2 text-2xl font-black text-text">
            Daily tips & behind the scenes with <span className="text-brand">{INSTAGRAM_HANDLE}</span>
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
            Short reels, exam tricks, and student wins. Join 10k+ learners who get extra practice in their feed.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#feda75] via-[#d62976] to-[#4f5bd5] px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            Follow on Instagram
          </a>
          <span className="text-xs text-text-muted">Opens in new tab</span>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 opacity-80">
        {[1, 2, 3].map((i) => (
          <a key={i} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-xl bg-tertiary">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-accent-gold/10 transition group-hover:from-brand/20 group-hover:to-accent-gold/20" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-text-muted">Reel #{i} →</div>
          </a>
        ))}
      </div>
    </section>
  )
}
