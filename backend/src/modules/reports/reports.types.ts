import { PaymentMethod } from '../../common/constants/enums';

export interface RevenueSummary {
  cash: number;
  card: number;
  contract: number;
  total: number;
  refunded: number;
  count: number;
  debt: number;
}

export interface RevenuePoint {
  period: string;
  cash: number;
  card: number;
  contract: number;
  total: number;
  count: number;
}

export interface ServiceStat {
  serviceId: string;
  name: string;
  code: string;
  departmentName: string;
  count: number;
  amount: number;
}

export interface DoctorStat {
  doctorId: string;
  name: string;
  specialty: string;
  roomNumber: string;
  servicesCount: number;
  patientsServed: number;
  amount: number;
}

export interface DepartmentStat {
  departmentId: string;
  name: string;
  servicesCount: number;
  amount: number;
  patients: number;
}

export interface PaymentMethodStat {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface DashboardStats {
  today: {
    patients: number;
    newPatients: number;
    services: number;
    payments: number;
    revenue: RevenueSummary;
    waiting: number;
    inProgress: number;
    completed: number;
    activeDoctors: number;
    pendingKioskRequests: number;
  };
  revenueLast30Days: RevenuePoint[];
  paymentMethods: PaymentMethodStat[];
  topServices: ServiceStat[];
  doctors: DoctorStat[];
  departments: DepartmentStat[];
}

export interface QueueSummary {
  WAITING: number;
  CALLED: number;
  IN_PROGRESS: number;
  COMPLETED: number;
  SKIPPED: number;
  CANCELLED: number;
  avgWaitMinutes: number | null;
  avgServiceMinutes: number | null;
}
