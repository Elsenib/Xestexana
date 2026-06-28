"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, CurrentUser } from "../../../lib/lovelydent-api";

type Doctor = { userId: string; email: string; name: string; branch: string | null };
type Service = { id: string; code: string; name: string; active: boolean };
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
  paidBaseAmount: number;
  earnedAmount: number;
  clinicShareAmount: number;
  status: string;
  sourceType: string;
  note: string | null;
  createdAt: string;
};
type Summary = {
  totals: { pending: number; earned: number; clinicShare: number; entries: number; activeRules: number };
  rules: CommissionRule[];
  entries: CommissionEntry[];
};
type CommissionPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
  note: string | null;
  closedAt: string;
  closedBy: string;
  settlements: Array<{
    id: string;
    doctorName: string;
    earnedAmount: number;
    paidAmount: number;
    status: string;
    payouts: Array<{ id: string; amount: number; paymentMethod: string; paidAt: string }>;
  }>;
};

const defaultRule = { doctorUserId: "", serviceId: "", percent: "10" };
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;

function money(value: number) {
  return `${value.toFixed(2)} ₼`;
}

export default function CommissionsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [periods, setPeriods] = useState<CommissionPeriod[]>([]);
  const [ruleForm, setRuleForm] = useState(defaultRule);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [periodForm, setPeriodForm] = useState({ startDate: monthStart, endDate: today, note: "" });
  const [payoutForms, setPayoutForms] = useState<Record<string, { amount: string; paymentMethod: "CASH" | "CARD" | "TRANSFER" }>>({});
  const canManageRules = user?.role === "SUPER_ADMIN";

  const doctorOptions = useMemo(
    () => doctors.map((doctor) => ({ value: doctor.userId, label: `${doctor.name} · ${doctor.email}` })),
    [doctors],
  );

  async function load() {
    const [me, doctorRows, summaryRow, serviceRows, periodRows] = await Promise.all([
      apiRequest<CurrentUser>("/auth/me"),
      apiRequest<Doctor[]>("/commissions/doctors"),
      apiRequest<Summary>("/commissions/summary"),
      apiRequest<Service[]>("/services").catch(() => [] as Service[]),
      apiRequest<CommissionPeriod[]>("/commissions/periods"),
    ]);
    setUser(me);
    setDoctors(doctorRows);
    setSummary(summaryRow);
    setServices(serviceRows.filter((service) => service.active));
    setPeriods(periodRows);
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
          serviceId: ruleForm.serviceId || undefined,
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

  async function closePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setSaving(true);
    try {
      await apiRequest("/commissions/periods/close", {
        method: "POST",
        body: JSON.stringify({ ...periodForm, note: periodForm.note || undefined }),
      });
      setNotice("Komissiya periodu bağlandı və həkim hesablaşmaları yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Komissiya periodu bağlanmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function paySettlement(settlementId: string, available: number) {
    const form = payoutForms[settlementId] ?? { amount: String(available), paymentMethod: "TRANSFER" as const };
    setError(""); setNotice(""); setSaving(true);
    try {
      await apiRequest(`/commissions/settlements/${settlementId}/payout`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(form.amount), paymentMethod: form.paymentMethod }),
      });
      setNotice("Həkim komissiyası ödəniş tarixçəsinə yazıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Komissiya ödənişi qeydə alınmadı.");
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
          <p className="ws-eyebrow">Avtomatik maliyyə · Gəlir bölgüsü</p>
          <h1>Həkim–klinika gəlir bölgüsü</h1>
          <span>
            Həkim maaş almır: görülən xidmətin ödənmiş hissəsi qaydaya əsasən həkim və klinika arasında bölünür. Məsələn 50% / 50%.
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
          <span>Qazanılmış komissiya</span>
          <strong>{money(summary?.totals.earned ?? 0)}</strong>
          <small>Ödənmiş xidmət hissəsinə görə</small>
        </article>
        <article>
          <span>Klinikanın payı</span>
          <strong>{money(summary?.totals.clinicShare ?? 0)}</strong>
          <small>Ödənmiş xidmətlərdən qalan pay</small>
        </article>
      </section>

      {canManageRules ? <section className="pc-grid">
        <form className="ws-panel pc-form" onSubmit={createRule}>
          <header>
            <div>
              <p className="ws-eyebrow">Qayda</p>
              <h2>Gəlir bölgüsü təyin et</h2>
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
              Xidmət
              <select value={ruleForm.serviceId} onChange={(e) => setRuleForm((v) => ({ ...v, serviceId: e.target.value }))}>
                <option value="">Bütün xidmətlər</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.code} · {service.name}</option>
                ))}
              </select>
            </label>
            <label>
              Həkimin payı (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={ruleForm.percent}
                onChange={(e) => setRuleForm((v) => ({ ...v, percent: e.target.value }))}
              />
              <small>Klinikanın payı avtomatik: {100 - Number(ruleForm.percent || 0)}%</small>
            </label>
            <footer>
              <button className="ws-button ws-button--primary" disabled={saving}>
                Qaydanı saxla
              </button>
            </footer>
          </div>
        </form>

      </section> : null}

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
                  <span>{rule.serviceName} · həkim {rule.percent}% / klinika {100 - rule.percent}%</span>
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
                  <strong>{entry.doctorName} · həkim {money(entry.earnedAmount)} / klinika {money(entry.clinicShareAmount)}</strong>
                  <span>
                    Ödənən baza {money(entry.paidBaseAmount)} / {money(entry.baseAmount)} · {entry.percent}% · {entry.status}
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

      {canManageRules ? (
        <form className="ws-panel pc-form" onSubmit={closePeriod} style={{ marginTop: 22 }}>
          <header><div><p className="ws-eyebrow">Hesablaşma periodu</p><h2>Komissiya periodunu bağla</h2></div></header>
          <div className="ws-form-grid">
            <label>Başlanğıc<input type="date" required value={periodForm.startDate} onChange={(e) => setPeriodForm((v) => ({ ...v, startDate: e.target.value }))} /></label>
            <label>Son tarix<input type="date" required value={periodForm.endDate} onChange={(e) => setPeriodForm((v) => ({ ...v, endDate: e.target.value }))} /></label>
            <label className="ws-form-wide">Qeyd<input value={periodForm.note} onChange={(e) => setPeriodForm((v) => ({ ...v, note: e.target.value }))} /></label>
            <footer className="ws-form-wide"><button className="ws-button ws-button--primary" disabled={saving}>Periodu bağla</button></footer>
          </div>
        </form>
      ) : null}

      <section className="ws-panel pc-section" style={{ marginTop: 22 }}>
        <header><div><p className="ws-eyebrow">Period tarixçəsi</p><h2>Həkim hesablaşmaları və ödənişlər</h2></div></header>
        <div className="ws-flow-list">
          {periods.map((period) => (
            <article className="ws-flow-card" key={period.id} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <strong>{new Date(period.startDate).toLocaleDateString("az-AZ")} – {new Date(period.endDate).toLocaleDateString("az-AZ")} · {money(period.totalAmount)}</strong>
                <span>{period.closedBy} · {period.note || "Qeyd yoxdur"}</span>
                <div className="ws-flow-list" style={{ marginTop: 12 }}>
                  {period.settlements.map((settlement) => {
                    const available = Math.max(0, settlement.earnedAmount - settlement.paidAmount);
                    const form = payoutForms[settlement.id] ?? { amount: String(available), paymentMethod: "TRANSFER" as const };
                    return (
                      <div className="ws-flow-card" key={settlement.id}>
                        <div>
                          <b>{settlement.doctorName}</b>
                          <span>Hesablandı {money(settlement.earnedAmount)} · ödənildi {money(settlement.paidAmount)} · {settlement.status}</span>
                        </div>
                        {canManageRules && available > 0 ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <input aria-label="Ödəniş məbləği" type="number" min="0.01" step="0.01" max={available} value={form.amount} onChange={(e) => setPayoutForms((v) => ({ ...v, [settlement.id]: { ...form, amount: e.target.value } }))} />
                            <select aria-label="Ödəniş metodu" value={form.paymentMethod} onChange={(e) => setPayoutForms((v) => ({ ...v, [settlement.id]: { ...form, paymentMethod: e.target.value as "CASH" | "CARD" | "TRANSFER" } }))}>
                              <option value="TRANSFER">Köçürmə</option><option value="CARD">Kart</option><option value="CASH">Nağd</option>
                            </select>
                            <button type="button" className="ws-row-action" disabled={saving} onClick={() => void paySettlement(settlement.id, available)}>Ödə</button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
          {!periods.length ? <p className="ws-empty">Hələ bağlanmış komissiya periodu yoxdur.</p> : null}
        </div>
      </section>
    </div>
  );
}
