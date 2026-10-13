import type { FormError } from '@nuxt/ui'
import type { PersonState } from '~/components/forms/PersonFields.vue'
import type { Gender } from '~/types/api'
import { EMAIL_PATTERN, normalizePhone, PHONE_PATTERN } from './phone'

interface PersonLike {
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string | null
  gender: Gender | null
  phone: string | null
  email: string | null
  address: string | null
  profession?: string | null
  passport?: string | null
}

export function emptyPerson(): PersonState {
  return { firstName: '', lastName: '', middleName: '', birthDate: '', gender: undefined, phone: '', email: '', address: '', profession: '', passport: '' }
}

export function personToState(p: PersonLike): PersonState {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName ?? '',
    birthDate: p.birthDate?.slice(0, 10) ?? '',
    gender: p.gender ?? undefined,
    phone: p.phone ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    profession: p.profession ?? '',
    passport: p.passport ?? '',
  }
}

const nil = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

/** Converts form state into an API payload (empty strings → null, phone normalised). */
export function stateToPayload(s: PersonState, opts: { profession?: boolean; passport?: boolean } = {}) {
  return {
    firstName: s.firstName.trim(),
    lastName: s.lastName.trim(),
    middleName: nil(s.middleName),
    birthDate: nil(s.birthDate),
    gender: s.gender ?? null,
    phone: s.phone.trim() ? normalizePhone(s.phone) : null,
    email: nil(s.email),
    address: nil(s.address),
    ...(opts.profession ? { profession: nil(s.profession) } : {}),
    ...(opts.passport ? { passport: nil(s.passport) } : {}),
  }
}

export function validatePerson(s: PersonState, t: (k: string) => string, phoneRequired = false): FormError[] {
  const errors: FormError[] = []
  if (!s.firstName.trim()) errors.push({ name: 'firstName', message: t('validation.required') })
  if (!s.lastName.trim()) errors.push({ name: 'lastName', message: t('validation.required') })
  if (phoneRequired && !s.phone.trim()) errors.push({ name: 'phone', message: t('validation.required') })
  if (s.phone.trim() && !PHONE_PATTERN.test(normalizePhone(s.phone))) errors.push({ name: 'phone', message: t('validation.phone') })
  if (s.email.trim() && !EMAIL_PATTERN.test(s.email.trim())) errors.push({ name: 'email', message: t('validation.email') })
  return errors
}
