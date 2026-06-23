export const approvalActionLabels: Record<string, string> = {
  STOCK_MOVEMENT: "Stok hərəkəti",
  CLINICAL_ENCOUNTER_COMPLETE: "Klinik qəbulun tamamlanması",
  SERVICE_UPSERT: "Xidmət kataloqu dəyişikliyi",
};

export const stockMovementLabels: Record<string, string> = {
  PURCHASE: "Alış / anbara giriş",
  CONSUMPTION: "Klinik sərf",
  TRANSFER_IN: "Transfer giriş",
  TRANSFER_OUT: "Transfer çıxış",
  RETURN: "Geri qaytarma",
  ADJUSTMENT_IN: "Artıq düzəlişi",
  ADJUSTMENT_OUT: "Əskik düzəlişi",
  WRITE_OFF: "Silinmə",
};

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Klinika admini",
  DOCTOR: "Həkim",
  NURSE: "Assistent",
  INVENTORY_MANAGER: "Anbar məsulu",
};

export type ApprovalRow = {
  id: string;
  actionType: string;
  entityId?: string | null;
  payload: Record<string, unknown>;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  requestedBy: { email: string; role: string };
  reviewedBy?: { email: string; role: string } | null;
  reviewerUser?: { email: string; role: string } | null;
  reviewerRole: string;
};

export function describeApproval(row: ApprovalRow, productName?: string) {
  if (row.actionType === "STOCK_MOVEMENT") {
    const type = String(row.payload.type ?? "");
    const qty = String(row.payload.quantity ?? "");
    const unit = productName ? ` · ${productName}` : "";
    return `${stockMovementLabels[type] ?? type} · ${qty}${unit}`;
  }
  if (row.actionType === "CLINICAL_ENCOUNTER_COMPLETE") {
    return "Qaralama qəbul tamamlanması və həkim imzası";
  }
  if (row.actionType === "SERVICE_UPSERT") {
    const mode = row.payload.mode === "create" ? "Yeni xidmət" : "Xidmət yenilənməsi";
    const data = row.payload.data as { name?: string; code?: string } | undefined;
    return `${mode}${data?.name ? ` · ${data.name}` : ""}${data?.code ? ` (${data.code})` : ""}`;
  }
  return row.actionType;
}

export function reviewerLabel(row: ApprovalRow) {
  if (row.reviewerUser?.email) return row.reviewerUser.email;
  return roleLabels[row.reviewerRole] ?? row.reviewerRole;
}
