export interface PersonName {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}

export const fullName = (p: PersonName | null | undefined): string =>
  p ? [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ') : '';

export const shortDoctorName = (p: PersonName | null | undefined): string => (p ? `Dr. ${p.lastName} ${p.firstName}` : '');

/** Pick safe user fields for embedding in other resources. */
export const pickUserRef = <T extends { id: string; firstName: string; lastName: string }>(
  u: T | null | undefined,
): { id: string; firstName: string; lastName: string } | null =>
  u ? { id: u.id, firstName: u.firstName, lastName: u.lastName } : null;
