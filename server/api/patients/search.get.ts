import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = String(query.q || '').trim()
  if (search.length < 2) return { patients: [] }
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ]
    },
    orderBy: { fullName: 'asc' },
    take: 20
  })
  return { patients }
})
