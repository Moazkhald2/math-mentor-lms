# Practice Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save practice attempt answers to the database per-question, replacing the current in-memory-only flow.

**Architecture:** Uses existing `exam_attempts` + `answers` tables. During practice, each answer selection upserts into `answers`. On finish, the attempt is marked completed and the user is redirected to the existing `/results/:attemptId` route. A migration adds a `UNIQUE (attempt_id, question_id)` constraint to `answers` to enable upsert.

**Tech Stack:** React 19 + TypeScript + Supabase + TanStack Query v5 + Vitest v4

**Global Constraints:**
- Follow existing `lib/exams.ts` pattern for data functions (import from `./supabase`, throw on error, return typed data)
- Follow existing `src/test/lib/exams.test.ts` pattern for tests (mock `../../lib/supabase`, chainable query builder)
- TypeScript strict mode
- All new tests must pass before commit

---

### Task 1: Add UNIQUE constraint migration for answers table

**Files:**
- Create: `supabase/migration-003-answers-upsert.sql`
- Test: N/A (raw SQL)

**Interfaces:**
- Consumes: existing `answers` table from schema.sql
- Produces: `UNIQUE (attempt_id, question_id)` constraint on `answers`

- [ ] **Step 1: Write the migration**

```sql
-- Add unique constraint on (attempt_id, question_id) to enable upserts
ALTER TABLE public.answers
ADD CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id);
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` or apply manually in Supabase SQL editor.

- [ ] **Step 3: Add migration reference to schema.sql header comment**

```sql
-- Migrations applied:
-- 001: Initial schema
-- 002: audit_logs table
-- 003: answers UNIQUE (attempt_id, question_id)
```

---

### Task 2: Create practice data library

**Files:**
- Create: `src/lib/practice.ts`
- Test: `src/test/lib/practice.test.ts`

**Interfaces:**
- Consumes: `supabase` client, types (`ExamAttempt`, `Answer`)
- Produces: `startPractice`, `upsertAnswer`, `finishPractice` functions with exact signatures below

- [ ] **Step 1: Write the failing tests**

Create `src/test/lib/practice.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (onFulfilled: any) => Promise.resolve(resolveValue).then(onFulfilled),
  }
  return chain
}

vi.mock('../../lib/supabase', () => {
  const mockQuery = createQueryBuilder([])
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  }
})

import { supabase } from '../../lib/supabase'
import { startPractice, upsertAnswer, finishPractice } from '../../lib/practice'

describe('practice lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startPractice', () => {
    it('inserts exam_attempt with exam_id, user_id, started_at, status in_progress', async () => {
      const qb = createQueryBuilder([{ id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', status: 'in_progress' }])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await startPractice('exam-1', 'user-1')
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({
        exam_id: 'exam-1',
        user_id: 'user-1',
        status: 'in_progress',
        started_at: expect.any(String),
      }))
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the created attempt', async () => {
      const mockAttempt = { id: 'att-1', exam_id: 'exam-1', status: 'in_progress' }
      const qb = createQueryBuilder([mockAttempt])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await startPractice('exam-1', 'user-1')
      expect(result).toEqual(mockAttempt)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(startPractice('exam-1', 'user-1')).rejects.toThrow('DB error')
    })
  })

  describe('upsertAnswer', () => {
    it('upserts into answers table with attempt_id, question_id, answer, is_correct, points_earned', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await upsertAnswer('att-1', 'q-1', 'B', true, 1)
      expect(supabase.from).toHaveBeenCalledWith('answers')
      expect(qb.upsert).toHaveBeenCalledWith({
        attempt_id: 'att-1',
        question_id: 'q-1',
        answer: 'B',
        is_correct: true,
        points_earned: 1,
      })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('defaults isCorrect to false and pointsEarned to 0', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await upsertAnswer('att-1', 'q-1', 'A')
      expect(qb.upsert).toHaveBeenCalledWith({
        attempt_id: 'att-1',
        question_id: 'q-1',
        answer: 'A',
        is_correct: false,
        points_earned: 0,
      })
    })

    it('returns the upserted answer', async () => {
      const mockAnswer = { id: 'ans-1', attempt_id: 'att-1', answer: 'A' }
      const qb = createQueryBuilder([mockAnswer])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await upsertAnswer('att-1', 'q-1', 'A')
      expect(result).toEqual(mockAnswer)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Upsert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(upsertAnswer('att-1', 'q-1', 'A')).rejects.toThrow('Upsert failed')
    })
  })

  describe('finishPractice', () => {
    it('updates exam_attempts with completed_at, score, total_points, status completed', async () => {
      const qb = createQueryBuilder([{ id: 'att-1', score: 7, status: 'completed' }])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await finishPractice('att-1', 7, 10)
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({
        completed_at: expect.any(String),
        score: 7,
        total_points: 10,
        status: 'completed',
      }))
      expect(qb.eq).toHaveBeenCalledWith('id', 'att-1')
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the updated attempt', async () => {
      const mockAttempt = { id: 'att-1', score: 7, status: 'completed' }
      const qb = createQueryBuilder([mockAttempt])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await finishPractice('att-1', 7, 10)
      expect(result).toEqual(mockAttempt)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Update failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(finishPractice('att-1', 7, 10)).rejects.toThrow('Update failed')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/lib/practice.test.ts`
Expected: FAIL — `Cannot find module '../../lib/practice'`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/practice.ts`:

```typescript
import { supabase } from './supabase'
import type { ExamAttempt, Answer } from '../types'

export async function startPractice(examId: string, userId: string) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .insert({
      exam_id: examId,
      user_id: userId,
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .select()
    .single()

  if (error) throw error
  return data as ExamAttempt
}

export async function upsertAnswer(
  attemptId: string,
  questionId: string,
  answer: string,
  isCorrect = false,
  pointsEarned = 0
) {
  const { data, error } = await supabase
    .from('answers')
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    })
    .select()
    .single()

  if (error) throw error
  return data as Answer
}

export async function finishPractice(attemptId: string, score: number, totalPoints: number) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .update({
      completed_at: new Date().toISOString(),
      score,
      total_points: totalPoints,
      status: 'completed',
    })
    .eq('id', attemptId)
    .select()
    .single()

  if (error) throw error
  return data as ExamAttempt
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/lib/practice.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/practice.ts src/test/lib/practice.test.ts supabase/migration-003-answers-upsert.sql
git commit -m "feat(practice): add practice lib with upsert support"
```

---

### Task 3: Rewrite Practice.tsx to persist to DB

**Files:**
- Modify: `src/pages/Practice.tsx` (full rewrite)
- Test: `src/test/pages/PracticePage.test.tsx`

**Interfaces:**
- Consumes: `startPractice`, `upsertAnswer`, `finishPractice` from `src/lib/practice.ts`
- Produces: Updated Practice page with DB-backed persistence

- [ ] **Step 1: Write the failing integration tests**

Create `src/test/pages/PracticePage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Practice from '../../pages/Practice'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock practice lib
vi.mock('../../lib/practice', () => ({
  startPractice: vi.fn(),
  upsertAnswer: vi.fn(),
  finishPractice: vi.fn(),
}))

// Mock auth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com', user_metadata: { full_name: 'Test' }, email_confirmed_at: 'yes' } }),
}))

// Mock activity logger
vi.mock('../../hooks/useActivityLogger', () => ({
  useActivityLogger: () => ({ log: vi.fn() }),
}))

// Mock shuffle
vi.mock('../../lib/shuffle', () => ({
  seededShuffle: (arr: any[]) => [...arr],
  shuffleMultipleChoice: (opts: string[], correct: string) => ({ options: opts, correctAnswer: correct }),
}))

import { supabase } from '../../lib/supabase'
import { startPractice, upsertAnswer, finishPractice } from '../../lib/practice'
import type { ExamAttempt } from '../../types'

function renderPractice() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/exam-1']}>
        <Routes>
          <Route path="/practice/:id" element={<Practice />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function createQueryBuilder(returnData: any[] = []) {
  const chain: any = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    order: vi.fn(() => chain),
  }
  return chain
}

describe('PracticePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts a practice attempt on mount', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(startPractice).mockResolvedValue(mockAttempt)

    const qb = createQueryBuilder([{
      id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false,
      questions: [{ id: 'eq-1', question: { id: 'q-1', type: 'multiple_choice', question_text: 'What is 2+2?', options: ['3', '4', '5'], correct_answer: '1', explanation: '2+2=4' } }]
    }])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => {
      expect(startPractice).toHaveBeenCalledWith('exam-1', 'user-1')
    })
  })

  it('upserts answer when user submits', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(startPractice).mockResolvedValue(mockAttempt)
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)

    const qb = createQueryBuilder([{
      id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false,
      questions: [{ id: 'eq-1', question: { id: 'q-1', type: 'multiple_choice', question_text: 'What is 2+2?', options: ['3', '4', '5'], correct_answer: '1', explanation: '2+2=4' } }]
    }])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('What is 2+2?')).toBeInTheDocument())
    await userEvent.click(screen.getByText('4'))
    await userEvent.click(screen.getByText('Submit Answer'))

    await waitFor(() => {
      expect(upsertAnswer).toHaveBeenCalledWith('att-1', 'q-1', '1', true, expect.any(Number))
    })
  })

  it('completes practice and redirects to results', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(startPractice).mockResolvedValue(mockAttempt)
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)
    vi.mocked(finishPractice).mockResolvedValue({ id: 'att-1', score: 1, total_points: 1, status: 'completed' } as any)

    const qb = createQueryBuilder([{
      id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false,
      questions: [{ id: 'eq-1', question: { id: 'q-1', type: 'multiple_choice', question_text: 'What is 2+2?', options: ['3', '4', '5'], correct_answer: '1', explanation: '2+2=4' } }]
    }])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('What is 2+2?')).toBeInTheDocument())
    await userEvent.click(screen.getByText('4'))
    await userEvent.click(screen.getByText('Submit Answer'))
    await waitFor(() => expect(screen.getByText('Next Question →')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Next Question →'))

    await waitFor(() => {
      expect(finishPractice).toHaveBeenCalledWith('att-1', 1, 1)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/pages/PracticePage.test.tsx`
Expected: FAIL — tests reference functions not yet in Practice.tsx

- [ ] **Step 3: Rewrite Practice.tsx**

```typescript
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExamQuestions } from '../lib/exams'
import { startPractice, upsertAnswer, finishPractice } from '../lib/practice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
import LatexRenderer from '../components/LatexRenderer'
import type { Exam, ExamQuestion, Question, ExamAttempt } from '../types'

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { log } = useActivityLogger(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const attemptRef = useRef<ExamAttempt | null>(null)
  const [saving, setSaving] = useState(false)

  type ExamWithQuestions = Exam & { questions: (ExamQuestion & { question: Question })[] }

  const { data: exam } = useQuery<ExamWithQuestions>({
    queryKey: ['practice', id],
    queryFn: async () => {
      const [examResult, rawQuestions] = await Promise.all([
        supabase.from('exams').select('*').eq('id', id!).single(),
        fetchExamQuestions(id!),
      ])
      if (examResult.error) throw examResult.error
      const seed = id || 'practice_default'
      const shuffled = examResult.data.shuffle_questions
        ? seededShuffle(rawQuestions, seed + '_questions')
        : [...rawQuestions]
      const mapped = shuffled.map(eq => {
        if (eq.question.type === 'multiple_choice' && eq.question.options.length > 0) {
          const { options, correctAnswer } = shuffleMultipleChoice(
            eq.question.options, eq.question.correct_answer, seed + eq.question.id
          )
          return { ...eq, question: { ...eq.question, options, correct_answer: correctAnswer } }
        }
        return eq
      })
      return { ...(examResult.data as Exam), questions: mapped }
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (id && user) {
      startPractice(id, user.id).then(attempt => {
        attemptRef.current = attempt
        log('practice_started', { exam_id: id })
      }).catch(() => {})
    }
  }, [id, user])

  if (!user) return null
  if (!exam || !exam.questions || exam.questions.length === 0) return <p className="text-text-muted">Loading...</p>

  const eqs = exam.questions
  const current = eqs[currentIndex]
  if (!current) return <p className="text-text-muted">Loading question...</p>

  const handleSubmit = async () => {
    if (!selectedAnswer || !attemptRef.current) return
    setSaving(true)
    const ans = selectedAnswer ?? ''
    const correct = current.question.type === 'short_answer'
      ? ans.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
      : ans === current.question.correct_answer
    try {
      await upsertAnswer(attemptRef.current.id, current.question.id, ans, correct, correct ? 1 : 0)
      setSubmitted(true)
      log('practice_answered', { question_id: current.question.id, correct, answer_given: selectedAnswer })
    } catch (e) {
      console.error('Failed to save answer', e)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    if (currentIndex < eqs.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setSubmitted(false)
    } else {
      if (attemptRef.current) {
        const total = eqs.length
        const { data: savedAnswers } = await supabase
          .from('answers')
          .select('is_correct')
          .eq('attempt_id', attemptRef.current.id)
        const correctCount = savedAnswers?.filter(a => a.is_correct).length ?? 0
        await finishPractice(attemptRef.current.id, correctCount, total)
        log('exam_submitted', { total, correct: correctCount, attempt_id: attemptRef.current.id })
      }
      navigate(`/results/${attemptRef.current!.id}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">{exam.title}</h1>
        <span className="text-sm text-text-muted">Question {currentIndex + 1} of {eqs.length}</span>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-6">
        {current.question.image_url && (
          <div className="mb-4 flex justify-center">
            <img src={current.question.image_url} alt="Diagram" className="max-h-48 rounded-lg" />
          </div>
        )}
        <p className="mb-6 text-lg font-medium text-text"><LatexRenderer content={current.question.question_text} /></p>

        {current.question.type === 'multiple_choice' && current.question.options.map((opt, i) => (
          <button key={i} onClick={() => !submitted && setSelectedAnswer(String(i))}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? String(i) === current.question.correct_answer ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === String(i) ? 'border-danger bg-danger/5' : 'border-border'
                : selectedAnswer === String(i) ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            }`}
          >
            <LatexRenderer content={opt} />
          </button>
        ))}

        {current.question.type === 'true_false' && ['true', 'false'].map(opt => (
          <button key={opt} onClick={() => !submitted && setSelectedAnswer(opt)}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? opt === current.question.correct_answer ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === opt ? 'border-danger bg-danger/5' : 'border-border'
                : selectedAnswer === opt ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            }`}
          >
            {opt === 'true' ? 'True' : 'False'}
          </button>
        ))}

        {current.question.type === 'short_answer' && (
          <input value={selectedAnswer ?? ''} onChange={e => !submitted && setSelectedAnswer(e.target.value)}
            placeholder="Type your answer..." className="w-full rounded-lg border border-border bg-white px-4 py-3 text-ink"
            disabled={submitted}
          />
        )}
      </div>

      {submitted && (
        <div className={`mb-6 rounded-xl border p-4 ${
          selectedAnswer !== null && (
            current.question.type === 'short_answer'
              ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
              : selectedAnswer === current.question.correct_answer
          ) ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'
        }`}>
          <p className={`font-bold ${
            selectedAnswer !== null && (
              current.question.type === 'short_answer'
                ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
                : selectedAnswer === current.question.correct_answer
            ) ? 'text-accent-green' : 'text-danger'
          }`}>
            {selectedAnswer !== null && (
              current.question.type === 'short_answer'
                ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
                : selectedAnswer === current.question.correct_answer
            ) ? 'Correct!' : 'Wrong'}
          </p>
          {selectedAnswer !== null && !(
            current.question.type === 'short_answer'
              ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
              : selectedAnswer === current.question.correct_answer
          ) && <p className="text-sm text-accent-green mt-1">Correct answer: {current.question.correct_answer}</p>}
          <p className="mt-1 text-sm text-text-muted"><LatexRenderer content={current.question.explanation} /></p>
        </div>
      )}

      <div className="flex justify-between">
        {submitted
          ? <button onClick={handleNext} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white">
              {currentIndex < eqs.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          : <button onClick={handleSubmit} disabled={!selectedAnswer || saving}
              className="rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Submit Answer'}
            </button>
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/pages/PracticePage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/Practice.tsx src/test/pages/PracticePage.test.tsx
git commit -m "feat(practice): persist answers to DB in real-time"
```

---

### Task 4: Add practice stats to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: existing exam_attempts query (also includes practice attempts since both use same table)
- Produces: Dashboard showing practice stats alongside exam stats

- [ ] **Step 1: Modify Dashboard to show practice history**

In `src/pages/Dashboard.tsx`, add the following changes:

1. Update the attempts query to include `type` from the exam join
2. Add practice-specific stats card
3. Show practice attempts in the recent attempts list

Update the attempts query (around line 36-50):

```typescript
const { data: attempts } = useQuery({
  queryKey: ['my-attempts', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*, exam:exams(title, type)')
      .eq('user_id', user!.id)
      .order('started_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return data as (ExamAttempt & { exam: { title: string; type: string } })[]
  },
  enabled: !!user,
})
```

Add a practice stats card between the exams taken and avg score cards (around line 162):

```typescript
<div className="rounded-xl border border-accent-green/40 bg-surface p-6">
  <span className="inline-block rounded bg-accent-green/20 px-2 py-0.5 text-xs font-semibold text-accent-green">Practice Completed</span>
  <p className="mt-2 text-3xl font-black text-text">
    {attempts?.filter((a) => a.status === 'completed' && (a.exam as any)?.type === 'practice').length ?? 0}
  </p>
</div>
```

Update recent attempts list to show exam type badge:

After the date in the attempts list (around line 200-204), add a type badge:

```typescript
<p className="text-xs text-text-muted">
  {new Date(a.started_at).toLocaleDateString()}
</p>
{(a.exam as any)?.type === 'practice' && (
  <span className="ml-2 rounded bg-accent-green/20 px-2 py-0.5 text-xs text-accent-green">Practice</span>
)}
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(dashboard): show practice stats and history"
```

---

## Self-Review Checklist

1. **Spec coverage:** ✓ All spec requirements covered (per-answer upsert, start/finish practice, redirect to results, dashboard stats)
2. **Placeholder scan:** ✓ No TBD, TODO, or placeholder patterns
3. **Type consistency:** ✓ Function signatures match across tasks - `startPractice(examId, userId)`, `upsertAnswer(attemptId, questionId, answer, isCorrect, pointsEarned)`, `finishPractice(attemptId, score, totalPoints)`
