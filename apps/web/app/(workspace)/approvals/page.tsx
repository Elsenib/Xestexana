"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";
import {
  approvalActionLabels,
  describeApproval,
  reviewerLabel,
  roleLabels,
  type ApprovalRow,
} from "../../../lib/approval-labels";

type Product = { id: string; name: string; unit: string };
type Scope = "review" | "mine" | "all";
type Status = "PENDING" | "APPROVED" | "REJECTED";

export default function ApprovalsPage() {
  const [scope, setScope] = useState<Scope>("review");
  const [status, setStatus] = useState<Status>("PENDING");
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function load() {
    setError("");
    try {
      const [approvals, inventory] = await Promise.all([
        apiRequest<ApprovalRow[]>(`/approvals?status=${status}&scope=${scope}`),
        apiRequest<Product[]>("/inventory/products").catch(() => []),
      ]);
      setRows(approvals);
      setProducts(inventory);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Təsdiqlər yüklənmədi.");
    }
  }

  useEffect(() => {
    void load();
  }, [scope, status]);

  async function review(id: string, decision: "APPROVE" | "REJECT", note?: string) {
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      await apiRequest(`/approvals/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision, note: note || null }),
      });
      setNotice(
        decision === "APPROVE"
          ? "Əməliyyat təsdiqləndi və server tərəfindən avtomatik tətbiq edildi."
          : "Əməliyyat rədd edildi. Biznes məlumatı dəyişmədi.",
      );
      setRejectId(null);
      setRejectNote("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sorğu cavablandırılmadı.");
    } finally {
      setBusyId(null);
    }
  }

  const canReview = scope === "review" && status === "PENDING";

  return (
    <>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Rəhbər nəzarəti</p>
          <h1>Təsdiq gözləyən əməliyyatlar</h1>
          <span>
            Təsdiqdən əvvəl stok, klinik və kataloq məlumatı dəyişmir. Təsdiqdən sonra
            ledger avtomatik yenilənir.
          </span>
        </div>
        <button type="button" className="ws-button" onClick={() => void load()}>
          Yenilə
        </button>
      </section>

      <section className="ws-approval-tabs">
        <div className="ws-approval-tab-row">
          {(
            [
              ["review", "Mənim təsdiqim"],
              ["mine", "Mənim göndərdiklərim"],
              ["all", "Bütün sorğular"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={scope === value ? "active" : ""}
              onClick={() => setScope(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ws-approval-tab-row ws-approval-tab-row--sub">
          {(
            [
              ["PENDING", "Gözləyən"],
              ["APPROVED", "Təsdiqlənmiş"],
              ["REJECTED", "Rədd edilmiş"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={status === value ? "active" : ""}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="ws-alert ws-alert--danger">{error}</div>}
      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}

      <section className="ws-panel pc-section ws-approval-list">
        <header className="ws-approval-list-head">
          <div>
            <p className="ws-eyebrow">Növbə</p>
            <h2>{rows.length} sorğu</h2>
          </div>
        </header>

        {rows.map((row) => {
          const product = products.find((item) => item.id === row.entityId);
          return (
            <article className="ws-approval-card" key={row.id}>
              <div className="ws-approval-card-main">
                <div className="ws-approval-card-top">
                  <span className="ws-approval-type">
                    {approvalActionLabels[row.actionType] ?? row.actionType}
                  </span>
                  <span className={`ws-approval-status ws-approval-status--${row.status.toLowerCase()}`}>
                    {row.status === "PENDING" ? "Gözləyir" : row.status === "APPROVED" ? "Təsdiqlənib" : "Rədd edilib"}
                  </span>
                </div>
                <b>{describeApproval(row, product?.name)}</b>
                <span>
                  {String(row.payload.reason ?? "")}
                  {row.payload.reason ? " · " : ""}
                  {row.requestedBy.email} ({roleLabels[row.requestedBy.role] ?? row.requestedBy.role})
                </span>
                <small>
                  Təsdiq edən: {reviewerLabel(row)} ·{" "}
                  {new Date(row.createdAt).toLocaleString("az-AZ")}
                  {row.reviewedBy?.email ? ` · Cavab: ${row.reviewedBy.email}` : ""}
                </small>
                {row.reviewNote && <em className="ws-approval-note">Qeyd: {row.reviewNote}</em>}
              </div>

              {canReview && (
                <div className="ws-approval-card-actions">
                  {rejectId === row.id ? (
                    <div className="ws-approval-reject-box">
                      <input
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Rədd səbəbi (ixtiyari)"
                      />
                      <button
                        type="button"
                        className="ws-button ws-button--danger"
                        disabled={busyId === row.id}
                        onClick={() => void review(row.id, "REJECT", rejectNote)}
                      >
                        Təsdiqlə rədd
                      </button>
                      <button type="button" className="ws-button" onClick={() => setRejectId(null)}>
                        Ləğv
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ws-row-action"
                        disabled={busyId === row.id}
                        onClick={() => setRejectId(row.id)}
                      >
                        Rədd et
                      </button>
                      <button
                        type="button"
                        className="ws-button ws-button--primary"
                        disabled={busyId === row.id}
                        onClick={() => void review(row.id, "APPROVE")}
                      >
                        {busyId === row.id ? "Tətbiq olunur..." : "Təsdiqlə"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {!rows.length && (
          <div className="ws-empty">
            <b>Bu filtrdə sorğu yoxdur</b>
            <span>Yeni əməliyyat təsdiq tələb etdikdə burada görünəcək.</span>
          </div>
        )}
      </section>
    </>
  );
}
