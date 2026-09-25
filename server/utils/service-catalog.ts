import { prisma } from './prisma'

export const DEPARTMENTS = [
  { code: 'PARASITOLOGY', name: 'Parasitology' },
  { code: 'VIROLOGY', name: 'Virology' },
  { code: 'BACTERIOLOGY', name: 'Bacteriology' },
  { code: 'SANITARY_MINIMUM', name: 'Sanitary Minimum' },
  { code: 'SANITARY_HYGIENE', name: 'Sanitary Hygiene (San Gig)' }
] as const

const SERVICES = [
  ['BACTERIOLOGY', 'Detection of Staphylococcus in the upper respiratory tract (Staphylococcus aureus) — for medical booklet'],
  ['BACTERIOLOGY', 'Examination of stool for pathogenic Enterobacteriaceae (Salmonella, Shigella) — for medical booklet'],
  ['BACTERIOLOGY', 'Examination of stool for conditionally pathogenic Enterobacteriaceae'],
  ['BACTERIOLOGY', 'Examination of stool for conditionally pathogenic Enterobacteriaceae and determination of antibiotic susceptibility'],
  ['BACTERIOLOGY', 'Examination of stool for pathogenic Staphylococcus for diagnostic purposes'],
  ['BACTERIOLOGY', 'Blood culture examination'],
  ['BACTERIOLOGY', 'Blood culture examination and antibiotic susceptibility testing'],
  ['BACTERIOLOGY', 'Breast milk examination'],
  ['BACTERIOLOGY', 'Breast milk examination and antibiotic susceptibility testing'],
  ['BACTERIOLOGY', 'Antibiotic susceptibility testing of microorganisms'],
  ['BACTERIOLOGY', 'Throat and nasal swab examination for Staphylococcus'],
  ['BACTERIOLOGY', 'Throat and nasal swab examination for Staphylococcus and antibiotic susceptibility testing'],
  ['BACTERIOLOGY', 'Identification of microflora (urine, tears, bacteriological culture)'],
  ['BACTERIOLOGY', 'Identification of microflora (urine, tears, bacteriological culture) and antibiotic susceptibility testing'],
  ['BACTERIOLOGY', 'Blood sterility examination'],
  ['BACTERIOLOGY', 'Blood sterility examination and antibiotic susceptibility testing'],
  ['BACTERIOLOGY', 'Serological examination of blood for brucellosis (Huddleson and Wright tests)'],
  ['PARASITOLOGY', 'Stool examination for protozoa and helminth eggs'],
  ['PARASITOLOGY', 'Examination using the scotch-tape scraping method'],
  ['VIROLOGY', 'HIV/AIDS testing by ELISA'],
  ['VIROLOGY', 'HIV/AIDS rapid test'],
  ['VIROLOGY', 'COVID-19 rapid test'],
  ['VIROLOGY', 'Hepatitis B testing'],
  ['VIROLOGY', 'Hepatitis C testing'],
  ['VIROLOGY', 'Sanitary Minimum'],
  ['VIROLOGY', 'Hepatitis D testing'],
  ['VIROLOGY', 'Hepatitis E testing'],
  ['VIROLOGY', 'Hepatitis B rapid test'],
  ['VIROLOGY', 'Hepatitis C rapid test'],
  ['VIROLOGY', 'Gonorrhea testing']
] as const

export async function ensureServiceCatalog() {
  for (const department of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name },
      create: department
    })
  }

  const departments = await prisma.department.findMany({ select: { id: true, code: true } })
  const ids = new Map(departments.map((department) => [department.code, department.id]))
  for (const [code, name] of SERVICES) {
    const departmentId = ids.get(code)
    if (!departmentId) continue
    await prisma.service.upsert({
      where: { name_department: { name, department: code } },
      update: { departmentId, active: true },
      create: { name, department: code, departmentId, price: 0 }
    })
  }
}
