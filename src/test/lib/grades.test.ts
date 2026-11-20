import { describe, it, expect } from 'vitest'
import { ALL_GRADES, formatGradeLabel, isJuniorGrade, isValidGrade } from '../../lib/grades'

describe('grades shared config (Grades 1–12)', () => {
  it('exposes all 12 grades in ascending order', () => {
    expect([...ALL_GRADES]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('validates and formats grade labels accurately', () => {
    expect(isValidGrade(1)).toBe(true)
    expect(isValidGrade(12)).toBe(true)
    expect(isValidGrade(0)).toBe(false)
    expect(isValidGrade(13)).toBe(false)
    expect(formatGradeLabel(7)).toBe('Grade 7')
    expect(formatGradeLabel(null)).toBe('All Grades')
  })

  it('identifies junior grades (1–8) vs senior grades (9–12)', () => {
    expect(isJuniorGrade(5)).toBe(true)
    expect(isJuniorGrade(8)).toBe(true)
    expect(isJuniorGrade(9)).toBe(false)
    expect(isJuniorGrade(12)).toBe(false)
  })
})
