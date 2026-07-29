export default function Home() {
  return (
    <div className="flex flex-col items-center pt-24 text-center">
      <div className="mb-6 inline-block rounded-full border border-accent-gold/30 bg-accent-gold/10 px-4 py-1 text-sm text-accent-gold">
        Personalized Guidance — Effort Leads to Excellence
      </div>

      <h1 className="mb-6 text-3xl sm:text-5xl font-black leading-tight text-text">
        Master Math with{' '}
        <span className="text-brand">The Math Mentor</span>
      </h1>

      <p className="mb-10 max-w-2xl text-lg leading-relaxed text-text-muted">
        Timed exams, step-by-step solutions, and smart progress tracking.
        Built for Grades 10–12 — because every student deserves{' '}
        <span className="font-semibold text-accent-green">compassionate</span>,{' '}
        <span className="font-semibold text-brand">expert guidance</span>.
      </p>

      <div className="mb-16 flex flex-col gap-4 sm:flex-row">
        <a
          href="/register"
          className="rounded-lg bg-brand px-8 py-3 font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-light"
        >
          Get Started Free
        </a>
        <a
          href="/login"
          className="rounded-lg border-2 border-border px-8 py-3 font-semibold text-text-muted hover:border-brand hover:text-text"
        >
          Sign In
        </a>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-3">
        {[
          {
            icon: '♠',
            title: 'Practice Exams',
            desc: 'Timed questions with difficulty from Easy → Expert',
            color: 'border-brand text-brand',
          },
          {
            icon: '♣',
            title: 'Step-by-Step',
            desc: 'Full solutions with common-mistake breakdowns',
            color: 'border-accent-green text-accent-green',
          },
          {
            icon: '△',
            title: 'Smart Tracking',
            desc: 'Progress analytics to target your weak spots',
            color: 'border-accent-gold text-accent-gold',
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`rounded-xl border-l-4 bg-surface p-6 text-left ${card.color}`}
          >
            <div className="mb-2 text-2xl">{card.icon}</div>
            <h3 className="mb-2 font-bold text-text">{card.title}</h3>
            <p className="text-sm text-text-muted">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}