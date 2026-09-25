import { prisma } from './prisma'

export const SERVICE_CATALOG = [
  ['BAKTERIOLOGIYA', "Yuqori nafas yo'llarida stafilikokni aniqlash (St. Aures tibbiy daftarcha uchun)"],
  ['BAKTERIOLOGIYA', 'Najasni patogen enterobakteriya (salmonella, shigella) tekshirish (dez. GR. tibbiy daftarcha)'],
  ['BAKTERIOLOGIYA', 'Najasni shartli-patogen enterobakteriyalarga tekshirish'],
  ['BAKTERIOLOGIYA', 'Najasni patogen stafilokokka diagnostik maqsadda tekshirish'],
  ['BAKTERIOLOGIYA', 'Qonni gemokulturaga tekshirish'],
  ['BAKTERIOLOGIYA', 'Ko‘krak sutini tekshirish'],
  ['BAKTERIOLOGIYA', 'Mikroblarning antibiotiklarga sezgirligini aniqlash'],
  ['BAKTERIOLOGIYA', 'Tomoq va burun surtmasini stafilokokka tekshirish'],
  ['BAKTERIOLOGIYA', 'Mikrofloralarni aniqlash (siydik, ko‘z yoshi, bak passiv)'],
  ['BAKTERIOLOGIYA', 'Qonni sterillikka tekshirish'],
  ['BAKTERIOLOGIYA', 'Brusellyozga serologik tekshiruv (Xeddelson va Rayt)'],
  ['PARAZITOLOGIYA', 'Najasni sodda jonivorlar va gelmint tuxumlariga tekshirish'],
  ['PARAZITOLOGIYA', 'Soskob (qirma) usulida tekshirish'],
  ['VIRUSOLOGIYA', 'Virusli gepatit B ga tekshirish'],
  ['VIRUSOLOGIYA', 'Virusli gepatit C ga tekshirish'],
  ['SAN_MINIMUM', 'San. Minimum'],
  ['VIRUSOLOGIYA', 'Virusli gepatit D ga tekshirish'],
  ['VIRUSOLOGIYA', 'Virusli gepatit E ga tekshirish'],
  ['VIRUSOLOGIYA', 'Gonokokka tekshiruv']
] as const

export const DEPARTMENT_CATALOG = [
  ['BAKTERIOLOGIYA', 'Bakteriologiya'],
  ['PARAZITOLOGIYA', 'Parazitologiya'],
  ['VIRUSOLOGIYA', 'Virusologiya'],
  ['SAN_MINIMUM', 'San. Minimum']
] as const

export async function ensureServiceCatalog() {
  await prisma.department.createMany({
    data: DEPARTMENT_CATALOG.map(([code, name]) => ({ code, name })),
    skipDuplicates: true
  })
  const departments = await prisma.department.findMany({
    where: { code: { in: DEPARTMENT_CATALOG.map(([code]) => code) } },
    select: { id: true, code: true }
  })
  const departmentIds = new Map(departments.map((department) => [department.code, department.id]))
  await prisma.service.createMany({
    data: SERVICE_CATALOG.map(([department, name]) => ({
      department,
      departmentId: departmentIds.get(department) ?? null,
      name,
      price: 0
    })),
    skipDuplicates: true
  })
}
