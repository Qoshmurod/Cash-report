import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { GuaranteesService } from './guarantees.service';

@Module({
  imports: [PatientsModule],
  controllers: [ContractsController],
  providers: [ContractsService, GuaranteesService],
  exports: [ContractsService],
})
export class ContractsModule {}
