import { KioskRequestStatus, PaymentStatus, QueueStatus } from '../../common/constants/enums';

export interface QueueUpdatedEvent {
  ticketId: string;
  ticketNumber: string;
  status: QueueStatus;
  doctorId: string | null;
  departmentId: string;
}

export interface QueueCalledEvent {
  ticketId: string;
  ticketNumber: string;
  roomNumber: string | null;
  doctorName: string;
  departmentName: string;
  calledAt: string;
  calledCount: number;
  doctorId: string | null;
}

export interface KioskNewEvent {
  id: string;
  number: number;
  fullName: string;
  totalAmount: number;
  servicesCount: number;
}

export interface KioskUpdatedEvent {
  id: string;
  status: KioskRequestStatus;
}

export interface PaymentUpdatedEvent {
  id: string;
  /** Absent for bulk changes (day closing). */
  status?: PaymentStatus;
  /** Set when a day closing settled many payments at once (`id` = day closing id). */
  dayClosed?: boolean;
}
