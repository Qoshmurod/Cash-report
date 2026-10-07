import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UpdateSettingsDto, VALID_TZ } from './dto/update-settings.dto';
import { SettingValue, SystemSetting } from './entities/system-setting.entity';
import { DEFAULT_SETTINGS, PublicSettings, SETTING_KEYS, SystemSettings } from './settings.types';

/** Key/value settings persisted in `system_settings`, cached in memory (single source of truth = DB). */
@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: SystemSettings | null = null;

  constructor(@InjectRepository(SystemSetting) private readonly repo: Repository<SystemSetting>) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<SystemSettings> {
    const rows = await this.repo.find();
    const merged: SystemSettings = { ...DEFAULT_SETTINGS };
    const target = merged as unknown as Record<string, unknown>;
    for (const row of rows) {
      if ((SETTING_KEYS as string[]).includes(row.key)) target[row.key] = row.value;
    }
    this.cache = merged;
    return merged;
  }

  async getAll(): Promise<SystemSettings> {
    return this.cache ?? this.load();
  }

  async getPublic(): Promise<PublicSettings> {
    const s = await this.getAll();
    return {
      hospitalName: s.hospitalName,
      logo: s.logo,
      phone: s.phone,
      address: s.address,
      currency: s.currency,
      timezone: s.timezone,
      voiceAnnouncements: s.voiceAnnouncements,
      announcementLanguage: s.announcementLanguage,
    };
  }

  async getTimezone(): Promise<string> {
    return (await this.getAll()).timezone;
  }

  async update(dto: UpdateSettingsDto, userId: string | null): Promise<{ before: SystemSettings; after: SystemSettings }> {
    if (dto.timezone && !VALID_TZ.isValidTimezone(dto.timezone)) {
      throw new BadRequestException(`Unknown timezone ${dto.timezone}`);
    }
    const before = { ...(await this.getAll()) };
    const entries = Object.entries(dto).filter(([key, value]) => (SETTING_KEYS as string[]).includes(key) && value !== undefined);
    await this.repo.manager.transaction(async (manager: EntityManager) => {
      for (const [key, value] of entries) {
        await manager.getRepository(SystemSetting).save({ key, value: value as SettingValue, updatedById: userId });
      }
    });
    const after = await this.load();
    return { before, after };
  }

  /** Inserts defaults for keys that do not exist yet (used by the seeder). */
  async ensureDefaults(manager: EntityManager): Promise<void> {
    const repo = manager.getRepository(SystemSetting);
    for (const key of SETTING_KEYS) {
      const exists = await repo.findOne({ where: { key } });
      if (!exists) await repo.insert({ key, value: DEFAULT_SETTINGS[key] as SettingValue, updatedById: null });
    }
    this.cache = null;
  }
}
