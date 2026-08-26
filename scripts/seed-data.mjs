// Generates comprehensive seed data: 100 students, 50 exams, 1000+ questions, attempts
// Usage: $env:SUPABASE_SERVICE_KEY="..." ; node scripts/seed-data.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vjhzbqtoktktrjevcodq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

const GRADES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const STUDENTS_PER_GRADE = 10
const EXAMS_PER_GRADE = 5

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rng(0, i); [a[i], a[j]] = [a[j], a[i]] } return a }

// ── Realistic math questions per grade ──────────────────────
const questionBank = {
  3: [
    {
      subject: 'Arithmetic', topic: 'Addition',
      type: 'multiple_choice', difficulty: 1,
      question_text: 'Sarah has 245 stickers. Her friend gives her 178 more. How many stickers does Sarah have now?',
      options: ['$323$', '$413$', '$423$', '$433$'],
      correct_answer: '2',
      explanation: 'Add the ones: $5 + 8 = 13$, carry the $1$. Tens: $4 + 7 + 1 = 12$, carry the $1$. Hundreds: $2 + 1 + 1 = 4$. So $245 + 178 = 423$.',
      common_mistakes: [{ mistake: '$323$ — forgetting to carry the tens', why: 'Always carry when a column sums to $\\ge 10$', correct: '$423$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Subtraction',
      type: 'multiple_choice', difficulty: 1,
      question_text: 'A bakery had 500 cookies. They sold 276. How many cookies are left?',
      options: ['$224$', '$234$', '$324$', '$276$'],
      correct_answer: '0',
      explanation: 'Borrow from the hundreds: $500 - 276$. Ones: $10 - 6 = 4$. Tens: $9 - 7 = 2$. Hundreds: $4 - 2 = 2$. So $500 - 276 = 224$.',
      common_mistakes: [{ mistake: '$276$ — subtracting the smaller from larger incorrectly', why: 'Subtract the smaller number from the larger, borrowing when needed', correct: '$224$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Multiplication',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A classroom has 6 rows of desks. Each row has 8 desks. How many desks are in the classroom?',
      options: ['$42$', '$48$', '$56$', '$64$'],
      correct_answer: '1',
      explanation: 'Multiply $6 \\times 8 = 48$. There are 48 desks in the classroom.',
      common_mistakes: [{ mistake: '$42$ — mixing up $6 \\times 7$ with $6 \\times 8$', why: 'Practice the 8 times table: $6 \\times 8 = 48$', correct: '$48$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Division',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A teacher has 72 pencils to distribute equally among 9 students. How many pencils does each student get?',
      options: ['$7$', '$8$', '$9$', '$6$'],
      correct_answer: '1',
      explanation: '$72 \\div 9 = 8$. Each student gets 8 pencils.',
      common_mistakes: [{ mistake: '$9$ — confusing $72 \\div 8 = 9$ with $72 \\div 9 = 8$', why: 'Division is the inverse of multiplication: $9 \\times 8 = 72$', correct: '$8$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Fractions',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What fraction of the circle is shaded if 3 out of 8 equal parts are shaded?',
      options: ['$\\frac{3}{5}$', '$\\frac{3}{8}$', '$\\frac{5}{8}$', '$\\frac{8}{3}$'],
      correct_answer: '1',
      explanation: 'The denominator is the total number of parts (8). The numerator is the number of shaded parts (3). So the fraction is $\\frac{3}{8}$.',
      common_mistakes: [{ mistake: '$\\frac{3}{5}$ — subtracting instead of writing parts/total', why: 'Fraction = shaded parts $\\div$ total parts', correct: '$\\frac{3}{8}$' }],
    },
    {
      subject: 'Basic Geometry', topic: 'Shapes',
      type: 'multiple_choice', difficulty: 1,
      question_text: 'How many sides does a hexagon have?',
      options: ['$4$', '$5$', '$6$', '$8$'],
      correct_answer: '2',
      explanation: 'A hexagon has 6 sides. Think of "hex" meaning 6 (like a hexagon in a honeycomb).',
      common_mistakes: [{ mistake: '$8$ — confusing hexagon with octagon', why: '"Hex" = 6, "Oct" = 8', correct: '$6$' }],
    },
    {
      subject: 'Basic Geometry', topic: 'Perimeter',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A rectangular garden is 12 meters long and 7 meters wide. What is its perimeter?',
      options: ['$19$ m', '$38$ m', '$84$ m', '$36$ m'],
      correct_answer: '1',
      explanation: 'Perimeter $= 2 \\times (\\text{length} + \\text{width}) = 2 \\times (12 + 7) = 2 \\times 19 = 38$ meters.',
      common_mistakes: [{ mistake: '$19$ — adding only once instead of twice', why: 'Perimeter means the sum of ALL sides', correct: '$38$ m' }],
    },
    {
      subject: 'Arithmetic', topic: 'Addition',
      type: 'short_answer', difficulty: 3,
      question_text: 'Find the sum: $1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10$',
      correct_answer: '55',
      explanation: 'Pair the numbers: $(1+10)+(2+9)+(3+8)+(4+7)+(5+6) = 11 \\times 5 = 55$.',
      common_mistakes: [{ mistake: '$50$ — forgetting to include one number', why: 'Check your pairing carefully', correct: '$55$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Subtraction',
      type: 'short_answer', difficulty: 3,
      question_text: 'What is $1000 - 1$?',
      correct_answer: '999',
      explanation: '$1000 - 1 = 999$.',
    },
    {
      subject: 'Basic Geometry', topic: 'Area',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A square has a side length of 9 cm. What is its area?',
      options: ['$18$ cm$^2$', '$36$ cm$^2$', '$81$ cm$^2$', '$9$ cm$^2$'],
      correct_answer: '2',
      explanation: 'Area of a square $= \\text{side}^2 = 9^2 = 81$ square cm.',
      common_mistakes: [{ mistake: '$36$ — multiplying $9 \\times 4$ (perimeter) instead of area', why: 'Area = side $\\times$ side, not side $\\times$ 4', correct: '$81$ cm$^2$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Fractions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is $\\frac{2}{3} + \\frac{1}{6}$?',
      options: ['$\\frac{3}{9}$', '$\\frac{5}{6}$', '$\\frac{3}{6}$', '$\\frac{1}{2}$'],
      correct_answer: '1',
      explanation: 'Find a common denominator: $\\frac{2}{3} = \\frac{4}{6}$. Then $\\frac{4}{6} + \\frac{1}{6} = \\frac{5}{6}$.',
      common_mistakes: [{ mistake: '$\\frac{3}{9}$ — adding numerators and denominators separately', why: 'You must find a common denominator first, then add the numerators', correct: '$\\frac{5}{6}$' }],
    },
  ],
  4: [
    {
      subject: 'Arithmetic', topic: 'Multiplication',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A book has 234 pages. How many pages are there in 6 such books?',
      options: ['$1{,}404$', '$1{,}234$', '$1{,}204$', '$1{,}404$'],
      correct_answer: '0',
      explanation: '$234 \\times 6 = (200 \\times 6) + (30 \\times 6) + (4 \\times 6) = 1200 + 180 + 24 = 1404$.',
      common_mistakes: [{ mistake: '$1{,}234$ — misaligning digits in multiplication', why: 'Multiply each digit separately, starting from the ones place', correct: '$1{,}404$' }],
    },
    {
      subject: 'Fractions', topic: 'Decimals',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is $0.75$ as a fraction in simplest form?',
      options: ['$\\frac{3}{4}$', '$\\frac{75}{100}$', '$\\frac{7}{10}$', '$\\frac{1}{2}$'],
      correct_answer: '0',
      explanation: '$0.75 = \\frac{75}{100} = \\frac{75 \\div 25}{100 \\div 25} = \\frac{3}{4}$.',
      common_mistakes: [{ mistake: '$\\frac{75}{100}$ — not simplifying', why: 'Always reduce fractions to their simplest form', correct: '$\\frac{3}{4}$' }],
    },
    {
      subject: 'Fractions', topic: 'Fractions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Which fraction is equivalent to $\\frac{2}{5}$?',
      options: ['$\\frac{4}{10}$', '$\\frac{2}{10}$', '$\\frac{6}{5}$', '$\\frac{4}{5}$'],
      correct_answer: '0',
      explanation: 'Multiply numerator and denominator by 2: $\\frac{2 \\times 2}{5 \\times 2} = \\frac{4}{10}$.',
      common_mistakes: [{ mistake: '$\\frac{2}{10}$ — multiplying only the denominator', why: 'Multiply both numerator AND denominator by the same number', correct: '$\\frac{4}{10}$' }],
    },
    {
      subject: 'Geometry', topic: 'Perimeter',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A rectangular playground is 45 m long and 28 m wide. What is its perimeter?',
      options: ['$73$ m', '$146$ m', '$1{,}260$ m', '$136$ m'],
      correct_answer: '1',
      explanation: '$P = 2(l + w) = 2(45 + 28) = 2(73) = 146$ meters.',
      common_mistakes: [{ mistake: '$73$ — only adding length and width without doubling', why: 'Perimeter is the distance around ALL sides', correct: '$146$ m' }],
    },
    {
      subject: 'Geometry', topic: 'Area',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A rectangular garden has an area of 96 square meters. Its width is 8 meters. How long is the garden?',
      options: ['$88$ m', '$12$ m', '$104$ m', '$16$ m'],
      correct_answer: '1',
      explanation: 'Area $= \\text{length} \\times \\text{width}$, so length $= \\text{area} \\div \\text{width} = 96 \\div 8 = 12$ meters.',
      common_mistakes: [{ mistake: '$88$ — subtracting instead of dividing', why: 'Area $= l \\times w$, so to find length, divide area by width', correct: '$12$ m' }],
    },
    {
      subject: 'Arithmetic', topic: 'Division',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A baker divided 156 cookies equally into 12 boxes. How many cookies are in each box?',
      options: ['$11$', '$13$', '$12$', '$14$'],
      correct_answer: '1',
      explanation: '$156 \\div 12 = 13$. Check: $13 \\times 12 = 156$.',
      common_mistakes: [{ mistake: '$12$ — rounding 156/12 to 12', why: '$12 \\times 12 = 144$, which is less than 156', correct: '$13$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Decimals',
      type: 'short_answer', difficulty: 3,
      question_text: 'What is $12.5 + 3.75$?',
      correct_answer: '16.25',
      explanation: 'Line up decimal points: $12.50 + 3.75 = 16.25$.',
      common_mistakes: [{ mistake: '$16.25$ is correct, but some write $16.25$ as $16.25$ — keep the decimal', why: 'Always line up decimal points when adding', correct: '$16.25$' }],
    },
    {
      subject: 'Arithmetic', topic: 'Subtraction',
      type: 'short_answer', difficulty: 2,
      question_text: 'What is $500 - 237$?',
      correct_answer: '263',
      explanation: 'Borrow: $500 - 237 = 263$.',
    },
    {
      subject: 'Fractions', topic: 'Fractions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is $\\frac{3}{4} - \\frac{1}{2}$?',
      options: ['$\\frac{2}{2}$', '$\\frac{1}{4}$', '$\\frac{2}{4}$', '$\\frac{1}{2}$'],
      correct_answer: '1',
      explanation: '$\\frac{3}{4} - \\frac{1}{2} = \\frac{3}{4} - \\frac{2}{4} = \\frac{1}{4}$.',
      common_mistakes: [{ mistake: '$\\frac{2}{2}$ — subtracting numerators and denominators separately', why: 'Find a common denominator first!', correct: '$\\frac{1}{4}$' }],
    },
    {
      subject: 'Geometry', topic: 'Area',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A triangle has a base of 10 cm and height of 6 cm. What is its area?',
      options: ['$60$ cm$^2$', '$30$ cm$^2$', '$16$ cm$^2$', '$20$ cm$^2$'],
      correct_answer: '1',
      explanation: 'Area of triangle $= \\frac{1}{2} \\times \\text{base} \\times \\text{height} = \\frac{1}{2} \\times 10 \\times 6 = 30$ cm$^2$.',
      common_mistakes: [{ mistake: '$60$ — forgetting to halve the product', why: 'A triangle is half of a rectangle, so always multiply by $\\frac{1}{2}$', correct: '$30$ cm$^2$' }],
    },
  ],
  5: [
    {
      subject: 'Pre-Algebra', topic: 'Order of Operations',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is $3 + 4 \\times 2$?',
      options: ['$14$', '$11$', '$10$', '$12$'],
      correct_answer: '1',
      explanation: 'By order of operations, multiply first: $4 \\times 2 = 8$, then add: $3 + 8 = 11$.',
      common_mistakes: [{ mistake: '$14$ — adding $3+4$ first, then multiplying', why: 'Remember PEMDAS: multiply BEFORE adding', correct: '$11$' }],
    },
    {
      subject: 'Pre-Algebra', topic: 'Variables',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'If $x = 5$, what is $3x + 7$?',
      options: ['$15$', '$22$', '$35$', '$20$'],
      correct_answer: '1',
      explanation: 'Substitute $x = 5$: $3(5) + 7 = 15 + 7 = 22$.',
      common_mistakes: [{ mistake: '$15$ — forgetting to add 7 after multiplying', why: 'Complete ALL operations after substitution', correct: '$22$' }],
    },
    {
      subject: 'Geometry', topic: 'Volume',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A rectangular prism is 8 cm long, 5 cm wide, and 3 cm tall. What is its volume?',
      options: ['$120$ cm$^3$', '$40$ cm$^3$', '$80$ cm$^3$', '$60$ cm$^3$'],
      correct_answer: '0',
      explanation: 'Volume $= \\text{length} \\times \\text{width} \\times \\text{height} = 8 \\times 5 \\times 3 = 120$ cm$^3$.',
      common_mistakes: [{ mistake: '$40$ — multiplying only length and width', why: 'Volume needs all three dimensions', correct: '$120$ cm$^3$' }],
    },
    {
      subject: 'Fractions', topic: 'Decimals',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is $\\frac{3}{5}$ written as a decimal?',
      options: ['$0.35$', '$0.6$', '$0.3$', '$0.5$'],
      correct_answer: '1',
      explanation: '$\\frac{3}{5} = \\frac{3 \\times 20}{5 \\times 20} = \\frac{60}{100} = 0.6$.',
      common_mistakes: [{ mistake: '$0.35$ — confusing $\\frac{3}{5}$ with 3.5 or 35%', why: '$\\frac{3}{5} = 0.6$ or 60%', correct: '$0.6$' }],
    },
    {
      subject: 'Geometry', topic: 'Coordinate Plane',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What are the coordinates of the point that is 3 units right and 2 units up from the origin?',
      options: ['$(2, 3)$', '$(3, 2)$', '$(-3, -2)$', '$(0, 0)$'],
      correct_answer: '1',
      explanation: 'Right is positive x, up is positive y. So $(3, 2)$.',
      common_mistakes: [{ mistake: '$(2, 3)$ — swapping x and y', why: 'Always (horizontal, vertical) = (x, y)', correct: '$(3, 2)$' }],
    },
    {
      subject: 'Pre-Algebra', topic: 'Order of Operations',
      type: 'short_answer', difficulty: 3,
      question_text: 'Evaluate: $(12 - 5) \\times 3 + 2$',
      correct_answer: '23',
      explanation: 'Parentheses first: $12 - 5 = 7$. Then multiply: $7 \\times 3 = 21$. Then add: $21 + 2 = 23$.',
      common_mistakes: [{ mistake: '$19$ — adding 2 before multiplying', why: 'PEMDAS: multiply before add', correct: '$23$' }],
    },
    {
      subject: 'Pre-Algebra', topic: 'Variables',
      type: 'short_answer', difficulty: 3,
      question_text: 'If $a = 4$ and $b = 7$, what is $2a + 3b$?',
      correct_answer: '29',
      explanation: '$2(4) + 3(7) = 8 + 21 = 29$.',
      common_mistakes: [{ mistake: '$33$ — adding before multiplying', why: 'Multiply first, then add', correct: '$29$' }],
    },
    {
      subject: 'Fractions', topic: 'Decimals',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Which decimal is equivalent to $\\frac{7}{8}$?',
      options: ['$0.78$', '$0.875$', '$0.7$', '$0.85$'],
      correct_answer: '1',
      explanation: '$\\frac{7}{8} = 7 \\div 8 = 0.875$.',
      common_mistakes: [{ mistake: '$0.78$ — confusing $\\frac{7}{8}$ with $\\frac{78}{100}$', why: 'Divide 7 by 8 to get 0.875', correct: '$0.875$' }],
    },
    {
      subject: 'Geometry', topic: 'Volume',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A cube has sides of length 4 cm. What is its volume?',
      options: ['$16$ cm$^3$', '$64$ cm$^3$', '$24$ cm$^3$', '$12$ cm$^3$'],
      correct_answer: '1',
      explanation: 'Volume of a cube $= \\text{side}^3 = 4^3 = 64$ cm$^3$.',
      common_mistakes: [{ mistake: '$16$ — squaring instead of cubing', why: 'Volume is 3D, so use $s^3$, not $s^2$', correct: '$64$ cm$^3$' }],
    },
    {
      subject: 'Fractions', topic: 'Fractions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'There are 20 students in a class. $\\frac{2}{5}$ are boys. How many girls are in the class?',
      options: ['$8$', '$12$', '$10$', '$15$'],
      correct_answer: '1',
      explanation: 'Boys: $\\frac{2}{5} \\times 20 = 8$. Girls: $20 - 8 = 12$.',
      common_mistakes: [{ mistake: '$8$ — answering the number of boys instead of girls', why: 'Read the question carefully — it asks for GIRLS', correct: '$12$' }],
    },
  ],
  6: [
    {
      subject: 'Ratios', topic: 'Ratios',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'In a bag of marbles, the ratio of red to blue marbles is $3:5$. If there are 24 red marbles, how many blue marbles are there?',
      options: ['$15$', '$40$', '$20$', '$30$'],
      correct_answer: '1',
      explanation: '$3$ parts $= 24$, so $1$ part $= 8$. Blue = $5$ parts $= 5 \\times 8 = 40$ blue marbles.',
      common_mistakes: [{ mistake: '$15$ — finding the ratio of blue to red', why: 'Find the value of one part first: $24 \\div 3 = 8$', correct: '$40$' }],
    },
    {
      subject: 'Ratios', topic: 'Percentages',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A store has a 25% off sale. The original price is $\\$80$. What is the sale price?',
      options: ['$\\$55$', '$\\$60$', '$\\$65$', '$\\$20$'],
      correct_answer: '1',
      explanation: 'Discount $= 25\\%$ of $80 = 80 \\times 0.25 = 20$. Sale price $= 80 - 20 = 60$.',
      common_mistakes: [{ mistake: '$\\$20$ — answering the discount instead of the sale price', why: 'Subtract the discount from the original price', correct: '$\\$60$' }],
    },
    {
      subject: 'Pre-Algebra', topic: 'Equations',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Solve for $x$: $3x + 7 = 22$',
      options: ['$x = 3$', '$x = 5$', '$x = 7$', '$x = 4$'],
      correct_answer: '1',
      explanation: '$3x + 7 = 22$  →  $3x = 22 - 7 = 15$  →  $x = 15 \\div 3 = 5$.',
      common_mistakes: [{ mistake: '$x = 7$ — adding 7 to 22 instead of subtracting', why: 'Undo addition by subtracting, then undo multiplication by dividing', correct: '$x = 5$' }],
    },
    {
      subject: 'Geometry', topic: 'Surface Area',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A rectangular prism has dimensions 6 cm $\\times$ 4 cm $\\times$ 3 cm. What is its surface area?',
      options: ['$72$ cm$^2$', '$108$ cm$^2$', '$96$ cm$^2$', '$84$ cm$^2$'],
      correct_answer: '1',
      explanation: 'SA $= 2(6\\times4) + 2(6\\times3) + 2(4\\times3) = 48 + 36 + 24 = 108$ cm$^2$.',
      common_mistakes: [{ mistake: '$72$ — finding volume instead of surface area', why: 'Surface area adds the areas of ALL faces', correct: '$108$ cm$^2$' }],
    },
    {
      subject: 'Pre-Algebra', topic: 'Integers',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is $(-8) + 5$?',
      options: ['$-13$', '$13$', '$-3$', '$3$'],
      correct_answer: '2',
      explanation: 'Start at $-8$ and move 5 units toward the positive: $(-8) + 5 = -3$.',
      common_mistakes: [{ mistake: '$-13$ — adding the absolute values and keeping the sign', why: 'When signs differ, subtract absolute values and keep the sign of the larger', correct: '$-3$' }],
    },
    {
      subject: 'Ratios', topic: 'Percentages',
      type: 'short_answer', difficulty: 3,
      question_text: 'What is 15% of 200?',
      correct_answer: '30',
      explanation: '$15\\%$ of $200 = 0.15 \\times 200 = 30$.',
      common_mistakes: [{ mistake: '$300$ — multiplying 15 × 200 without converting to a decimal', why: '$15\\% = 0.15$, not 15', correct: '$30$' }],
    },
    {
      subject: 'Pre-Algebra', topic: 'Equations',
      type: 'short_answer', difficulty: 3,
      question_text: 'Solve: $2x - 9 = 11$',
      correct_answer: '10',
      explanation: '$2x - 9 = 11$  →  $2x = 20$  →  $x = 10$.',
    },
    {
      subject: 'Geometry', topic: 'Surface Area',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A cube has side length 5 cm. What is its surface area?',
      options: ['$25$ cm$^2$', '$125$ cm$^2$', '$150$ cm$^2$', '$100$ cm$^2$'],
      correct_answer: '2',
      explanation: 'Each face is $5 \\times 5 = 25$ cm$^2$. A cube has 6 faces: $6 \\times 25 = 150$ cm$^2$.',
      common_mistakes: [{ mistake: '$25$ — finding area of one face only', why: 'Surface area = sum of ALL 6 faces', correct: '$150$ cm$^2$' }],
    },
    {
      subject: 'Ratios', topic: 'Ratios',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'The ratio of cats to dogs in a pet store is $4:3$. If there are 12 dogs, how many cats are there?',
      options: ['$9$', '$16$', '$18$', '$24$'],
      correct_answer: '1',
      explanation: 'Dogs $= 3$ parts $= 12$, so $1$ part $= 4$. Cats $= 4$ parts $= 4 \\times 4 = 16$.',
    },
    {
      subject: 'Pre-Algebra', topic: 'Integers',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is $(-6) \\times (-4)$?',
      options: ['$-24$', '$24$', '$-10$', '$10$'],
      correct_answer: '1',
      explanation: 'The product of two negative numbers is positive: $(-6) \\times (-4) = 24$.',
      common_mistakes: [{ mistake: '$-24$ — thinking product of negatives is negative', why: 'Negative $\\times$ Negative = Positive', correct: '$24$' }],
    },
  ],
  7: [
    {
      subject: 'Algebra', topic: 'Linear Equations',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Solve: $5x - 3 = 2x + 9$',
      options: ['$x = 2$', '$x = 4$', '$x = 3$', '$x = 5$'],
      correct_answer: '1',
      explanation: '$5x - 3 = 2x + 9$  →  $5x - 2x = 9 + 3$  →  $3x = 12$  →  $x = 4$.',
      common_mistakes: [{ mistake: '$x = 2$ — forgetting to add 3 to both sides correctly', why: 'When moving terms, change their signs', correct: '$x = 4$' }],
    },
    {
      subject: 'Geometry', topic: 'Angles',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Two angles are supplementary. One angle measures $72^\\circ$. What is the measure of the other angle?',
      options: ['$18^\\circ$', '$28^\\circ$', '$108^\\circ$', '$288^\\circ$'],
      correct_answer: '2',
      explanation: 'Supplementary angles sum to $180^\\circ$. So the other angle is $180 - 72 = 108^\\circ$.',
      common_mistakes: [{ mistake: '$18^\\circ$ — confusing supplementary (180) with complementary (90)', why: 'Supplementary = 180°, Complementary = 90°', correct: '$108^\\circ$' }],
    },
    {
      subject: 'Geometry', topic: 'Triangles',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A triangle has angles $50^\\circ$ and $65^\\circ$. What is the third angle?',
      options: ['$55^\\circ$', '$65^\\circ$', '$75^\\circ$', '$45^\\circ$'],
      correct_answer: '1',
      explanation: 'Sum of angles in a triangle $= 180^\\circ$. Third angle $= 180 - 50 - 65 = 65^\\circ$.',
      common_mistakes: [{ mistake: '$55^\\circ$ — subtracting incorrectly', why: 'Add the two known angles first, then subtract from 180', correct: '$65^\\circ$' }],
    },
    {
      subject: 'Statistics', topic: 'Probability',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A bag has 3 red marbles, 5 blue marbles, and 2 green marbles. What is the probability of drawing a blue marble?',
      options: ['$\\frac{1}{2}$', '$\\frac{3}{10}$', '$\\frac{1}{5}$', '$\\frac{5}{10}$'],
      correct_answer: '0',
      explanation: 'Total marbles $= 3 + 5 + 2 = 10$. Blue marbles $= 5$. Probability $= \\frac{5}{10} = \\frac{1}{2}$.',
      common_mistakes: [{ mistake: '$\\frac{3}{10}$ — using number of red marbles instead of blue', why: 'Read which color the question asks for', correct: '$\\frac{1}{2}$' }],
    },
    {
      subject: 'Algebra', topic: 'Inequalities',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Solve: $2x - 7 > 5$',
      options: ['$x > 1$', '$x > 6$', '$x > -1$', '$x < 6$'],
      correct_answer: '1',
      explanation: '$2x - 7 > 5$  →  $2x > 12$  →  $x > 6$.',
      common_mistakes: [{ mistake: '$x > 1$ — adding 7 to 5 incorrectly as 6 instead of 12', why: '$5 + 7 = 12$, then divide by 2', correct: '$x > 6$' }],
    },
    {
      subject: 'Algebra', topic: 'Linear Equations',
      type: 'short_answer', difficulty: 3,
      question_text: 'Solve for $x$: $7x + 2 = 5x + 14$',
      correct_answer: '6',
      explanation: '$7x + 2 = 5x + 14$  →  $7x - 5x = 14 - 2$  →  $2x = 12$  →  $x = 6$.',
    },
    {
      subject: 'Geometry', topic: 'Probability',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A fair six-sided die is rolled. What is the probability of rolling a number greater than 4?',
      options: ['$\\frac{1}{6}$', '$\\frac{1}{3}$', '$\\frac{1}{2}$', '$\\frac{2}{3}$'],
      correct_answer: '1',
      explanation: 'Numbers greater than 4 are 5 and 6 (2 outcomes). Total outcomes = 6. Probability $= \\frac{2}{6} = \\frac{1}{3}$.',
      common_mistakes: [{ mistake: '$\\frac{1}{2}$ — including 4 as "greater than"', why: '"Greater than 4" means 5 and 6 only, not 4', correct: '$\\frac{1}{3}$' }],
    },
    {
      subject: 'Geometry', topic: 'Angles',
      type: 'short_answer', difficulty: 3,
      question_text: 'Two angles are complementary. One is $38^\\circ$. What is the other?',
      correct_answer: '52',
      explanation: 'Complementary angles sum to $90^\\circ$. So $90 - 38 = 52^\\circ$.',
    },
    {
      subject: 'Algebra', topic: 'Linear Equations',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is the slope of the line $y = 3x - 5$?',
      options: ['$-5$', '$3$', '$5$', '$-3$'],
      correct_answer: '1',
      explanation: 'In $y = mx + b$, the slope $m$ is the coefficient of $x$, which is $3$.',
      common_mistakes: [{ mistake: '$-5$ — confusing slope with y-intercept', why: '$m$ is slope (coefficient of $x$), $b$ is y-intercept', correct: '$3$' }],
    },
    {
      subject: 'Statistics', topic: 'Probability',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A bag contains 4 red, 3 white, and 3 blue marbles. What is the probability of drawing a red marble, then a white marble (without replacement)?',
      options: ['$\\frac{12}{100}$', '$\\frac{2}{15}$', '$\\frac{12}{90}$', '$\\frac{1}{3}$'],
      correct_answer: '1',
      explanation: '$\\sin(\\pi - \\theta) = \\sin \\theta$ (sine is positive in Quadrant II).',
    },
    // --- Euclidean Geometry G7 additions (OERGeometry Ch3-4, CC BY-SA) ---
    {
      subject: 'Geometry', topic: 'Parallel Lines',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Two parallel lines cut by a transversal form corresponding angles $48^\\circ$. What is the measure of the matching angle?',
      options: ['$42^\\circ$', '$48^\\circ$', '$132^\\circ$', '$180^\\circ$'],
      correct_answer: '1',
      explanation: 'Corresponding angles formed by parallel lines are equal: $48^\\circ$.',
    },
    {
      subject: 'Geometry', topic: 'Triangles',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'In $\\triangle ABC$, $AB = AC$ and $\\angle A = 36^\\circ$. What is $\\angle B$?',
      options: ['$72^\\circ$', '$54^\\circ$', '$36^\\circ$', '$108^\\circ$'],
      correct_answer: '0',
      explanation: 'Isosceles $AB=AC$ → base angles equal: $(180-36)/2 = 72^\\circ$.',
    },
    {
      subject: 'Geometry', topic: 'Exterior Angles',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Exterior angle of a triangle is $110^\\circ$, one remote interior is $45^\\circ$. Find the other remote interior.',
      options: ['$65^\\circ$', '$70^\\circ$', '$55^\\circ$', '$45^\\circ$'],
      correct_answer: '0',
      explanation: 'Exterior $=$ sum of remote interiors: $110 - 45 = 65^\\circ$.',
    },
    {
      subject: 'Geometry', topic: 'Quadrilaterals',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Sum of interior angles of a convex hexagon?',
      options: ['$360^\\circ$', '$540^\\circ$', '$720^\\circ$', '$1080^\\circ$'],
      correct_answer: '2',
      explanation: '$(n-2)180 = 4 \\cdot 180 = 720^\\circ$.',
    },
  ],
  8: [
    {
      subject: 'Algebra', topic: 'Systems',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Solve the system: $\\begin{cases} x + y = 10 \\\\ x - y = 2 \\end{cases}$',
      options: ['$(6, 4)$', '$(4, 6)$', '$(5, 5)$', '$(7, 3)$'],
      correct_answer: '0',
      explanation: 'Adding the equations: $2x = 12$, so $x = 6$. Then $6 + y = 10$, so $y = 4$. The solution is $(6, 4)$.',
      common_mistakes: [{ mistake: '$(4, 6)$ — swapping x and y', why: 'Solve for x first ($x=6$), then substitute to find y', correct: '$(6, 4)$' }],
    },
    {
      subject: 'Geometry', topic: 'Pythagorean',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?',
      options: ['$10$', '$12$', '$14$', '$100$'],
      correct_answer: '0',
      explanation: '$a^2 + b^2 = c^2$  →  $6^2 + 8^2 = 36 + 64 = 100$  →  $c = \\sqrt{100} = 10$.',
      common_mistakes: [{ mistake: '$100$ — forgetting to take the square root', why: '$a^2 + b^2 = c^2$, so $c = \\sqrt{a^2 + b^2}$', correct: '$10$' }],
    },
    {
      subject: 'Algebra', topic: 'Slope',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is the slope of the line through points $(1, 3)$ and $(4, 9)$?',
      options: ['$1$', '$2$', '$3$', '$6$'],
      correct_answer: '1',
      explanation: 'Slope $= \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{9 - 3}{4 - 1} = \\frac{6}{3} = 2$.',
      common_mistakes: [{ mistake: '$6$ — subtracting x from y instead of using the slope formula', why: 'Slope = rise $\\div$ run: $\\frac{\\Delta y}{\\Delta x}$', correct: '$2$' }],
    },
    {
      subject: 'Geometry', topic: 'Transformations',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'A point $(3, -2)$ is reflected across the $y$-axis. What are the new coordinates?',
      options: ['$(-3, -2)$', '$(3, 2)$', '$(-3, 2)$', '$(2, -3)$'],
      correct_answer: '0',
      explanation: 'Reflecting across the $y$-axis changes the sign of $x$: $(3, -2) \\to (-3, -2)$.',
      common_mistakes: [{ mistake: '$(3, 2)$ — reflecting across x-axis instead of y-axis', why: 'Y-axis reflection: $(x,y) \\to (-x, y)$', correct: '$(-3, -2)$' }],
    },
    {
      subject: 'Algebra', topic: 'Systems',
      type: 'short_answer', difficulty: 3,
      question_text: 'Solve: $\\begin{cases} 2x + y = 7 \\\\ x - y = 2 \\end{cases}$',
      correct_answer: 'x=3, y=1',
      explanation: 'Add: $3x = 9$, so $x = 3$. Then $3 - y = 2$, so $y = 1$.',
    },
    {
      subject: 'Algebra', topic: 'Functions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'If $f(x) = 2x^2 - 3$, what is $f(4)$?',
      options: ['$29$', '$13$', '$5$', '$19$'],
      correct_answer: '0',
      explanation: '$f(4) = 2(4)^2 - 3 = 2(16) - 3 = 32 - 3 = 29$.',
      common_mistakes: [{ mistake: '$13$ — multiplying $2 \\times 4$ then squaring instead of squaring first', why: 'Exponents before multiplication: $4^2 = 16$, then $2 \\times 16 = 32$', correct: '$29$' }],
    },
    {
      subject: 'Geometry', topic: 'Pythagorean',
      type: 'short_answer', difficulty: 3,
      question_text: 'A 13-foot ladder is placed 5 feet from the base of a wall. How high does it reach?',
      correct_answer: '12',
      explanation: '$5^2 + h^2 = 13^2$  →  $25 + h^2 = 169$  →  $h^2 = 144$  →  $h = 12$ feet.',
    },
    {
      subject: 'Geometry', topic: 'Slope',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Which line is parallel to $y = 2x + 5$?',
      options: ['$y = -2x + 3$', '$y = 2x - 1$', '$y = \\frac{1}{2}x + 5$', '$y = -\\frac{1}{2}x + 5$'],
      correct_answer: '1',
      explanation: 'Parallel lines have the same slope. $y = 2x - 1$ has the same slope (2) as $y = 2x + 5$.',
    },
    {
      subject: 'Algebra', topic: 'Functions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is the domain of $f(x) = \\sqrt{x - 3}$?',
      options: ['$x \\ge 3$', '$x > 3$', '$x \\le 3$', 'All real numbers'],
      correct_answer: '0',
      explanation: 'The expression under a square root must be $\\ge 0$: $x - 3 \\ge 0$, so $x \\ge 3$.',
    },
    {
      subject: 'Geometry', topic: 'Transformations',
      type: 'short_answer', difficulty: 3,
      question_text: 'Translate $(2, -5)$ by the vector $\\langle -3, 4 \\rangle$.',
      correct_answer: '(-1, -1)',
      explanation: 'Add the vector: $2 + (-3) = -1$, $-5 + 4 = -1$. Result: $(-1, -1)$.',
    },
    // --- Euclidean Geometry G8 additions ---
    {
      subject: 'Geometry', topic: 'Midpoint',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Midpoint of $A(2,8)$ and $B(6,2)$?',
      options: ['$(4,5)$', '$(8,10)$', '$(2,3)$', '$(4,3)$'],
      correct_answer: '0',
      explanation: '$M = \\left(\\frac{2+6}{2},\\frac{8+2}{2}\\right) = (4,5)$.',
    },
    {
      subject: 'Geometry', topic: 'Distance',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Distance between $(0,0)$ and $(3,4)$?',
      options: ['$5$', '$7$', '$25$', '$3$'],
      correct_answer: '0',
      explanation: '$d = \\sqrt{3^2+4^2}=5$.',
    },
    {
      subject: 'Geometry', topic: 'Congruence',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Which confirms $\\triangle ABC \\cong \\triangle DEF$ if $AB=DE$, $BC=EF$, $CA=FD$?',
      options: ['SSS', 'SAS', 'ASA', 'AAS'],
      correct_answer: '0',
      explanation: 'Three sides equal → SSS.',
    },
    {
      subject: 'Geometry', topic: 'Similarity',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Two similar triangles ratio $2:3$, small area $16$. Large area?',
      options: ['$24$', '$36$', '$48$', '$32$'],
      correct_answer: '1',
      explanation: 'Area ratio $k^2 = (3/2)^2=9/4$, $16 \\cdot 9/4=36$.',
    },
  ],
  9: [
    {
      subject: 'Algebra I', topic: 'Quadratics',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Solve: $x^2 - 5x + 6 = 0$',
      options: ['$x = 2, 3$', '$x = -2, -3$', '$x = 1, 6$', '$x = -1, -6$'],
      correct_answer: '0',
      explanation: 'Factor: $(x - 2)(x - 3) = 0$, so $x = 2$ or $x = 3$.',
      common_mistakes: [{ mistake: '$x = -2, -3$ — forgetting to change signs when factoring', why: 'If $(x - a)(x - b) = 0$, then $x = a$ and $x = b$', correct: '$x = 2, 3$' }],
    },
    {
      subject: 'Geometry', topic: 'Circles',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'A circle has a radius of 7 cm. What is its circumference? (Use $\\pi \\approx \\frac{22}{7}$)',
      options: ['$44$ cm', '$22$ cm', '$154$ cm', '$49$ cm'],
      correct_answer: '0',
      explanation: '$C = 2\\pi r = 2 \\times \\frac{22}{7} \\times 7 = 44$ cm.',
      common_mistakes: [{ mistake: '$154$ — finding area ($\\pi r^2$) instead of circumference', why: 'Circumference = $2\\pi r$, Area = $\\pi r^2$', correct: '$44$ cm' }],
    },
    {
      subject: 'Trigonometry', topic: 'Trig Ratios',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'In a right triangle, the side opposite a $30^\\circ$ angle is 5. What is the length of the hypotenuse?',
      options: ['$5\\sqrt{3}$', '$10$', '$5\\sqrt{2}$', '$2.5$'],
      correct_answer: '1',
      explanation: 'In a $30^\\circ$-$60^\\circ$-$90^\\circ$ triangle, the hypotenuse is twice the short leg. So $5 \\times 2 = 10$.',
      common_mistakes: [{ mistake: '$5\\sqrt{3}$ — using the $45^\\circ$-$45^\\circ$-$90^\\circ$ rule instead', why: '$30^\\circ$-$60^\\circ$-$90^\\circ$: hypotenuse $= 2 \\times$ short leg', correct: '$10$' }],
    },
    {
      subject: 'Algebra I', topic: 'Polynomials',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Simplify: $(3x^2 + 2x - 5) + (x^2 - 4x + 3)$',
      options: ['$4x^2 - 2x - 2$', '$2x^2 - 2x - 2$', '$4x^2 + 6x - 8$', '$3x^2 - 2x + 8$'],
      correct_answer: '0',
      explanation: 'Combine like terms: $3x^2 + x^2 = 4x^2$; $2x - 4x = -2x$; $-5 + 3 = -2$. Result: $4x^2 - 2x - 2$.',
    },
    {
      subject: 'Trigonometry', topic: 'Trig Ratios',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is $\\sin 30^\\circ$?',
      options: ['$0$', '$\\frac{1}{2}$', '$\\frac{\\sqrt{2}}{2}$', '$\\frac{\\sqrt{3}}{2}$'],
      correct_answer: '1',
      explanation: '$\\sin 30^\\circ = \\frac{1}{2}$. Remember the unit circle: $\\sin 30^\\circ = 0.5$.',
      common_mistakes: [{ mistake: '$\\frac{\\sqrt{3}}{2}$ — confusing $\\sin 30^\\circ$ with $\\sin 60^\\circ$', why: '$\\sin 30^\\circ = \\frac{1}{2}$, $\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}$', correct: '$\\frac{1}{2}$' }],
    },
    {
      subject: 'Algebra I', topic: 'Quadratics',
      type: 'short_answer', difficulty: 3,
      question_text: 'Solve: $x^2 - 10x + 25 = 0$',
      correct_answer: '5',
      explanation: 'Factor: $(x - 5)^2 = 0$, so $x = 5$ (double root).',
    },
    {
      subject: 'Geometry', topic: 'Proofs',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'In a triangle, two angles are equal. What can you conclude?',
      options: ['The triangle is equilateral', 'The sides opposite the equal angles are equal', 'The triangle is right-angled', 'The triangle has no equal sides'],
      correct_answer: '1',
      explanation: 'Base Angles Theorem: if two angles in a triangle are equal, the sides opposite them are equal (isosceles triangle).',
    },
    {
      subject: 'Algebra I', topic: 'Polynomials',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'Multiply: $(x + 3)(x - 2)$',
      options: ['$x^2 + x - 6$', '$x^2 - x - 6$', '$x^2 + 5x - 6$', '$x^2 + x + 6$'],
      correct_answer: '0',
      explanation: 'FOIL: $x \\cdot x = x^2$, $x \\cdot (-2) = -2x$, $3 \\cdot x = 3x$, $3 \\cdot (-2) = -6$. Sum: $x^2 + x - 6$.',
    },
    {
      subject: 'Trigonometry', topic: 'Trig Ratios',
      type: 'short_answer', difficulty: 3,
      question_text: 'If $\\tan \\theta = 1$, what is $\\theta$ (in degrees, between $0^\\circ$ and $90^\\circ$)?',
      correct_answer: '45',
      explanation: '$\\tan 45^\\circ = 1$, so $\\theta = 45^\\circ$.',
    },
    {
      subject: 'Geometry', topic: 'Circles',
      type: 'short_answer', difficulty: 3,
      question_text: 'A circle has circumference $12\\pi$ cm. What is its radius?',
      correct_answer: '6',
      explanation: '$C = 2\\pi r = 12\\pi$  →  $r = \\frac{12\\pi}{2\\pi} = 6$ cm.',
    },
    // --- Euclidean Geometry G9 additions ---
    {
      subject: 'Geometry', topic: 'Circles',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Central angle $60^\\circ$ in circle $r=6$, arc length?',
      options: ['$2\\pi$', '$6\\pi$', '$\\pi$', '$3\\pi$'],
      correct_answer: '0',
      explanation: '$s = r\\theta = 6 \\cdot \\pi/3 = 2\\pi$.',
    },
    {
      subject: 'Geometry', topic: 'Similarity',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Shadow: pole $2$m casts $3$m, building casts $12$m. Height?',
      options: ['$8$m', '$6$m', '$9$m', '$18$m'],
      correct_answer: '0',
      explanation: '$2/3 = h/12 → h=8$m.',
    },
    {
      subject: 'Geometry', topic: 'Proofs',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'If $\\angle A \\cong \\angle D$ and $\\angle B \\cong \\angle E$, triangles are?',
      options: ['Congruent', 'Similar by AA', 'Neither', 'Right'],
      correct_answer: '1',
      explanation: 'AA similarity.',
    },
  ],
  10: [
    {
      subject: 'Algebra II', topic: 'Exponentials',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Simplify: $2^3 \\times 2^4$',
      options: ['$2^7$', '$2^{12}$', '$4^7$', '$2^1$'],
      correct_answer: '0',
      explanation: 'When multiplying with the same base, add the exponents: $2^3 \\times 2^4 = 2^{3+4} = 2^7$.',
      common_mistakes: [{ mistake: '$2^{12}$ — multiplying exponents instead of adding', why: 'For multiplication, ADD exponents (same base)', correct: '$2^7$' }],
    },
    {
      subject: 'Trigonometry', topic: 'Unit Circle',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is $\\cos 180^\\circ$?',
      options: ['$0$', '$1$', '$-1$', '$\\frac{1}{2}$'],
      correct_answer: '2',
      explanation: 'On the unit circle, $180^\\circ$ corresponds to $(-1, 0)$, so $\\cos 180^\\circ = -1$.',
      common_mistakes: [{ mistake: '$0$ — confusing $\\cos 180^\\circ$ with $\\cos 90^\\circ$', why: '$\\cos 90^\\circ = 0$, $\\cos 180^\\circ = -1$', correct: '$-1$' }],
    },
    {
      subject: 'Algebra II', topic: 'Logarithms',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Solve: $\\log_2(8) = x$',
      options: ['$x = 2$', '$x = 3$', '$x = 4$', '$x = 16$'],
      correct_answer: '1',
      explanation: '$\\log_2(8) = x$ means $2^x = 8$, so $x = 3$.',
      common_mistakes: [{ mistake: '$x = 4$ — confusing $2^3 = 8$ with $2^4 = 16$', why: '$2^3 = 8$, so $\\log_2(8) = 3$', correct: '$x = 3$' }],
    },
    {
      subject: 'Analytic Geometry', topic: 'Conics',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What shape is described by $x^2 + y^2 = 25$?',
      options: ['Ellipse', 'Circle', 'Parabola', 'Hyperbola'],
      correct_answer: '1',
      explanation: '$x^2 + y^2 = r^2$ is the equation of a circle with radius $r = 5$.',
    },
    {
      subject: 'Algebra II', topic: 'Sequences',
      type: 'multiple_choice', difficulty: 2,
      question_text: 'What is the 5th term of the sequence: $3, 7, 11, 15, \\dots$?',
      options: ['$17$', '$19$', '$21$', '$23$'],
      correct_answer: '1',
      explanation: 'Arithmetic sequence with common difference $4$: $a_5 = 3 + 4(5-1) = 3 + 16 = 19$.',
      common_mistakes: [{ mistake: '$17$ — adding $4$ to $15$ to get $19$, but selecting the wrong multiple choice' }],
    },
    {
      subject: 'Trigonometry', topic: 'Unit Circle',
      type: 'short_answer', difficulty: 3,
      question_text: 'What is $\\sin 270^\\circ$?',
      correct_answer: '-1',
      explanation: 'On the unit circle, $270^\\circ$ corresponds to $(0, -1)$, so $\\sin 270^\\circ = -1$.',
    },
    {
      subject: 'Algebra II', topic: 'Exponentials',
      type: 'short_answer', difficulty: 3,
      question_text: 'Simplify: $\\frac{3^5}{3^2}$',
      correct_answer: '27',
      explanation: '$\\frac{3^5}{3^2} = 3^{5-2} = 3^3 = 27$.',
    },
    {
      subject: 'Algebra II', topic: 'Sequences',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is the sum of the first 10 positive integers?',
      options: ['$45$', '$50$', '$55$', '$110$'],
      correct_answer: '2',
      explanation: 'Sum $= \\frac{n(n+1)}{2} = \\frac{10 \\times 11}{2} = 55$.',
    },
    {
      subject: 'Analytic Geometry', topic: 'Conics',
      type: 'short_answer', difficulty: 3,
      question_text: 'What is the radius of the circle $x^2 + y^2 = 49$?',
      correct_answer: '7',
      explanation: '$x^2 + y^2 = r^2$, so $r = \\sqrt{49} = 7$.',
    },
    {
      subject: 'Algebra II', topic: 'Logarithms',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Evaluate: $\\log_{10}(1000)$',
      options: ['$1$', '$2$', '$3$', '$4$'],
      correct_answer: '2',
      explanation: '$10^3 = 1000$, so $\\log_{10}(1000) = 3$.',
    },
  ],
  11: [
    {
      subject: 'Pre-Calculus', topic: 'Functions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'If $f(x) = x^2$ and $g(x) = x + 3$, what is $f(g(2))$?',
      options: ['$7$', '$25$', '$10$', '$4$'],
      correct_answer: '1',
      explanation: '$g(2) = 2 + 3 = 5$. Then $f(5) = 5^2 = 25$.',
      common_mistakes: [{ mistake: '$7$ — adding instead of composing: $f(g(2)) = f(5) = 25$', why: 'Evaluate the inner function first, then the outer', correct: '$25$' }],
    },
    {
      subject: 'Trigonometry', topic: 'Identities',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Simplify: $\\sin^2 \\theta + \\cos^2 \\theta$',
      options: ['$0$', '$1$', '$\\sin \\theta \\cos \\theta$', '$\\tan \\theta$'],
      correct_answer: '1',
      explanation: 'This is the Pythagorean identity: $\\sin^2 \\theta + \\cos^2 \\theta = 1$.',
    },
    {
      subject: 'Pre-Calculus', topic: 'Vectors',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Vector $\\mathbf{v} = \\langle 3, 4 \\rangle$. What is its magnitude?',
      options: ['$5$', '$7$', '$12$', '$25$'],
      correct_answer: '0',
      explanation: '$|\\mathbf{v}| = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$.',
    },
    {
      subject: 'Statistics', topic: 'Probability Distributions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is the probability of rolling a sum of 7 with two fair six-sided dice?',
      options: ['$\\frac{1}{6}$', '$\\frac{1}{12}$', '$\\frac{1}{9}$', '$\\frac{1}{36}$'],
      correct_answer: '0',
      explanation: 'There are 6 ways to get sum 7: $(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)$. Total outcomes = 36. Probability $= \\frac{6}{36} = \\frac{1}{6}$.',
    },
    {
      subject: 'Pre-Calculus', topic: 'Functions',
      type: 'short_answer', difficulty: 3,
      question_text: 'If $f(x) = \\frac{1}{x}$, what is $f\\left(\\frac{1}{2}\\right)$?',
      correct_answer: '2',
      explanation: '$f(\\frac{1}{2}) = \\frac{1}{\\frac{1}{2}} = 2$.',
    },
    {
      subject: 'Trigonometry', topic: 'Identities',
      type: 'short_answer', difficulty: 3,
      question_text: 'Simplify: $\\frac{\\sin \\theta}{\\cos \\theta}$',
      correct_answer: 'tan theta',
      explanation: '$\\frac{\\sin \\theta}{\\cos \\theta} = \\tan \\theta$.',
    },
    {
      subject: 'Pre-Calculus', topic: 'Polar',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Convert $(1, 0)$ from polar to rectangular coordinates. (Radius $= 1$, angle $= 0$)',
      options: ['$(0, 1)$', '$(1, 0)$', '$(-1, 0)$', '$(0, -1)$'],
      correct_answer: '1',
      explanation: 'In polar coordinates, $x = r \\cos \\theta$, $y = r \\sin \\theta$. So $(1, 0)$ in polar corresponds to $(1 \\cdot 1, 1 \\cdot 0) = (1, 0)$.',
    },
    {
      subject: 'Statistics', topic: 'Probability Distributions',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'The mean of a data set is 70 and the standard deviation is 5. What is the z-score of 80?',
      options: ['$1$', '$2$', '$10$', '$0.5$'],
      correct_answer: '1',
      explanation: '$z = \\frac{x - \\mu}{\\sigma} = \\frac{80 - 70}{5} = \\frac{10}{5} = 2$.',
    },
    {
      subject: 'Pre-Calculus', topic: 'Vectors',
      type: 'short_answer', difficulty: 3,
      question_text: 'If $\\mathbf{a} = \\langle 1, 2 \\rangle$ and $\\mathbf{b} = \\langle 3, 4 \\rangle$, what is $\\mathbf{a} + \\mathbf{b}$?',
      correct_answer: '(4, 6)',
      explanation: 'Add component-wise: $(1+3, 2+4) = (4, 6)$.',
    },
    {
      subject: 'Trigonometry', topic: 'Identities',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Simplify: $\\sin(\\pi - \\theta)$',
      options: ['$-\\cos \\theta$', '$\\sin \\theta$', '$-\\sin \\theta$', '$\\cos \\theta$'],
      correct_answer: '1',
      explanation: '$\\sin(\\pi - \\theta) = \\sin \\theta$ (sine is positive in Quadrant II).',
    },
  ],
  12: [
    {
      subject: 'Calculus', topic: 'Limits',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Evaluate: $\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$',
      options: ['$0$', '$3$', '$6$', 'Does not exist'],
      correct_answer: '2',
      explanation: 'Factor: $\\frac{(x-3)(x+3)}{x-3} = x+3$. Then $\\lim_{x \\to 3} (x+3) = 6$.',
      common_mistakes: [{ mistake: '$0$ — plugging in $x=3$ directly gives $\\frac{0}{0}$', why: 'When you get $\\frac{0}{0}$, try factoring first', correct: '$6$' }],
    },
    {
      subject: 'Calculus', topic: 'Derivatives',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Find $\\frac{d}{dx}(x^3)$',
      options: ['$3x$', '$3x^2$', '$x^2$', '$\\frac{1}{4}x^4$'],
      correct_answer: '1',
      explanation: 'Power rule: $\\frac{d}{dx}(x^n) = nx^{n-1}$. So $\\frac{d}{dx}(x^3) = 3x^2$.',
      common_mistakes: [{ mistake: '$3x$ — reducing the exponent too much', why: 'Power rule: $x^n \\to nx^{n-1}$, so $x^3 \\to 3x^2$', correct: '$3x^2$' }],
    },
    {
      subject: 'Calculus', topic: 'Integrals',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'Evaluate: $\\int_1^2 2x \\, dx$',
      options: ['$2$', '$3$', '$4$', '$1$'],
      correct_answer: '1',
      explanation: '$\\int 2x \\, dx = x^2$. Evaluate from 1 to 2: $2^2 - 1^2 = 4 - 1 = 3$.',
    },
    {
      subject: 'Advanced Algebra', topic: 'Matrices',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'For matrix $A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$, what is $\\det(A)$?',
      options: ['$-2$', '$2$', '$10$', '$4$'],
      correct_answer: '0',
      explanation: '$\\det(A) = (1)(4) - (2)(3) = 4 - 6 = -2$.',
    },
    {
      subject: 'Statistics', topic: 'Hypothesis Testing',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'In a hypothesis test, a p-value of 0.03 with $\\alpha = 0.05$ means:',
      options: ['Reject $H_0$', 'Fail to reject $H_0$', 'Accept $H_0$', 'Increase sample size'],
      correct_answer: '0',
      explanation: 'Since $p = 0.03 < 0.05$, we reject the null hypothesis at the $5\\%$ significance level.',
    },
    {
      subject: 'Calculus', topic: 'Derivatives',
      type: 'short_answer', difficulty: 3,
      question_text: 'If $f(x) = 3x^2 + 2x - 5$, find $f\'(x)$.',
      correct_answer: "6x+2",
      explanation: 'Power rule: $f\'(x) = 6x + 2$.',
    },
    {
      subject: 'Calculus', topic: 'Integrals',
      type: 'short_answer', difficulty: 3,
      question_text: 'Evaluate: $\\int 3x^2 \\, dx$',
      correct_answer: 'x^3 + C',
      explanation: '$\\int 3x^2 \\, dx = x^3 + C$.',
    },
    {
      subject: 'Calculus', topic: 'Limits',
      type: 'short_answer', difficulty: 3,
      question_text: 'Find $\\lim_{x \\to 0} \\frac{\\sin x}{x}$',
      correct_answer: '1',
      explanation: 'This is a fundamental limit: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$.',
    },
    {
      subject: 'Advanced Algebra', topic: 'Matrices',
      type: 'short_answer', difficulty: 3,
      question_text: 'If $A = \\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}$, what is $A$ called?',
      correct_answer: 'identity matrix',
      explanation: 'This is the $2 \\times 2$ identity matrix $I_2$.',
    },
    {
      subject: 'Calculus', topic: 'Derivatives',
      type: 'multiple_choice', difficulty: 3,
      question_text: 'What is the derivative of $f(x) = \\sin x$?',
      options: ['$\\cos x$', '$-\\sin x$', '$\\tan x$', '$\\sec^2 x$'],
      correct_answer: '0',
      explanation: '$\\frac{d}{dx}(\\sin x) = \\cos x$.',
    },
  ],
}

function genOptionsFromPool(q) {
  const opts = shuffle(q.options)
  const correctIdx = q.options.indexOf(q.correct_answer)
  const shuffledCorrect = opts.indexOf(q.correct_answer)
  return { options: opts, correctAnswer: String(shuffledCorrect) }
}

function genAnswer(question) {
  if (question.type === 'multiple_choice') {
    const idx = rng(0, 3)
    return { answer: String(idx), is_correct: idx === Number(question.correct_answer), points_earned: idx === Number(question.correct_answer) ? 1 : 0 }
  }
  if (question.type === 'short_answer') {
    const val = String(rng(1, 50))
    return { answer: val, is_correct: Math.random() > 0.4, points_earned: Math.random() > 0.4 ? 2 : 0 }
  }
  const val = Math.random() > 0.5 ? 'true' : 'false'
  return { answer: val, is_correct: val === question.correct_answer, points_earned: val === question.correct_answer ? 1 : 0 }
}

async function main() {
  console.log('Starting seed...\n')

  const { data: qCheck } = await supabase.from('questions').select('id').limit(10)
  if (qCheck && qCheck.length >= 10) {
    console.log(`  Database already has ${qCheck.length}+ questions. Seed skipped.\n`)
    console.log('  To force re-seed, delete all questions via Supabase dashboard.\n')
    return
  }

  // Step 0: Fix admin profile role
  const { data: adminProfile } = await supabase.from('profiles').select('id, role').eq('email', 'admin@mathmentor.com').single()
  if (adminProfile) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', adminProfile.id)
    console.log('  ✓ Fixed admin role')
  }

  // Step 0.5: Create teacher account
  let teacherId = null
  try {
    const { data: existingTeacher } = await supabase.from('profiles').select('id').eq('email', 'teacher@test.com').single()
    if (existingTeacher) {
      teacherId = existingTeacher.id
      await supabase.from('profiles').update({ role: 'teacher', full_name: 'Mr. Smith' }).eq('id', teacherId)
      console.log('  ✓ Found existing teacher')
    } else {
      const { data: teacherUser, error: tErr } = await supabase.auth.admin.createUser({
        email: 'teacher@test.com', password: 'test123', email_confirm: true,
        user_metadata: { full_name: 'Mr. Smith', role: 'teacher' }
      })
      if (teacherUser) {
        teacherId = teacherUser.user.id
        await supabase.from('profiles').upsert({
          id: teacherId, email: 'teacher@test.com', full_name: 'Mr. Smith', role: 'teacher'
        })
        console.log('  ✓ Created teacher: teacher@test.com / test123')
      } else {
        console.log('  ⏩ Teacher exists or create failed:', tErr.message)
      }
    }
  } catch (e) {
    console.log('  ⏩ Teacher create failed (likely exists):', e.message)
  }

  // Step 1: Create student accounts
  const studentIds = []
  for (const grade of GRADES) {
    for (let n = 1; n <= STUDENTS_PER_GRADE; n++) {
      const email = `student${grade}_${n}@test.com`
      const { data: user, error } = await supabase.auth.admin.createUser({
        email, password: 'test123', email_confirm: true,
        user_metadata: { full_name: `Student ${grade}.${n}`, grade, role: 'student', parent_phone: `+2010${String(rng(10000000, 99999999))}` }
      })
      if (error) { console.error(`  Failed to create ${email}:`, error.message); continue }
      await supabase.from('profiles').upsert({
        id: user.user.id, email, full_name: `Student ${grade}.${n}`, role: 'student',
        grade, parent_phone: `+2010${String(rng(10000000, 99999999))}`, telegram_chat_id: '',
      })
      studentIds.push({ id: user.user.id, grade, email })
      console.log(`  ✓ Created: ${email}`)
    }
  }
  console.log(`\nCreated ${studentIds.length} students\n`)

  // Store all inserted question IDs per grade for later linking
  const gradeQuestions = {}

  // Step 2: Insert questions
  let totalQuestions = 0
  for (const grade of GRADES) {
    const bank = questionBank[grade]
    if (!bank) continue
    gradeQuestions[grade] = []
    for (const q of bank) {
      const options = q.options || []
      const correctAnswer = q.type === 'multiple_choice' ? String(options.indexOf(q.correct_answer)) : q.correct_answer
      const commonMistakes = (q.common_mistakes || []).map(cm => ({
        mistake: cm.mistake, why: cm.why || 'Review the concept', correct: cm.correct,
      }))
      const { data: question, error: qErr } = await supabase.from('questions').insert({
        type: q.type, subject: q.subject, topic: q.topic, difficulty: q.difficulty,
        question_text: q.question_text, options, correct_answer: correctAnswer,
        explanation: q.explanation,
        image_url: q.topic === 'Shapes' || q.topic === 'Circles' || q.topic === 'Triangles' ? '/images/triangle.svg' : '',
        common_mistakes: commonMistakes.length > 0 ? commonMistakes : [],
        created_by: 'ddb7f264-8402-45de-9d59-de4657101482', grade,
      }).select().single()
      if (qErr) { console.error(`  Failed question grade ${grade}:`, qErr.message); continue }
      gradeQuestions[grade].push(question)
      totalQuestions++
    }
  }
  console.log(`Inserted ${totalQuestions} questions\n`)

  // Step 2b: Create 3 exams + 2 practice sheets per grade
  const examIds = []
  for (const grade of GRADES) {
    const bank = gradeQuestions[grade]
    if (!bank || bank.length < 6) continue

    // Split bank into chunks
    const subsetSizes = [bank.length > 20 ? 10 : Math.ceil(bank.length / 3), bank.length > 20 ? 10 : Math.floor(bank.length / 3)]
    const subset1 = bank.slice(0, subsetSizes[0])
    const subset2 = bank.slice(subsetSizes[0], subsetSizes[0] + parseInt(subsetSizes[1]))
    const subset3 = bank.slice(subsetSizes[0] + parseInt(subsetSizes[1]))
    const examConfigs = [
      {
        title: `Grade ${grade} Math Exam`, description: `Comprehensive math exam covering grade ${grade} topics.`,
        time_limit_minutes: 45, passing_score: 60, isPractice: false,
        questions: subset1, type: 'exam',
      },
      {
        title: `Grade ${grade} Problem Solving`, description: `Problem-solving assessment for grade ${grade}.`,
        time_limit_minutes: 40, passing_score: 65, isPractice: false,
        questions: subset2, type: 'exam',
      },
      {
        title: `Grade ${grade} Math Skills Test`, description: `Skills assessment across topics.`,
        time_limit_minutes: 35, passing_score: 70, isPractice: false,
        questions: subset3.length > 0 ? subset3 : subset1, type: 'exam',
      },
      {
        title: `Grade ${grade} Practice Sheet`, description: `Practice problems for extra review at grade ${grade} level. Instant feedback!`,
        time_limit_minutes: 0, passing_score: 0, isPractice: true,
        questions: shuffle(bank.concat(bank)).slice(0, 10), type: 'practice',
      },
      {
        title: `Grade ${grade} Mixed Review Practice`, description: `Mixed topic practice sheet. No timer, instant feedback on each question.`,
        time_limit_minutes: 0, passing_score: 0, isPractice: true,
        questions: shuffle(bank).slice(0, 8), type: 'practice',
      },
    ]

    for (const cfg of examConfigs) {
      const { data: exam, error } = await supabase.from('exams').insert({
        title: cfg.title, description: cfg.description,
        time_limit_minutes: cfg.time_limit_minutes, passing_score: cfg.passing_score,
        shuffle_questions: true, type: cfg.type, grade,
        is_published: true, is_template: false,
        created_by: 'ddb7f264-8402-45de-9d59-de4657101482',
      }).select().single()
      if (error) { console.error(`  Failed exam ${cfg.title}:`, error.message); continue }

      // Link questions
      if (cfg.questions.length > 0) {
        await supabase.from('exam_questions').insert(
          cfg.questions.map((q, i) => ({
            exam_id: exam.id, question_id: q.id, order_index: i, points: 1,
          }))
        )
      }
      examIds.push({ id: exam.id, grade, isPractice: cfg.isPractice })
      console.log(`  ✓ ${cfg.title} (${cfg.questions.length} Q)`)
    }
  }
  console.log(`\nCreated ${examIds.length} exams/practice sheets\n`)

  // Step 3: Create exam attempts for each student
  let attemptCount = 0
  for (const student of studentIds) {
    const gradeExams = examIds.filter(e => e.grade === student.grade && !e.isPractice)
    for (const exam of gradeExams) {
      if (Math.random() > 0.5) continue

      const startedAt = new Date(Date.now() - rng(1, 30) * 86400000)
      const completedAt = new Date(startedAt.getTime() + rng(10, 50) * 60000)
      const totalPoints = 20
      const earnedPoints = rng(8, 20)
      const score = Math.round(earnedPoints / totalPoints * 100)

      const { data: attempt, error: aErr } = await supabase.from('exam_attempts').insert({
        user_id: student.id, exam_id: exam.id,
        started_at: startedAt.toISOString(), completed_at: completedAt.toISOString(),
        score, total_points: totalPoints, status: 'completed',
      }).select().single()
      if (aErr) continue

      const { data: eqs } = await supabase.from('exam_questions').select('*').eq('exam_id', exam.id)
      if (!eqs?.length) continue

      for (const eq of eqs) {
        const { data: q } = await supabase.from('questions').select('*').eq('id', eq.question_id).single()
        if (!q) continue
        const ans = genAnswer(q)
        await supabase.from('answers').insert({
          attempt_id: attempt.id, question_id: eq.question_id,
          answer: ans.answer, is_correct: ans.is_correct,
          points_earned: ans.points_earned, max_points: 1,
        })
      }
      attemptCount++
    }
  }
  console.log(`Created ${attemptCount} exam attempts\n`)

  // Step 4: Create classes & assign students
  let classCount = 0
  for (const grade of GRADES) {
    const gradeStudents = studentIds.filter(s => s.grade === grade)
    if (gradeStudents.length === 0) continue

    const { data: cls, error: cErr } = await supabase.from('classes').insert({
      name: `Grade ${grade} - Section A`, grade, teacher_id: teacherId,
    }).select().single()
    if (cErr) { console.error(`  Failed to create class for grade ${grade}:`, cErr.message); continue }
    for (const student of gradeStudents) {
      await supabase.from('class_members').insert({ class_id: cls.id, student_id: student.id }).catch(() => {})
    }
    classCount++
    console.log(`  ✓ Created class: Grade ${grade} Section A (${gradeStudents.length} students)`)
  }
  console.log(`\nCreated ${classCount} classes\n`)
  console.log('✅ Seed complete!')

  console.log('\n=== TEST ACCOUNTS ===')
  console.log('Admin: admin@mathmentor.com / (Google sign-in or set password)')
  console.log('Teacher: teacher@test.com / test123')
  for (const grade of GRADES) {
    console.log(`\nGrade ${grade} students (password: test123):`)
    for (let n = 1; n <= STUDENTS_PER_GRADE; n++) {
      console.log(`  student${grade}_${n}@test.com`)
    }
  }
  console.log('\n=== Login at https://math-mentor-lms.pages.dev ===')
}

main().catch(console.error)
