# Batch 1 — Cleanup, Header/Auth UX, Exam Sheet, Dashboard Simplify

> Executor: superpowers:executing-plans inline. Branch `feat/batch1-polish`. Gates per task: build+test green. Merge only after owner preview approval.

**Decisions locked:** Google=primary no-password + email/pw alternative · parent phone REQUIRED both paths · email-confirm ON + disposable-domain blocklist · blur-on-blur during exams (violation still counts) · print-only watermark · dark mode deferred.

---

### Task 1 — Social removal + Contact placeholders
Files: delete `src/pages/Connect.tsx`, `src/components/InstagramBanner.tsx`; edit `App.tsx` (rm import L27, route L63), `Layout.tsx` (instaUrl L23, desktop Connect L37, IG icon L41–53, mobile Connect L93, footer Connect L114 + IG L115–122), `Home.tsx` (import L1 + usage L68), `Dashboard.tsx` (queue card L175–179 → replace with Contact card linking `#contact`).
Add **footer Contact block** in Layout: WhatsApp `tel:+20XXXXXXXXXX` placeholder · Telegram `https://t.me/themathmentor` · Email `mailto:support@themathmentor.com` — marked `<!-- owner fills -->` comment.
Commit: `feat(ui): remove social surfaces, add contact placeholders`

### Task 2 — Header + auth redirects + hover system
index.css: add
```css
.hover-lift { transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.hover-lift:hover { transform: translateY(-2px); box-shadow: rgba(0,0,0,0.08) 0px 6px 18px; }
```
Apply `.card-cute:hover` = same lift (single source). Layout edits:
- Logo `<a href="/">` → onClick navigate based on auth (`user ? '/dashboard' : '/'`) using existing router Link.
- Login link L67: `btn btn-outline px-4 py-1.5 text-sm font-semibold` (visible always).
- Sign Up L68: `btn btn-primary px-5 py-2 text-sm font-semibold shadow-sm hover-lift` (larger).
- All nav links get active-state underline via NavLink if trivial, else skip.
- Cards: add `.card-cute` gets `.hover-lift` behavior globally (merge rule into .card-cute:hover).
Login.tsx: redirect `/exams`→`/dashboard` (L12 + L34).
Commit: `feat(ui): header auth placement, logo routing, unified hover lift`

### Task 3 — Exam sheet polish
AntiCheatGuard.tsx timer (L56–65): enlarge to `text-2xl font-extrabold tabular-nums tracking-tight`; label "Time left".
Watermark.tsx rewrite: render ONLY print layer — wrap existing tile div in `<div className="hidden print:block">` with text `© The Math Mentor – Unauthorized distribution prohibited`; remove corner badge entirely.
Exam.tsx progress L298–307: reformat to `Question {i+1} of {total}` above existing bar; bar height 3→6px rounded.
Blur-on-blur: in AntiCheatGuard add:
```tsx
const [blurred, setBlurred] = useState(false)
useEffect(() => {
  const hide = () => setBlurred(document.visibilityState === 'hidden' || !document.hasFocus())
  document.addEventListener('visibilitychange', hide)
  window.addEventListener('blur', hide)
  window.addEventListener('focus', hide)
  return () => { /* remove all three */ }
}, [])
{blurred && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface/95 backdrop-blur-sm"><p className="font-display text-xl">Screen paused — click to continue</p></div>}
```
(click handler setBlurred(false)).
Commit: `feat(exam): sheet layout, big timer, print-only watermark, blur guard`

### Task 4 — Student dashboard simplify
Dashboard.tsx: DELETE Daily-tip card L175–179 and Recent Activity L305–330 (+ its query L55–59). Move Score Trend chart (L283–299) directly under welcome header as primary; Recent Attempts list becomes collapsible: wrap in `<details className="card-cute p-0"><summary className="cursor-pointer px-5 py-4 font-semibold">Recent Attempts ({n})</summary><div className="p-5 pt-0">{existing}</div></details>` replacing its Card wrapper header. New **What's Next** card at top of queue section: fetch published exams (fetchExams) filter out ids present in completedAttempts → list first 3 as numbered steps ("1. Circle Theorems → Start") linking /exam/:id; fallback empty text.
Commit: `feat(dashboard): what's-next queue, trend-first, collapsible attempts, declutter`

### Task 5 — Signup hardening
utils/disposable.ts: `const BLOCKED=[mailinator,temp-mail,guerrillamail,yopmail,10minutemail,throwaway,sharklasers,getnada,dispostable,fakeinbox]; export function isDisposableEmail(e){const d=e.split('@')[1]?.toLowerCase()??'';return BLOCKED.some(b=>d===b||d.endsWith('.'+b))}` + test file asserting examples true/false.
Register.tsx rewrite of form section: split First/Last name inputs (submit combined full_name), password rules min 8 incl. letter+number (regex check + inline error), parent phone REQUIRED (regex `^\+?\d{8,15}$`), isDisposableEmail check before signUp, all errors inline red text.
Commit: `feat(auth): required parent phone, strong password, first/last name, disposable-email block`
Supabase note to owner: Auth → Providers → Email → "Confirm email" must stay ON (default).

### Task 6 — Sidebar order + gates + ship
AdminSidebar items reorder: Dashboard, Users, Classes, Exams, Attempts, Violations | divider "Tools": CSV Import, CSV Export, Bulk Exams, Grading, Question Analysis.
Gates: lint/test/build green → push branch → CF preview URL → owner reviews locally (`npm run dev`) AND preview → approve → merge main.

## Self-review
All owner bullets from messy list covered except dark mode (deferred by decision) and screenshot-detection (replaced by blur-on-blur, agreed). Filters/cascades = Batch 2. Teacher grade→class hierarchy = Batch 2.
