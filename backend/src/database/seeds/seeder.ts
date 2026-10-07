import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';
import { Gender, Role, UserStatus } from '../../common/constants/enums';
import { Department } from '../../modules/departments/entities/department.entity';
import { DoctorService } from '../../modules/doctors/entities/doctor-service.entity';
import { Doctor } from '../../modules/doctors/entities/doctor.entity';
import { MedicalService } from '../../modules/services/entities/service.entity';
import { SettingValue, SystemSetting } from '../../modules/settings/entities/system-setting.entity';
import { DEFAULT_SETTINGS, SETTING_KEYS } from '../../modules/settings/settings.types';
import { User } from '../../modules/users/entities/user.entity';
import { seedDemoData } from './demo-data.seeder';
import { SEED_DEPARTMENTS, SEED_STAFF, SeedUser } from './seed-data';

export interface SeedOptions {
  isProduction: boolean;
  bcryptRounds: number;
  adminLogin: string;
  adminPassword: string;
  kioskLogin: string;
  kioskPassword: string;
  demoData: boolean;
  timezone: string;
}

const logger = new Logger('Seeder');

/** Idempotent: inserts what is missing, never overwrites existing passwords or edited data. */
export const runSeed = async (dataSource: DataSource, options: SeedOptions): Promise<void> => {
  await dataSource.transaction(async (manager) => {
    await seedSettings(manager, options);
    await seedAccounts(manager, options);
    const servicesByCode = await seedCatalog(manager);
    await seedStaff(manager, options, servicesByCode);
  });
  if (options.demoData) {
    await dataSource.transaction((manager) => seedDemoData(manager, options.timezone));
  }
  logger.log('Seed completed');
};

const seedSettings = async (manager: EntityManager, options: SeedOptions): Promise<void> => {
  const repo = manager.getRepository(SystemSetting);
  for (const key of SETTING_KEYS) {
    if (await repo.exists({ where: { key } })) continue;
    const value = key === 'timezone' ? options.timezone : DEFAULT_SETTINGS[key];
    await repo.insert({ key, value: value as SettingValue, updatedById: null });
  }
};

const upsertUser = async (manager: EntityManager, u: SeedUser, options: SeedOptions): Promise<User> => {
  const repo = manager.getRepository(User);
  const existing = await repo.findOne({ where: { login: u.login } });
  if (existing) return existing;
  const user = await repo.save(
    repo.create({
      login: u.login,
      passwordHash: await bcrypt.hash(u.password, options.bcryptRounds),
      role: u.role,
      status: UserStatus.ACTIVE,
      firstName: u.firstName,
      lastName: u.lastName,
      middleName: u.middleName ?? null,
      gender: u.gender,
      phone: u.phone,
      email: u.email ?? null,
      profession: u.profession ?? null,
      birthDate: u.birthDate ?? null,
      // Default credentials must be changed on first production login.
      mustChangePassword: options.isProduction,
    }),
  );
  logger.log(`User created: ${u.login} (${u.role})`);
  return user;
};

const seedAccounts = async (manager: EntityManager, options: SeedOptions): Promise<void> => {
  await upsertUser(
    manager,
    {
      login: options.adminLogin, password: options.adminPassword, role: Role.ADMIN, firstName: 'Bosh', lastName: 'Administrator',
      gender: Gender.MALE, phone: '+998900000001', email: 'admin@shifo.uz', profession: 'Tizim administratori',
    },
    options,
  );
  await upsertUser(
    manager,
    {
      login: options.kioskLogin, password: options.kioskPassword, role: Role.KIOSK, firstName: 'Interaktiv', lastName: 'Panel 01',
      gender: Gender.MALE, phone: '+998900000002', profession: 'Kiosk',
    },
    options,
  );
};

const seedCatalog = async (manager: EntityManager): Promise<Map<string, MedicalService>> => {
  const depRepo = manager.getRepository(Department);
  const svcRepo = manager.getRepository(MedicalService);
  const byCode = new Map<string, MedicalService>();
  for (const d of SEED_DEPARTMENTS) {
    let dep = await depRepo.findOne({ where: { code: d.code } });
    if (!dep) {
      dep = await depRepo.save(
        depRepo.create({ code: d.code, name: d.name, nameRu: d.nameRu, queuePrefix: d.queuePrefix, description: d.description, sortOrder: d.sortOrder, isActive: true }),
      );
      logger.log(`Department created: ${d.name} (${d.queuePrefix})`);
    }
    for (const s of d.services) {
      let svc = await svcRepo.findOne({ where: { code: s.code } });
      if (!svc) {
        svc = await svcRepo.save(
          svcRepo.create({
            departmentId: dep.id, code: s.code, name: s.name, nameRu: s.nameRu, price: s.price,
            durationMinutes: s.durationMinutes, description: s.description ?? null, isActive: true,
          }),
        );
      }
      byCode.set(s.code, svc);
    }
  }
  return byCode;
};

const seedStaff = async (manager: EntityManager, options: SeedOptions, services: Map<string, MedicalService>): Promise<void> => {
  const doctorRepo = manager.getRepository(Doctor);
  const linkRepo = manager.getRepository(DoctorService);
  for (const s of SEED_STAFF) {
    const user = await upsertUser(manager, s, options);
    if (!s.doctor) continue;
    let doctor = await doctorRepo.findOne({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await doctorRepo.save(
        doctorRepo.create({ userId: user.id, specialty: s.doctor.specialty, roomNumber: s.doctor.roomNumber, workSchedule: s.doctor.workSchedule, isAvailable: true }),
      );
    }
    for (const code of s.doctor.serviceCodes) {
      const svc = services.get(code);
      if (!svc) continue;
      if (!(await linkRepo.exists({ where: { doctorId: doctor.id, serviceId: svc.id } }))) {
        await linkRepo.insert({ doctorId: doctor.id, serviceId: svc.id });
      }
    }
  }
};
