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

export async function ensureServiceCatalog() {
  await prisma.service.createMany({
    data: SERVICE_CATALOG.map(([department, name]) => ({ department, name, price: 0 })),
    skipDuplicates: true
  })
}
