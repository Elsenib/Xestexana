"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type BackupSummary = {
  mode: string;
  note: string;
  counts: Record<string, number>;
};
type BackupJob = {
  id: string;
  type: string;
  status: string;
  storageKey: string | null;
  summary: BackupSummary | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
};

const labels: Record<string, string> = {
  users: "İstifadəçilər",
  patients: "Pasiyentlər",
  appointments: "Randevular",
  clinicalEncounters: "Klinik qeydlər",
  treatmentPlans: "Müalicə planları",
  patientFiles: "Pasiyent faylları",
  leads: "CRM lead-lər",
  warranties: "Zəmanətlər",
  accountEntries: "Maliyyə sətirləri",
  stockMovements: "Anbar hərəkətləri",
};

export default function BackupsPage() {
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [summaryRow, jobRows] = await Promise.all([
      apiRequest<BackupSummary>("/backups/summary"),
      apiRequest<BackupJob[]>("/backups"),
    ]);
    setSummary(summaryRow);
    setJobs(jobRows);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Backup məlumatı yüklənmədi."));
  }, []);

  async function createBackup(type: "MANUAL" | "PRE_UPDATE") {
    setNotice("");
    setError("");
    setSaving(true);
    try {
      await apiRequest("/backups", {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      setNotice(type === "PRE_UPDATE" ? "Update öncəsi backup qeydi yaradıldı." : "Manual backup qeydi yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup yaradıla bilmədi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Data safety · Skelet</p>
          <h1>Backup və update təhlükəsizliyi</h1>
          <span>Bu panel real dump mexanizminə hazırlanmış skeletdir. İndi məlumat saylarını və backup job tarixçəsini saxlayır.</span>
        </div>
      </section>

      {notice ? <div className="ws-alert ws-alert--success">{notice}</div> : null}
      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>Backup statusu</span>
          <strong>{jobs[0]?.status ?? "—"}</strong>
          <small>Son job vəziyyəti</small>
        </article>
        <article>
          <span>Pasiyent</span>
          <strong>{summary?.counts.patients ?? 0}</strong>
          <small>Hazırda qorunmalı kart sayı</small>
        </article>
        <article>
          <span>Fayl</span>
          <strong>{summary?.counts.patientFiles ?? 0}</strong>
          <small>DB-də saxlanan pasiyent faylları</small>
        </article>
      </section>

      <section className="pc-grid">
        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Snapshot</p>
              <h2>Klinika məlumat xülasəsi</h2>
            </div>
          </header>
          {summary ? (
            <>
              {Object.entries(summary.counts).map(([key, value]) => (
                <div className="ws-flow-card" key={key}>
                  <div>
                    <strong>{labels[key] ?? key}</strong>
                    <span>Backup xülasəsinə daxil ediləcək data bloku</span>
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className="ws-alert ws-alert--success" style={{ marginTop: 14 }}>
                {summary.note}
              </div>
            </>
          ) : (
            <div className="ws-empty"><span>Xülasə yüklənir.</span></div>
          )}
        </article>

        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Job</p>
              <h2>Backup əməliyyatları</h2>
            </div>
          </header>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button className="ws-button ws-button--primary" disabled={saving} type="button" onClick={() => void createBackup("MANUAL")}>
              Manual backup qeydi
            </button>
            <button className="ws-button" disabled={saving} type="button" onClick={() => void createBackup("PRE_UPDATE")}>
              Update öncəsi qeyd
            </button>
          </div>
          {jobs.map((job) => (
            <div className="ws-flow-card" key={job.id}>
              <div>
                <strong>{job.type} · {job.status}</strong>
                <span>{new Date(job.createdAt).toLocaleString("az-AZ")} · {job.createdBy}</span>
                <small>{job.storageKey ?? job.error ?? "Storage sonrakı mərhələdə real fayla bağlanacaq"}</small>
              </div>
            </div>
          ))}
          {!jobs.length ? <div className="ws-empty"><span>Hələ backup job yoxdur.</span></div> : null}
        </article>
      </section>
    </div>
  );
}
