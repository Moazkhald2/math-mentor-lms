-- Seed dummy data: 30 students (3 per grade 3-12), 2 teachers, attempts, logs
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_pw TEXT := crypt('password123', gen_salt('bf'));
  v_uid UUID;
  v_pid UUID;
  v_eid UUID;
  v_aid UUID;
  v_qids UUID[];
  v_qid UUID;
  v_total INTEGER;
  v_correct INTEGER;
  v_target INTEGER;
  v_score INTEGER;
  v_attempt_count INTEGER;
  v_days_ago INTEGER;
  v_hours_ago INTEGER;

  -- Student data: (email, full_name, grade)
  students TEXT[][] := ARRAY[
    -- Grade 3
    ['alex.g3@test.com', 'Alex Johnson', '3'],
    ['emma.g3@test.com', 'Emma Davis', '3'],
    ['james.g3@test.com', 'James Wilson', '3'],
    -- Grade 4
    ['olivia.g4@test.com', 'Olivia Brown', '4'],
    ['liam.g4@test.com', 'Liam Martinez', '4'],
    ['sophia.g4@test.com', 'Sophia Garcia', '4'],
    -- Grade 5
    ['ethan.g5@test.com', 'Ethan Anderson', '5'],
    ['ava.g5@test.com', 'Ava Taylor', '5'],
    ['noah.g5@test.com', 'Noah Thomas', '5'],
    -- Grade 6
    ['isabella.g6@test.com', 'Isabella Jackson', '6'],
    ['mason.g6@test.com', 'Mason White', '6'],
    ['mia.g6@test.com', 'Mia Harris', '6'],
    -- Grade 7
    ['lucas.g7@test.com', 'Lucas Martin', '7'],
    ['charlotte.g7@test.com', 'Charlotte Clark', '7'],
    ['logan.g7@test.com', 'Logan Lewis', '7'],
    -- Grade 8
    ['amelia.g8@test.com', 'Amelia Walker', '8'],
    ['oliver.g8@test.com', 'Oliver Hall', '8'],
    ['harper.g8@test.com', 'Harper Young', '8'],
    -- Grade 9
    ['elijah.g9@test.com', 'Elijah King', '9'],
    ['evelyn.g9@test.com', 'Evelyn Wright', '9'],
    ['benjamin.g9@test.com', 'Benjamin Hill', '9'],
    -- Grade 10
    ['aria.g10@test.com', 'Aria Scott', '10'],
    ['henry.g10@test.com', 'Henry Adams', '10'],
    ['scarlett.g10@test.com', 'Scarlett Baker', '10'],
    -- Grade 11
    ['jack.g11@test.com', 'Jack Nelson', '11'],
    ['grace.g11@test.com', 'Grace Carter', '11'],
    ['daniel.g11@test.com', 'Daniel Mitchell', '11'],
    -- Grade 12
    ['lily.g12@test.com', 'Lily Roberts', '12'],
    ['samuel.g12@test.com', 'Samuel Turner', '12'],
    ['chloe.g12@test.com', 'Chloe Phillips', '12']
  ];

  -- Teacher data: (email, full_name)
  teachers TEXT[][] := ARRAY[
    ['sarah.j@mathmentor.com', 'Sarah Johnson'],
    ['michael.c@mathmentor.com', 'Michael Chen']
  ];

BEGIN

  -- ========== CREATE TEACHERS ==========
  FOR i IN 1..array_length(teachers, 1) LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, last_sign_in_at,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      teachers[i][1], v_pw,
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', teachers[i][2]),
      v_now, v_now, v_now,
      '', '', '', '',
      false, false
    )
    RETURNING id INTO v_uid;

    -- Trigger creates profile with student role; update to teacher
    UPDATE public.profiles SET role = 'teacher' WHERE id = v_uid;
  END LOOP;

  -- ========== CREATE STUDENTS ==========
  FOR i IN 1..array_length(students, 1) LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, last_sign_in_at,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      students[i][1], v_pw,
      v_now, v_now, v_now,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', students[i][2]),
      v_now, v_now, v_now,
      '', '', '', '',
      false, false
    )
    RETURNING id INTO v_uid;

    -- Trigger creates profile with name from raw_user_meta_data; add grade
    UPDATE public.profiles SET grade = students[i][3]::int WHERE id = v_uid;
  END LOOP;

  -- ========== CREATE EXAM ATTEMPTS ==========
  FOR i IN 1..array_length(students, 1) LOOP
    -- Get student profile id
    SELECT id INTO v_pid FROM public.profiles WHERE email = students[i][1];
    v_attempt_count := 3 + (i % 3); -- 3-5 attempts per student

    FOR j IN 1..v_attempt_count LOOP
      -- Find exam for this student's grade
      SELECT id INTO v_eid FROM public.exams WHERE grade = students[i][3]::int AND is_published = true ORDER BY created_at LIMIT 1;
      IF NOT FOUND THEN CONTINUE; END IF;

      -- Get questions for this exam
      v_qids := ARRAY(SELECT eq.question_id FROM public.exam_questions eq WHERE eq.exam_id = v_eid ORDER BY eq.order_index);
      SELECT COALESCE(sum(eq.points), 0) INTO v_total FROM public.exam_questions eq WHERE eq.exam_id = v_eid;

      -- Vary the start time (1-30 days ago, random hour)
      v_days_ago := (30 - j * 7 + i) % 30;
      v_hours_ago := (i * 3 + j * 7) % 24;

      -- Create attempt
      INSERT INTO public.exam_attempts (user_id, exam_id, started_at, completed_at, score, total_points, status)
      VALUES (
        v_pid, v_eid,
        v_now - (v_days_ago || ' days')::interval - (v_hours_ago || ' hours')::interval,
        v_now - (v_days_ago || ' days')::interval - (v_hours_ago - 1 || ' hours')::interval,
        0, v_total, 'completed'
      )
      RETURNING id INTO v_aid;

      -- Deterministic score: 30-100 varies by student index and attempt
      v_score := 30 + ((i * 17 + j * 31) % 71);
      v_target := (v_score * array_length(v_qids, 1)) / 100;

      v_correct := 0;
      FOREACH v_qid IN ARRAY v_qids LOOP
        IF v_correct < v_target THEN
          v_correct := v_correct + 1;
          INSERT INTO public.answers (attempt_id, question_id, answer, is_correct, points_earned)
          VALUES (v_aid, v_qid, 'dummy_correct', true, 1);
        ELSE
          INSERT INTO public.answers (attempt_id, question_id, answer, is_correct, points_earned)
          VALUES (v_aid, v_qid, 'dummy_wrong', false, 0);
        END IF;
      END LOOP;

      UPDATE public.exam_attempts SET score = v_score WHERE id = v_aid;

      -- ========== CREATE ACTIVITY LOG ==========
      INSERT INTO public.activity_logs (user_id, exam_id, action, details, created_at)
      VALUES (
        v_pid, v_eid,
        CASE WHEN v_score >= 60 THEN 'exam_completed' ELSE 'exam_failed' END,
        format('{"score": %s, "total": %s, "correct": %s}', v_score, v_total, v_correct)::jsonb,
        v_now - (v_days_ago || ' days')::interval - (v_hours_ago - 1 || ' hours')::interval
      );
    END LOOP;
  END LOOP;

  -- ========== ADDITIONAL ACTIVITY LOGS ==========
  -- Login logs for each student
  FOR i IN 1..array_length(students, 1) LOOP
    SELECT id INTO v_pid FROM public.profiles WHERE email = students[i][1];
    FOR j IN 1..3 LOOP
      v_days_ago := (i * 3 + j * 5) % 20;
      INSERT INTO public.activity_logs (user_id, action, details, created_at)
      VALUES (v_pid, 'user_login', '{}'::jsonb, v_now - (v_days_ago || ' days')::interval);
    END LOOP;
  END LOOP;

  -- Teacher login logs
  FOR i IN 1..array_length(teachers, 1) LOOP
    SELECT id INTO v_pid FROM public.profiles WHERE email = teachers[i][1];
    FOR j IN 1..5 LOOP
      v_days_ago := (j * 3) % 15;
      INSERT INTO public.activity_logs (user_id, action, details, created_at)
      VALUES (v_pid, 'user_login', '{}'::jsonb, v_now - (v_days_ago || ' days')::interval);
    END LOOP;
  END LOOP;

END $$;
