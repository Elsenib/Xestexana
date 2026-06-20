export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT" | "CALL_CENTER" | "CASHIER" | "INVENTORY_MANAGER" | "ACCOUNTANT" | "MANAGEMENT";

export interface AppointmentSummary {
  id: string;
  doctorName: string;
  branch: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  channel: "web" | "mobile" | "call-center";
}

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
}

export interface AvailabilityQuery {
  branch?: string;
  doctorId?: string;
  startDate: string;
  endDate: string;
}
