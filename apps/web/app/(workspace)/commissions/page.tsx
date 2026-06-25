"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Doctor = { userId: string; email: string; name: string; branch: string | null };
type CommissionRule = {
  id: string;
  doctorName: string;
  serviceName: string;
  percent: number;
  active: boolean;
  updatedAt: string;
};
type CommissionEntry = {
  id: string;
  doctorName: string;
  patientName: string | null;
  baseAmount: number;
  percent: number;
  amount: number;
  status: string;
  sourceType: string;
  note: string | null;
  createdAt: string;
};
type Summary = {
  totals: { pending: number; approved: number; entries: number; activeRules: number };
  rules: CommissionRule[];
  entries: CommissionEntry[];
};

const defaultRule = { doctorUserId: "", percent: "10" };
const defaultEntry = { doctorUserId: "", baseAmount: "", percent: "", note: "" };

function money(value: number) {
  return `${value.toFixed(2)} ₼`;
}

export default function CommissionsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ruleForm, setRuleForm] = useState(defaultRule);
  const [entryForm, setEntryForm] = useState(defaultEntry);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const doctorOptions = useMemo(
    () => doctors.map((doctor) => ({ value: doctor.userId, label: `${doctor.name} · ${doctor.email}` })),
    [doctors],
  );

  async function load() {
    const [doctorRows, summaryRow] = await Promise.all([
      apiRequest<Doctor[]>("/commissions/doctors"),
      apiRequest<Summary>("/commissions/summary"),
    ]);
    setDoctors(doctorRows);
    setSummary(summaryRow);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Həkim faizi yüklənmədi."));
  }, []);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await apiRequest("/commissions/rules", {
        method: "POST",
        body: JSON.stringify({
          doctorUserId: ruleForm.doctorUserId || undefined,
          percent: Number(ruleForm.percent),
        }),
      });
      setRuleForm(defaultRule);
      setNotice("Faiz qaydası yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Faiz qaydası saxlanmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!entryForm.doctorUserId || !entryForm.baseAmount) {
      setError("Manual komissiya üçün həkim və məbləğ tələb olunur.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/commissions/entries/manual", {
        method: "POST",
        body: JSON.stringify({
          doctorUserId: entryForm.doctorUserId,
          baseAmount: Number(entryForm.baseAmount),
          percent: entryForm.percent ? Number(entryForm.percent) : undefined,
          note: entryForm.note || undefined,
        }),
      });
      setEntryForm(defaultEntry);
      setNotice("Komissiya sətri yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Komissiya sətri yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: CommissionRule) {
    setError("");
    try {
      await apiRequest(`/commissions/rules/${rule.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !rule.active }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Faiz qaydası yenilənmədi.");
    }
  }

  return (
    <div className="ws-stack">
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Maliyyə skeleti · Həkim faizi</p>
          <h1>Həkim komissiyaları</h1>
          <span>
            Bu modul hələ avtomatik ödənişə bağlanmayıb; qaydalar və manual sətirlər sonrakı real axına hazır skeletdir.
          </span>
        </div>
      </section>

      {notice ? <div className="ws-alert ws-alert--success">{notice}</div> : null}
      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>Gözləyən komissiya</span>
          <strong>{money(summary?.totals.pending ?? 0)}</strong>
          <small>Ödənilməmiş həkim payı</small>
        </article>
        <article>
          <span>Təsdiqlənmiş</span>
          <strong>{money(summary?.totals.approved ?? 0)}</strong>
          <small>Bağlanmış komissiya</small>
        </article>
        <article>
          <span>Aktiv qayda / sətir</span>
          <strong>{summary?.totals.activeRules ?? 0}</strong>
          <small>{summary?.totals.entries ?? 0} komissiya sətri</small>
        </article>
      </section>

      <section className="pc-grid">
        <form className="ws-panel pc-form" onSubmit={createRule}>
          <header>
            <div>
              <p className="ws-eyebrow">Qayda</p>
              <h2>Həkim faizi təyin et</h2>
            </div>
          </header>
          <div className="ws-form-grid">
            <label>
              Həkim
              <select value={ruleForm.doctorUserId} onChange={(e) => setRuleForm((v) => ({ ...v, doctorUserId: e.target.value }))}>
                <option value="">Bütün həkimlər üçün ümumi qayda</option>
                {doctorOptions.map((doctor) => (
                  <option key={doctor.value} value={doctor.value}>
                    {doctor.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Faiz
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={ruleForm.percent}
                onChange={(e) => setRuleForm((v) => ({ ...v, percent: e.target.value }))}
              />
            </label>
            <footer>
              <button className="ws-button ws-button--primary" disabled={saving}>
                Qaydanı saxla
              </button>
            </footer>
          </div>
        </form>

        <form className="ws-panel pc-form" onSubmit={createEntry}>
          <header>
            <div>
              <p className="ws-eyebrow">Manual sətir</p>
              <h2>Komissiya yaz</h2>
            </div>
          </header>
          <div className="ws-form-grid">
            <label>
              Həkim
              <select value={entryForm.doctorUserId} onChange={(e) => setEntryForm((v) => ({ ...v, doctorUserId: e.target.value }))}>
                <option value="">Həkim seçin</option>
                {doctorOptions.map((doctor) => (
                  <option key={doctor.value} value={doctor.value}>
                    {doctor.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Baza məbləğ
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryForm.baseAmount}
                onChange={(e) => setEntryForm((v) => ({ ...v, baseAmount: e.target.value }))}
              />
            </label>
            <label>
              Faiz boş qalarsa qaydadan götürülür
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={entryForm.percent}
                onChange={(e) => setEntryForm((v) => ({ ...v, percent: e.target.value }))}
              />
            </label>
            <label>
              Qeyd
              <textarea value={entryForm.note} onChange={(e) => setEntryForm((v) => ({ ...v, note: e.target.value }))} />
            </label>
            <footer>
              <button className="ws-button ws-button--primary" disabled={saving}>
                Komissiya yarat
              </button>
            </footer>
          </div>
        </form>
      </section>

      <section className="pc-grid" style={{ marginTop: 22 }}>
        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Qaydalar</p>
              <h2>Aktiv/deaktiv faizlər</h2>
            </div>
          </header>
          <div>
            {(summary?.rules ?? []).map((rule) => (
              <div className="ws-flow-card" key={rule.id}>
                <div>
                  <strong>{rule.doctorName}</strong>
                  <span>{rule.serviceName} · {rule.percent}%</span>
                </div>
                <button className="ws-row-action" type="button" onClick={() => toggleRule(rule)}>
                  {rule.active ? "Deaktiv et" : "Aktiv et"}
                </button>
              </div>
            ))}
            {!summary?.rules.length ? <p className="ws-empty">Hələ faiz qaydası yoxdur.</p> : null}
          </div>
        </article>

        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Sətirlər</p>
              <h2>Son komissiyalar</h2>
            </div>
          </header>
          <div>
            {(summary?.entries ?? []).map((entry) => (
              <div className="ws-flow-card" key={entry.id}>
                <div>
                  <strong>{entry.doctorName} · {money(entry.amount)}</strong>
                  <span>
                    {money(entry.baseAmount)} × {entry.percent}% · {entry.status}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                </div>
                <small>{new Date(entry.createdAt).toLocaleDateString("az-AZ")}</small>
              </div>
            ))}
            {!summary?.entries.length ? <p className="ws-empty">Hələ komissiya sətri yoxdur.</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
