# Launch Security, Custom SMTP & Backup Runbook (Step 2)

Complete every checklist item below before onboarding real students or enabling Phase 1 group invite links.

---

## 1. Custom SMTP Setup for Supabase Auth (Mandatory — Do Not Use Built-In Sender)

Supabase's built-in Auth email service is limited to **2 emails/hour project-wide** and is unsuitable for real student signups or password resets.

### Primary Provider: Brevo Free (300 emails/day, no daily rollover)
1. Create a free account at **Brevo** (`brevo.com`) and verify a sender email/domain (SPF + DKIM DNS records on your domain if you have one, or verified sender email for initial pilot).
2. In Brevo → **SMTP & API → SMTP**, generate an SMTP key and copy:
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Username:** your Brevo login email
   - **Password:** your generated Brevo SMTP key
3. In **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**:
   - Enable **Custom SMTP**.
   - Enter Brevo Host, Port `587`, Username, Password, Sender Email, and Sender Name (`The Math Mentor`).
4. In **Supabase Dashboard → Authentication → Rate Limits**:
   - Start conservatively at **30 emails/hour** (Supabase's safe default for custom SMTP).
   - Raise this cap **only after** confirming clean deliverability and zero bounce/spam complaints.

### Documented Fallback: Resend Free (100 emails/day, 3,000/month)
- If Brevo is ever unavailable, configure Resend SMTP (`smtp.resend.com`, port `465`, user `resend`, pass `re_...`), keeping in mind its **100/day** Free ceiling (resets at midnight UTC).

### Mandatory Deliverability Test Checklist
- [ ] New student signup confirmation arrives in **Gmail** inbox (not Spam).
- [ ] New student signup confirmation arrives in **Outlook / Hotmail** inbox.
- [ ] Test signup & password reset with a common Egyptian student/parent email address.
- [ ] Confirm the **60-second resend cooldown** button works cleanly in `/register` and `/forgot-password`.
- [ ] Confirm friendly rate-limit notice appears if resent repeatedly.

---

## 2. GitHub & Cloudflare Free Security Checklist

### GitHub Repository (`Moazkhald2/math-mentor-lms`)
- [ ] Repository visibility is set to **Private** (`Settings → General → Danger Zone → Change visibility`).
- [ ] Dependabot security alerts reviewed and patched periodically.
- [ ] `.env`, `backups/`, and service-role keys are **never** committed (`.gitignore` enforced).

### Cloudflare Pages & Edge Protection
- [ ] Verify production headers via `curl -I https://safe-optimization.math-mentor-lms.pages.dev` (or your custom domain):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
- [ ] When using a custom domain on Cloudflare DNS:
  - Enable **Bot Fight Mode** (`Security → Bots` — basic Free protection; still rely on Supabase RPC rate limits).
  - Set SSL/TLS encryption mode to **Full (strict)** + **Always Use HTTPS**.

---

## 3. Local Database Backup & Restore Drill (Supabase Free Has No Automated PITR)

Run a local snapshot weekly (and before every major exam or migration):

```powershell
$env:SUPABASE_URL="https://vjhzbqtoktktrjevcodq.supabase.co"
$env:SUPABASE_SERVICE_KEY="<your-service-role-key-from-supabase-dashboard>"
node scripts/backup.mjs
node scripts/restore-drill.mjs backups/2026-11-20
```

- [ ] Backup finishes with exit code `0` and writes `backups/<YYYY-MM-DD>/manifest.json`.
- [ ] `restore-drill.mjs` prints `PASS` (all SHA-256 checksums + core tables verified).
- [ ] Store an encrypted copy of the latest backup folder off-machine (e.g., encrypted USB or private cloud drive).
- [ ] Never commit `backups/` to Git (`backups/` is gitignored).
