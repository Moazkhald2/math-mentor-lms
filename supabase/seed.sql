DO $$
DECLARE
  admin_id UUID := 'ddb7f264-8402-45de-9d59-de4657101482';
  q1 UUID; q2 UUID; q3 UUID; q4 UUID; q5 UUID;
  q6 UUID; q7 UUID; q8 UUID; q9 UUID; q10 UUID;
  e1 UUID;
BEGIN

-- Questions
INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Limits', 'Limit Basics', 1,
  'What is the limit of f(x) = 2x + 1 as x approaches 3?',
  '["5", "6", "7", "8"]',
  '1',
  'Substitute x = 3 into 2x + 1: 2(3) + 1 = 6 + 1 = 7',
  '[{"mistake": "Choosing 6 (forgetting to add 1)", "why": "They correctly compute 2x3=6 but stop there", "correct": "7"}]',
  admin_id)
RETURNING id INTO q1;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Derivatives', 'Power Rule', 2,
  'What is the derivative of f(x) = x^4?',
  '["3x^3", "4x^3", "4x^4", "3x^4"]',
  '1',
  'Using the power rule: d/dx[x^n] = n*x^(n-1). So d/dx[x^4] = 4x^3.',
  '[]',
  admin_id)
RETURNING id INTO q2;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'true_false', 'Limits', 'Continuity', 1,
  'A function must be defined at x = a for the limit as x approaches a to exist.',
  '[]',
  'false',
  'The limit only cares about values near a, not at a. For example, f(x) = (x^2-1)/(x-1) has a limit of 2 as x→1 but is undefined at x=1.',
  '[{"mistake": "Thinking the function must be defined at the point", "why": "Limits describe behavior approaching the point, not at the point", "correct": "False — limit can exist even if function is undefined at that point"}]',
  admin_id)
RETURNING id INTO q3;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Sequences', 'Arithmetic', 2,
  'What is the 10th term of the arithmetic sequence: 3, 7, 11, 15, ...?',
  '["35", "39", "43", "47"]',
  '1',
  'First term a1=3, common difference d=4. Using an = a1 + (n-1)d: a10 = 3 + 9x4 = 3 + 36 = 39',
  '[{"mistake": "Answering 43 (using n instead of n-1)", "why": "Using an = a1 + nd instead of an = a1 + (n-1)d", "correct": "39"}]',
  admin_id)
RETURNING id INTO q4;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Derivatives', 'Product Rule', 3,
  'Find the derivative of f(x) = x^2 * sin(x).',
  '["2x*sin(x)", "x^2*cos(x)", "2x*sin(x) + x^2*cos(x)", "2x*cos(x) + x^2*sin(x)"]',
  '2',
  'Using the product rule: (uv)'' = u''v + uv''. With u=x^2, v=sin(x): u''=2x, v''=cos(x). So f''(x) = 2x*sin(x) + x^2*cos(x).',
  '[{"mistake": "Only choosing 2x*sin(x)", "why": "Forgetting the second term of the product rule", "correct": "2x*sin(x) + x^2*cos(x)"}]',
  admin_id)
RETURNING id INTO q5;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Sequences', 'Geometric', 3,
  'A geometric sequence has first term 2 and common ratio 3. What is the 5th term?',
  '["96", "162", "486", "1458"]',
  '1',
  'Using an = a1 * r^(n-1): a5 = 2 * 3^4 = 2 * 81 = 162',
  '[{"mistake": "Answering 486 (using r^n instead of r^(n-1))", "why": "Using an = a1*r^n instead of an = a1*r^(n-1)", "correct": "162"}]',
  admin_id)
RETURNING id INTO q6;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'true_false', 'Limits', 'One-Sided Limits', 1,
  'If the left-hand limit and right-hand limit both exist, the limit exists.',
  '[]',
  'false',
  'Both one-sided limits must exist AND be equal for the limit to exist. If they exist but differ, the limit does not exist.',
  '[]',
  admin_id)
RETURNING id INTO q7;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Derivatives', 'Chain Rule', 4,
  'Find the derivative of f(x) = (3x^2 + 1)^5.',
  '["5(3x^2+1)^4", "30x(3x^2+1)^4", "5(6x)^4", "15x(3x^2+1)^4"]',
  '1',
  'Using the chain rule: d/dx[g(x)^n] = n*g(x)^(n-1) * g''(x). Here g(x)=3x^2+1, g''(x)=6x. So f''(x) = 5(3x^2+1)^4 * 6x = 30x(3x^2+1)^4.',
  '[{"mistake": "Choosing 5(3x^2+1)^4", "why": "Forgetting to multiply by the derivative of the inner function", "correct": "30x(3x^2+1)^4"}]',
  admin_id)
RETURNING id INTO q8;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'short_answer', 'Geometry', 'Circle Area', 1,
  'What is the area of a circle with radius 5? (Answer in terms of pi)',
  '[]',
  '25pi',
  'Area of a circle = pr^2 = p(5)^2 = 25p',
  '[]',
  admin_id)
RETURNING id INTO q9;

INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
VALUES (gen_random_uuid(), 'multiple_choice', 'Sequences', 'Series', 4,
  'Find the sum of the infinite geometric series: 8 + 4 + 2 + 1 + ...',
  '["14", "15", "16", "17"]',
  '2',
  'This is an infinite geometric series with a1=8, r=1/2. Since |r|<1, sum = a1/(1-r) = 8/(1-1/2) = 8/(1/2) = 16.',
  '[{"mistake": "Answering 15 (only summing visible terms)", "why": "Forgetting the formula for infinite sum, only adding the first few visible terms", "correct": "16"}]',
  admin_id)
RETURNING id INTO q10;

-- Exam
INSERT INTO public.exams (id, title, description, time_limit_minutes, passing_score, shuffle_questions, created_by, is_published)
VALUES (gen_random_uuid(), 'Math Fundamentals Diagnostic', 'Test your knowledge of limits, derivatives, sequences, and geometry. Covers Easy to Expert level questions.',
  45, 60, true, admin_id, true)
RETURNING id INTO e1;

-- Link questions to exam (in order)
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q1, 0, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q3, 1, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q7, 2, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q9, 3, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q2, 4, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q4, 5, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q6, 6, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q5, 7, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q8, 8, 3);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q10, 9, 3);

END $$;
