import type { Question } from '../types'
import DifficultyBadge from './DifficultyBadge'

function parseMistakes(raw: unknown): { mistake: string; why: string; correct: string }[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return []
}

export default function QuestionCard({ question }: { question: Question }) {
  const mistakes = parseMistakes(question.common_mistakes)

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-3 flex items-center gap-3">
        <DifficultyBadge level={question.difficulty} />
        <span className="text-xs text-text-muted">{question.subject}</span>
        <span className="text-xs capitalize text-text-muted">{question.topic}</span>
        <span className="ml-auto text-xs uppercase text-text-muted">{question.type.replace('_', ' ')}</span>
      </div>

      <p className="mb-4 font-medium text-text">{question.question_text}</p>

      {question.type === 'multiple_choice' && (question.options?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-2 text-sm ${
                i === Number(question.correct_answer)
                  ? 'border-accent-green bg-accent-green/5 text-accent-green'
                  : 'border-border text-text-muted'
              }`}
            >
              <span className="mr-2 font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </div>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-3">
          {['True', 'False'].map((opt) => (
            <div
              key={opt}
              className={`rounded-lg border px-4 py-2 text-sm ${
                opt.toLowerCase() === question.correct_answer
                  ? 'border-accent-green bg-accent-green/5 text-accent-green'
                  : 'border-border text-text-muted'
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand hover:text-brand-light">
            Explanation
          </summary>
          <p className="mt-2 rounded-lg bg-ink/50 p-4 text-sm leading-relaxed text-text-muted">
            {question.explanation}
          </p>
        </details>
      )}

      {mistakes.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-accent-gold hover:text-warning">
            Common Mistakes
          </summary>
          <div className="mt-2 space-y-3">
            {mistakes.map((cm, i) => (
              <div key={i} className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 p-3">
                <p className="mb-1 text-sm">
                  <span className="font-semibold text-danger">✗ {cm.mistake}</span>
                </p>
                <p className="mb-1 text-xs text-text-muted">Why: {cm.why}</p>
                <p className="text-sm text-accent-green">✓ Correct: {cm.correct}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
