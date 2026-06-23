"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Patient = { id: string; fullName: string; phone: string; identityNumber: string };
type Agent = { id: string; email: string; role: string };
type Recall = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  isOverdue: boolean;
  assignee: Agent;
  createdBy: Agent;
};

const statusLabel: Record<Recall["status"], string> = {
  PENDING: "Gözləyir",
  IN_PROGRESS: "İcradadır",
  COMPLETED: "Tamamlandı",
  CANCELLED: "Ləğv edildi",
};

const priorityLabel: Record<Recall["priority"], string> = {
  LOW: "Aşağı",
  MEDIUM: "Normal",
  HIGH: "Təcili",
};

const defaultForm = {
  patientId: "",
  assigneeUserId: "",
  dueDate: "",
  reason: "",
  priority: "MEDIUM" as Recall["priority"],
};

export default function CrmPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState<"" | Recall["status"]>("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const openCount = useMemo(
    () => recalls.filter((row) => row.status === "PENDING" || row.status === "IN_PROGRESS").length,
    [recalls],
  );
  const overdueCount = useMemo(() => recalls.filter((row) => row.isOverdue).length, [recalls]);

  async function load() {
    const query = filter ? `?status=${filter}&take=100` : "?take=100";
    const [patientRows, agentRows, recallRows] = await Promise.all([
      apiRequest<Patient[]>("/patients?take=200"),
      apiRequest<Agent[]>("/crm/agents"),
      apiRequest<Recall[]>(`/crm/recalls${query}`),
    ]);
    setPatients(patientRows);
    setAgents(agentRows);
    setRecalls(recallRows);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "CRM yüklənmədi."));
  }, [filter]);

  async function createRecall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.patientId || !form.dueDate || !form.reason.trim()) {
      setError("Pasiyent, tarix və səbəb tələb olunur.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/crm/recalls", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          assigneeUserId: form.assigneeUserId || undefined,
          dueDate: new Date(form.dueDate).toISOString(),
        }),
      });
      setNotice("Recall yaradıldı.");
      setForm(defaultForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recall yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: Recall["status"]) {
    setError("");
    setNotice("");
    try {
      await apiRequest(`/crm/recalls/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status yenilənmədi.");
    }
  }

  return (
    <>
      <section className="ws-hero">
        <div>
          <p className="ws-eyebrow">Faza 2 · CRM</p>
          <h1>Recall və pasiyent geri dönüşləri</h1>
          <span>Pasiyentə zəng, kontrol, təkrar qəbul və borc xatırlatmaları buradan izlənir.</span>
        </div>
        <div className="ws-hero-metrics">
          <article>
            <span>Açıq recall</span>
            <b>{openCount}</b>
          </article>
          <article>
            <span>Gecikən</span>
            <b>{overdueCount}</b>
          </article>
        </div>
      </section>

      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}
      {error && <div className="ws-alert ws-alert--danger">{error}</div>}

      <div className="pc-grid">
        <form className="ws-panel pc-form" onSubmit={createRecall}>
          <header>
            <div>
              <p className="ws-eyebrow">Yeni əlaqə işi</p>
              <h2>Recall yarat</h2>
            </div>
            <span>Call-center axını</span>
          </header>
          <div className="ws-form-grid">
            <label className="ws-form-wide">
              Pasiyent
              <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
                <option value="">Seçin</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} · {patient.phone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Məsul
              <select
                value={form.assigneeUserId}
                onChange={(e) => setForm({ ...form, assigneeUserId: e.target.value })}
              >
                <option value="">Avtomatik</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tarix / saat
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
            <label>
              Prioritet
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Recall["priority"] })}
              >
                <option value="LOW">Aşağı</option>
                <option value="MEDIUM">Normal</option>
                <option value="HIGH">Təcili</option>
              </select>
            </label>
            <label className="ws-form-wide">
              Səbəb
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Məs: 6 aylıq kontrol, borc xatırlatması, müalicə planına geri dönüş..."
              />
            </label>
            <footer className="ws-form-wide">
              <button className="ws-button ws-button--primary" disabled={saving}>
                {saving ? "Yaradılır..." : "Recall yarat"}
              </button>
            </footer>
          </div>
        </form>

        <section className="ws-panel pc-section">
          <header className="ws-registry-tools">
            <div>
              <p className="ws-eyebrow">İş siyahısı</p>
              <h2>Recall-lar</h2>
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="">Hamısı</option>
              <option value="PENDING">Gözləyir</option>
              <option value="IN_PROGRESS">İcradadır</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="CANCELLED">Ləğv edildi</option>
            </select>
          </header>

          {recalls.length ? (
            <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
              {recalls.map((recall) => (
                <article className="ws-flow-card" key={recall.id}>
                  <time>{new Date(recall.dueDate).toLocaleString("az-AZ")}</time>
                  <div>
                    <b>{recall.title.replace("CRM recall · ", "")}</b>
                    <span>
                      {statusLabel[recall.status]} · {priorityLabel[recall.priority]} · {recall.assignee.email}
                    </span>
                    <small>{recall.description}</small>
                  </div>
                  <em data-status={recall.isOverdue ? "CANCELED" : recall.status}>
                    {recall.isOverdue ? "Gecikir" : statusLabel[recall.status]}
                  </em>
                  <footer>
                    {recall.status === "PENDING" && (
                      <button type="button" onClick={() => void setStatus(recall.id, "IN_PROGRESS")}>
                        Başla
                      </button>
                    )}
                    {recall.status !== "COMPLETED" && (
                      <button type="button" onClick={() => void setStatus(recall.id, "COMPLETED")}>
                        Tamamla
                      </button>
                    )}
                    {recall.status !== "CANCELLED" && (
                      <button type="button" onClick={() => void setStatus(recall.id, "CANCELLED")}>
                        Ləğv et
                      </button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="ws-empty" style={{ padding: 20 }}>
              <span>Recall yoxdur.</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
