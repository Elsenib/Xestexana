"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type AuditLog = {
  id: string;
  category: string;
  action: string;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  details: unknown;
  createdAt: string;
};

const categories = ["SECURITY", "FINANCE", "CLINICAL", "INVENTORY", "APPROVAL", "ADMIN"];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const query = category ? `?category=${category}&take=120` : "?take=120";
    setLogs(await apiRequest<AuditLog[]>(`/audit/logs${query}`));
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Audit yüklənmədi."));
  }, [category]);

  return (
    <div>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Təhlükəsizlik</p>
          <h1>Audit jurnalı</h1>
          <span>Əməliyyatların kim tərəfindən, nə vaxt və hansı modulda edildiyini izləmək üçün nəzarət paneli.</span>
        </div>
      </section>

      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-panel pc-section">
        <header className="ws-registry-tools">
          <div>
            <p className="ws-eyebrow">Loglar</p>
            <h2>Son əməliyyatlar</h2>
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Bütün kateqoriyalar</option>
            {categories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </header>
        <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
          {logs.map((log) => (
            <article className="ws-flow-card" key={log.id}>
              <time>{new Date(log.createdAt).toLocaleString("az-AZ")}</time>
              <div>
                <b>{log.summary}</b>
                <span>{log.category} · {log.action} · {log.userEmail ?? "system"}</span>
                <small>{log.entityType ?? "Entity yoxdur"} {log.entityId ? `· ${log.entityId}` : ""}</small>
              </div>
              <em>{log.userRole ?? "SYSTEM"}</em>
            </article>
          ))}
          {!logs.length ? <div className="ws-empty"><span>Audit qeydi yoxdur.</span></div> : null}
        </div>
      </section>
    </div>
  );
}
