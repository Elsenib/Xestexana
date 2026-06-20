"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/lovelydent-api";

type Appointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  branch: string;
  startsAt: string;
  status: string;
};

function range() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function Page() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [amount, setAmount] = useState("80");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("LovelyDent xidmət ödənişi");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const completed = useMemo(() => appointments.filter((item) => item.status === "COMPLETED"), [appointments]);
  const cashQueue = useMemo(() => appointments.filter((item) => ["IN_TREATMENT", "COMPLETED"].includes(item.status)), [appointments]);

  async function load() {
    const dates = range();
    setLoading(true);
    setError("");
    try {
      const rows = await apiRequest<Appointment[]>(`/appointments?startDate=${dates.startDate}&endDate=${dates.endDate}`);
      setAppointments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Maliyyə məlumatları yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPaymentUrl("");
    try {
      const result = await apiRequest<{ paymentUrl: string }>("/payment/paymes-initiate", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          customerEmail: email,
          description
        })
      });
      setPaymentUrl(result.paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödəniş linki yaradıla bilmədi.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Maliyyə · Kassa axını</p>
          <h1>Kassa və maliyyə</h1>
          <span>Bugünkü qəbuldan ödənişə keçid və Paymes link yaratma paneli.</span>
        </div>
        <button className="ws-button" onClick={load} disabled={loading}>
          Yenilə
        </button>
      </div>

      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>KASSA NÖVBƏSİ</span>
          <small>Müalicədə və tamamlananlar</small>
          <strong>{cashQueue.length}</strong>
        </article>
        <article>
          <span>TAMAMLANAN</span>
          <small>Bugünkü xidmətlər</small>
          <strong>{completed.length}</strong>
        </article>
        <article>
          <span>TƏSDİQLİ DÖVRİYYƏ</span>
          <small>Maliyyə ledger-indən hesablanacaq</small>
          <strong>—</strong>
        </article>
      </section>

      <div className="ws-clinical-grid">
        <section className="ws-panel ws-today">
          <header>
            <div>
              <p className="ws-eyebrow">Günlük kassa siyahısı</p>
              <h2>Ödəniş gözləyən qəbullar</h2>
            </div>
          </header>
          {cashQueue.length ? (
            <div className="ws-flow-list">
              {cashQueue.map((item) => (
                <article className="ws-flow-card" key={item.id}>
                  <time>{new Date(item.startsAt).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}</time>
                  <div>
                    <b>{item.patientName}</b>
                    <span>{item.patientPhone}</span>
                    <small>
                      {item.doctorName} · {item.branch}
                    </small>
                  </div>
                  <em data-status={item.status}>{item.status}</em>
                </article>
              ))}
            </div>
          ) : (
            <div className="ws-empty">
              <b>Kassa növbəsi boşdur</b>
              <span>Müalicə tamamlandıqca ödəniş işi burada görünəcək.</span>
            </div>
          )}
        </section>

        <aside className="ws-panel ws-booking">
          <p className="ws-eyebrow">Online ödəniş</p>
          <h2>Paymes link yarat</h2>
          <form className="ws-form-grid" onSubmit={createPayment}>
            <label className="ws-form-wide">
              Müştəri e-poçtu
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Məbləğ
              <input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </label>
            <label className="ws-form-wide">
              Açıqlama
              <input value={description} onChange={(event) => setDescription(event.target.value)} required />
            </label>
            <footer className="ws-form-wide">
              <button className="ws-button ws-button--primary">Link yarat</button>
            </footer>
          </form>
          {paymentUrl ? (
            <p className="ws-clinical-note">
              Link hazırdır: <a href={paymentUrl} target="_blank" rel="noreferrer">{paymentUrl}</a>
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
