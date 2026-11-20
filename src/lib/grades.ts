/**
 * Single shared Grade configuration for The Math Mentor LMS.
 * Covers all K-12 grades (1–12), aligned with DB CHECK (grade BETWEEN 1 AND 12).
 */
export const MIN_GRADE = 1
export const MAX_GRADE = 12

export const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export type GradeNumber = (typeof ALL_GRADES)[number]

export function isValidGrade(grade: number | null | undefined): grade is GradeNumber {
  return typeof grade === 'number' && Number.isInteger(grade) && grade >= MIN_GRADE && grade <= MAX_GRADE
}

export function formatGradeLabel(grade: number | null | undefined): string {
  return isValidGrade(grade) ? `Grade ${grade}` : 'All Grades'
}

export function isJuniorGrade(grade: number | null | undefined): boolean {
  return isValidGrade(grade) ? grade <= 8 : false
}
