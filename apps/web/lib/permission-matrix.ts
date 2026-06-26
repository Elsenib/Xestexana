import type { StaffRole } from "./lovelydent-api";

export type PermissionAction = "read" | "create" | "update" | "approve" | "manage";

export type PermissionModule = {
  key: string;
  label: string;
  description: string;
  actions: Partial<Record<PermissionAction, StaffRole[]>>;
};

export const permissionActions: Array<{ key: PermissionAction; label: string }> = [
  { key: "read", label: "Görür" },
  { key: "create", label: "Yaradır" },
  { key: "update", label: "Dəyişir" },
  { key: "approve", label: "Təsdiq edir" },
  { key: "manage", label: "İdarə edir" },
];

export const permissionModules: PermissionModule[] = [
  {
    key: "appointments",
    label: "Təqvim və qəbullar",
    description: "Randevu, check-in və gündəlik qəbul axını.",
    actions: {
      read: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
      create: ["ADMIN", "CALL_CENTER"],
      update: ["ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
      manage: ["SUPER_ADMIN", "ADMIN"],
    },
  },
  {
    key: "patients",
    label: "Pasiyent kartı",
    description: "Pasiyent profili, anamnez, rentgen və fayllar.",
    actions: {
      read: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
      create: ["ADMIN", "CALL_CENTER"],
      update: ["ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"],
      manage: ["SUPER_ADMIN", "ADMIN"],
    },
  },
  {
    key: "clinical",
    label: "Klinik iş",
    description: "Müayinə, diaqnoz, klinik qeyd və müalicə prosesi.",
    actions: {
      read: ["SUPER_ADMIN", "DOCTOR", "NURSE"],
      create: ["DOCTOR"],
      update: ["DOCTOR"],
      approve: ["SUPER_ADMIN", "ADMIN", "DOCTOR"],
    },
  },
  {
    key: "crm",
    label: "CRM / Recall",
    description: "Lead, geri zəng, follow-up və pasiyentə çevirmə.",
    actions: {
      read: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER"],
      create: ["ADMIN", "CALL_CENTER"],
      update: ["ADMIN", "CALL_CENTER"],
      manage: ["SUPER_ADMIN", "ADMIN"],
    },
  },
  {
    key: "finance",
    label: "Kassa və maliyyə",
    description: "Ödəniş, borc, qəbz, kassa növbəsi və hesabatlar.",
    actions: {
      read: ["SUPER_ADMIN", "ADMIN", "CASHIER", "ACCOUNTANT"],
      create: ["ADMIN", "CASHIER"],
      update: ["ADMIN", "CASHIER", "ACCOUNTANT"],
      manage: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
    },
  },
  {
    key: "inventory",
    label: "Anbar",
    description: "Material kartı, giriş-çıxış və kritik qalıqlar.",
    actions: {
      read: ["SUPER_ADMIN", "ADMIN", "NURSE", "INVENTORY_MANAGER"],
      create: ["ADMIN", "INVENTORY_MANAGER"],
      update: ["ADMIN", "INVENTORY_MANAGER", "NURSE"],
      manage: ["SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"],
    },
  },
  {
    key: "admin",
    label: "İdarəetmə",
    description: "İşçilər, icazələr, backup, audit və sistem nəzarəti.",
    actions: {
      read: ["SUPER_ADMIN", "ADMIN"],
      create: ["SUPER_ADMIN", "ADMIN"],
      update: ["SUPER_ADMIN", "ADMIN"],
      approve: ["SUPER_ADMIN", "ADMIN"],
      manage: ["SUPER_ADMIN"],
    },
  },
];
