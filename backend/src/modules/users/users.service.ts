import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuditAction, Role, UserStatus } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { PasswordService } from '../../common/security/password.service';
import { IMAGE_STORAGE, ImageStorage } from '../../common/storage/image-storage';
import { RequestMeta } from '../../common/types/auth.types';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService, diffObjects } from '../audit/audit.service';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { DoctorsService } from '../doctors/doctors.service';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './entities/user.entity';

const SORTS = { createdAt: 'u.createdAt', lastName: 'u.lastName', login: 'u.login', role: 'u.role' };
const AUDITED_FIELDS = [
  'firstName', 'lastName', 'middleName', 'birthDate', 'gender', 'phone', 'email', 'address', 'profession', 'role', 'status', 'avatar',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly passwords: PasswordService,
    private readonly doctors: DoctorsService,
    private readonly audit: AuditService,
    @Inject(IMAGE_STORAGE) private readonly images: ImageStorage,
  ) {}

  async findAll(query: UserQueryDto): Promise<Paginated<User>> {
    const qb = this.repo.createQueryBuilder('u').leftJoinAndSelect('u.doctor', 'd');
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        "(u.login ILIKE :s ESCAPE '\\' OR u.firstName ILIKE :s ESCAPE '\\' OR u.lastName ILIKE :s ESCAPE '\\' OR u.phone ILIKE :s ESCAPE '\\' OR u.email ILIKE :s ESCAPE '\\')",
        { s: `%${escapeLike(query.search)}%` },
      );
    }
    qb.orderBy(resolveSort(query.sortBy, SORTS), query.sortOrder).addOrderBy('u.id').skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.limit);
  }

  /** Full user incl. doctor profile (with services) when role = DOCTOR. */
  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const doctorRow = await this.dataSource.getRepository(Doctor).findOne({ where: { userId: id } });
    user.doctor = doctorRow ? await this.doctors.findOne(doctorRow.id) : null;
    if (user.doctor) delete user.doctor.user;
    return user;
  }

  async create(dto: CreateUserDto, actorId: string, meta: RequestMeta): Promise<User> {
    if (dto.role === Role.DOCTOR && !dto.doctor) throw new BadRequestException('doctor profile is required for role DOCTOR');
    const exists = await this.repo.createQueryBuilder('u').where('lower(u.login) = :login', { login: dto.login }).getExists();
    if (exists) throw new ConflictException('Login is already taken');
    const avatar = dto.avatar ? await this.images.save(dto.avatar, 'avatars') : null;
    const passwordHash = await this.passwords.hash(dto.password);

    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      const { doctor: doctorDto, password: _password, ...fields } = dto;
      const user = await repo.save(
        repo.create({ ...fields, avatar, passwordHash, status: dto.status ?? UserStatus.ACTIVE, mustChangePassword: false }),
      );
      if (dto.role === Role.DOCTOR && doctorDto) await this.doctors.createForUser(manager, user.id, doctorDto);
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.CREATE,
          module: AUDIT_MODULES.USERS,
          entity: 'User',
          entityId: user.id,
          newValue: { login: user.login, role: user.role, firstName: user.firstName, lastName: user.lastName, doctor: doctorDto ?? null },
          description: `Employee created: ${user.lastName} ${user.firstName} (${user.role})`,
          meta,
        },
        manager,
      );
      return user.id;
    });
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string, meta: RequestMeta): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (id === actorId && ((dto.role && dto.role !== user.role) || (dto.status && dto.status !== UserStatus.ACTIVE))) {
      throw new ForbiddenException('You cannot change your own role or deactivate yourself');
    }
    if (user.role === Role.ADMIN && ((dto.role && dto.role !== Role.ADMIN) || (dto.status && dto.status !== UserStatus.ACTIVE))) {
      await this.assertAnotherActiveAdmin(id);
    }
    const before = { ...user };
    const { doctor: doctorDto, avatar, ...fields } = dto;
    Object.assign(user, fields);
    if (avatar !== undefined) user.avatar = avatar ? await this.images.save(avatar, 'avatars') : null;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).save(user);
      const doctorRepo = manager.getRepository(Doctor);
      const existingDoctor = await doctorRepo.findOne({ where: { userId: id } });
      if (user.role === Role.DOCTOR) {
        if (!existingDoctor) {
          if (!doctorDto) throw new BadRequestException('doctor profile is required when changing role to DOCTOR');
          await this.doctors.createForUser(manager, id, doctorDto);
        } else if (doctorDto) {
          await doctorRepo.update(existingDoctor.id, {
            specialty: doctorDto.specialty,
            roomNumber: doctorDto.roomNumber,
            ...(doctorDto.workSchedule ? { workSchedule: doctorDto.workSchedule } : {}),
          });
          if (doctorDto.serviceIds) await this.doctors.replaceServices(manager, existingDoctor.id, doctorDto.serviceIds);
        }
      } else if (existingDoctor?.isAvailable) {
        await doctorRepo.update(existingDoctor.id, { isAvailable: false });
      }
      const diff = diffObjects(before, user, AUDITED_FIELDS);
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.UPDATE,
          module: AUDIT_MODULES.USERS,
          entity: 'User',
          entityId: id,
          oldValue: diff.oldValue,
          newValue: { ...diff.newValue, ...(doctorDto ? { doctor: doctorDto } : {}) },
          description: `Employee updated: ${user.lastName} ${user.firstName}`,
          meta,
        },
        manager,
      );
    });
    if (before.status === UserStatus.ACTIVE && user.status !== UserStatus.ACTIVE) await this.revokeSessions(id);
    return this.findOne(id);
  }

  async resetPassword(id: string, newPassword: string, actorId: string, meta: RequestMeta): Promise<{ ok: true }> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.repo.update(id, { passwordHash: await this.passwords.hash(newPassword), mustChangePassword: true, passwordChangedAt: new Date() });
    await this.revokeSessions(id);
    await this.audit.log({
      userId: actorId,
      action: AuditAction.PASSWORD_CHANGE,
      module: AUDIT_MODULES.USERS,
      entity: 'User',
      entityId: id,
      description: `Password reset by administrator for ${user.login}`,
      meta,
    });
    return { ok: true };
  }

  async deactivate(id: string, actorId: string, meta: RequestMeta): Promise<{ ok: true }> {
    if (id === actorId) throw new ForbiddenException('You cannot deactivate yourself');
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) await this.assertAnotherActiveAdmin(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).update(id, { status: UserStatus.INACTIVE });
      await manager.getRepository(Doctor).update({ userId: id }, { isAvailable: false });
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.DELETE,
          module: AUDIT_MODULES.USERS,
          entity: 'User',
          entityId: id,
          oldValue: { status: user.status },
          newValue: { status: UserStatus.INACTIVE },
          description: `Employee deactivated: ${user.login}`,
          meta,
        },
        manager,
      );
    });
    await this.revokeSessions(id);
    return { ok: true };
  }

  async updateProfile(id: string, dto: UpdateProfileDto, meta: RequestMeta): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const before = { ...user };
    const { avatar, ...fields } = dto;
    Object.assign(user, fields);
    if (avatar !== undefined) user.avatar = avatar ? await this.images.save(avatar, 'avatars') : null;
    await this.repo.save(user);
    const diff = diffObjects(before, user, AUDITED_FIELDS);
    if (Object.keys(diff.newValue).length) {
      await this.audit.log({
        userId: id,
        action: AuditAction.UPDATE,
        module: AUDIT_MODULES.PROFILE,
        entity: 'User',
        entityId: id,
        ...diff,
        description: 'Profile updated',
        meta,
      });
    }
    return this.findOne(id);
  }

  private async assertAnotherActiveAdmin(excludeId: string): Promise<void> {
    const others = await this.repo
      .createQueryBuilder('u')
      .where('u.role = :role AND u.status = :status AND u.id <> :id', { role: Role.ADMIN, status: UserStatus.ACTIVE, id: excludeId })
      .getCount();
    if (others === 0) throw new ConflictException('At least one active administrator must remain');
  }

  private async revokeSessions(userId: string): Promise<void> {
    await this.dataSource.getRepository(RefreshToken).update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
