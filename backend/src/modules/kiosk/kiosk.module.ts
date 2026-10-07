import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from '../patients/patients.module';
import { KioskRequestItem } from './entities/kiosk-request-item.entity';
import { KioskRequest } from './entities/kiosk-request.entity';
import { KioskController, KioskRequestsController } from './kiosk.controller';
import { KioskService } from './kiosk.service';

@Module({
  imports: [TypeOrmModule.forFeature([KioskRequest, KioskRequestItem]), PatientsModule],
  controllers: [KioskController, KioskRequestsController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
