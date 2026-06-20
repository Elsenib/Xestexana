"use client";

import { useMemo, useState } from "react";

type StockItem = {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minimum: number;
  location: string;
};

const demoStock: StockItem[] = [
  { name: "Kompozit plomb materialı", category: "Müalicə", unit: "ədəd", quantity: 18, minimum: 10, location: "Kabinet 1" },
  { name: "Anesteziya kartric", category: "Dərman", unit: "kartric", quantity: 42, minimum: 30, location: "Soyuducu" },
  { name: "Steril əlcək", category: "Sərfiyyat", unit: "qutu", quantity: 6, minimum: 12, location: "Anbar" },
  { name: "İmplant örtüyü", category: "Cərrahi", unit: "ədəd", quantity: 4, minimum: 5, location: "Cərrahi set" }
];

export default function Page() {
  const [items] = useState(demoStock);
  const critical = useMemo(() => items.filter((item) => item.quantity <= item.minimum), [items]);

  return (
    <>
      <div className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Anbar · Material nəzarəti</p>
          <h1>Stok və materiallar</h1>
          <span>Minimum stok xəbərdarlığı, kabinet üzrə yerləşmə və alış ehtiyacları.</span>
        </div>
      </div>

      <section className="ws-metrics">
        <article>
          <span>MATERİAL SAYI</span>
          <small>Demo siyahı</small>
          <strong>{items.length}</strong>
        </article>
        <article>
          <span>KRİTİK STOK</span>
          <small>Minimumdan aşağı/yaxın</small>
          <strong>{critical.length}</strong>
        </article>
        <article>
          <span>ALlŞ SİQNALI</span>
          <small>Hazırlanmalı sifariş</small>
          <strong>{critical.length ? "Var" : "Yox"}</strong>
        </article>
      </section>

      <section className="ws-panel ws-registry">
        <div className="ws-registry-tools">
          <span>Material kartları</span>
          <span>Real DB modeli növbəti mərhələdə əlavə olunacaq.</span>
        </div>
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Kateqoriya</th>
                <th>Miqdar</th>
                <th>Minimum</th>
                <th>Yer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>
                    {item.minimum} {item.unit}
                  </td>
                  <td>{item.location}</td>
                  <td>{item.quantity <= item.minimum ? "Alış lazımdır" : "Normal"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
