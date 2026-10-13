import { Injectable } from '@nestjs/common';
import { WS_EVENTS, WS_ROOMS } from '../../common/constants/app.constants';
import { Role } from '../../common/constants/enums';
import { RealtimeGateway } from './realtime.gateway';
import {
  KioskNewEvent,
  KioskUpdatedEvent,
  PaymentUpdatedEvent,
  QueueCalledEvent,
  QueueUpdatedEvent,
} from './realtime.types';

const STAFF_ROOMS = [WS_ROOMS.role(Role.ADMIN), WS_ROOMS.role(Role.REGISTRAR)];

/** Domain-level facade over the gateway — services never touch socket.io directly. */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  private emit(rooms: string[], event: string, payload: object): void {
    if (!this.gateway.server) return;
    this.gateway.server.to(rooms).emit(event, payload);
  }

  queueUpdated(event: QueueUpdatedEvent): void {
    const rooms = [WS_ROOMS.BOARD, ...STAFF_ROOMS];
    if (event.doctorId) rooms.push(WS_ROOMS.doctor(event.doctorId));
    this.emit(rooms, WS_EVENTS.QUEUE_UPDATED, event);
  }

  queueCalled(event: QueueCalledEvent): void {
    const rooms = [WS_ROOMS.BOARD, ...STAFF_ROOMS];
    if (event.doctorId) rooms.push(WS_ROOMS.doctor(event.doctorId));
    this.emit(rooms, WS_EVENTS.QUEUE_CALLED, event);
  }

  kioskNew(event: KioskNewEvent): void {
    this.emit(STAFF_ROOMS, WS_EVENTS.KIOSK_NEW, event);
  }

  kioskUpdated(event: KioskUpdatedEvent): void {
    this.emit(STAFF_ROOMS, WS_EVENTS.KIOSK_UPDATED, event);
  }

  paymentUpdated(event: PaymentUpdatedEvent): void {
    this.emit(STAFF_ROOMS, WS_EVENTS.PAYMENT_UPDATED, event);
  }
}
