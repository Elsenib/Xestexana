"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest, roleLabel, StaffRole } from "../../../lib/lovelydent-api";
import { auditActionLabel, auditCategoryLabel } from "../../../lib/audit-labels";

type Staff = {
  id: string;
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
};

type AuditRow = {
  id: string;
  category: string;
  action: string;
  summary: string;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  createdAt: string;
};

const assignableRoles: StaffRole[] = [
  "ADMIN",
  "CALL_CENTER",
  "NURSE",
  "CASHIER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
  "MANAGEMENT",
];

export default function AdministrationPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditCategory, setAuditCategory] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "CALL_CENTER" as StaffRole });

  async function loadStaff() {
    setStaff(await apiRequest<Staff[]>("/admin-users?take=200"));
  }

  async function loadAudit() {
    const query = auditCategory ? `?category=${auditCategory}&take=80` : "?take=80";
    setAuditRows(await apiRequest<AuditRow[]>(`/audit/logs${query}`));
  }

  async function load() {
    try {
      await Promise.all([loadStaff(), loadAudit()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Məlumatlar yüklənmədi.");
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    void loadAudit().catch(() => undefined);
  }, [auditCategory]);

  async function createStaff(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await apiRequest("/admin-users", { method: "POST", body: JSON.stringify(form) });
      setForm({ email: "", password: "", role: "CALL_CENTER" });
      setNotice("Əməkdaş hesabı yaradıldı.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Əməkdaş yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(item: Staff) {
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin-users/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      });
      setNotice(item.active ? "Hesab deaktiv edildi." : "Hesab aktiv edildi.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Hesab statusu dəyişmədi.");
    }
  }

  return (
    <>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Klinika administratoru</p>
          <h1>Əməkdaş və audit jurnalı</h1>
          <span>İşçi hesabları və kritik əməliyyatların dəyişdirilə bilməyən izi.</span>
        </div>
        <button type="button" className="ws-button" onClick={() => void load()}>
          Yenilə
        </button>
      </section>
      {error && <div className="ws-alert ws-alert--danger">{error}</div>}
      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}
      <section className="ws-dashboard-grid">
        <form className="ws-panel pc-form" onSubmit={createStaff}>
          <header><div><p className="ws-eyebrow">Yeni işçi</p><h2>Hesab yarat</h2></div></header>
          <div className="ws-form-grid">
            <label className="ws-form-wide">E-poçt
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>İlkin şifrə
              <input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <label>Rol
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                {assignableRoles.map((role) => <option key={role} value={role}>{roleLabel[role]}</option>)}
              </select>
            </label>
            <footer className="ws-form-wide">
              <button className="ws-button ws-button--primary" disabled={saving}>{saving ? "Yaradılır..." : "Əməkdaş yarat"}</button>
            </footer>
          </div>
        </form>
        <section className="ws-panel pc-section">
          <p className="ws-eyebrow">Aktiv və arxiv hesablar</p>
          <h2>Klinika heyəti</h2>
          {staff.map((item) => (
            <div className="pc-history" key={item.id}>
              <i />
              <div><b>{item.email}</b><span>{roleLabel[item.role] ?? item.role} · {new Date(item.createdAt).toLocaleDateString("az-AZ")}</span></div>
              <em>{item.active ? "Aktiv" : "Deaktiv"}</em>
              <button type="button" className="ws-row-action" onClick={() => void setStatus(item)}>{item.active ? "Blokla" : "Aktiv et"}</button>
            </div>
          ))}
          {!staff.length && <div className="ws-empty"><span>Əməkdaş hesabı yoxdur.</span></div>}
        </section>
      </section>

      <section className="ws-panel pc-section" style={{ marginTop: 22 }}>
        <header className="ws-registry-tools">
          <div>
            <p className="ws-eyebrow">Audit jurnalı</p>
            <h2>Kritik əməliyyat izi</h2>
          </div>
          <label>
            Kateqoriya
            <select value={auditCategory} onChange={(e) => setAuditCategory(e.target.value)}>
              <option value="">Hamısı</option>
              {Object.entries(auditCategoryLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </header>
        {auditRows.length ? (
          <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
            {auditRows.map((row) => (
              <article className="ws-flow-card" key={row.id}>
                <time>{new Date(row.createdAt).toLocaleString("az-AZ")}</time>
                <div>
                  <b>{row.summary}</b>
                  <span>
                    {auditCategoryLabel[row.category] ?? row.category}
                    {" · "}
                    {auditActionLabel[row.action] ?? row.action}
                    {row.userEmail ? ` · ${row.userEmail}` : ""}
                    {row.ipAddress ? ` · ${row.ipAddress}` : ""}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ws-empty" style={{ padding: 20 }}>
            <b>Hələ audit qeydi yoxdur</b>
            <span>Giriş, maliyyə və təsdiq əməliyyatları burada görünəcək.</span>
          </div>
        )}
      </section>
    </>
  );
}
