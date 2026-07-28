import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center pt-32 text-center">
      <div className="mb-4 text-8xl font-black text-brand">404</div>
      <h1 className="mb-2 text-2xl font-bold text-text">Page Not Found</h1>
      <p className="mb-8 text-text-muted">This page doesn't exist or has been moved.</p>
      <Link
        to="/"
        className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-light"
      >
        Go Home
      </Link>
    </div>
  )
}
