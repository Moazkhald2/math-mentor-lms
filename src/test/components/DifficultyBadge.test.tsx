import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DifficultyBadge from '../../components/DifficultyBadge'

describe('DifficultyBadge', () => {
  it('renders Easy for level 1', () => {
    render(<DifficultyBadge level={1} />)
    expect(screen.getByText('Easy')).toBeInTheDocument()
  })

  it('renders Intermediate for level 2', () => {
    render(<DifficultyBadge level={2} />)
    expect(screen.getByText('Intermediate')).toBeInTheDocument()
  })

  it('renders Hard for level 3', () => {
    render(<DifficultyBadge level={3} />)
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })

  it('renders Expert for level 4', () => {
    render(<DifficultyBadge level={4} />)
    expect(screen.getByText('Expert')).toBeInTheDocument()
  })

  it('applies correct color class for each level', () => {
    const { container } = render(<DifficultyBadge level={1} />)
    expect(container.firstChild).toHaveClass('text-accent-green')
  })
})
