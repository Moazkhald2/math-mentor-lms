# Admin Panel + Class System + Question Display + Analytics

## Overview

Build the teacher/admin tooling layer: admin panel with user/class/question/exam/attempt management, a full class system (grades 3-12), LaTeX-rendered question cards, practice sheets with instant feedback, student activity logging, and basic analytics charts.

## 1. Class System

### New Tables

```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 3 AND 12),
  teacher_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
```

### Changes to Profiles

Add `grade INTEGER CHECK (grade BETWEEN 3 AND 12)` column.

### RLS

- Admins see all classes/members
- Teachers see their own classes
- Students see their own class(es)
- Admins can insert/update classes and members

## 2. Content Types: Exam vs Practice Sheet

Add `type` column to `exams` table: `'exam' | 'practice'`.

| | Exam | Practice Sheet |
|---|---|---|
| Timer | Required | None |
| Feedback | After submission | Instant (per question) |
| Passing score | Configurable | N/A |
| Tracked | Yes | Yes |
| Grade filter | Student sees only their grade | Same |

### UI Behavior

- **Exam**: full-screen enforced, anti-cheat active, submit at end → see results + correct answers + explanations
- **Practice**: no timer, no full-screen, answer one question → see green/red + explanation → next button
- Both listed on /exams page with badge distinguishing them

## 3. Student Activity Log

### New Table

```sql
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  exam_id UUID REFERENCES public.exams(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_exam ON public.activity_logs(exam_id);
```

### Actions Logged

- `exam_started` — { exam_title, time_limit }
- `question_answered` — { question_id, time_spent_seconds, answer_given }
- `tab_switch` — { count, duration_away }
- `exam_submitted` — { score, total_points, time_spent }
- `practice_answered` — { question_id, correct, time_spent }
- `violation` — { type: 'blur'|'copy'|'paste'|'contextmenu'|'devtools', detail }

### Viewing

- Admin: see any student's activity log
- Student: see own activity log on dashboard / settings

## 4. Admin Panel

Route: `/admin`, admin role required. Sub-pages:

### /admin (dashboard)
- Summary cards: total users, total exams, total attempts, active classes
- Chart: users created over time (simple area/bar)
- Chart: attempts over time (line)

### /admin/users
- Table: email, full_name, role, grade, class, created_at
- Search by name/email
- Filter by role, grade
- Click to edit: change role, change grade
- Delete user (confirm dialog)

### /admin/classes
- Create class form: name, grade, teacher (dropdown)
- Table of all classes: name, grade, teacher, student count
- Click class → see members list
- Assign/remove students from class
- Delete class

### /admin/questions
- Table of all questions: type, subject, topic, difficulty, preview (truncated)
- Filter by type, difficulty, subject
- Click to view full question with rendered LaTeX
- Delete question (confirm)

### /admin/exams
- Table: title, type (exam/practice), time (if exam), published, created_by
- Toggle published/unpublished
- Filter by type
- Delete exam (confirm)

### /admin/attempts
- Table: student, exam, score, status, started_at, completed_at
- Filter by student, exam, status, date range
- Click → view full attempt detail (answers, correct/incorrect)

## 5. Settings Page

Route: `/settings`

### Fields
- Edit full_name
- Edit grade (if student)
- Change password (calls Supabase auth.updateUser)

## 6. Question Display (LaTeX)

- Import KaTeX CSS and JS (already installed)
- Create `LatexRenderer` component
- All question cards use it for `question_text`, `explanation`, `options`
- Math delimiters: `$...$` inline, `$$...$$` block
- Clean card design with:
  - Type badge (MC / T/F / Short Answer)
  - Difficulty dots/stars (1-4)
  - Subject + topic tags
  - Rendered question text

## 7. Practice Mode

- `/practice/:id` route (reuses Exam take flow)
- No timer display
- No full-screen enforcement
- One question at a time
- After answering: immediately show correct/wrong + explanation
- "Next" button to proceed
- At end: summary of all answers

## 8. Post-Exam Review

After exam submission (`/results/:attemptId`):
- Score card with passing/fail
- List all questions with:
  - Green background if correct, red if wrong
  - Show correct answer with explanation
  - Show student's given answer
  - Highlight common mistakes if matched

## 9. Basic Charts (Recharts)

- Already installed (`recharts` in package.json)
- Admin dashboard: `<BarChart>` users/attempts over last 30 days
- Admin dashboard: `<PieChart>` user distribution by role/grade
- Student dashboard: `<LineChart>` scores over last 10 attempts

## 10. Implementation Order

1. DB migrations: grades, classes, class_members, activity_logs, profiles.grade, exams.type
2. Settings page (/settings)
3. Admin panel foundation + /admin dashboard with stats + charts
4. /admin/users
5. /admin/classes
6. /admin/questions
7. /admin/exams
8. /admin/attempts
9. LatexRenderer component + update all question cards
10. Practice mode (/practice/:id)
11. Post-exam review enhancements
12. Activity logging throughout
13. Student grade filtering on /exams page
