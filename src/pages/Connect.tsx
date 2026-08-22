const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL ?? 'https://instagram.com/themathmentor'
const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_URL ?? 'https://t.me/themathmentor'
const X_URL = import.meta.env.VITE_X_URL ?? 'https://x.com/themathmentor'
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_URL ?? 'https://wa.me/201000000000'

export default function Connect() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero with brand images */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand via-brand-dark to-ink p-8 md:p-12">
        <img src="/logo-symbol.png" alt="" className="pointer-events-none absolute -right-12 -top-12 w-64 opacity-[0.07] select-none" />
        <img src="/images/circle.svg" alt="" className="pointer-events-none absolute bottom-4 right-4 w-24 opacity-20 select-none hidden md:block" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-white/80">
            <span className="h-2 w-2 rounded-full bg-accent-gold animate-pulse" />
            OFFICIAL CHANNELS
          </div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight text-white">
            Learn daily with <span className="text-accent-gold">The Math Mentor</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Same brand, same quality - wherever you follow. Daily reels, exam alerts, solutions, and direct help. All connected to your exam account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-brand hover:bg-white/90">
              Follow on Instagram
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
              Join Telegram
            </a>
          </div>
        </div>
      </div>

      {/* Brand strip - using brand images */}
      <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4">
        <img src="/logo-main.png" alt="The Math Mentor logo" className="rounded-2xl border border-border bg-white p-4 md:p-6 object-contain h-24 md:h-28 w-full" />
        <div className="rounded-2xl border border-border bg-tertiary p-4 flex items-center justify-center">
          <img src="/images/parabola.svg" alt="Math illustration" className="h-16 md:h-20 opacity-60" />
        </div>
        <div className="rounded-2xl border border-border bg-brand p-4 flex items-center justify-center">
          <img src="/logo-white.svg" alt="Symbol" className="h-12 md:h-16" />
        </div>
      </div>

      {/* Social cards - all connected */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-[#feda75]/0 via-[#d62976]/0 to-[#4f5bd5]/0 group-hover:from-[#feda75]/10 group-hover:via-[#d62976]/5 group-hover:to-[#4f5bd5]/10 transition" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-text">Instagram</h3>
            <p className="mt-1 text-sm text-text-muted">Daily reels, tricks, wins. Link in bio to exams.</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-brand group-hover:underline">Open Instagram →</span>
          </div>
        </a>

        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-[#229ED9]/0 group-hover:bg-[#229ED9]/5 transition" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#229ED9] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-9.99 10.18 10 10 0 0 0 5.67 8.96l-.35-3.02 2.2 1.5a10 10 0 0 0 2.47.32A10 10 0 0 0 22 12 10 10 0 0 0 12 2Zm4.7 7.2-1.5 7.1c-.11.5-.4.62-.81.39l-2.25-1.66-1.08 1.04c-.12.12-.22.22-.45.22l.16-2.3 4.2-3.8c.18-.16-.04-.25-.28-.09L8.5 13.3 6 12.5c-.55-.17-.56-.55.12-.82l9.77-3.77c.46-.17.86.1.71.81Z" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-text">Telegram</h3>
            <p className="mt-1 text-sm text-text-muted">Weekly reports, exam alerts. Bot: @mathmentor_bot</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-brand group-hover:underline">Open Telegram →</span>
          </div>
        </a>

        <a href={X_URL} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.6 7.55L23 22h-6.1l-4.77-6.23L6.67 22H3.58l7.06-8.07L3 2h6.24l4.31 5.67L18.9 2Zm-1.07 18h1.73L6.13 3.82H4.2L17.83 20Z" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-text">X</h3>
            <p className="mt-1 text-sm text-text-muted">Quick tips, threads, exam dates.</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-brand group-hover:underline">Open X →</span>
          </div>
        </a>

        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/20 hover:shadow-lg">
          <div className="absolute inset-0 bg-[#25D366]/0 group-hover:bg-[#25D366]/5 transition" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.02 2C6.54 2 2.1 6.45 2.1 12c0 1.76.46 3.48 1.33 4.99L2 22l5.14-1.34A9.83 9.83 0 0 0 12.02 22c5.48 0 9.92-4.45 9.92-9.99 0-2.67-1.04-5.18-2.89-7.1Zm-7.03 14.3a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.05.8.81-2.97-.2-.31A8.26 8.26 0 0 1 3.82 12c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42A8.18 8.18 0 0 1 20.3 12c0 4.55-3.7 8.25-8.28 8.25Zm6.78-6.06c-.37-.19-2.2-1.09-2.54-1.21-.34-.12-.59-.19-.84.19-.25.37-.96 1.21-1.18 1.46-.22.25-.44.28-.81.09-.37-.19-1.56-.58-2.97-1.84-1.1-.98-1.84-2.18-2.06-2.55-.22-.37-.02-.57.17-.76.17-.17.37-.44.56-.66.18-.22.25-.37.37-.62.12-.25.06-.47-.03-.66-.09-.19-.84-2.02-1.15-2.77-.3-.72-.61-.62-.84-.63l-.72-.01c-.25 0-.66.09-1 .47-.34.37-1.31 1.28-1.31 3.12s1.34 3.62 1.53 3.87c.19.25 2.64 4.03 6.39 5.65.89.39 1.59.62 2.13.79.9.29 1.71.25 2.36.15.72-.11 2.2-.9 2.51-1.77.31-.87.31-1.61.22-1.77-.09-.16-.34-.25-.71-.44Z" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-text">WhatsApp</h3>
            <p className="mt-1 text-sm text-text-muted">Parent updates, support. Same number as profile.</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-brand group-hover:underline">Open WhatsApp →</span>
          </div>
        </a>
      </div>

      {/* How all connected */}
      <div className="mt-10 rounded-2xl border border-border bg-tertiary p-6 md:p-8">
        <h3 className="font-bold text-text">All connected to your exam account</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-text-muted">
          <div className="rounded-xl bg-surface p-4 border border-border">
            <p className="font-semibold text-text">1. Link Telegram</p>
            <p className="mt-1">Go to Profile → add Telegram chat ID → get weekly reports automatically.</p>
          </div>
          <div className="rounded-xl bg-surface p-4 border border-border">
            <p className="font-semibold text-text">2. Follow Instagram & X</p>
            <p className="mt-1">Daily content links back to /exams - same login everywhere.</p>
          </div>
          <div className="rounded-xl bg-surface p-4 border border-border">
            <p className="font-semibold text-text">3. Brand everywhere</p>
            <p className="mt-1">Logo, colors <span className="inline-block h-3 w-3 rounded-full bg-brand align-middle" /> <span className="inline-block h-3 w-3 rounded-full bg-accent-gold align-middle" /> <span className="inline-block h-3 w-3 rounded-full bg-accent-green align-middle" /> stay same on site + socials.</p>
          </div>
        </div>
      </div>

      {/* Decorative brand pattern */}
      <div className="mt-6 flex items-center justify-center gap-4 opacity-40">
        <img src="/images/triangle.svg" alt="" className="h-8" />
        <img src="/images/coordinate-grid.svg" alt="" className="h-8" />
        <img src="/logo-symbol.png" alt="" className="h-8" />
      </div>
    </div>
  )
}
