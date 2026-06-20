"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest, roleLabel, StaffRole } from "../../../lib/lovelydent-api";

type Staff = {
  id: string;
  email: string;
  role: StaffRole;
  active: boolean;
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "CALL_CENTER" as StaffRole });

  async function load() {
    try {
      setStaff(await apiRequest<Staff[]>("/admin-users?take=200"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Əməkdaşlar yüklənmədi.");
    }
  }

  useEffect(() => { void load(); }, []);

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
          <h1>Əməkdaş və giriş idarəetməsi</h1>
          <span>İşçi hesabları roluna görə yaradılır, bloklanır və yenidən aktivləşdirilir.</span>
        </div>
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
              <button className="ws-row-action" onClick={() => void setStatus(item)}>{item.active ? "Blokla" : "Aktiv et"}</button>
            </div>
          ))}
          {!staff.length && <div className="ws-empty"><span>Əməkdaş hesabı yoxdur.</span></div>}
        </section>
      </section>
    </>
  );
}
