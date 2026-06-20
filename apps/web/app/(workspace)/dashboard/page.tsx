"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, StaffRole } from "../../../lib/lovelydent-api";
import { roleWorkspace } from "../../../lib/role-access";

type DashboardSummary = {
  role: StaffRole;
  metrics: Array<{ label: string; value: string; detail: string }>;
  actions: Array<{ label: string; href: string }>;
  appointments: Array<{
    id: string;
    patientName: string;
    doctorName: string;
    startsAt: string;
    status: string;
  }>;
};

const statusLabel: Record<string, string> = {
  PENDING: "Gözləyir",
  CONFIRMED: "Təsdiqlənib",
  CHECKED_IN: "Pasiyent gəlib",
  IN_TREATMENT: "Qəbulda",
  COMPLETED: "Tamamlanıb",
  CANCELED: "Ləğv edilib",
  NO_SHOW: "Gəlməyib",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<DashboardSummary>("/dashboard/summary")
      .then(setSummary)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "İş masası yüklənmədi."),
      );
  }, []);

  if (error) return <div className="ws-alert ws-alert--danger">{error}</div>;
  if (!summary)
    return (
      <div className="ws-empty">
        <b>İş masası hazırlanır...</b>
      </div>
    );

  const workspace = roleWorkspace[summary.role];
  return (
    <>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Rol əsaslı iş sahəsi</p>
          <h1>{workspace.title}</h1>
          <span>{workspace.description}</span>
        </div>
        {summary.actions[0] && (
          <Link className="ws-button ws-button--primary" href={summary.actions[0].href}>
            {summary.actions[0].label}
          </Link>
        )}
      </section>

      <section className="ws-metrics">
        {summary.metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label.toLocaleUpperCase("az-AZ")}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className="ws-dashboard-grid">
        <article className="ws-panel ws-today">
          <header>
            <div>
              <p className="ws-eyebrow">
                {summary.appointments.length ? "Canlı qəbul axını" : "Səlahiyyətli görünüş"}
              </p>
              <h2>{summary.appointments.length ? "Bu gün" : "İş prioritetləri"}</h2>
            </div>
          </header>
          {summary.appointments.length ? (
            summary.appointments.map((appointment) => (
              <div className="ws-appointment-row" key={appointment.id}>
                <time>
                  {new Date(appointment.startsAt).toLocaleTimeString("az-AZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <i />
                <div>
                  <b>{appointment.patientName}</b>
                  <span>{appointment.doctorName}</span>
                </div>
                <em>{statusLabel[appointment.status] ?? appointment.status}</em>
              </div>
            ))
          ) : (
            <div className="ws-empty">
              <b>Məlumat rolunuza uyğun məhdudlaşdırılıb</b>
              <span>Şəxsi tibbi məlumatlar yalnız əməliyyat işi olan rollara göstərilir.</span>
            </div>
          )}
        </article>

        <aside className="ws-panel ws-focus">
          <p className="ws-eyebrow">Sürətli keçidlər</p>
          <h2>İş axını</h2>
          <p>Yalnız bu rolun məsuliyyətinə aid modullar aktivdir.</p>
          {summary.actions.map((action) => (
            <Link key={action.href} href={action.href}>
              {action.label} →
            </Link>
          ))}
        </aside>
      </section>
    </>
  );
}
