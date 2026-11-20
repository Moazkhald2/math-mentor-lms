import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LEGAL_CONTACT_EMAIL,
  CONSENT_POLICY_VERSION,
  LEGAL_LAST_UPDATED_AR,
  LEGAL_LAST_UPDATED_EN,
} from '../lib/legal'

export default function TermsOfService() {
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
          Terms {CONSENT_POLICY_VERSION}
        </span>
      </div>

      {lang === 'ar' ? (
        <article dir="rtl" lang="ar" className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 text-right leading-relaxed text-text">
          <header className="space-y-2 border-b border-border/60 pb-4">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
              شروط الاستخدام — منصة The Math Mentor
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">آخر تحديث: {LEGAL_LAST_UPDATED_AR}</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">1. الاستخدام التعليمي الشخصي فقط</h2>
            <p className="text-sm text-text-muted">
              حساب الطالب شخصي ومخصص لاستخدامه التعليمي فقط في التدريبات والامتحانات مع معلمه، ولا يجوز مشاركة بيانات الدخول
              أو السماح لشخص آخر بأداء الامتحانات نيابة عن الطالب.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">2. نزاهة الامتحانات</h2>
            <p className="text-sm text-text-muted">
              يُمنع استخدام أدوات مساعدة غير مصرح بها، أو تصوير أو تسريب أسئلة الامتحانات، أو محاولة التلاعب بالمؤقت أو النظام
              أو فتح الامتحان على أكثر من جهاز في نفس الوقت. يحق للمعلم مراجعة سجل الأمان وإلغاء المحاولة عند ثبوت المخالفة.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">3. الملكية الفكرية</h2>
            <p className="text-sm text-text-muted">
              جميع الأسئلة، أوراق التدريب، الرسومات الهندسية، الشروحات، وتصميم المنصة مملوكة حصرياً لـ{' '}
              <strong className="text-text">معاذ خالد — The Math Mentor</strong> ولا يجوز نسخها أو إعادة نشرها أو استخدامها
              تجارياً دون إذن كتابي مسبق.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">4. موافقة ولي الأمر وحذف الحساب</h2>
            <p className="text-sm text-text-muted">
              يخضع تسجيل الطلاب دون 18 عاماً لموافقة ولي الأمر القانوني وفقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة
              2020. يمكن لولي الأمر أو الطالب البالغ طلب حذف الحساب والبيانات في أي وقت عبر{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline" dir="ltr">
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
            <Link to="/privacy" className="font-bold text-brand hover:underline">
              ← قراءة إشعار الخصوصية
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
              Terms of Service — The Math Mentor
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">Last updated: {LEGAL_LAST_UPDATED_EN}</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">1. Personal Educational Use Only</h2>
            <p className="text-sm text-text-muted">
              Student accounts are strictly personal for math practice and assessments. Account credentials may not be shared, and another person may not complete exams on a student&apos;s behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">2. Exam Integrity</h2>
            <p className="text-sm text-text-muted">
              Unauthorized assistance, photographing or leaking exam questions, tampering with timers or APIs, or attempting simultaneous multi-device logins are prohibited. Teachers may invalidate compromised attempts after reviewing security logs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">3. Intellectual Property</h2>
            <p className="text-sm text-text-muted">
              All questions, practice sheets, diagrams, explanations, and platform code are the exclusive property of{' '}
              <strong className="text-text">Moaaz Khaled — The Math Mentor</strong> and may not be copied or redistributed without prior written permission.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-ink">4. Guardian Consent & Account Deletion</h2>
            <p className="text-sm text-text-muted">
              Registration for students under 18 requires legal guardian consent under Egyptian Law No. 151 of 2020. Guardians or adult students may request account deletion anytime via{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
            <Link to="/privacy" className="font-bold text-brand hover:underline">
              Read Privacy Notice →
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
