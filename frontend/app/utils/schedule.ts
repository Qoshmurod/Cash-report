import type { WorkSchedule } from '~/types/api'

export function defaultSchedule(): WorkSchedule {
  const day = () => ({ start: '09:00', end: '18:00' })
  return { '1': day(), '2': day(), '3': day(), '4': day(), '5': day(), '6': { start: '09:00', end: '14:00' }, '7': null }
}
