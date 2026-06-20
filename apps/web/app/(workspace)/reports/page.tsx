"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/lovelydent-api";

type Appointment = {
  id: string;
  patientName: string;
  doctorName: string;
  branch: string;
  startsAt: string;
  status: string;
};

type Patient = {
  id: string;
  fullName: string;
  createdAt: string;
};

function range(days: number) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function Page() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState("");

  const completed = useMemo(() => appointments.filter((item) => item.status === "COMPLETED"), [appointments]);
  const noShow = useMemo(() => appointments.filter((item) => item.status === "NO_SHOW"), [appointments]);
  const byBranch = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of appointments) map.set(item.branch, (map.get(item.branch) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [appointments]);

  async function load() {
    const dates = range(7);
    setError("");
    try {
      const [appointmentRows, patientRows] = await Promise.all([
        apiRequest<Appointment[]>(`/appointments?startDate=${dates.startDate}&endDate=${dates.endDate}`),
        apiRequest<Patient[]>("/patients?take=200")
      ]);
      setAppointments(appointmentRows);
      setPatients(patientRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hesabat məlumatları yüklənmədi.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="ws-page-head">
        <div>
          <p className="ws-eyebrow">İdarəetmə · 7 günlük baxış</p>
          <h1>Hesabatlar</h1>
          <span>Klinik aktivlik, randevu statusları və filial üzrə qərar göstəriciləri.</span>
        </div>
        <button className="ws-button" onClick={load}>Yenilə</button>
      </div>

      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>RANDEVU</span>
          <small>Son 7 gün</small>
          <strong>{appointments.length}</strong>
        </article>
        <article>
          <span>TAMAMLANMA</span>
          <small>Bitmiş qəbullar</small>
          <strong>{completed.length}</strong>
        </article>
        <article>
          <span>PASİYENT BAZASI</span>
          <small>Aktiv qeydiyyat</small>
          <strong>{patients.length}</strong>
        </article>
      </section>

      <div className="ws-dashboard-grid">
        <section className="ws-panel ws-today">
          <header>
            <div>
              <p className="ws-eyebrow">İxtisas üzrə yük</p>
              <h2>Randevu paylanması</h2>
            </div>
          </header>
          {byBranch.length ? (
            <div className="ws-flow-list">
              {byBranch.map(([branch, count]) => (
                <article className="ws-flow-card" key={branch}>
                  <time>{count}</time>
                  <div>
                    <b>{branch}</b>
                    <span>Son 7 gündə qəbul sayı</span>
                  </div>
                  <em>{Math.round((count / appointments.length) * 100)}%</em>
                </article>
              ))}
            </div>
          ) : (
            <div className="ws-empty">
              <b>Hələ hesabat datası yoxdur</b>
              <span>Randevular yarandıqca göstəricilər dolacaq.</span>
            </div>
          )}
        </section>

        <aside className="ws-panel ws-focus">
          <p className="ws-eyebrow">Rəhbərlik qeydi</p>
          <h2>Operativ siqnallar</h2>
          <p>No-show sayı: {noShow.length}. Tamamlanan qəbullar: {completed.length}. Növbəti mərhələdə gəlir, həkim performansı və material xərci buraya bağlanacaq.</p>
        </aside>
      </div>
    </>
  );
}
