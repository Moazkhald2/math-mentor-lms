-- Add one exam per grade (3-12) with appropriate questions
-- Run this AFTER seed.sql has been applied

DO $$
DECLARE
  admin_id UUID := 'ddb7f264-8402-45de-9d59-de4657101482';

  -- existing questions from seed (looked up by content)
  v_limit UUID; v_deriv UUID; v_cont UUID; v_seq UUID; v_geom UUID;
  v_product UUID; v_chain UUID; v_circle UUID; v_series UUID; v_tf_limit UUID;

  -- new question IDs for lower grades
  v_g3a UUID; v_g3b UUID; v_g3c UUID;
  v_g4a UUID; v_g4b UUID; v_g4c UUID;
  v_g5a UUID; v_g5b UUID;
  v_g6a UUID; v_g6b UUID; v_g6c UUID;
  v_g7a UUID; v_g7b UUID;

  -- exam IDs
  v_e3 UUID; v_e4 UUID; v_e5 UUID; v_e6 UUID; v_e7 UUID;
  v_e8 UUID; v_e9 UUID; v_e10 UUID; v_e11 UUID; v_e12 UUID;
BEGIN

  -- Look up existing seed questions
  SELECT id INTO v_limit FROM public.questions WHERE question_text LIKE '%limit of f(x) = 2x + 1%' LIMIT 1;
  SELECT id INTO v_deriv FROM public.questions WHERE question_text LIKE '%derivative of f(x) = x^4%' LIMIT 1;
  SELECT id INTO v_cont FROM public.questions WHERE question_text LIKE '%left-hand limit and right-hand limit%' LIMIT 1;
  SELECT id INTO v_seq FROM public.questions WHERE question_text LIKE '%10th term of the arithmetic%' LIMIT 1;
  SELECT id INTO v_geom FROM public.questions WHERE question_text LIKE '%geometric sequence has first term 2%' LIMIT 1;
  SELECT id INTO v_product FROM public.questions WHERE question_text LIKE '%derivative of f(x) = x^2 * sin%' LIMIT 1;
  SELECT id INTO v_chain FROM public.questions WHERE question_text LIKE '%derivative of f(x) = (3x^2 + 1)%' LIMIT 1;
  SELECT id INTO v_circle FROM public.questions WHERE question_text LIKE '%area of a circle with radius 5%' LIMIT 1;
  SELECT id INTO v_series FROM public.questions WHERE question_text LIKE '%sum of the infinite geometric%' LIMIT 1;
  SELECT id INTO v_tf_limit FROM public.questions WHERE question_text LIKE '%function must be defined%' LIMIT 1;

  -- ==================== GRADE 3 ====================
  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Arithmetic', 'Addition', 1,
    'What is 245 + 187?',
    '["422", "432", "442", "412"]', '1',
    '245 + 187 = 432. Add hundreds: 200+100=300, tens: 40+80=120, ones: 5+7=12. Total: 300+120+12=432.',
    '[{"mistake": "Choosing 422 (carry error)", "why": "Forgot to carry the 1 from 5+7", "correct": "432"}]', admin_id)
  RETURNING id INTO v_g3a;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Arithmetic', 'Multiplication', 1,
    'What is 7 × 8?',
    '["48", "54", "56", "64"]', '2',
    '7 × 8 = 56. This is a basic multiplication fact.',
    '[{"mistake": "Choosing 48 (6×8)", "why": "Confused 7×8 with 6×8", "correct": "56"}]', admin_id)
  RETURNING id INTO v_g3b;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Arithmetic', 'Subtraction', 1,
    'What is 600 − 237?',
    '["363", "373", "463", "377"]', '0',
    '600 − 237 = 363. Borrow from hundreds: 600 = 500 + 100, so 500−200=300, and 100−37=63. Total: 363.',
    '[{"mistake": "Choosing 373 (subtraction error)", "why": "Forgot to borrow correctly from zero", "correct": "363"}]', admin_id)
  RETURNING id INTO v_g3c;

  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 3 Math Basics', 'Addition, subtraction, and multiplication for Grade 3 students.',
    20, 60, true, 'exam', 3, admin_id, true)
  RETURNING id INTO v_e3;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e3, v_g3a, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e3, v_g3b, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e3, v_g3c, 2, 1);

  -- ==================== GRADE 4 ====================
  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Arithmetic', 'Division', 1,
    'What is 84 ÷ 7?',
    '["11", "12", "13", "14"]', '1',
    '84 ÷ 7 = 12 because 7 × 12 = 84.',
    '[{"mistake": "Choosing 14 (6×14=84 but wrong operation)", "why": "Thought of 6×14 instead of dividing", "correct": "12"}]', admin_id)
  RETURNING id INTO v_g4a;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Number Theory', 'Factors', 1,
    'Which number is a factor of both 24 and 36?',
    '["5", "7", "8", "12"]', '3',
    '12 divides both 24 (24÷12=2) and 36 (36÷12=3).',
    '[{"mistake": "Choosing 8", "why": "8 divides 24 but not 36", "correct": "12"}]', admin_id)
  RETURNING id INTO v_g4b;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Arithmetic', 'Word Problems', 1,
    'Sarah has 3 bags with 5 apples each. How many apples does she have in total?',
    '["8", "10", "15", "20"]', '2',
    '3 bags × 5 apples = 15 apples total.',
    '[{"mistake": "Choosing 8 (adding instead of multiplying)", "why": "Added 3 + 5 instead of multiplying", "correct": "15"}]', admin_id)
  RETURNING id INTO v_g4c;

  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 4 Math Skills', 'Division, factors, and word problems for Grade 4.',
    20, 60, true, 'exam', 4, admin_id, true)
  RETURNING id INTO v_e4;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e4, v_g4a, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e4, v_g4b, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e4, v_g4c, 2, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e4, v_g3b, 3, 1);

  -- ==================== GRADE 5 ====================
  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Fractions', 'Adding Fractions', 1,
    'What is 1/4 + 1/2?',
    '["1/6", "2/6", "3/4", "2/4"]', '2',
    '1/4 + 1/2 = 1/4 + 2/4 = 3/4. Convert 1/2 to 2/4, then add numerators.',
    '[{"mistake": "Choosing 1/6 (adding numerators and denominators)", "why": "Added 1+1=2 and 4+2=6 to get 2/6", "correct": "3/4"}]', admin_id)
  RETURNING id INTO v_g5a;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Decimals', 'Decimal Operations', 1,
    'What is 3.5 + 2.7?',
    '["5.2", "6.2", "5.12", "6.12"]', '1',
    '3.5 + 2.7 = 6.2. Add tenths: 5+7=12 tenths = 1.2, add wholes: 3+2+1=6. Total: 6.2.',
    '[{"mistake": "Choosing 5.12 (misaligned decimal)", "why": "Added 3+2=5 and 5+7=12 to get 5.12, ignoring place value", "correct": "6.2"}]', admin_id)
  RETURNING id INTO v_g5b;

  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 5 Math', 'Fractions, decimals, and geometry for Grade 5.',
    25, 60, true, 'exam', 5, admin_id, true)
  RETURNING id INTO v_e5;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e5, v_g5a, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e5, v_g5b, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e5, v_circle, 2, 2);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e5, v_g4b, 3, 1);

  -- ==================== GRADE 6 ====================
  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Ratios', 'Ratios', 1,
    'A recipe uses 2 cups of flour for every 3 cups of sugar. How much flour is needed for 9 cups of sugar?',
    '["4 cups", "5 cups", "6 cups", "8 cups"]', '2',
    'Ratio 2:3 = x:9. Cross multiply: 2×9 = 3x → 18 = 3x → x = 6.',
    '[{"mistake": "Choosing 4 cups", "why": "Subtracted 3 from 9 and 2 from something instead of using proportion", "correct": "6 cups"}]', admin_id)
  RETURNING id INTO v_g6a;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Percentages', 'Percentage', 1,
    'What is 20% of 80?',
    '["12", "14", "16", "18"]', '2',
    '20% of 80 = 0.20 × 80 = 16.',
    '[{"mistake": "Choosing 12 (15% of 80)", "why": "Computed 15% instead of 20%", "correct": "16"}]', admin_id)
  RETURNING id INTO v_g6b;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('true_false', 'Algebra', 'Equations', 1,
    'The solution to 2x + 3 = 11 is x = 4.',
    '[]', 'true',
    '2(4) + 3 = 8 + 3 = 11. Correct!',
    '[]', admin_id)
  RETURNING id INTO v_g6c;

  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 6 Math', 'Ratios, percentages, and basic algebra for Grade 6.',
    25, 60, true, 'exam', 6, admin_id, true)
  RETURNING id INTO v_e6;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e6, v_g6a, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e6, v_g6b, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e6, v_g6c, 2, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e6, v_g5a, 3, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e6, v_g5b, 4, 1);

  -- ==================== GRADE 7 ====================
  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Algebra', 'Linear Equations', 2,
    'Solve: 3x − 7 = 14',
    '["x = 5", "x = 6", "x = 7", "x = 8"]', '2',
    '3x − 7 = 14 → 3x = 21 → x = 7.',
    '[{"mistake": "Choosing x = 5 (3×5=15-7=8 not 14)", "why": "Guessed without solving step by step", "correct": "x = 7"}]', admin_id)
  RETURNING id INTO v_g7a;

  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES ('multiple_choice', 'Geometry', 'Angles', 2,
    'What is the sum of the interior angles of a triangle?',
    '["90°", "180°", "270°", "360°"]', '1',
    '180°. The sum of interior angles of any triangle is always 180°.',
    '[{"mistake": "Choosing 360° (thinking of a square)", "why": "Confused triangle with quadrilateral", "correct": "180°"}]', admin_id)
  RETURNING id INTO v_g7b;

  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 7 Math', 'Algebra, geometry, and sequences for Grade 7.',
    30, 60, true, 'exam', 7, admin_id, true)
  RETURNING id INTO v_e7;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e7, v_g7a, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e7, v_g7b, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e7, v_seq, 2, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e7, v_g6b, 3, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e7, v_g6a, 4, 1);

  -- ==================== GRADE 8 ====================
  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 8 Math', 'Functions, sequences, and geometry for Grade 8.',
    30, 60, true, 'exam', 8, admin_id, true)
  RETURNING id INTO v_e8;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e8, v_limit, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e8, v_seq, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e8, v_geom, 2, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e8, v_g7a, 3, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e8, v_g7b, 4, 1);

  -- ==================== GRADE 9 ====================
  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 9 Math', 'Introduction to calculus concepts, continuity, and series for Grade 9.',
    35, 60, true, 'exam', 9, admin_id, true)
  RETURNING id INTO v_e9;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e9, v_limit, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e9, v_deriv, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e9, v_seq, 2, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e9, v_geom, 3, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e9, v_g7a, 4, 1);

  -- ==================== GRADE 10 ====================
  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 10 Math', 'Advanced limits, derivatives, and sequences for Grade 10.',
    35, 60, true, 'exam', 10, admin_id, true)
  RETURNING id INTO v_e10;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e10, v_limit, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e10, v_tf_limit, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e10, v_deriv, 2, 2);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e10, v_seq, 3, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e10, v_geom, 4, 2);

  -- ==================== GRADE 11 ====================
  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 11 Math', 'Advanced derivatives and series for Grade 11.',
    40, 60, true, 'exam', 11, admin_id, true)
  RETURNING id INTO v_e11;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e11, v_product, 0, 2);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e11, v_chain, 1, 3);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e11, v_series, 2, 3);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e11, v_deriv, 3, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e11, v_seq, 4, 1);

  -- ==================== GRADE 12 ====================
  INSERT INTO public.exams (title, description, time_limit_minutes, passing_score, shuffle_questions, type, grade, created_by, is_published)
  VALUES ('Grade 12 Math', 'Comprehensive advanced math for Grade 12.',
    45, 60, true, 'exam', 12, admin_id, true)
  RETURNING id INTO v_e12;

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e12, v_limit, 0, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e12, v_deriv, 1, 1);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e12, v_geom, 2, 2);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e12, v_product, 3, 2);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e12, v_chain, 4, 3);
  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points) VALUES (v_e12, v_series, 5, 3);

END $$;
