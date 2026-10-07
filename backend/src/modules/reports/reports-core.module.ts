import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ReportsService } from './reports.service';

/** Report computations, shared by the reports controller and the exports module. */
@Module({
  imports: [PaymentsModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsCoreModule {}
