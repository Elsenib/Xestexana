"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Patient = { id: string; fullName: string; phone: string; identityNumber: string };
type Agent = { id: string; email: string; role: string };
type RecallStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type LeadStatus = "NEW" | "CONTACTED" | "APPOINTMENT_PLANNED" | "CONVERTED" | "LOST";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type Lead = {
  id: string;
  fullName: string;
  phone: string;
  source: string;
  status: LeadStatus;
  interest: string | null;
  note: string | null;
  assignedTo: Agent | null;
  createdAt: string;
  activities: Array<{ id: string; summary: string; createdAt: string; createdBy: string }>;
};
type Recall = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: RecallStatus;
  priority: Priority;
  isOverdue: boolean;
  assignee: Agent;
};

const recallStatusLabel: Record<RecallStatus, string> = {
  PENDING: "Gözləyir",
  IN_PROGRESS: "İcradadır",
  COMPLETED: "Tamamlandı",
  CANCELLED: "Ləğv edildi",
};
const leadStatusLabel: Record<LeadStatus, string> = {
  NEW: "Yeni",
  CONTACTED: "Əlaqə saxlanıb",
  APPOINTMENT_PLANNED: "Randevu planlanıb",
  CONVERTED: "Pasiyentə çevrilib",
  LOST: "İtirilmiş",
};
const priorityLabel: Record<Priority, string> = { LOW: "Aşağı", MEDIUM: "Normal", HIGH: "Təcili" };

const defaultRecall = { patientId: "", assigneeUserId: "", dueDate: "", reason: "", priority: "MEDIUM" as Priority };
const defaultLead = { fullName: "", phone: "", source: "PHONE", interest: "", note: "", assignedToUserId: "" };

export default function CrmPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [recallForm, setRecallForm] = useState(defaultRecall);
  const [leadForm, setLeadForm] = useState(defaultLead);
  const [leadFilter, setLeadFilter] = useState<"" | LeadStatus>("");
  const [recallFilter, setRecallFilter] = useState<"" | RecallStatus>("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const leadOpenCount = useMemo(() => leads.filter((row) => !["CONVERTED", "LOST"].includes(row.status)).length, [leads]);
  const overdueCount = useMemo(() => recalls.filter((row) => row.isOverdue).length, [recalls]);

  async function load() {
    const leadQuery = leadFilter ? `?status=${leadFilter}&take=100` : "?take=100";
    const recallQuery = recallFilter ? `?status=${recallFilter}&take=100` : "?take=100";
    const [patientRows, agentRows, leadRows, recallRows] = await Promise.all([
      apiRequest<Patient[]>("/patients?take=200"),
      apiRequest<Agent[]>("/crm/agents"),
      apiRequest<Lead[]>(`/crm/leads${leadQuery}`),
      apiRequest<Recall[]>(`/crm/recalls${recallQuery}`),
    ]);
    setPatients(patientRows);
    setAgents(agentRows);
    setLeads(leadRows);
    setRecalls(recallRows);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "CRM yüklənmədi."));
  }, [leadFilter, recallFilter]);

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!leadForm.fullName.trim() || !leadForm.phone.trim()) {
      setError("Lead üçün ad və telefon tələb olunur.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/crm/leads", {
        method: "POST",
        body: JSON.stringify({
          ...leadForm,
          interest: leadForm.interest || undefined,
          note: leadForm.note || undefined,
          assignedToUserId: leadForm.assignedToUserId || undefined,
        }),
      });
      setLeadForm(defaultLead);
      setNotice("Lead yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lead yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function updateLeadStatus(id: string, status: LeadStatus) {
    setError("");
    try {
      await apiRequest(`/crm/leads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lead statusu yenilənmədi.");
    }
  }

  async function createRecall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!recallForm.patientId || !recallForm.dueDate || !recallForm.reason.trim()) {
      setError("Recall üçün pasiyent, tarix və səbəb tələb olunur.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/crm/recalls", {
        method: "POST",
        body: JSON.stringify({
          ...recallForm,
          assigneeUserId: recallForm.assigneeUserId || undefined,
          dueDate: new Date(recallForm.dueDate).toISOString(),
        }),
      });
      setRecallForm(defaultRecall);
      setNotice("Recall yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recall yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRecallStatus(id: string, status: RecallStatus) {
    setError("");
    try {
      await apiRequest(`/crm/recalls/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recall statusu yenilənmədi.");
    }
  }

  return (
    <>
      <section className="ws-hero">
        <div>
          <p className="ws-eyebrow">Faza 2 · CRM</p>
          <h1>Lead, recall və pasiyent geri dönüşləri</h1>
          <span>Zəng, WhatsApp, kontrol və təkrar qəbul axını bir yerdə izlənir.</span>
        </div>
        <div className="ws-hero-metrics">
          <article><span>Açıq lead</span><b>{leadOpenCount}</b></article>
          <article><span>Gecikən recall</span><b>{overdueCount}</b></article>
        </div>
      </section>

      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}
      {error && <div className="ws-alert ws-alert--danger">{error}</div>}

      <div className="pc-grid">
        <form className="ws-panel pc-form" onSubmit={createLead}>
          <header><div><p className="ws-eyebrow">Yeni müraciət</p><h2>Lead yarat</h2></div><span>Satış / qəbul axını</span></header>
          <div className="ws-form-grid">
            <label>Ad soyad<input value={leadForm.fullName} onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })} /></label>
            <label>Telefon<input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} /></label>
            <label>Mənbə<select value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}>
              <option value="PHONE">Telefon</option><option value="WHATSAPP">WhatsApp</option><option value="INSTAGRAM">Instagram</option><option value="REFERRAL">Tövsiyə</option><option value="WALK_IN">Klinikaya gəlib</option><option value="WEBSITE">Sayt</option><option value="OTHER">Digər</option>
            </select></label>
            <label>Məsul<select value={leadForm.assignedToUserId} onChange={(e) => setLeadForm({ ...leadForm, assignedToUserId: e.target.value })}>
              <option value="">Avtomatik</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.email}</option>)}
            </select></label>
            <label className="ws-form-wide">Maraq / xidmət<input value={leadForm.interest} onChange={(e) => setLeadForm({ ...leadForm, interest: e.target.value })} placeholder="İmplant, ortodontiya, konsultasiya..." /></label>
            <label className="ws-form-wide">Qeyd<textarea value={leadForm.note} onChange={(e) => setLeadForm({ ...leadForm, note: e.target.value })} /></label>
            <footer className="ws-form-wide"><button className="ws-button ws-button--primary" disabled={saving}>{saving ? "Yaradılır..." : "Lead yarat"}</button></footer>
          </div>
        </form>

        <section className="ws-panel pc-section">
          <header className="ws-registry-tools"><div><p className="ws-eyebrow">Müraciətlər</p><h2>Lead-lər</h2></div>
            <select value={leadFilter} onChange={(e) => setLeadFilter(e.target.value as typeof leadFilter)}>
              <option value="">Hamısı</option><option value="NEW">Yeni</option><option value="CONTACTED">Əlaqə saxlanıb</option><option value="APPOINTMENT_PLANNED">Randevu planlanıb</option><option value="CONVERTED">Çevrildi</option><option value="LOST">İtirildi</option>
            </select>
          </header>
          {leads.length ? <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
            {leads.map((lead) => <article className="ws-flow-card" key={lead.id}>
              <time>{new Date(lead.createdAt).toLocaleString("az-AZ")}</time>
              <div><b>{lead.fullName}</b><span>{lead.phone} · {lead.source} · {lead.assignedTo?.email ?? "Məsul seçilməyib"}</span><small>{lead.interest || lead.note || "Qeyd yoxdur"}</small></div>
              <em data-status={lead.status === "LOST" ? "CANCELED" : lead.status === "CONVERTED" ? "COMPLETED" : "PENDING"}>{leadStatusLabel[lead.status]}</em>
              <footer>
                {lead.status === "NEW" && <button type="button" onClick={() => void updateLeadStatus(lead.id, "CONTACTED")}>Əlaqə saxlandı</button>}
                {lead.status !== "APPOINTMENT_PLANNED" && lead.status !== "CONVERTED" && <button type="button" onClick={() => void updateLeadStatus(lead.id, "APPOINTMENT_PLANNED")}>Randevu planla</button>}
                {lead.status !== "CONVERTED" && <button type="button" onClick={() => void updateLeadStatus(lead.id, "CONVERTED")}>Çevrildi</button>}
                {lead.status !== "LOST" && <button type="button" onClick={() => void updateLeadStatus(lead.id, "LOST")}>İtirildi</button>}
              </footer>
            </article>)}
          </div> : <div className="ws-empty" style={{ padding: 20 }}><span>Lead yoxdur.</span></div>}
        </section>
      </div>

      <div className="pc-grid" style={{ marginTop: 18 }}>
        <form className="ws-panel pc-form" onSubmit={createRecall}>
          <header><div><p className="ws-eyebrow">Pasiyent geri dönüşü</p><h2>Recall yarat</h2></div><span>Call-center axını</span></header>
          <div className="ws-form-grid">
            <label className="ws-form-wide">Pasiyent<select value={recallForm.patientId} onChange={(e) => setRecallForm({ ...recallForm, patientId: e.target.value })}>
              <option value="">Seçin</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.phone}</option>)}
            </select></label>
            <label>Məsul<select value={recallForm.assigneeUserId} onChange={(e) => setRecallForm({ ...recallForm, assigneeUserId: e.target.value })}>
              <option value="">Avtomatik</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.email}</option>)}
            </select></label>
            <label>Tarix / saat<input type="datetime-local" value={recallForm.dueDate} onChange={(e) => setRecallForm({ ...recallForm, dueDate: e.target.value })} /></label>
            <label>Prioritet<select value={recallForm.priority} onChange={(e) => setRecallForm({ ...recallForm, priority: e.target.value as Priority })}>
              <option value="LOW">Aşağı</option><option value="MEDIUM">Normal</option><option value="HIGH">Təcili</option>
            </select></label>
            <label className="ws-form-wide">Səbəb<textarea value={recallForm.reason} onChange={(e) => setRecallForm({ ...recallForm, reason: e.target.value })} /></label>
            <footer className="ws-form-wide"><button className="ws-button ws-button--primary" disabled={saving}>{saving ? "Yaradılır..." : "Recall yarat"}</button></footer>
          </div>
        </form>

        <section className="ws-panel pc-section">
          <header className="ws-registry-tools"><div><p className="ws-eyebrow">İş siyahısı</p><h2>Recall-lar</h2></div>
            <select value={recallFilter} onChange={(e) => setRecallFilter(e.target.value as typeof recallFilter)}>
              <option value="">Hamısı</option><option value="PENDING">Gözləyir</option><option value="IN_PROGRESS">İcradadır</option><option value="COMPLETED">Tamamlandı</option><option value="CANCELLED">Ləğv edildi</option>
            </select>
          </header>
          {recalls.length ? <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
            {recalls.map((recall) => <article className="ws-flow-card" key={recall.id}>
              <time>{new Date(recall.dueDate).toLocaleString("az-AZ")}</time>
              <div><b>{recall.title.replace("CRM recall · ", "")}</b><span>{recallStatusLabel[recall.status]} · {priorityLabel[recall.priority]} · {recall.assignee.email}</span><small>{recall.description}</small></div>
              <em data-status={recall.isOverdue ? "CANCELED" : recall.status}>{recall.isOverdue ? "Gecikir" : recallStatusLabel[recall.status]}</em>
              <footer>
                {recall.status === "PENDING" && <button type="button" onClick={() => void updateRecallStatus(recall.id, "IN_PROGRESS")}>Başla</button>}
                {recall.status !== "COMPLETED" && <button type="button" onClick={() => void updateRecallStatus(recall.id, "COMPLETED")}>Tamamla</button>}
                {recall.status !== "CANCELLED" && <button type="button" onClick={() => void updateRecallStatus(recall.id, "CANCELLED")}>Ləğv et</button>}
              </footer>
            </article>)}
          </div> : <div className="ws-empty" style={{ padding: 20 }}><span>Recall yoxdur.</span></div>}
        </section>
      </div>
    </>
  );
}
