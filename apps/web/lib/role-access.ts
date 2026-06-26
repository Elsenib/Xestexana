import type { StaffRole } from "./lovelydent-api";
import type { NavIconId } from "../components/ui/nav-icons";

export type WorkspaceRoute =
  | "/dashboard"
  | "/tasks"
  | "/appointments"
  | "/patients"
  | "/crm"
  | "/clinical"
  | "/treatments"
  | "/warranties"
  | "/finance"
  | "/commissions"
  | "/inventory"
  | "/reports"
  | "/administration"
  | "/approvals"
  | "/backups"
  | "/readiness"
  | "/permissions"
  | "/audit";

export type NavigationGroup = "daily" | "clinical" | "finance" | "admin";

export type NavigationItem = {
  href: WorkspaceRoute;
  label: string;
  icon: NavIconId;
  group: NavigationGroup;
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

export const navigationGroups: Array<{ id: NavigationGroup; label: string }> = [
  { id: "daily", label: "Gündəlik iş" },
  { id: "clinical", label: "Klinik iş" },
  { id: "finance", label: "Maliyyə və resurs" },
  { id: "admin", label: "İdarəetmə" },
];

export const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "İş masası", icon: "dashboard", group: "daily", roles: allStaff },
  {
    href: "/tasks",
    label: "Tapşırıqlar",
    icon: "tasks",
    group: "daily",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT"],
  },
  {
    href: "/appointments",
    label: "Təqvim və qəbullar",
    icon: "calendar",
    group: "daily",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/patients",
    label: "Pasiyentlər",
    icon: "patients",
    group: "daily",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/crm",
    label: "CRM / Recall",
    icon: "crm",
    group: "daily",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER"],
  },
  {
    href: "/clinical",
    label: "Klinik iş",
    icon: "clinical",
    group: "clinical",
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE"],
  },
  {
    href: "/treatments",
    label: "Müalicə planları",
    icon: "treatments",
    group: "clinical",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/warranties",
    label: "Zəmanətlər",
    icon: "warranty",
    group: "clinical",
    roles: ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "CALL_CENTER"],
  },
  {
    href: "/finance",
    label: "Kassa və maliyyə",
    icon: "finance",
    group: "finance",
    roles: ["SUPER_ADMIN", "ADMIN", "CASHIER", "ACCOUNTANT"],
  },
  {
    href: "/commissions",
    label: "Həkim faizi",
    icon: "commission",
    group: "finance",
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    href: "/inventory",
    label: "Anbar",
    icon: "inventory",
    group: "finance",
    roles: ["SUPER_ADMIN", "ADMIN", "NURSE", "INVENTORY_MANAGER"],
  },
  {
    href: "/reports",
    label: "Hesabatlar",
    icon: "reports",
    group: "finance",
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  },
  {
    href: "/administration",
    label: "Klinika idarəetməsi",
    icon: "administration",
    group: "admin",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/approvals",
    label: "Təsdiq gözləyənlər",
    icon: "approvals",
    group: "admin",
    roles: ["SUPER_ADMIN", "ADMIN", "DOCTOR"],
  },
  {
    href: "/backups",
    label: "Backup",
    icon: "backup",
    group: "admin",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/readiness",
    label: "MVP yekun",
    icon: "readiness",
    group: "admin",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/permissions",
    label: "İcazələr",
    icon: "permissions",
    group: "admin",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/audit",
    label: "Audit",
    icon: "audit",
    group: "admin",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

export const roleWorkspace: Record<StaffRole, { title: string; description: string }> = {
  SUPER_ADMIN: {
    title: "Sistem nəzarəti",
    description: "Platforma, klinika təhlükəsizliyi, icazələr, backup və ümumi idarəetmə.",
  },
  ADMIN: {
    title: "Klinika idarəetməsi",
    description: "Əməkdaşlar, gündəlik əməliyyat, pasiyent axını və klinika parametrləri.",
  },
  CALL_CENTER: {
    title: "Qeydiyyat masası",
    description: "Lead, recall, randevu və pasiyent qeydiyyatı.",
  },
  DOCTOR: {
    title: "Həkim iş masası",
    description: "Qəbullar, pasiyent kartı, klinik qeydlər və müalicə planı.",
  },
  NURSE: {
    title: "Assistent iş masası",
    description: "Qəbul hazırlığı, klinik dəstək və material sərfiyyatı.",
  },
  CASHIER: {
    title: "Kassa iş masası",
    description: "Ödəniş, qəbz, kassa növbəsi və gün sonu nəzarəti.",
  },
  INVENTORY_MANAGER: {
    title: "Anbar iş masası",
    description: "Stok, giriş-çıxış və kritik qalıqların idarəsi.",
  },
  ACCOUNTANT: {
    title: "Mühasib",
    description: "Maliyyə əməliyyatları, komissiya və hesabat nəzarəti.",
  },
  MANAGEMENT: {
    title: "Rəhbərlik görünüşü",
    description: "Hələlik təsdiqlənməmiş rol; genişləndirilməyib.",
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
