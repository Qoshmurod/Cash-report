import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistory } from './entities/login-history.entity';
import { LoginHistoryController } from './login-history.controller';
import { LoginHistoryService } from './login-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoginHistory])],
  controllers: [LoginHistoryController],
  providers: [LoginHistoryService],
  exports: [LoginHistoryService],
})
export class LoginHistoryModule {}
