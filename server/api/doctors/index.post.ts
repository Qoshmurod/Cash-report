import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { parseDoctorBody } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DOCTORS_MANAGE')
  const doctor = await prisma.doctor.create({ data: parseDoctorBody(await readBody(event)) })
  await audit(event, user, 'CREATE', 'doctor', doctor.id, `Shifokor qo‘shildi: ${doctor.fullName}`)
  return { doctor }
})
