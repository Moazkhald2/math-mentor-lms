import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuestionCard from '../../components/QuestionCard'
import type { Question } from '../../types'

const mcQuestion: Question = {
  id: 'q1',
  type: 'multiple_choice',
  subject: 'Algebra',
  topic: 'Equations',
  difficulty: 2,
  question_text: 'Solve for x: 2x + 3 = 7',
  options: ['x = 1', 'x = 2', 'x = 3', 'x = 4'],
  correct_answer: '1',
  explanation: 'Subtract 3 then divide by 2',
  image_url: '',
  common_mistakes: [],
  created_by: 'admin',
  created_at: '2024-01-01',
}

const tfQuestion: Question = {
  ...mcQuestion,
  id: 'q2',
  type: 'true_false',
  question_text: 'The Earth is flat',
  options: [],
  correct_answer: 'false',
  explanation: 'The Earth is approximately spherical',
}

describe('QuestionCard', () => {
  it('renders question text', () => {
    render(<QuestionCard question={mcQuestion} />)
    expect(screen.getByText('Solve for x: 2x + 3 = 7')).toBeInTheDocument()
  })

  it('renders MC options', () => {
    render(<QuestionCard question={mcQuestion} />)
    expect(screen.getByText('x = 1')).toBeInTheDocument()
    expect(screen.getByText('x = 2')).toBeInTheDocument()
    expect(screen.getByText('x = 3')).toBeInTheDocument()
    expect(screen.getByText('x = 4')).toBeInTheDocument()
  })

  it('renders true/false options', () => {
    render(<QuestionCard question={tfQuestion} />)
    expect(screen.getByText('True')).toBeInTheDocument()
    expect(screen.getByText('False')).toBeInTheDocument()
  })

  it('shows subject and topic', () => {
    render(<QuestionCard question={mcQuestion} />)
    expect(screen.getByText('Algebra')).toBeInTheDocument()
    expect(screen.getByText('Equations')).toBeInTheDocument()
  })

  it('shows question type', () => {
    render(<QuestionCard question={mcQuestion} />)
    expect(screen.getByText('multiple choice')).toBeInTheDocument()
  })

  it('renders explanation', () => {
    render(<QuestionCard question={mcQuestion} />)
    expect(screen.getByText('Explanation')).toBeInTheDocument()
  })

  it('renders difficulty badge', () => {
    render(<QuestionCard question={mcQuestion} />)
    expect(screen.getByText('Intermediate')).toBeInTheDocument()
  })

  it('renders common mistakes when present', () => {
    const q: Question = {
      ...mcQuestion,
      common_mistakes: [{ mistake: 'Forget to subtract', why: 'Order of operations', correct: 'Subtract first' }],
    }
    render(<QuestionCard question={q} />)
    expect(screen.getByText('Common Mistakes')).toBeInTheDocument()
  })

  it('shows correct answer highlighted', () => {
    const { container } = render(<QuestionCard question={mcQuestion} />)
    const correctOption = container.querySelector('.border-success')
    expect(correctOption).toBeInTheDocument()
  })
})
