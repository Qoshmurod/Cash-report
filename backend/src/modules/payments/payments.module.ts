import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesModule } from '../queues/queues.module';
import { DayClosingsController } from './day-closings.controller';
import { DayClosingsService } from './day-closings.service';
import { Contract } from './entities/contract.entity';
import { DayClosing } from './entities/day-closing.entity';
import { PaymentItem } from './entities/payment-item.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentItem, PaymentTransaction, Contract, DayClosing]), QueuesModule],
  controllers: [PaymentsController, DayClosingsController],
  providers: [PaymentsService, DayClosingsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
