export const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://api-production-e6391.up.railway.app/api";
export const TOKEN_KEY = "ld_staff_token";

export type StaffRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CALL_CENTER"
  | "DOCTOR"
  | "NURSE"
  | "CASHIER"
  | "INVENTORY_MANAGER"
  | "ACCOUNTANT"
  | "MANAGEMENT"
  | "PATIENT";

export type CurrentUser = { id: string; email: string; role: StaffRole; active?: boolean };

export const roleLabel: Record<StaffRole, string> = {
  SUPER_ADMIN: "Sistem administratoru",
  ADMIN: "Klinika administratoru",
  CALL_CENTER: "Qeydiyyatçı",
  DOCTOR: "Həkim",
  NURSE: "Həkim assistenti",
  CASHIER: "Kassir",
  INVENTORY_MANAGER: "Anbar məsulu",
  ACCOUNTANT: "Mühasib",
  MANAGEMENT: "Rəhbərlik",
  PATIENT: "Pasiyent",
};

async function responseMessage(response: Response, fallback: string) {
  try {
    return (await response.json())?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(await responseMessage(response, "Sorğu uğursuz oldu."));
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export async function openAuthenticatedHtml(path: string) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Popup bloklanıb.");
  popup.document.write('<p style="font-family:system-ui,sans-serif;padding:24px">Sənəd açılır...</p>');

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const message = await responseMessage(response, "Sənəd açıla bilmədi.");
    popup.document.body.innerHTML = "";
    const paragraph = popup.document.createElement("p");
    paragraph.style.fontFamily = "system-ui, sans-serif";
    paragraph.style.padding = "24px";
    paragraph.style.color = "#b91c1c";
    paragraph.textContent = message;
    popup.document.body.appendChild(paragraph);
    throw new Error(message);
  }

  const html = await response.text();
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export async function downloadAuthenticatedFile(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(await responseMessage(response, "Fayl endirilə bilmədi."));

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function fetchAuthenticatedBlobUrl(path: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(await responseMessage(response, "Fayl açıla bilmədi."));

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function openAuthenticatedFile(path: string) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Popup bloklanıb.");
  popup.document.write('<p style="font-family:system-ui,sans-serif;padding:24px">Fayl açılır...</p>');

  try {
    const url = await fetchAuthenticatedBlobUrl(path);
    popup.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fayl açıla bilmədi.";
    popup.document.body.innerHTML = "";
    const paragraph = popup.document.createElement("p");
    paragraph.style.fontFamily = "system-ui, sans-serif";
    paragraph.style.padding = "24px";
    paragraph.style.color = "#b91c1c";
    paragraph.textContent = message;
    popup.document.body.appendChild(paragraph);
    throw error;
  }
}
