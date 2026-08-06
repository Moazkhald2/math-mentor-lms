-- Seed variant groups for a first batch of questions (exam anti-cheat feature).
-- Task 9: tag 4 base questions (real ids from live DB, published Limits Mastery
-- Exam, grade 11) and insert 2 numeric-only variants per group. Variants differ
-- ONLY in numbers/answers; type/subject/topic/difficulty and the question_text
-- template stay identical to the base.
--
-- Idempotent: re-running is safe. UPDATEs collapse to the same value, and each
-- INSERT is guarded by a WHERE NOT EXISTS check on (variant_group_id, question_text).

-- Group 1 — short_answer base: lim x->4 (x - 4) = 0
-- base id: 3d28764c-cd88-4c9f-9945-ea16f8d4d04b
UPDATE public.questions
   SET variant_group_id = id::text
 WHERE id = '3d28764c-cd88-4c9f-9945-ea16f8d4d04b';

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'short_answer', 'Calculus', 'Limits', 1,
       'Find $\lim_{x \to 4} (x - 6)$', '[]'::jsonb,
       '-2', 'Substitute x = 4: 4 - 6 = -2.', '',
       '[]'::jsonb, 'ddb7f264-8402-45de-9d59-de4657101482',
       '3d28764c-cd88-4c9f-9945-ea16f8d4d04b'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '3d28764c-cd88-4c9f-9945-ea16f8d4d04b'
     AND question_text = 'Find $\lim_{x \to 4} (x - 6)$');

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'short_answer', 'Calculus', 'Limits', 1,
       'Find $\lim_{x \to 6} (x - 4)$', '[]'::jsonb,
       '2', 'Substitute x = 6: 6 - 4 = 2.', '',
       '[]'::jsonb, 'ddb7f264-8402-45de-9d59-de4657101482', '3d28764c-cd88-4c9f-9945-ea16f8d4d04b'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '3d28764c-cd88-4c9f-9945-ea16f8d4d04b'
     AND question_text = 'Find $\lim_{x \to 6} (x - 4)$');

-- ----------------------------------------------------------------------------
-- Group 2: short_answer base: lim x->∞ (5x+1)/(2x) = 5/2
-- real base id: 88914f01-2a10-4e15-b373-7bd5e3927759
-- ----------------------------------------------------------------------------
UPDATE public.questions
   SET variant_group_id = id::text
 WHERE id = '88914f01-2a10-4e15-b373-7bd5e3927759';

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'short_answer', 'Calculus', 'Limits', 2,
       'Find $\lim_{x \to \infty} \frac{3x + 1}{2x}$', '[]'::jsonb,
       '3/2', 'Divide numerator and denominator by x: (3 + 1/x) / 2. As x → ∞, 1/x → 0, leaving 3/2.', '',
       '[]'::jsonb, 'ddb7f264-8402-45de-9d59-de4657101482', '88914f01-2a10-4e15-b373-7bd5e3927759'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '88914f01-2a10-4e15-b373-7bd5e3927759'
     AND question_text = 'Find $\lim_{x \to \infty} \frac{3x + 1}{2x}$');

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'short_answer', 'Calculus', 'Limits', 2,
       'Find $\lim_{x \to \infty} \frac{7x + 2}{4x}$', '[]'::jsonb,
       '7/4', 'Divide numerator and denominator by x: (7 + 2/x) / 4. As x → ∞, 2/x → 0, leaving 7/4.', '',
       '[]'::jsonb, 'ddb7f264-8402-45de-9d59-de4657101482', '88914f01-2a10-4e15-b373-7bd5e3927759'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '88914f01-2a10-4e15-b373-7bd5e3927759'
     AND question_text = 'Find $\lim_{x \to \infty} \frac{7x + 2}{4x}$');

-- ----------------------------------------------------------------------------
-- Group 3: multiple_choice base: Find $\lim_{x \to 3} (x^2 + 1)$ (= 10)
-- real base id: 93859f00-12e8-482d-a688-83ef61604d94
-- ----------------------------------------------------------------------------
UPDATE public.questions
   SET variant_group_id = id::text
 WHERE id = '93859f00-12e8-482d-a688-83ef61604d94';

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'multiple_choice', 'Calculus', 'Limits', 1,
       'Find $\lim_{x \to 3} (x^2 + 2)$',
       '["14","8","11","12"]'::jsonb,
       '2', 'Substitute x = 3: 3² + 2 = 9 + 2 = 11. Polynomials are continuous, so direct substitution works.', '',
       '[{"why":"Forgot to add 2 after squaring","correct":"11","mistake":"Choosing 14"}]'::jsonb,
       'ddb7f264-8402-45de-9d59-de4657101482', '93859f00-12e8-482d-a688-83ef61604d94'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '93859f00-12e8-482d-a688-83ef61604d94'
     AND question_text = 'Find $\lim_{x \to 3} (x^2 + 2)$');

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'multiple_choice', 'Calculus', 'Limits', 1,
       'Find $\lim_{x \to 5} (x^2 + 1)$',
       '["24","25","26","27"]'::jsonb,
       '2', 'Substitute x = 5: 5² + 1 = 25 + 1 = 26. Polynomials are continuous, so direct substitution works.', '',
       '[{"why":"Squared 5 as 20","correct":"26","mistake":"Choosing 24"}]'::jsonb,
       'ddb7f264-8402-45de-9d59-de4657101482', '93859f00-12e8-482d-a688-83ef61604d94'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '93859f00-12e8-482d-a688-83ef61604d94'
     AND question_text = 'Find $\lim_{x \to 5} (x^2 + 1)$');

-- ----------------------------------------------------------------------------
-- Group 4: multiple_choice base: Find $\lim_{x \to 1} (2x + 3)$ (= 5)
-- base id: 04e3ed90-4d5d-4705-acdf-5222c79ad12d
-- ----------------------------------------------------------------------------
UPDATE public.questions
   SET variant_group_id = id::text
 WHERE id = '04e3ed90-4d5d-4705-acdf-5222c79ad12d';

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'multiple_choice', 'Calculus', 'Limits', 1,
       'Find $\lim_{x \to 2} (2x + 1)$',
       '["4","5","6","7"]'::jsonb,
       '1', 'Substitute x = 2: 2(2) + 1 = 5.', '',
       '[{"why":"Added instead of multiplied","correct":"5","mistake":"Choosing 4"}]'::jsonb,
       'ddb7f264-8402-45de-9d59-de4657101482', '04e3ed90-4d5d-4705-acdf-5222c79ad12d'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '04e3ed90-4d5d-4705-acdf-5222c79ad12d'
     AND question_text = 'Find $\lim_{x \to 2} (2x + 1)$');

INSERT INTO public.questions
  (type, subject, topic, difficulty, question_text, options, correct_answer,
   explanation, image_url, common_mistakes, created_by, variant_group_id)
SELECT 'multiple_choice', 'Calculus', 'Limits', 1,
       'Find $\lim_{x \to 1} (4x - 1)$',
       '["1","2","3","4"]'::jsonb,
       '2', 'Substitute x = 1: 4(1) - 1 = 3.', '',
       '[{"why":"Used 4 - 1 instead of 4(1) - 1","correct":"3","mistake":"Choosing 7"}]'::jsonb,
       'ddb7f264-8402-45de-9d59-de4657101482', '04e3ed90-4d5d-4705-acdf-5222c79ad12d'
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions
   WHERE variant_group_id = '04e3ed90-4d5d-4705-acdf-5222c79ad12d'
     AND question_text = 'Find $\lim_{x \to 1} (4x - 1)$');