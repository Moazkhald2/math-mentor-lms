/**
 * Grade-Adaptive Visual System (Step 16 — aligned with SYSTEM_SPEC.md §2.4 & §3.2)
 * Maps Grades 1–12 to their canonical House v2 accent color and age-appropriate UI tier.
 */

export type GradeTier = 'primary' | 'middle' | 'high'

export interface GradeThemeConfig {
  grade: number
  tier: GradeTier
  tierLabel: string
  accentHex: string
  accentName: string
  motto: string
}

const GRADE_ACCENTS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#E76F51', name: 'Terracotta' },
  2: { hex: '#E07A5F', name: 'Warm Coral' },
  3: { hex: '#D97706', name: 'Warm Ochre' },
  4: { hex: '#E76F51', name: 'Terracotta' },
  5: { hex: '#CF7B1D', name: 'Warm Amber' },
  6: { hex: '#B33A63', name: 'Berry Rose' },
  7: { hex: '#2980B9', name: 'Cobalt Blue' },
  8: { hex: '#8E44AD', name: 'Violet Purple' },
  9: { hex: '#6C3483', name: 'Deep Purple' },
  10: { hex: '#0A9396', name: 'Brand Teal' },
  11: { hex: '#1A1A2E', name: 'Navy Blue' },
  12: { hex: '#0A6F72', name: 'Deep Teal' },
}

export function getGradeTier(grade: number | null | undefined): GradeTier {
  if (!grade || grade < 1) return 'high'
  if (grade <= 6) return 'primary'
  if (grade <= 9) return 'middle'
  return 'high'
}

export function getGradeTheme(grade: number | null | undefined): GradeThemeConfig {
  const safeGrade = grade && grade >= 1 && grade <= 12 ? Math.round(grade) : 10
  const tier = getGradeTier(safeGrade)
  const accent = GRADE_ACCENTS[safeGrade] ?? { hex: '#0A9396', name: 'Brand Teal' }

  if (tier === 'primary') {
    return {
      grade: safeGrade,
      tier,
      tierLabel: 'Primary Explorer Mode',
      accentHex: accent.hex,
      accentName: accent.name,
      motto: 'Step by step — every try builds math strength.',
    }
  }

  if (tier === 'middle') {
    return {
      grade: safeGrade,
      tier,
      tierLabel: 'Prep Studio Mode',
      accentHex: accent.hex,
      accentName: accent.name,
      motto: 'Learn It. Do It. Own It.',
    }
  }

  return {
    grade: safeGrade,
    tier,
    tierLabel: 'Exam Focus Mode',
    accentHex: accent.hex,
    accentName: accent.name,
    motto: 'The Lesson Counts.',
  }
}

export function applyGradeThemeToDocument(grade: number | null | undefined): GradeThemeConfig {
  const config = getGradeTheme(grade)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.gradeTier = config.tier
    document.documentElement.style.setProperty('--color-grade-active', config.accentHex)
  }
  return config
}
