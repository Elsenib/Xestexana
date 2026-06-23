"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Report = {
  appointmentCount: number;
  patientCount: number;
  statusCounts: Record<string, number>;
  branchCounts: Array<{ branch: string; count: number }>;
};

type FinanceReport = {
  charges: number;
  payments: number;
  deposits: number;
  refunds: number;
  cashPayments: number;
  openDebtors: number;
  totalOutstanding: number;
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
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const dates = range(7);
    setError("");
    try {
      const [ops, fin] = await Promise.all([
        apiRequest<Report>(`/reports/operations?startDate=${dates.startDate}&endDate=${dates.endDate}`),
        apiRequest<FinanceReport>(`/finance/reports/summary?startDate=${dates.startDate}&endDate=${dates.endDate}`),
      ]);
      setReport(ops);
      setFinance(fin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hesabat məlumatları yüklənmədi.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <div className="ws-page-head">
        <div>
          <p className="ws-eyebrow">İdarəetmə · 7 günlük baxış</p>
          <h1>Hesabatlar</h1>
          <span>Klinik aktivlik və maliyyə göstəriciləri ledger-dən hesablanır.</span>
        </div>
        <button type="button" className="ws-button" onClick={() => void load()}>Yenilə</button>
      </div>

      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>RANDEVU</span>
          <small>Son 7 gün</small>
          <strong>{report.appointmentCount}</strong>
        </article>
        <article>
          <span>BORCLAR</span>
          <small>Ledger xidmət haqqı</small>
          <strong>{finance ? `${finance.charges.toFixed(2)} ₼` : "—"}</strong>
        </article>
        <article>
          <span>ÖDƏNİŞ</span>
          <small>Nağd: {finance ? `${finance.cashPayments.toFixed(2)} ₼` : "—"}</small>
          <strong>{finance ? `${finance.payments.toFixed(2)} ₼` : "—"}</strong>
        </article>
        <article>
          <span>BORCLU</span>
          <small>Cari pasiyent sayı</small>
          <strong>{finance ? finance.openDebtors : "—"}</strong>
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
            </div>
          )}
        </section>

        <aside className="ws-panel ws-focus">
          <p className="ws-eyebrow">Maliyyə xülasəsi</p>
          <h2>7 günlük ledger</h2>
          {finance ? (
            <dl>
              <div><dt>Depozit</dt><dd>{finance.deposits.toFixed(2)} ₼</dd></div>
              <div><dt>Refund</dt><dd>{finance.refunds.toFixed(2)} ₼</dd></div>
              <div><dt>Ümumi borc</dt><dd>{finance.totalOutstanding.toFixed(2)} ₼</dd></div>
              <div><dt>Tamamlanan qəbullar</dt><dd>{report.statusCounts.COMPLETED ?? 0}</dd></div>
              <div><dt>No-show</dt><dd>{report.statusCounts.NO_SHOW ?? 0}</dd></div>
            </dl>
          ) : (
            <p>Maliyyə datası yüklənir...</p>
          )}
        </aside>
      </div>
    </>
  );
}
