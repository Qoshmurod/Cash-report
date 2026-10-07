import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitsModule } from '../visits/visits.module';
import { QueueCounter } from './entities/queue-counter.entity';
import { QueueTicketService } from './entities/queue-ticket-service.entity';
import { QueueTicket } from './entities/queue-ticket.entity';
import { QueueNumberService } from './queue-number.service';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueueTicket, QueueTicketService, QueueCounter]), VisitsModule],
  controllers: [QueuesController],
  providers: [QueuesService, QueueNumberService],
  exports: [QueuesService, QueueNumberService],
})
export class QueuesModule {}
