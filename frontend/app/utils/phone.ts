const UZ_PREFIX = '998'
const UZ_DIGITS = 12

/** Formats any input as "+998 90 123 45 67" (Uzbekistan numbering plan). */
export function formatUzPhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (!digits.startsWith(UZ_PREFIX)) digits = UZ_PREFIX + digits.replace(/^998?/, '')
  digits = digits.slice(0, UZ_DIGITS)
  const parts = [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 8), digits.slice(8, 10), digits.slice(10, 12)].filter(Boolean)
  return `+${parts.join(' ')}`
}

/** "+998 90 123 45 67" → "+998901234567" */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  return digits ? `+${digits}` : ''
}

export function isValidUzPhone(input: string): boolean {
  return /^\+998\d{9}$/.test(normalizePhone(input))
}

export const PHONE_PATTERN = /^\+?\d{7,15}$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
