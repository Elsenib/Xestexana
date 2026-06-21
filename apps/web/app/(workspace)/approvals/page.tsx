"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Approval = {
  id: string; actionType: string; entityId?: string; payload: Record<string, unknown>;
  status: string; createdAt: string; requestedBy: { email: string; role: string };
};
type Product = { id: string; name: string; unit: string };

const actionLabel: Record<string, string> = { STOCK_MOVEMENT: "Stok hərəkəti" };
const movementLabel: Record<string, string> = { PURCHASE: "Alış/giriş", CONSUMPTION: "Klinik sərf", TRANSFER_IN: "Transfer giriş", TRANSFER_OUT: "Transfer çıxış", RETURN: "Geri qaytarma", ADJUSTMENT_IN: "Artıq düzəlişi", ADJUSTMENT_OUT: "Əskik düzəlişi", WRITE_OFF: "Silinmə" };

export default function ApprovalsPage() {
  const [rows, setRows] = useState<Approval[]>([]); const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function load() {
    setError("");
    try {
      const [approvals, inventory] = await Promise.all([apiRequest<Approval[]>("/approvals?status=PENDING"), apiRequest<Product[]>("/inventory/products").catch(() => [])]);
      setRows(approvals); setProducts(inventory);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Təsdiqlər yüklənmədi."); }
  }
  useEffect(() => { void load(); }, []);
  async function review(id: string, decision: "APPROVE" | "REJECT") {
    setError(""); setNotice("");
    try { await apiRequest(`/approvals/${id}/review`, { method: "PATCH", body: JSON.stringify({ decision }) }); setNotice(decision === "APPROVE" ? "Əməliyyat təsdiqləndi və avtomatik tətbiq edildi." : "Əməliyyat rədd edildi."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Sorğu cavablandırılmadı."); }
  }
  return <>
    <section className="ws-page-head"><div><p className="ws-eyebrow">Rəhbər nəzarəti</p><h1>Təsdiq gözləyən əməliyyatlar</h1><span>Təsdiqdən əvvəl biznes məlumatı dəyişmir; təsdiqdən sonra server əməliyyatı avtomatik tətbiq edir.</span></div><button className="ws-button" onClick={() => void load()}>Yenilə</button></section>
    {error && <div className="ws-alert ws-alert--danger">{error}</div>}{notice && <div className="ws-alert ws-alert--success">{notice}</div>}
    <section className="ws-panel pc-section"><p className="ws-eyebrow">Növbə</p><h2>{rows.length} sorğu</h2>
      {rows.map((row) => { const product = products.find((item) => item.id === row.entityId); const type = String(row.payload.type ?? ""); return <article className="ws-flow-card" key={row.id}><div><b>{actionLabel[row.actionType] ?? row.actionType} · {product?.name ?? "Məhsul"}</b><span>{movementLabel[type] ?? type} · {String(row.payload.quantity ?? "")} {product?.unit ?? ""}</span><small>{String(row.payload.reason ?? "")} · {row.requestedBy.email} · {new Date(row.createdAt).toLocaleString("az-AZ")}</small></div><div><button className="ws-row-action" onClick={() => void review(row.id, "REJECT")}>Rədd et</button><button className="ws-button ws-button--primary" onClick={() => void review(row.id, "APPROVE")}>Təsdiqlə</button></div></article>; })}
      {!rows.length && <div className="ws-empty"><b>Gözləyən sorğu yoxdur</b><span>Yeni rəhbər təsdiqi tələb ediləndə burada görünəcək.</span></div>}
    </section>
  </>;
}
