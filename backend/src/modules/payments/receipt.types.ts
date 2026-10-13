import { PaymentMethod, PaymentStatus } from '../../common/constants/enums';

export interface Receipt {
  hospitalName: string;
  hospitalPhone: string;
  hospitalAddress: string;
  header: string;
  footer: string;
  receiptNumber: string;
  date: string;
  patientName: string;
  patientCode: string;
  items: { name: string; price: number; quantity: number; amount: number }[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  method: PaymentMethod;
  contractNumber: string | null;
  status: PaymentStatus;
  cashier: string;
  tickets: { ticketNumber: string; roomNumber: string | null; doctorName: string; departmentName: string; services: string[] }[];
}
