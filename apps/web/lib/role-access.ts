import type { StaffRole } from "./lovelydent-api";
import type { NavIconId } from "../components/ui/nav-icons";

export type WorkspaceRoute =
  | "/dashboard"
  | "/appointments"
  | "/patients"
  | "/crm"
  | "/clinical"
  | "/treatments"
  | "/finance"
  | "/inventory"
  | "/reports"
  | "/administration"
  | "/approvals";

export type NavigationItem = {
  href: WorkspaceRoute;
  label: string;
  icon: NavIconId;
  roles: StaffRole[];
};

const allStaff: StaffRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CALL_CENTER",
  "DOCTOR",
  "NURSE",
  "CASHIER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
  "MANAGEMENT",
];

export const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "İş masası", icon: "dashboard", roles: allStaff },
  {
    href: "/appointments",
    label: "Təqvim və qəbullar",
    icon: "calendar",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/patients",
    label: "Pasiyentlər",
    icon: "patients",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/crm",
    label: "CRM / Recall",
    icon: "crm",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER"],
  },
  {
    href: "/clinical",
    label: "Klinik iş",
    icon: "clinical",
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE"],
  },
  {
    href: "/treatments",
    label: "Müalicə planları",
    icon: "treatments",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/finance",
    label: "Kassa və maliyyə",
    icon: "finance",
    roles: ["SUPER_ADMIN", "ADMIN", "CASHIER", "ACCOUNTANT"],
  },
  {
    href: "/inventory",
    label: "Anbar",
    icon: "inventory",
    roles: ["SUPER_ADMIN", "ADMIN", "NURSE", "INVENTORY_MANAGER"],
  },
  {
    href: "/reports",
    label: "Hesabatlar",
    icon: "reports",
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGEMENT"],
  },
  {
    href: "/administration",
    label: "Klinika idarəetməsi",
    icon: "administration",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/approvals",
    label: "Təsdiq gözləyənlər",
    icon: "approvals",
    roles: ["SUPER_ADMIN", "ADMIN", "DOCTOR"],
  },
];

export const roleWorkspace: Record<StaffRole, { title: string; description: string }> = {
  SUPER_ADMIN: {
    title: "Sistem nəzarəti",
    description: "Platformanın klinikaları, təhlükəsizliyi və ümumi işləkliyi.",
  },
  ADMIN: {
    title: "Klinika idarəetməsi",
    description: "Əməkdaşlar, gündəlik əməliyyat və klinika parametrləri.",
  },
  CALL_CENTER: {
    title: "Qeydiyyat masası",
    description: "Pasiyent qeydiyyatı, randevu və qəbul axını.",
  },
  DOCTOR: {
    title: "Həkim iş masası",
    description: "Bugünkü qəbullar, klinik qeydlər və müalicə işi.",
  },
  NURSE: {
    title: "Assistent iş masası",
    description: "Qəbul hazırlığı, klinik dəstək və material nəzarəti.",
  },
  CASHIER: {
    title: "Kassa iş masası",
    description: "Ödəniş növbəsi, kassa əməliyyatları və gün sonu nəzarəti.",
  },
  INVENTORY_MANAGER: {
    title: "Anbar iş masası",
    description: "Stok, alış, sərf və kritik qalıqların idarəsi.",
  },
  ACCOUNTANT: {
    title: "Maliyyə iş masası",
    description: "Təsdiqlənmiş maliyyə əməliyyatları və hesabatlar.",
  },
  MANAGEMENT: {
    title: "Rəhbərlik görünüşü",
    description: "Klinikanın əməliyyat göstəriciləri və qərar hesabatları.",
  },
  PATIENT: {
    title: "Pasiyent kabineti",
    description: "Şəxsi randevu və tibbi məlumatlar.",
  },
};

export function canAccessRoute(role: StaffRole, pathname: string) {
  const item = navigation.find(
    (candidate) =>
      pathname === candidate.href || pathname.startsWith(`${candidate.href}/`),
  );
  return item ? item.roles.includes(role) : false;
}
