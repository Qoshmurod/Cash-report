import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AppConfig } from '../../config/configuration';

/** Pre-computed hash used to keep login timing constant when the user does not exist. */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5zWm6VxQdH6YzZ8QeY8Yx5m7v5E0pIa';

@Injectable()
export class PasswordService {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.getOrThrow<AppConfig>('app').bcryptRounds;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verify(plain: string, hash: string | null | undefined): Promise<boolean> {
    if (!hash) {
      await bcrypt.compare(plain, DUMMY_HASH);
      return false;
    }
    return bcrypt.compare(plain, hash);
  }
}
