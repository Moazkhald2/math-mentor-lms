# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.0.0   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Email or use GitHub's private vulnerability reporting
3. Include: description, steps to reproduce, potential impact
4. Allow reasonable time for a fix before public disclosure

We will acknowledge receipt within 48 hours and provide a timeline for the fix.

## Security Posture

### Host & Transport
- Hosted on **Cloudflare Pages** with automatic HTTPS
- **HSTS** enforced (`max-age=31536000; includeSubDomains; preload`)
- **X-Frame-Options: DENY** prevents clickjacking
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy: strict-origin-when-cross-origin**

### Content Security Policy
The site enforces a strict CSP via `_headers` and Cloudflare Pages:

- `default-src 'self'`
- `script-src 'self' https://cdn.jsdelivr.net`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`
- `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net`
- `img-src 'self' data:`
- `connect-src 'self' https://vjhzbqtoktktrjevcodq.supabase.co https://cdn.jsdelivr.net`
- `base-uri 'self'`
- `form-action 'self'`
- `frame-ancestors 'none'`
- `frame-src 'none'`

### Supabase Security
- **Row Level Security (RLS)** is enabled on all tables
- Authentication is handled by Supabase Auth (email/password + Google OAuth)
- The frontend uses the **anon key** only; the service key is never exposed client-side
- All database writes go through Supabase RLS policies that validate `auth.uid()`

### Application-Level Protections
- **Anti-cheat system** — fullscreen enforcement, tab-switch detection, devtools detection, copy/paste/context-menu blocking during exams
- **Login throttling** — 5 attempts per 60-second cooldown
- **Idle timeout** — automatic sign-out after 60 minutes of inactivity
- **Input sanitization** — HTML entity escaping via `sanitize()` utility
- **Audit logging** — activity and audit tables track user actions

### Dependencies
- `npm audit` is run as part of CI via GitHub Actions
- Vulnerable packages are addressed promptly; overrides are used when a semver-compatible patch is not yet available

## Notes

This is a client-side SPA (Vite + React) with no server-side rendering. Server-side-specific CVEs (e.g., RSC CSRF, SSR open redirect) are not exploitable in this deployment.
