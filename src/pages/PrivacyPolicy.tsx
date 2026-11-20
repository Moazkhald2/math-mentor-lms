import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LEGAL_CONTACT_EMAIL,
  CONSENT_POLICY_VERSION,
  LEGAL_LAST_UPDATED_AR,
  LEGAL_LAST_UPDATED_EN,
} from '../lib/legal'

export default function PrivacyPolicy() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
              lang === 'ar'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-surface text-text hover:border-brand'
            }`}
          >
            العربية (الرسمي)
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
              lang === 'en'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-surface text-text hover:border-brand'
            }`}
          >
            English Summary
          </button>
        </div>
        <span className="rounded-md bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
          Policy {CONSENT_POLICY_VERSION}
        </span>
      </div>

      {lang === 'ar' ? (
        <article dir="rtl" lang="ar" className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 text-right leading-relaxed text-text">
          <header className="space-y-2 border-b border-border/60 pb-4">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
              إشعار الخصوصية وحماية البيانات الشخصية — منصة The Math Mentor
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              آخر تحديث: {LEGAL_LAST_UPDATED_AR} — متوافق مع مبادئ قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">1. من نحن (المتحكم في البيانات)</h2>
            <p className="text-sm text-text-muted">
              تُدار منصة <strong className="text-text">The Math Mentor</strong> التعليمية بواسطة{' '}
              <strong className="text-text">معاذ خالد (Moaaz Khaled — The Math Mentor)</strong>. لأي استفسار أو طلب متعلق
              ببياناتك الشخصية أو طلب حذف الحساب، يرجى التواصل عبر البريد الإلكتروني الرسمي:{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline" dir="ltr">
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">2. البيانات التي نجمعها</h2>
            <p className="text-sm text-text-muted">نجمع فقط الحد الأدنى من البيانات اللازمة للعملية التعليمية:</p>
            <ul className="list-disc pr-5 space-y-1.5 text-sm text-text-muted">
              <li><strong className="text-text">بيانات الطالب:</strong> الاسم الحقيقي الكامل، البريد الإلكتروني، الصف الدراسي (من الأول إلى الثاني عشر)، والمجموعة الدراسية.</li>
              <li><strong className="text-text">بيانات ولي الأمر (للطلاب دون 18 عاماً):</strong> اسم ولي الأمر الكامل، رقم هاتف ولي الأمر، والبريد الإلكتروني لولي الأمر لتوثيق الموافقة القانونية وإرسال تقارير التقدم.</li>
              <li><strong className="text-text">البيانات التعليمية:</strong> إجابات أوراق التدريب والامتحانات، الدرجات، ومستوى الإتقان في المهارات الرياضية.</li>
              <li><strong className="text-text">بيانات الأمان ونزاهة الامتحانات:</strong> توقيت بدء وتسليم الامتحان، ورمز الجلسة النشطة لمنع الدخول المتزامن، وسجلات الأمان الأساسية.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">3. الغرض من جمع البيانات (التعليم فقط)</h2>
            <p className="text-sm text-text-muted">
              تُستخدم البيانات حصرياً لتقديم الاختبارات وأوراق التدريب، وتصحيح الإجابات، وتحسين شرح المعلم للمفاهيم الصعبة،
              وإرسال تقارير التقدم لولي الأمر.
            </p>
            <ul className="list-disc pr-5 space-y-1.5 text-sm text-text-muted">
              <li>لا نبيع بيانات الطلاب ولا نشاركها مع أي جهة إعلانية أو تسويقية.</li>
              <li>لا نستخدم الذكاء الاصطناعي الخارجي لمعالجة بيانات الطلاب أثناء الامتحانات.</li>
              <li>لا تُستخدم ميزات التحفيز الاختيارية (مثل النقاط أو الشارات) لأي تنميط سلوكي أو تجاري.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">4. حماية القُصّر وموافقة ولي الأمر (قانون رقم 151 لسنة 2020)</h2>
            <p className="text-sm text-text-muted">
              لا يجوز لأي طالب دون سن <strong className="text-text">18 عاماً</strong> إنشاء حساب أو تقديم بياناته الشخصية دون
              علم وموافقة ولي أمره القانوني. عند التسجيل، نطلب تأكيد موافقة ولي الأمر وتوثيق اسمه وبريده الإلكتروني ورقم هاتفه
              وتاريخ الموافقة وإصدار هذه السياسة في سجل تدقيق آمن.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">5. مدد الاحتفاظ بالبيانات</h2>
            <ul className="list-disc pr-5 space-y-1.5 text-sm text-text-muted">
              <li><strong className="text-text">سجلات النشاط والأمان:</strong> تُحذف تلقائياً بعد <strong>90 يوماً</strong>.</li>
              <li><strong className="text-text">حساب الطالب ونتائج الامتحانات:</strong> يُحتفظ بها طوال فترة الدراسة النشطة مع المعلم، وتُحذف خلال <strong>30 يوماً</strong> من استلام طلب حذف رسمي من ولي الأمر أو الطالب البالغ، أو بعد مرور <strong>12 شهراً</strong> من انتهاء العلاقة التعليمية دون نشاط.</li>
              <li><strong className="text-text">روابط تقارير ولي الأمر:</strong> روابط مؤقتة تنتهي تلقائياً خلال <strong>7 إلى 30 يوماً</strong> ويمكن إلغاؤها فوراً بضغطة واحدة.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">6. مزودو البنية التحتية التقنية</h2>
            <p className="text-sm text-text-muted">
              نعتمد على مزودين موثوقين لتشغيل المنصة بأعلى معايير الأمان: <strong className="text-text">Supabase</strong>{' '}
              (قواعد البيانات والمصادقة المشفرة)، <strong className="text-text">Cloudflare Pages</strong> (استضافة الواجهة
              وحماية الاتصال)، و<strong className="text-text">Brevo / Resend</strong> (لإرسال رسائل تأكيد الحساب وإعادة تعيين كلمة المرور فقط).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">7. حقوق الطالب وولي الأمر</h2>
            <p className="text-sm text-text-muted">يحق لولي الأمر (أو الطالب البالغ 18+ عاماً) في أي وقت:</p>
            <ol className="list-decimal pr-5 space-y-1 text-sm text-text-muted">
              <li>الاطلاع على كافة البيانات المسجلة لدينا.</li>
              <li>طلب تصحيح أي بيانات غير دقيقة.</li>
              <li>سحب الموافقة وإيقاف الإشعارات الاختيارية.</li>
              <li>
                طلب الحذف الكامل للحساب وجميع البيانات المرتبطة به، ويُنفّذ الطلب خلال <strong className="text-text">14 يوم عمل</strong>{' '}
                عبر التواصل على{' '}
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline" dir="ltr">
                  {LEGAL_CONTACT_EMAIL}
                </a>
                .
              </li>
            </ol>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
            <Link to="/terms" className="font-bold text-brand hover:underline">
              ← قراءة شروط الاستخدام
            </Link>
            <Link to="/register" className="font-bold text-ink hover:text-brand">
              العودة إلى صفحة التسجيل
            </Link>
          </div>
        </article>
      ) : (
        <article dir="ltr" lang="en" className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 leading-relaxed text-text">
          <header className="space-y-2 border-b border-border/60 pb-4">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
              Privacy Notice & Personal Data Protection — The Math Mentor
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              Last updated: {LEGAL_LAST_UPDATED_EN} — Aligned with Egyptian Personal Data Protection Law No. 151 of 2020
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">1. Data Controller</h2>
            <p className="text-sm text-text-muted">
              <strong className="text-text">The Math Mentor</strong> LMS is operated by{' '}
              <strong className="text-text">Moaaz Khaled — The Math Mentor</strong>. For any privacy inquiry or account
              deletion request, contact{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-muted">
              <li><strong className="text-text">Student Info:</strong> Real full name, email address, Grade (1–12), and enrolled study group.</li>
              <li><strong className="text-text">Guardian Info (Students under 18):</strong> Legal guardian full name, guardian email, and parent phone number to document consent and deliver progress reports.</li>
              <li><strong className="text-text">Academic Records:</strong> Practice sheet and exam answers, scores, and math skill mastery.</li>
              <li><strong className="text-text">Exam Security Logs:</strong> Attempt timestamps, active session token (preventing simultaneous device logins), and core security events.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">3. Educational Purpose Only</h2>
            <p className="text-sm text-text-muted">
              Data is used strictly for running math practice sheets and exams, grading, helping the teacher identify difficult concepts, and sharing progress with parents. We never sell student data, run third-party ads, send live exam data to external AI models, or use opt-in gamification for behavioral profiling.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">4. Minors & Guardian Consent (Egyptian Law No. 151/2020)</h2>
            <p className="text-sm text-text-muted">
              Students under <strong className="text-text">18 years old</strong> may not register without legal guardian knowledge and consent. At sign-up, guardian details, consent policy version ({CONSENT_POLICY_VERSION}), and timestamp are logged in an immutable audit table.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">5. Data Retention Periods</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-muted">
              <li><strong className="text-text">Activity & Security Logs:</strong> Automatically pruned after <strong>90 days</strong>.</li>
              <li><strong className="text-text">Student Accounts & Results:</strong> Kept during active study, deleted within <strong>30 days</strong> of an official guardian/adult deletion request or after <strong>12 months</strong> of inactivity following the end of instruction.</li>
              <li><strong className="text-text">Parent Report Links:</strong> Expire automatically within <strong>7–30 days</strong> and can be revoked instantly.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">6. Infrastructure Sub-Processors</h2>
            <p className="text-sm text-text-muted">
              Supabase (encrypted database & auth), Cloudflare Pages (frontend delivery & TLS), and Brevo/Resend (transactional account confirmation & password reset emails only).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">7. Your Rights</h2>
            <p className="text-sm text-text-muted">
              Guardians and adult students may request access, correction, consent withdrawal, or complete deletion at any time via{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>{' '}
              (fulfilled within <strong>14 business days</strong>).
            </p>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
            <Link to="/terms" className="font-bold text-brand hover:underline">
              Read Terms of Service →
            </Link>
            <Link to="/register" className="font-bold text-ink hover:text-brand">
              Back to Registration
            </Link>
          </div>
        </article>
      )}
    </div>
  )
}
