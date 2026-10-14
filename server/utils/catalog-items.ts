import { DEPARTMENT_CODES } from './catalog'

export function parseServiceBody(body: any) {
  const name = String(body?.name || '').trim()
  const price = Number(body?.price)
  if (!name || !Number.isSafeInteger(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Xizmat nomi va narxi noto‘g‘ri' })
  const department = body?.department ? String(body.department) : null
  if (department && !DEPARTMENT_CODES.includes(department)) throw createError({ statusCode: 400, statusMessage: 'Bo‘lim noto‘g‘ri' })
  return { name, price, department, active: body?.active === undefined ? true : Boolean(body.active) }
}

export function parseDoctorBody(body: any) {
  const fullName = String(body?.fullName || '').trim()
  if (!fullName) throw createError({ statusCode: 400, statusMessage: 'Shifokor ismi shart' })
  return {
    fullName,
    specialty: body?.specialty ? String(body.specialty).trim() : null,
    phone: body?.phone ? String(body.phone).trim() : null,
    active: body?.active === undefined ? true : Boolean(body.active)
  }
}

export function routeId(event: any) {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri ID' })
  return id
}
