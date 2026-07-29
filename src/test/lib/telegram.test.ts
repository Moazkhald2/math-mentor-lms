import { describe, it, expect } from 'vitest'
import { buildWeeklyReport, buildMonthlyReport } from '../../lib/telegram'

const weeklyStats = {
  examsTaken: 5,
  avgScore: 78.5,
  bestExam: 'Algebra Quiz 3',
  bestScore: 95,
  practiceCount: 3,
  totalTimeMin: 240,
}

const monthlyStats = {
  ...weeklyStats,
  scoreTrend: '+5% from last month',
}

describe('buildWeeklyReport', () => {
  it('includes student name', () => {
    const html = buildWeeklyReport('Alice', weeklyStats)
    expect(html).toContain('Alice')
  })

  it('shows exam stats', () => {
    const html = buildWeeklyReport('Alice', weeklyStats)
    expect(html).toContain('5')
    expect(html).toContain('95')
    expect(html).toContain('78.5')
  })

  it('shows total time', () => {
    const html = buildWeeklyReport('Alice', weeklyStats)
    expect(html).toContain('4h')
    expect(html).toContain('0m')
  })

  it('returns plain text with tags', () => {
    const html = buildWeeklyReport('Alice', weeklyStats)
    expect(html).toContain('<b>')
    expect(html).toContain('</b>')
  })

  it('renders pass emoji for score >= 60', () => {
    const lowStats = { ...weeklyStats, avgScore: 45 }
    const html = buildWeeklyReport('Bob', lowStats)
    expect(html).toContain('⚠️')
  })
})

describe('buildMonthlyReport', () => {
  it('includes student name', () => {
    const html = buildMonthlyReport('Alice', monthlyStats)
    expect(html).toContain('Alice')
  })

  it('shows score trend', () => {
    const html = buildMonthlyReport('Alice', monthlyStats)
    expect(html).toContain('78.5')
    expect(html).toContain('+5%')
  })

  it('returns plain text with tags', () => {
    const html = buildMonthlyReport('Alice', monthlyStats)
    expect(html).toContain('<b>')
    expect(html).toContain('</b>')
  })

  it('renders warning emoji for score < 60', () => {
    const lowStats = { ...monthlyStats, avgScore: 45 }
    const html = buildMonthlyReport('Bob', lowStats)
    expect(html).toContain('⚠️')
  })
})
