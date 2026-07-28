-- Sample geometry exam with diagrams for Grade 8
DO $$
DECLARE
  admin_id UUID := 'ddb7f264-8402-45de-9d59-de4657101482';
  q1 UUID; q2 UUID; q3 UUID; q4 UUID; q5 UUID;
  q6 UUID; q7 UUID; q8 UUID;
  e1 UUID; e2 UUID;
BEGIN

-- ========== GEOMETRY QUESTIONS WITH DIAGRAMS ==========

-- Q1: Right triangle identification
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Geometry', 'Triangles', 1,
  'In the right triangle shown, which side is the hypotenuse?',
  '["Side a", "Side b", "Side c", "All sides"]',
  '2',
  'The hypotenuse is the side opposite the right angle — it is the longest side. In this triangle, side c is opposite the 90° angle at vertex A.',
  '/images/triangle.svg',
  '[{"mistake": "Choosing side a or b", "why": "Confusing legs with hypotenuse", "correct": "Side c"}]',
  admin_id)
RETURNING id INTO q1;

-- Q2: Pythagorean theorem
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Geometry', 'Pythagorean Theorem', 2,
  'In the triangle shown, if a = 3 and b = 4, what is the length of side c?',
  '["5", "6", "7", "12"]',
  '0',
  'Using the Pythagorean theorem: c² = a² + b² = 3² + 4² = 9 + 16 = 25. So c = √25 = 5.',
  '/images/triangle.svg',
  '[{"mistake": "Choosing 7 (a + b)", "why": "Adding the sides instead of squaring", "correct": "5"}]',
  admin_id)
RETURNING id INTO q2;

-- Q3: Circle properties
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Geometry', 'Circles', 1,
  'In the circle shown, what does the dashed line represent?',
  '["Radius", "Diameter", "Chord", "Arc"]',
  '1',
  'The dashed line passes through the center (O) and connects two points on the circle — this is the diameter. The radius goes from center to edge.',
  '/images/circle.svg',
  '[{"mistake": "Choosing Radius", "why": "The dashed line goes all the way across, not half", "correct": "Diameter"}]',
  admin_id)
RETURNING id INTO q3;

-- Q4: Coordinate geometry
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Geometry', 'Coordinate Plane', 1,
  'What are the coordinates of point P shown on the coordinate plane?',
  '["(2, 4)", "(4, 3)", "(3, 4)", "(4, 2)"]',
  '1',
  'Point P is at x = 4 (right from origin) and y = 3 (up from origin). Coordinates are always written as (x, y).',
  '/images/coordinate-grid.svg',
  '[{"mistake": "Choosing (3, 4)", "why": "Swapping x and y coordinates", "correct": "(4, 3)"}]',
  admin_id)
RETURNING id INTO q4;

-- Q5: Parabola graphing
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Algebra', 'Quadratics', 3,
  'The graph shows y = x². What is the y-coordinate when x = 2?',
  '["2", "4", "0", "-2"]',
  '1',
  'Substitute x = 2 into y = x²: y = 2² = 4. The parabola shows all points (x, x²).',
  '/images/parabola.svg',
  '[{"mistake": "Choosing 2", "why": "Forgetting to square the x value", "correct": "4"}]',
  admin_id)
RETURNING id INTO q5;

-- Q6: True/false on triangle angles
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('true_false', 'Geometry', 'Angles', 1,
  'A right triangle can have two 90° angles.',
  '[]',
  'false',
  'A triangle has 180° total. If two angles were 90°, that would already be 180°, leaving 0° for the third angle — impossible.',
  '',
  '[]',
  admin_id)
RETURNING id INTO q6;

-- Q7: Area of a circle
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('multiple_choice', 'Geometry', 'Circles', 2,
  'If the circle shown has radius r = 5, what is its area?',
  '["10π", "25π", "5π", "20π"]',
  '1',
  'Area of a circle = πr² = π(5)² = 25π. Use the formula A = πr².',
  '/images/circle.svg',
  '[{"mistake": "Choosing 10π (using 2πr)", "why": "Using circumference formula instead of area", "correct": "25π"}]',
  admin_id)
RETURNING id INTO q7;

-- Q8: Short answer on triangle
INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by)
VALUES ('short_answer', 'Geometry', 'Pythagorean Theorem', 3,
  'In a right triangle with legs 6 and 8, what is the length of the hypotenuse?',
  '[]',
  '10',
  'c² = 6² + 8² = 36 + 64 = 100, so c = √100 = 10.',
  '',
  '[]',
  admin_id)
RETURNING id INTO q8;

-- ========== GEOMETRY EXAM ==========
INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
VALUES ('Geometry Basics', 'Test your knowledge of triangles, circles, and coordinate geometry. Includes diagrams for visual questions.',
  30, 60, true, 'exam', 8, admin_id, true)
RETURNING id INTO e1;

INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q1, 0, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q2, 1, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q3, 2, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q4, 3, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q5, 4, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q6, 5, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q7, 6, 2);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e1, q8, 7, 3);

-- ========== GEOMETRY PRACTICE SHEET ==========
INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
VALUES ('Geometry Practice', 'Untimed practice with instant feedback. Work through triangle theorems and circle properties at your own pace.',
  0, 0, true, 'practice', 8, admin_id, true)
RETURNING id INTO e2;

INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q1, 0, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q2, 1, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q3, 2, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q4, 3, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q5, 4, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q6, 5, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q7, 6, 1);
INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (e2, q8, 7, 1);

END $$;
