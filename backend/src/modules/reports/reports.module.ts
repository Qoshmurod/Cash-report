import { Module } from '@nestjs/common';
import { ExportsModule } from '../exports/exports.module';
import { ReportsCoreModule } from './reports-core.module';
import { ReportsController } from './reports.controller';

@Module({
  imports: [ReportsCoreModule, ExportsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
