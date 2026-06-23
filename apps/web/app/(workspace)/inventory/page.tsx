"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, CurrentUser } from "../../../lib/lovelydent-api";

type MovementType = "PURCHASE" | "CONSUMPTION" | "TRANSFER_IN" | "TRANSFER_OUT" | "RETURN" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "WRITE_OFF";
type Movement = { id: string; type: MovementType; quantity: number; reason: string; reference?: string; createdAt: string; createdBy: { email: string } };
type Product = {
  id: string; name: string; category: string; sku: string; unit: string;
  minimumStock: number; location?: string; active: boolean; balance: number;
  isCritical: boolean; recentMovements: Movement[];
};

const movementLabels: Record<MovementType, string> = {
  PURCHASE: "Alış / anbara giriş",
  CONSUMPTION: "Klinik sərf",
  TRANSFER_IN: "Transfer giriş",
  TRANSFER_OUT: "Transfer çıxış",
  RETURN: "Geri qaytarma",
  ADJUSTMENT_IN: "Artıq düzəlişi",
  ADJUSTMENT_OUT: "Əskik düzəlişi",
  WRITE_OFF: "Silinmə",
};
const managerMovementTypes = Object.keys(movementLabels) as MovementType[];
const nurseMovementTypes: MovementType[] = ["CONSUMPTION", "RETURN"];

type MovementResponse = { message?: string; approvalId?: string; status?: string };

export default function InventoryPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState({ name: "", category: "", sku: "", unit: "ədəd", minimumStock: "0", location: "" });
  const [movementForm, setMovementForm] = useState({ productId: "", type: "PURCHASE" as MovementType, quantity: "1", reason: "", reference: "" });
  const [myPending, setMyPending] = useState<Array<{ id: string; actionType: string; createdAt: string; payload: Record<string, unknown> }>>([]);

  const canManage = user ? ["SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"].includes(user.role) : false;
  const allowedMovementTypes = user?.role === "NURSE" ? nurseMovementTypes : managerMovementTypes;
  const critical = useMemo(() => products.filter((item) => item.isCritical), [products]);
  const recent = useMemo(
    () => products.flatMap((product) => product.recentMovements.map((movement) => ({ product, movement })))
      .sort((a, b) => +new Date(b.movement.createdAt) - +new Date(a.movement.createdAt)).slice(0, 12),
    [products],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [currentUser, rows, pending] = await Promise.all([
        apiRequest<CurrentUser>("/auth/me"),
        apiRequest<Product[]>("/inventory/products"),
        apiRequest<Array<{ id: string; actionType: string; createdAt: string; payload: Record<string, unknown> }>>(
          "/approvals?status=PENDING&scope=mine",
        ).catch(() => [] as Array<{ id: string; actionType: string; createdAt: string; payload: Record<string, unknown> }>),
      ]);
      setUser(currentUser);
      setProducts(rows);
      setMyPending(pending.filter((row) => row.actionType === "STOCK_MOVEMENT"));
      if (!movementForm.productId && rows[0]) setMovementForm((value) => ({ ...value, productId: rows[0].id }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Anbar məlumatları yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    setError(""); setNotice("");
    try {
      await apiRequest("/inventory/products", {
        method: "POST",
        body: JSON.stringify({ ...productForm, minimumStock: Number(productForm.minimumStock), location: productForm.location || null }),
      });
      setProductForm({ name: "", category: "", sku: "", unit: "ədəd", minimumStock: "0", location: "" });
      setNotice("Material kartı yaradıldı.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Material yaradılmadı.");
    }
  }

  async function createMovement(event: FormEvent) {
    event.preventDefault();
    setError(""); setNotice("");
    try {
      const result = await apiRequest<MovementResponse>("/inventory/movements", {
        method: "POST",
        body: JSON.stringify({ ...movementForm, quantity: Number(movementForm.quantity), reference: movementForm.reference || null }),
      });
      setMovementForm((value) => ({ ...value, quantity: "1", reason: "", reference: "" }));
      setNotice(
        result.approvalId
          ? result.message ?? "Əməliyyat təsdiq gözləyir. Stok hələ dəyişməyib."
          : result.message ?? "Stok hərəkəti qeydə alındı və avtomatik tətbiq edildi.",
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Stok hərəkəti qeydə alınmadı.");
    }
  }

  return (
    <>
      <section className="ws-page-head">
        <div><p className="ws-eyebrow">Anbar · Hərəkət ledger-i</p><h1>Stok və materiallar</h1><span>Hər qalıq giriş, sərf, transfer və düzəliş tarixçəsindən avtomatik hesablanır.</span></div>
      </section>
      {error && <div className="ws-alert ws-alert--danger">{error}</div>}
      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}
      {myPending.length > 0 && (
        <section className="ws-panel pc-section ws-approval-banner">
          <p className="ws-eyebrow">Təsdiq gözləyir</p>
          <h2>{myPending.length} stok əməliyyatı hələ tətbiq olunmayıb</h2>
          <span>Super Admin və ya həkim təsdiqləyənə qədər qalıq dəyişmir.</span>
        </section>
      )}
      <section className="ws-metrics">
        <article><span>AKTİV MATERİAL</span><strong>{products.filter((item) => item.active).length}</strong><small>Məhsul kartı</small></article>
        <article><span>KRİTİK STOK</span><strong>{critical.length}</strong><small>Minimum və aşağı</small></article>
        <article><span>SON HƏRƏKƏTLƏR</span><strong>{recent.length}</strong><small>Audit görünüşü</small></article>
      </section>

      <section className="ws-dashboard-grid">
        {canManage && (
          <form className="ws-panel pc-form" onSubmit={createProduct}>
            <header><div><p className="ws-eyebrow">Anbar məsulu</p><h2>Yeni material</h2></div></header>
            <div className="ws-form-grid">
              <label>Material adı<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
              <label>SKU / barkod<input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} /></label>
              <label>Kateqoriya<input required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></label>
              <label>Ölçü vahidi<input required value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></label>
              <label>Minimum stok<input type="number" min="0" step="0.001" required value={productForm.minimumStock} onChange={(e) => setProductForm({ ...productForm, minimumStock: e.target.value })} /></label>
              <label>Yerləşmə<input value={productForm.location} onChange={(e) => setProductForm({ ...productForm, location: e.target.value })} /></label>
              <footer className="ws-form-wide"><button className="ws-button ws-button--primary">Material yarat</button></footer>
            </div>
          </form>
        )}

        <form className="ws-panel pc-form" onSubmit={createMovement}>
          <header><div><p className="ws-eyebrow">Stok əməliyyatı</p><h2>Giriş və sərf</h2></div></header>
          <div className="ws-form-grid">
            <label className="ws-form-wide">Material<select required value={movementForm.productId} onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}><option value="">Material seçin</option>{products.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.balance} {item.unit}</option>)}</select></label>
            <label>Əməliyyat<select value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as MovementType })}>{allowedMovementTypes.map((type) => <option key={type} value={type}>{movementLabels[type]}</option>)}</select></label>
            <label>Miqdar<input type="number" min="0.001" step="0.001" required value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} /></label>
            <label className="ws-form-wide">Səbəb<input required minLength={3} value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="Alış, prosedur sərfi və ya düzəliş səbəbi" /></label>
            <label className="ws-form-wide">Sənəd / istinad<input value={movementForm.reference} onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })} placeholder="Faktura və ya prosedur nömrəsi" /></label>
            <footer className="ws-form-wide"><button className="ws-button ws-button--primary" disabled={!products.length}>Əməliyyatı qeydə al</button></footer>
          </div>
        </form>
      </section>

      <section className="ws-panel ws-registry">
        <header className="ws-registry-tools"><span>Material qalıqları</span><span>{loading ? "Yüklənir..." : `${products.length} material`}</span></header>
        <div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>Material</th><th>SKU</th><th>Kateqoriya</th><th>Qalıq</th><th>Minimum</th><th>Yer</th><th>Status</th></tr></thead>
          <tbody>{products.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td><code>{item.sku}</code></td><td>{item.category}</td><td>{item.balance} {item.unit}</td><td>{item.minimumStock} {item.unit}</td><td>{item.location || "—"}</td><td>{!item.active ? "Arxiv" : item.isCritical ? "Alış lazımdır" : "Normal"}</td></tr>)}</tbody>
        </table></div>
        {!loading && !products.length && <div className="ws-empty"><b>Material yoxdur</b><span>Anbar məsulu ilk material kartını yaratmalıdır.</span></div>}
      </section>

      <section className="ws-panel pc-section">
        <p className="ws-eyebrow">Dəyişdirilməz tarixçə</p><h2>Son stok hərəkətləri</h2>
        {recent.map(({ product, movement }) => <div className="pc-history" key={movement.id}><i /><div><b>{product.name} · {movementLabels[movement.type]}</b><span>{movement.reason} · {movement.createdBy.email} · {new Date(movement.createdAt).toLocaleString("az-AZ")}</span></div><em>{movement.quantity} {product.unit}</em></div>)}
        {!recent.length && <div className="ws-empty"><span>Hələ stok hərəkəti yoxdur.</span></div>}
      </section>
    </>
  );
}
