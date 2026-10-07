import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type SettingValue = string | number | boolean | null | { [key: string]: string | number | boolean | null };

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ length: 64 })
  key: string;

  /** JSON value; SQL NULL represents an unset optional value (e.g. no logo). */
  @Column({ type: 'jsonb', nullable: true })
  value: SettingValue;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
