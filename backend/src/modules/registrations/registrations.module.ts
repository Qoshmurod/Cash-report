import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { PatientsModule } from '../patients/patients.module';
import { PaymentsModule } from '../payments/payments.module';
import { QueuesModule } from '../queues/queues.module';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  imports: [ContractsModule, PatientsModule, PaymentsModule, QueuesModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
