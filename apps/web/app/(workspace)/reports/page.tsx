"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/lovelydent-api";

type Report = {
  appointmentCount: number;
  patientCount: number;
  statusCounts: Record<string, number>;
  branchCounts: Array<{ branch: string; count: number }>;
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
  const [report, setReport] = useState<Report>({ appointmentCount: 0, patientCount: 0, statusCounts: {}, branchCounts: [] });
  const [error, setError] = useState("");

  async function load() {
    const dates = range(7);
    setError("");
    try {
      setReport(await apiRequest<Report>(`/reports/operations?startDate=${dates.startDate}&endDate=${dates.endDate}`));
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
          <strong>{report.appointmentCount}</strong>
        </article>
        <article>
          <span>TAMAMLANMA</span>
          <small>Bitmiş qəbullar</small>
          <strong>{report.statusCounts.COMPLETED ?? 0}</strong>
        </article>
        <article>
          <span>PASİYENT BAZASI</span>
          <small>Aktiv qeydiyyat</small>
          <strong>{report.patientCount}</strong>
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
          {report.branchCounts.length ? (
            <div className="ws-flow-list">
              {report.branchCounts.map((item) => (
                <article className="ws-flow-card" key={item.branch}>
                  <time>{item.count}</time>
                  <div>
                    <b>{item.branch}</b>
                    <span>Son 7 gündə qəbul sayı</span>
                  </div>
                  <em>{report.appointmentCount ? Math.round((item.count / report.appointmentCount) * 100) : 0}%</em>
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
          <p>No-show sayı: {report.statusCounts.NO_SHOW ?? 0}. Tamamlanan qəbullar: {report.statusCounts.COMPLETED ?? 0}. Maliyyə göstəriciləri yalnız ledger əməliyyatlarından sonra burada göstəriləcək.</p>
        </aside>
      </div>
    </>
  );
}
