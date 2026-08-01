-- Grade 11 Limits Mastery Exam (15 questions: 5 easy, 5 medium, 3 hard, 2 extreme)
-- Flags exam as important for Grade 11
DO $$
DECLARE
  admin_id UUID := 'ddb7f264-8402-45de-9d59-de4657101482';
  q1 UUID; q2 UUID; q3 UUID; q4 UUID; q5 UUID;
  q6 UUID; q7 UUID; q8 UUID; q9 UUID; q10 UUID;
  q11 UUID; q12 UUID; q13 UUID; q14 UUID; q15 UUID;
  e1 UUID;
BEGIN

-- Add important flag if not present
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT false;

-- ========== EASY (5) ==========

-- Q1: Direct substitution
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 1,
  'Find $\\lim_{x \\to 3} (x^2 + 1)$',
  '["7", "9", "10", "11"]',
  '2',
  'Substitute x = 3: 3² + 1 = 9 + 1 = 10. Polynomials are continuous, so direct substitution works.',
  '',
  '[{"mistake": "Choosing 9", "why": "Forgot to add 1 after squaring", "correct": "10"}, {"mistake": "Choosing 7", "why": "Used 2x + 1 instead of x² + 1", "correct": "10"}]',
  admin_id)
RETURNING id INTO q1;

-- Q2: Direct substitution
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 1,
  'Find $\\lim_{x \\to -2} (x + 5)$',
  '["3", "-3", "7", "-7"]',
  '0',
  'Substitute x = -2: -2 + 5 = 3.',
  '',
  '[{"mistake": "Choosing -3", "why": "Sign error when adding negative numbers", "correct": "3"}]',
  admin_id)
RETURNING id INTO q2;

-- Q3: Constant function
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('true_false', 'Calculus', 'Limits', 1,
  'If $f(x) = 7$ for all x, then $\\lim_{x \\to 0} f(x) = 7$.',
  '[]',
  'true',
  'The limit of a constant function is that constant, regardless of what x approaches.',
  '',
  '[]',
  admin_id)
RETURNING id INTO q3;

-- Q4: Direct substitution
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 1,
  'Find $\\lim_{x \\to 1} (2x + 3)$',
  '["4", "5", "6", "7"]',
  '1',
  'Substitute x = 1: 2(1) + 3 = 5.',
  '',
  '[{"mistake": "Choosing 4", "why": "Subtracted instead of added", "correct": "5"}]',
  admin_id)
RETURNING id INTO q4;

-- Q5: Short answer, direct substitution
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('short_answer', 'Calculus', 'Limits', 1,
  'Find $\\lim_{x \\to 4} (x - 4)$',
  '[]',
  '0',
  'Substitute x = 4: 4 - 4 = 0.',
  '',
  '[]',
  admin_id)
RETURNING id INTO q5;

-- ========== MEDIUM (5) ==========

-- Q6: Special limit sin x / x
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 2,
  'Find $\\lim_{x \\to 0} \\frac{\\sin x}{x}$',
  '["0", "1", "-1", "Does not exist"]',
  '1',
  'This is the famous special limit: as x approaches 0, sin x / x approaches 1. It follows from the squeeze theorem.',
  '',
  '[{"mistake": "Choosing 0", "why": "Thinking sin 0 = 0 makes the ratio 0", "correct": "1"}]',
  admin_id)
RETURNING id INTO q6;

-- Q7: Limit at infinity, divide by highest power
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 2,
  'Find $\\lim_{x \\to \\infty} \\frac{3x^2 + 2x}{x^2 - 5}$',
  '["0", "2", "3", "∞"]',
  '2',
  'Divide numerator and denominator by x²: (3 + 2/x) / (1 - 5/x²). As x → ∞, 2/x and 5/x² both go to 0, leaving 3/1 = 3.',
  '',
  '[{"mistake": "Choosing ∞", "why": "Forgetting to divide by the highest power", "correct": "3"}]',
  admin_id)
RETURNING id INTO q7;

-- Q8: Factoring 0/0
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 2,
  'Find $\\lim_{x \\to 3} \\frac{x^2 - x - 6}{x - 3}$',
  '["0", "4", "5", "6"]',
  '2',
  'Factor the numerator: x² - x - 6 = (x - 3)(x + 2). Cancel x - 3, then substitute: 3 + 2 = 5.',
  '',
  '[{"mistake": "Choosing 0", "why": "Substituting before factoring gives 0/0", "correct": "5"}]',
  admin_id)
RETURNING id INTO q8;

-- Q9: Special limit with cos
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('true_false', 'Calculus', 'Limits', 2,
  '$\\lim_{x \\to 0} \\frac{1 - \\cos x}{x} = 1$',
  '[]',
  'false',
  'The correct value is 0. Use the identity 1 - cos x = 2 sin²(x/2), so the limit is 2 · 0 · (sin(x/2)/(x)) pattern → 0. Or note it is 1 - cos x ≈ x²/2, divided by x gives ≈ x/2 → 0.',
  '',
  '[{"mistake": "Saying true", "why": "Confusing with lim sin x / x = 1", "correct": "false (it is 0)"}]',
  admin_id)
RETURNING id INTO q9;

-- Q10: Limit at infinity short answer
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('short_answer', 'Calculus', 'Limits', 2,
  'Find $\\lim_{x \\to \\infty} \\frac{5x + 1}{2x}$',
  '[]',
  '5/2',
  'Divide numerator and denominator by x: (5 + 1/x) / 2. As x → ∞, 1/x → 0, leaving 5/2.',
  '',
  '[{"mistake": "Answering 5", "why": "Only looked at the numerator", "correct": "5/2"}]',
  admin_id)
RETURNING id INTO q10;

-- ========== HARD (3) ==========

-- Q11: Composite trig limit
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 3,
  'Find $\\lim_{x \\to 0} \\frac{\\sin 3x}{2x}$',
  '["0", "1/2", "3/2", "3"]',
  '2',
  'Rewrite as (3/2) · (sin 3x)/(3x). Since sin(3x)/(3x) → 1 as x → 0, the limit is 3/2.',
  '',
  '[{"mistake": "Choosing 3", "why": "Forgot to divide by the 2 in the denominator", "correct": "3/2"}]',
  admin_id)
RETURNING id INTO q11;

-- Q12: Conjugate radical at infinity
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 3,
  'Find $\\lim_{x \\to \\infty} (\\sqrt{x^2 + 2x} - x)$',
  '["0", "1", "2", "∞"]',
  '1',
  'Rationalize: multiply by (√(x²+2x) + x)/(√(x²+2x) + x). Numerator becomes (x²+2x) - x² = 2x. Then divide by x: 2 / (√(1 + 2/x) + 1) → 2/2 = 1.',
  '',
  '[{"mistake": "Choosing ∞", "why": "Both parts grow, but the difference is finite", "correct": "1"}]',
  admin_id)
RETURNING id INTO q12;

-- Q13: 1 - cos x over x²
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('short_answer', 'Calculus', 'Limits', 3,
  'Find $\\lim_{x \\to 0} \\frac{1 - \\cos x}{x^2}$',
  '[]',
  '1/2',
  'Use 1 - cos x = 2 sin²(x/2): limit = 2 · (sin(x/2)/(x))² · 1/4... Simplifying: 2 sin²(x/2)/x² = (1/2)·(sin(x/2)/(x/2))² → 1/2.',
  '',
  '[{"mistake": "Answering 0", "why": "Substituting directly gives 0/0, not the true limit", "correct": "1/2"}]',
  admin_id)
RETURNING id INTO q13;

-- ========== EXTREME (2) ==========

-- Q14: Piecewise continuity
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 4,
  'Given $f(x) = \\begin{cases} ax + 1, & x < 2 \\\\ x^2, & x \\geq 2 \\end{cases}$, find a so that f is continuous at x = 2.',
  '["1", "3/2", "2", "3"]',
  '1',
  'For continuity, left and right limits must equal f(2) = 4. Left limit: 2a + 1 = 4, so 2a = 3, a = 3/2.',
  '',
  '[{"mistake": "Choosing 2", "why": "Set 2a + 1 = 4 but solved incorrectly (2a = 3 → a = 3/2)", "correct": "3/2"}]',
  admin_id)
RETURNING id INTO q14;

-- Q15: Difference of powers
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Calculus', 'Limits', 4,
  'Find $\\lim_{x \\to 1} \\frac{x^5 - 1}{x - 1}$',
  '["1", "4", "5", "6"]',
  '2',
  'Factor x⁵ - 1 = (x - 1)(x⁴ + x³ + x² + x + 1). Cancel x - 1 and substitute x = 1: 1 + 1 + 1 + 1 + 1 = 5.',
  '',
  '[{"mistake": "Choosing 4", "why": "Summed only four terms of the factored form", "correct": "5"}]',
  admin_id)
RETURNING id INTO q15;

-- ========== GRADE 11 LIMITS MASTERY EXAM (IMPORTANT) ==========
INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published, is_important)
VALUES ('Limits Mastery Exam',
  'A comprehensive Grade 11 exam on limits: direct substitution, special trigonometric limits, limits at infinity, factoring, radicals, and continuity. 5 easy, 5 medium, 3 hard, and 2 extreme questions.',
  60, 60, true, 'exam', 11, admin_id, true, true)
RETURNING id INTO e1;

INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q1, 0, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q2, 1, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q3, 2, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q4, 3, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q5, 4, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q6, 5, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q7, 6, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q8, 7, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q9, 8, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q10, 9, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q11, 10, 3);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q12, 11, 3);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q13, 12, 3);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q14, 13, 4);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q15, 14, 4);

END $$;
