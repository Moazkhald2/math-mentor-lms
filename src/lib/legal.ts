export const LEGAL_CONTACT_EMAIL = 'support@themathmentor.com'
export const CONSENT_POLICY_VERSION = '2026-11-v1'
export const LEGAL_LAST_UPDATED_AR = 'نوفمبر 2026'
export const LEGAL_LAST_UPDATED_EN = 'November 2026'

export type AgeBand = 'under_18' | 'adult_18_plus'

export interface RegistrationConsentPayload {
  ageBand: AgeBand
  guardianName: string
  guardianEmail: string
  consentVersion: string
  consentAcceptedAt: string
}
