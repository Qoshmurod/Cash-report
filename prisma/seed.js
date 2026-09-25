import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const departments = [
  ['PARASITOLOGY', 'Parasitology'],
  ['VIROLOGY', 'Virology'],
  ['BACTERIOLOGY', 'Bacteriology'],
  ['SANITARY_MINIMUM', 'Sanitary Minimum'],
  ['SANITARY_HYGIENE', 'Sanitary Hygiene (San Gig)']
]
const services = [
  ['PARASITOLOGY', 'Stool examination for protozoa and helminth eggs'],
  ['PARASITOLOGY', 'Examination using the scotch-tape scraping method'],
  ['VIROLOGY', 'HIV/AIDS testing by ELISA'], ['VIROLOGY', 'HIV/AIDS rapid test'],
  ['VIROLOGY', 'COVID-19 rapid test'], ['VIROLOGY', 'Hepatitis B testing'],
  ['VIROLOGY', 'Hepatitis C testing'], ['VIROLOGY', 'Sanitary Minimum'],
  ['VIROLOGY', 'Hepatitis D testing'], ['VIROLOGY', 'Hepatitis E testing'],
  ['VIROLOGY', 'Hepatitis B rapid test'], ['VIROLOGY', 'Hepatitis C rapid test'],
  ['VIROLOGY', 'Gonorrhea testing']
]

try {
  const records = {}
  for (const [code, name] of departments) records[code] = await prisma.department.upsert({ where: { code }, update: { name }, create: { code, name } })
  for (const [code, name] of services) {
    await prisma.service.upsert({
      where: { name_department: { name, department: code } },
      update: { departmentId: records[code].id },
      create: { name, department: code, departmentId: records[code].id, price: 0 }
    })
  }
} finally {
  await prisma.$disconnect()
}
