"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiRequest } from "../../../lib/lovelydent-api";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "IN_TREATMENT" | "COMPLETED" | "CANCELED" | "NO_SHOW";

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  branch: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes?: string | null;
};

const statusLabel: Record<AppointmentStatus, string> = {
  PENDING: "Gözləyir",
  CONFIRMED: "Təsdiqlənib",
  CHECKED_IN: "Klinikadadır",
  IN_TREATMENT: "Müalicədə",
  COMPLETED: "Tamamlandı",
  CANCELED: "Ləğv edildi",
  NO_SHOW: "Gəlmədi"
};

function isoDayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function time(value: string) {
  return new Intl.DateTimeFormat("az-AZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function Page() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const queue = useMemo(
    () => appointments.filter((item) => ["CHECKED_IN", "IN_TREATMENT"].includes(item.status)),
    [appointments]
  );
  const waiting = useMemo(
    () => appointments.filter((item) => ["PENDING", "CONFIRMED"].includes(item.status)),
    [appointments]
  );

  async function load() {
    const range = isoDayRange();
    setLoading(true);
    setError("");
    try {
      const rows = await apiRequest<Appointment[]>(`/appointments?startDate=${range.startDate}&endDate=${range.endDate}`);
      setAppointments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Klinik növbə yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, status: AppointmentStatus) {
    setError("");
    try {
      await apiRequest(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status dəyişdirilə bilmədi.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Klinik nüvə · Günün axını</p>
          <h1>Klinik iş</h1>
          <span>Check-in olmuş pasiyentlər, müalicəyə keçid və klinik karta sürətli giriş.</span>
        </div>
        <button className="ws-button" onClick={load} disabled={loading}>
          Yenilə
        </button>
      </div>

      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>GÖZLƏYƏN</span>
          <small>Təsdiqlənmiş və növbədə</small>
          <strong>{waiting.length}</strong>
        </article>
        <article>
          <span>KLİNİK NÖVBƏ</span>
          <small>Check-in və müalicədə</small>
          <strong>{queue.length}</strong>
        </article>
        <article>
          <span>BUGÜN CƏMİ</span>
          <small>Bütün randevular</small>
          <strong>{appointments.length}</strong>
        </article>
      </section>

      <div className="ws-clinical-grid">
        <section className="ws-panel ws-today">
          <header>
            <div>
              <p className="ws-eyebrow">Aktiv klinik növbə</p>
              <h2>Müalicə axını</h2>
            </div>
            <Link href="/appointments">Təqvimə bax</Link>
          </header>

          {loading ? (
            <div className="ws-empty">
              <b>Yüklənir...</b>
              <span>Günün klinik növbəsi hazırlanır.</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="ws-empty">
              <b>Aktiv klinik növbə yoxdur</b>
              <span>Pasiyent check-in ediləndə burada görünəcək.</span>
            </div>
          ) : (
            <div className="ws-flow-list">
              {queue.map((appointment) => (
                <article className="ws-flow-card" key={appointment.id}>
                  <time>
                    {time(appointment.startsAt)}–{time(appointment.endsAt)}
                  </time>
                  <div>
                    <b>{appointment.patientName}</b>
                    <span>{appointment.patientPhone}</span>
                    <small>
                      {appointment.doctorName} · {appointment.branch}
                    </small>
                  </div>
                  <em data-status={appointment.status}>{statusLabel[appointment.status]}</em>
                  <footer>
                    <Link href={`/patients/card?id=${appointment.patientId}`}>Klinik kart</Link>
                    {appointment.status === "CHECKED_IN" ? (
                      <button onClick={() => changeStatus(appointment.id, "IN_TREATMENT")}>Müalicəyə başla</button>
                    ) : null}
                    {appointment.status === "IN_TREATMENT" ? (
                      <button onClick={() => changeStatus(appointment.id, "COMPLETED")}>Tamamla</button>
                    ) : null}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="ws-panel ws-booking">
          <p className="ws-eyebrow">Qəbuldan klinikaya</p>
          <h2>Növbəti addım</h2>
          <p className="ws-clinical-note">
            Reception pasiyenti “Klinikadadır” statusuna gətirir, həkim buradan klinik karta keçib anamnezə,
            odontograma və klinik tarixçəyə baxır. Bu, sabah demo üçün artıq real axın kimi görünür.
          </p>
          <Link className="ws-button ws-button--primary" href="/patients">
            Pasiyent kartlarına keç
          </Link>
        </aside>
      </div>
    </>
  );
}
