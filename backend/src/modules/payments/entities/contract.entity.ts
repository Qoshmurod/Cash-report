import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Organization/insurance agreement referenced by CONTRACT ("SHARTNOMA") payments. */
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_contracts_number', { unique: true })
  @Column({ length: 100 })
  contractNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organization: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
