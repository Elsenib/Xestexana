export const auditCategoryLabel: Record<string, string> = {
  SECURITY: "Təhlükəsizlik",
  FINANCE: "Maliyyə",
  CLINICAL: "Klinik",
  INVENTORY: "Anbar",
  APPROVAL: "Təsdiq",
  ADMIN: "İdarəetmə",
};

export const auditActionLabel: Record<string, string> = {
  LOGIN_SUCCESS: "Uğurlu giriş",
  LOGIN_FAILED: "Uğursuz giriş",
  LOGIN_BLOCKED_INACTIVE: "Deaktiv hesab cəhdi",
  STAFF_CREATED: "Əməkdaş yaradıldı",
  STAFF_STATUS_CHANGED: "Hesab statusu dəyişdi",
  APPROVAL_REQUESTED: "Təsdiq sorğusu",
  APPROVAL_APPROVED: "Təsdiq edildi",
  APPROVAL_REJECTED: "Rədd edildi",
  CASH_SESSION_OPENED: "Kassa açıldı",
  CASH_SESSION_CLOSED: "Kassa bağlandı",
  PAYMENT_RECORDED: "Ödəniş qəbul edildi",
  CHARGE_RECORDED: "Borc yazıldı",
  ENCOUNTER_COMPLETED: "Qəbul tamamlandı",
};
