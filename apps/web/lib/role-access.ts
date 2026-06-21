import type { StaffRole } from "./lovelydent-api";

export type WorkspaceRoute =
  | "/dashboard"
  | "/appointments"
  | "/patients"
  | "/clinical"
  | "/treatments"
  | "/finance"
  | "/inventory"
  | "/reports"
  | "/administration";

export type NavigationItem = {
  href: WorkspaceRoute;
  label: string;
  icon: string;
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
  { href: "/dashboard", label: "İş masası", icon: "⌂", roles: allStaff },
  {
    href: "/appointments",
    label: "Təqvim və qəbullar",
    icon: "□",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/patients",
    label: "Pasiyentlər",
    icon: "♙",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/clinical",
    label: "Klinik iş",
    icon: "+",
    roles: ["SUPER_ADMIN", "DOCTOR", "NURSE"],
  },
  {
    href: "/treatments",
    label: "Müalicə planları",
    icon: "◫",
    roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
  },
  {
    href: "/finance",
    label: "Kassa və maliyyə",
    icon: "₼",
    roles: ["SUPER_ADMIN", "ADMIN", "CASHIER", "ACCOUNTANT"],
  },
  {
    href: "/inventory",
    label: "Anbar",
    icon: "◇",
    roles: ["SUPER_ADMIN", "ADMIN", "NURSE", "INVENTORY_MANAGER"],
  },
  {
    href: "/reports",
    label: "Hesabatlar",
    icon: "⌁",
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGEMENT"],
  },
  {
    href: "/administration",
    label: "Klinika idarəetməsi",
    icon: "⚙",
    roles: ["SUPER_ADMIN", "ADMIN"],
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
