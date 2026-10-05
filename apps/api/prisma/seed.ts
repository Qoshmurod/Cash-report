import { PrismaClient, PaymentType } from '@prisma/client';
import * as argon2 from 'argon2';
import { requiredEnv, validateEnvironment } from '../src/config';

const prisma = new PrismaClient();

const permissions = [
  ['kassa_access','Kassa','Kassaga kirish'], ['kassa_edit','Kassa','Kassa tahrirlash'],
  ['cashier_access','Kassir','Jarayondagi to‘lovlar'], ['cashier_close','Kassir','Kunni yopish'],
  ['service_provision_access','Xizmat','Xizmatlarni ko‘rish'], ['service_provision_complete','Xizmat','Xizmatni yakunlash'],
  ['patient_access','Mijoz','Mijozlarni ko‘rish'], ['patient_add','Mijoz','Mijoz qo‘shish'],
  ['patient_edit','Mijoz','Mijoz tahrirlash'], ['patient_delete','Mijoz','Mijoz o‘chirish'],
  ['service_access','Xizmat','Xizmatlar'], ['service_add','Xizmat','Xizmat qo‘shish'],
  ['service_delete','Xizmat','Xizmat o‘chirish'], ['report_view','Hisobot','Hisobot ko‘rish'],
  ['report_download','Hisobot','Hisobot yuklash'], ['user_access','Admin','Foydalanuvchilar'],
  ['user_add','Admin','Foydalanuvchi qo‘shish'], ['user_edit','Admin','Foydalanuvchi tahrirlash'],
  ['user_delete','Admin','Foydalanuvchi o‘chirish'], ['role_access','Admin','Rollar'],
  ['audit_access','Admin','Audit'], ['owner_access','Admin','Super admin']
];

const departments = [
  ['bakteriologiya','Bakteriologiya','🧫'],
  ['parazitologiya','Parazitologiya','🔬'],
  ['virusologiya','Virusologiya','🦠'],
  ['sanmin','San minimum','🧪'],
  ['sangig','Sangig','🧬']
];

const services: [string, string, number, string][] = [
  ['BAK-01','Bakteriologik tekshiruv 01',87376,'bakteriologiya'],
  ['BAK-02','Bakteriologik tekshiruv 02',93881,'bakteriologiya'],
  ['BAK-03','Bakteriologik tekshiruv 03',50000,'bakteriologiya'],
  ['BAK-04','Bakteriologik tekshiruv 04',55000,'bakteriologiya'],
  ['BAK-05','Bakteriologik tekshiruv 05',60000,'bakteriologiya'],
  ['PAR-01','Parazitologik tekshiruv 01',50000,'parazitologiya'],
  ['PAR-02','Parazitologik tekshiruv 02',65000,'parazitologiya'],
  ['VIR-01','Virusologik tekshiruv 01',70000,'virusologiya'],
  ['VIR-02','Virusologik tekshiruv 02',80000,'virusologiya'],
  ['VIR-03','Virusologik tekshiruv 03',90000,'virusologiya'],
  ['SAN-01','San minimum tekshiruv',50000,'sanmin'],
  ['SANG-01','Sangig tekshiruv',60000,'sangig']
];

async function main() {
  validateEnvironment();
  for (const [id, group, name] of permissions) {
    await prisma.permission.upsert({
      where: { id }, update: { group, name }, create: { id, group, name }
    });
  }

  for (const [key, name, icon] of departments) {
    await prisma.department.upsert({ where: { key }, update: { name, icon, isActive: true }, create: { key, name, icon } });
  }

  for (const [code, name, price, deptKey] of services) {
    await prisma.service.upsert({
      where: { code }, update: { name, price: BigInt(price as number), deptKey: deptKey as string, isActive: true },
      create: { code, name, price: BigInt(price as number), deptKey: deptKey as string }
    });
  }

  const allPerms = permissions.map(x => x[0]);
  const roles = [
    ['super_admin', allPerms],
    ['rahbar', allPerms.filter(x => !['owner_access','role_delete','user_delete'].includes(x))],
    ['buxgalter', ['report_view','report_download','patient_access']],
    ['kassir', ['kassa_access','kassa_edit','cashier_access','cashier_close','patient_access','patient_add','service_access','report_view']],
    ['mutaxassis', ['service_provision_access','service_provision_complete','patient_access']]
  ] as const;

  for (const [name, perms] of roles) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name, isSystem: true } });
    for (const pid of perms) await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: pid } },
      update: {}, create: { roleId: role.id, permissionId: pid }
    });
  }

  const login = requiredEnv('OWNER_LOGIN').toLowerCase();
  const password = requiredEnv('OWNER_PASSWORD');
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'super_admin' } });
  const existingOwner = await prisma.user.findFirst({ where: { isOwner: true } });
  if (!existingOwner) {
    const hash = await argon2.hash(password);
    await prisma.user.create({ data: { name: requiredEnv('OWNER_NAME'), login, passwordHash: hash, roleId: role.id, isOwner: true, isActive: true } });
  }
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
