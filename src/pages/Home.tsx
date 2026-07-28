export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 text-center">
      <h1 className="mb-4 text-5xl font-bold text-text">
        Master Math with{' '}
        <span className="text-brand-light">The Math Mentor</span>
      </h1>
      <p className="mb-8 max-w-2xl text-lg text-text-muted">
        Practice timed exams, track your progress, and master limits,
        derivatives, and more. Built for Grades 10-12.
      </p>
      <div className="flex gap-4">
        <a
          href="/register"
          className="rounded-lg bg-brand px-6 py-3 text-white hover:bg-brand-light"
        >
          Get Started Free
        </a>
        <a
          href="/login"
          className="rounded-lg border border-border px-6 py-3 text-text-muted hover:text-text"
        >
          Sign In
        </a>
      </div>
    </div>
  )
}