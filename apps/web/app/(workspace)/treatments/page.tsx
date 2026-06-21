"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, CurrentUser } from "../../../lib/lovelydent-api";

type Service = { id: string; code: string; name: string; category: string; price: number; durationMinutes: number; active: boolean };
type Patient = { id: string; fullName: string };
type PlanItem = { id: string; tooth?: string; quantity: number; unitPrice: number; service: Service };
type Plan = { id: string; title: string; status: string; patientName: string; currentVersion: number; subtotal: number; total: number; latestVersion?: { discount: number; note?: string; items: PlanItem[] } };
type DraftItem = { serviceId: string; tooth: string; quantity: string };

const statusLabel: Record<string, string> = { DRAFT: "Qaralama", PRESENTED: "Təqdim edildi", ACCEPTED: "Qəbul edildi", PARTIALLY_ACCEPTED: "Qismən qəbul", IN_PROGRESS: "İcradadır", COMPLETED: "Tamamlandı", CANCELED: "Ləğv edildi" };
const nextStatus: Record<string, Array<{ value: string; label: string }>> = {
  DRAFT: [{ value: "PRESENTED", label: "Pasiyentə təqdim et" }, { value: "CANCELED", label: "Ləğv et" }],
  PRESENTED: [{ value: "ACCEPTED", label: "Qəbul edildi" }, { value: "PARTIALLY_ACCEPTED", label: "Qismən qəbul" }, { value: "CANCELED", label: "Ləğv et" }],
  ACCEPTED: [{ value: "IN_PROGRESS", label: "İcraya başla" }], PARTIALLY_ACCEPTED: [{ value: "IN_PROGRESS", label: "İcraya başla" }],
  IN_PROGRESS: [{ value: "COMPLETED", label: "Tamamla" }],
};

export default function TreatmentsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [serviceForm, setServiceForm] = useState({ code: "", name: "", category: "", price: "", durationMinutes: "30" });
  const [planForm, setPlanForm] = useState({ patientId: "", title: "", discount: "0", note: "" });
  const [items, setItems] = useState<DraftItem[]>([{ serviceId: "", tooth: "", quantity: "1" }]);
  const canManageServices = user ? ["SUPER_ADMIN", "ADMIN"].includes(user.role) : false;
  const canAuthor = user ? ["SUPER_ADMIN", "ADMIN", "DOCTOR"].includes(user.role) : false;
  const activeServices = useMemo(() => services.filter((service) => service.active), [services]);

  async function load() {
    setError("");
    try {
      const [me, serviceRows, patientRows, planRows] = await Promise.all([apiRequest<CurrentUser>("/auth/me"), apiRequest<Service[]>("/services"), apiRequest<Patient[]>("/patients?take=200"), apiRequest<Plan[]>("/treatment-plans?take=100")]);
      setUser(me); setServices(serviceRows); setPatients(patientRows); setPlans(planRows);
      if (!planForm.patientId && patientRows[0]) setPlanForm((value) => ({ ...value, patientId: patientRows[0].id }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Müalicə planları yüklənmədi."); }
  }
  useEffect(() => { void load(); }, []);

  async function createService(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    try { await apiRequest("/services", { method: "POST", body: JSON.stringify({ ...serviceForm, price: Number(serviceForm.price), durationMinutes: Number(serviceForm.durationMinutes) }) }); setServiceForm({ code: "", name: "", category: "", price: "", durationMinutes: "30" }); setNotice("Xidmət kataloqa əlavə edildi."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Xidmət yaradılmadı."); }
  }
  async function createPlan(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    try { await apiRequest("/treatment-plans", { method: "POST", body: JSON.stringify({ ...planForm, discount: Number(planForm.discount), note: planForm.note || null, items: items.map((item) => ({ serviceId: item.serviceId, tooth: item.tooth || null, quantity: Number(item.quantity) })) }) }); setPlanForm((value) => ({ ...value, title: "", discount: "0", note: "" })); setItems([{ serviceId: "", tooth: "", quantity: "1" }]); setNotice("Müalicə planı yaradıldı."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Müalicə planı yaradılmadı."); }
  }
  async function changeStatus(id: string, status: string) {
    setError(""); setNotice("");
    try { await apiRequest(`/treatment-plans/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); setNotice("Plan statusu yeniləndi."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Status dəyişmədi."); }
  }

  return <>
    <section className="ws-page-head"><div><p className="ws-eyebrow">Klinik MVP · Qiymət və plan</p><h1>Müalicə planları</h1><span>Xidmətlər təsdiqli kataloqdan seçilir; qiymət plan versiyasında sabitlənir.</span></div></section>
    {error && <div className="ws-alert ws-alert--danger">{error}</div>}{notice && <div className="ws-alert ws-alert--success">{notice}</div>}
    <section className="ws-dashboard-grid">
      {canManageServices && <form className="ws-panel pc-form" onSubmit={createService}><header><div><p className="ws-eyebrow">Admin</p><h2>Xidmət kataloqu</h2></div></header><div className="ws-form-grid">
        <label>Kod<input required value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} /></label><label>Xidmət adı<input required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} /></label>
        <label>Kateqoriya<input required value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} /></label><label>Qiymət (AZN)<input type="number" min="0" step="0.01" required value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} /></label>
        <label>Müddət (dəqiqə)<input type="number" min="5" required value={serviceForm.durationMinutes} onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })} /></label><footer className="ws-form-wide"><button className="ws-button ws-button--primary">Xidmət yarat</button></footer>
      </div></form>}
      {canAuthor && <form className="ws-panel pc-form" onSubmit={createPlan}><header><div><p className="ws-eyebrow">Həkim</p><h2>Yeni müalicə planı</h2></div></header><div className="ws-form-grid">
        <label className="ws-form-wide">Pasiyent<select required value={planForm.patientId} onChange={(e) => setPlanForm({ ...planForm, patientId: e.target.value })}><option value="">Seçin</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label>
        <label className="ws-form-wide">Plan adı<input required value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} /></label>
        {items.map((item, index) => <div className="ws-form-wide ws-form-grid" key={index}><label>Xidmət<select required value={item.serviceId} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, serviceId: e.target.value } : row))}><option value="">Seçin</option>{activeServices.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.price}₼</option>)}</select></label><label>Diş<input value={item.tooth} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, tooth: e.target.value } : row))} placeholder="məs. 16" /></label><label>Miqdar<input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} /></label></div>)}
        <button type="button" className="ws-button" onClick={() => setItems([...items, { serviceId: "", tooth: "", quantity: "1" }])}>+ Xidmət sətri</button><label>Endirim (AZN)<input type="number" min="0" step="0.01" value={planForm.discount} onChange={(e) => setPlanForm({ ...planForm, discount: e.target.value })} /></label><label className="ws-form-wide">Qeyd<textarea value={planForm.note} onChange={(e) => setPlanForm({ ...planForm, note: e.target.value })} /></label><footer className="ws-form-wide"><button className="ws-button ws-button--primary" disabled={!activeServices.length}>Plan yarat</button></footer>
      </div></form>}
    </section>
    <section className="ws-panel pc-section"><p className="ws-eyebrow">Versiyalanan tarixçə</p><h2>Planlar</h2>{plans.map((plan) => <article className="ws-flow-card" key={plan.id}><div><b>{plan.patientName} · {plan.title}</b><span>Versiya {plan.currentVersion} · {statusLabel[plan.status] ?? plan.status}</span><small>{plan.latestVersion?.items.map((item) => `${item.service.name}${item.tooth ? ` (${item.tooth})` : ""}`).join(", ")}</small></div><strong>{plan.total.toFixed(2)}₼</strong>{canAuthor && <div>{(nextStatus[plan.status] ?? []).map((action) => <button key={action.value} className="ws-row-action" onClick={() => void changeStatus(plan.id, action.value)}>{action.label}</button>)}</div>}</article>)}{!plans.length && <div className="ws-empty"><span>Hələ müalicə planı yoxdur.</span></div>}</section>
  </>;
}
