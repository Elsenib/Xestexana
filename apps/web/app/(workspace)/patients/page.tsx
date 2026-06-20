"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Patient = {
  id: string;
  fullName: string;
  email: string;
  identityNumber: string;
  phone: string;
  birthDate: string;
  createdAt: string;
};
const initial = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  identityNumber: "",
  phone: "",
  gender: "FEMALE",
  birthDate: "1990-01-01",
};

export default function PatientsPage() {
  const [rows, setRows] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(initial);
  async function load() {
    setLoading(true);
    try {
      setRows(await apiRequest<Patient[]>("/patients?take=200"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pasiyentlər yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("az");
    return q
      ? rows.filter((p) =>
          `${p.fullName} ${p.phone} ${p.identityNumber}`
            .toLocaleLowerCase("az")
            .includes(q),
        )
      : rows;
  }, [query, rows]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/patients", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          birthDate: new Date(form.birthDate).toISOString(),
        }),
      });
      setDrawer(false);
      setForm(initial);
      await load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Pasiyent yaradılmadı.");
    }
  }
  const field =
    (key: keyof typeof initial) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Pasiyent reyestri</p>
          <h1>Pasiyentlər</h1>
          <span>
            Klinik tarixçə və əlaqə məlumatları üçün vahid başlanğıc nöqtəsi.
          </span>
        </div>
        <button
          className="ws-button ws-button--primary"
          onClick={() => setDrawer(true)}
        >
          + Yeni pasiyent
        </button>
      </section>
      <section className="ws-panel ws-registry">
        <header className="ws-registry-tools">
          <label className="ws-search">
            ⌕
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ad, telefon və ya FIN ilə axtar"
            />
          </label>
          <span>{filtered.length} pasiyent</span>
        </header>
        {error && <div className="ws-alert ws-alert--danger">{error}</div>}
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Pasiyent</th>
                <th>Əlaqə</th>
                <th>FIN</th>
                <th>Doğum tarixi</th>
                <th>Qeydiyyat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="ws-person">
                        <i>
                          {p.fullName
                            .split(" ")
                            .map((x) => x[0])
                            .join("")
                            .slice(0, 2)}
                        </i>
                        <div>
                          <b>{p.fullName}</b>
                          <span>{p.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{p.phone}</td>
                    <td>
                      <code>{p.identityNumber}</code>
                    </td>
                    <td>{new Date(p.birthDate).toLocaleDateString("az-AZ")}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString("az-AZ")}</td>
                    <td>
                      <a
                        className="ws-row-action"
                        href={`/patients/card?id=${p.id}`}
                        aria-label="Klinik kartı aç"
                      >
                        →
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="ws-empty">
            <b>Pasiyentlər yüklənir...</b>
          </div>
        )}
        {!loading && !filtered.length && (
          <div className="ws-empty">
            <b>Nəticə tapılmadı</b>
            <span>Axtarışı dəyişin və ya yeni pasiyent yaradın.</span>
          </div>
        )}
      </section>
      {drawer && (
        <div
          className="ws-drawer-backdrop"
          onMouseDown={() => setDrawer(false)}
        >
          <aside className="ws-drawer" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="ws-eyebrow">Yeni qeyd</p>
                <h2>Pasiyent yaradın</h2>
              </div>
              <button onClick={() => setDrawer(false)}>×</button>
            </header>
            <form onSubmit={create} className="ws-form-grid">
              <label>
                Ad
                <input
                  value={form.firstName}
                  onChange={field("firstName")}
                  required
                />
              </label>
              <label>
                Soyad
                <input
                  value={form.lastName}
                  onChange={field("lastName")}
                  required
                />
              </label>
              <label>
                Telefon
                <input value={form.phone} onChange={field("phone")} required />
              </label>
              <label>
                FIN
                <input
                  value={form.identityNumber}
                  onChange={field("identityNumber")}
                  required
                />
              </label>
              <label>
                E-poçt
                <input
                  type="email"
                  value={form.email}
                  onChange={field("email")}
                  required
                />
              </label>
              <label>
                Müvəqqəti şifrə
                <input
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={field("password")}
                  required
                />
              </label>
              <label>
                Doğum tarixi
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={field("birthDate")}
                  required
                />
              </label>
              <label>
                Cins
                <select value={form.gender} onChange={field("gender")}>
                  <option value="FEMALE">Qadın</option>
                  <option value="MALE">Kişi</option>
                  <option value="OTHER">Digər</option>
                </select>
              </label>
              {error && (
                <div className="ws-alert ws-alert--danger ws-form-wide">
                  {error}
                </div>
              )}
              <footer className="ws-form-wide">
                <button
                  type="button"
                  className="ws-button"
                  onClick={() => setDrawer(false)}
                >
                  Ləğv et
                </button>
                <button className="ws-button ws-button--primary">
                  Pasiyenti yarat
                </button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
