import { Module } from '@nestjs/common';
import { LoginHistoryModule } from '../login-history/login-history.module';
import { PatientsModule } from '../patients/patients.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReportsCoreModule } from '../reports/reports-core.module';
import { ExportsService } from './exports.service';

@Module({
  imports: [ReportsCoreModule, PaymentsModule, PatientsModule, LoginHistoryModule],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
