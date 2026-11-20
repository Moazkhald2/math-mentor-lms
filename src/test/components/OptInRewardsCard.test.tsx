import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptInRewardsCard from '../../components/OptInRewardsCard'
import PerfectScoreCelebration from '../../components/PerfectScoreCelebration'

describe('Step 16 — OptInRewardsCard & PerfectScoreCelebration UI', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts turned off with zero-profiling privacy notice and toggles streaks/badges cleanly', () => {
    render(
      <OptInRewardsCard
        userId="student-1"
        metrics={{
          completedAttemptDates: [new Date().toISOString()],
          completedPracticeCount: 1,
          perfectScoreCount: 1,
          recoveredMistakesCount: 1,
          independentAnswersCount: 5,
        }}
      />
    )

    expect(screen.getByText(/Off by default/i)).toBeInTheDocument()
    expect(screen.getByText(/never used for grading or behavioral profiling/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Turn On Motivation/i }))
    expect(screen.getByText(/Your Learning Rhythm & Effort Badges/i)).toBeInTheDocument()
    expect(screen.getByText('Fixed a Mistake')).toBeInTheDocument()
    expect(screen.getByText('Full Mark Mastery')).toBeInTheDocument()
    expect(screen.getByText('Independent Solver')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Turn Off/i }))
    expect(screen.getByText(/Off by default/i)).toBeInTheDocument()
  })

  it('renders PerfectScoreCelebration with House v2 motto and dismisses cleanly', () => {
    render(<PerfectScoreCelebration title="Linear Equations Sheet" studentName="Salma" />)

    expect(screen.getByText(/100% Full Mark/i)).toBeInTheDocument()
    expect(screen.getByText(/Outstanding work, Salma/i)).toBeInTheDocument()
    expect(screen.getByText(/Learn It\. Do It\. Own It\./i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Dismiss celebration banner/i }))
    expect(screen.queryByText(/100% Full Mark/i)).not.toBeInTheDocument()
  })
})
