"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Patient = {
  id: string;
  fullName: string;
  email: string;
  identityNumber: string;
  phone: string;
  patientType: "LOCAL" | "FOREIGN";
  citizenshipCountryCode: string;
  identityDocumentType: "NATIONAL_ID" | "PASSPORT" | "RESIDENCE_PERMIT" | "OTHER";
  identityDocumentExpiry?: string | null;
  preferredLanguage: "AZ" | "TR" | "RU" | "EN" | "OTHER";
  interpreterRequired: boolean;
  birthDate: string;
  createdAt: string;
};
type PatientForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  identityNumber: string;
  phone: string;
  patientType: "LOCAL" | "FOREIGN";
  citizenshipCountryCode: string;
  identityDocumentType: "NATIONAL_ID" | "PASSPORT" | "RESIDENCE_PERMIT" | "OTHER";
  identityDocumentExpiry: string;
  preferredLanguage: "AZ" | "TR" | "RU" | "EN" | "OTHER";
  interpreterRequired: boolean;
  gender: string;
  birthDate: string;
};
const initial: PatientForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  identityNumber: "",
  phone: "",
  patientType: "LOCAL",
  citizenshipCountryCode: "AZ",
  identityDocumentType: "NATIONAL_ID",
  identityDocumentExpiry: "",
  preferredLanguage: "AZ",
  interpreterRequired: false,
  gender: "FEMALE",
  birthDate: "1990-01-01",
};

export default function PatientsPage() {
  const [rows, setRows] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "LOCAL" | "FOREIGN">("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState(initial);
  async function load() {
    setLoading(true);
    try {
      const patientTypeQuery = typeFilter === "ALL" ? "" : `&patientType=${typeFilter}`;
      setRows(await apiRequest<Patient[]>(`/patients?take=200${patientTypeQuery}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pasiyentlər yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [typeFilter]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("az");
    return rows.filter((p) => {
      const matchesType = typeFilter === "ALL" || p.patientType === typeFilter;
      const matchesQuery = !q ||
          `${p.fullName} ${p.phone} ${p.identityNumber} ${p.citizenshipCountryCode}`
            .toLocaleLowerCase("az")
            .includes(q);
      return matchesType && matchesQuery;
    });
  }, [query, rows, typeFilter]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/patients", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          birthDate: new Date(form.birthDate).toISOString(),
          identityDocumentExpiry: form.identityDocumentExpiry
            ? new Date(form.identityDocumentExpiry).toISOString()
            : null,
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
    (key: keyof PatientForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value } as PatientForm);

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
          <select
            className="ws-filter-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            aria-label="Pasiyent tipinə görə süzgəc"
          >
            <option value="ALL">Bütün pasiyentlər</option>
            <option value="LOCAL">Yerli vətəndaşlar</option>
            <option value="FOREIGN">Xarici vətəndaşlar</option>
          </select>
          <span>{filtered.length} pasiyent</span>
        </header>
        {error && <div className="ws-alert ws-alert--danger">{error}</div>}
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Pasiyent</th>
                <th>Əlaqə</th>
                <th>Tip / sənəd</th>
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
                      <span className={`ws-patient-kind ${p.patientType === "FOREIGN" ? "is-foreign" : ""}`}>
                        {p.patientType === "FOREIGN" ? `Xarici · ${p.citizenshipCountryCode}` : "Yerli"}
                      </span>
                      <small className="ws-document-line">
                        {p.identityDocumentType === "PASSPORT" ? "Pasport" : p.identityDocumentType === "RESIDENCE_PERMIT" ? "Yaşayış icazəsi" : "Şəxsiyyət sənədi"}: <code>{p.identityNumber}</code>
                      </small>
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
              <label className="ws-form-wide">
                Pasiyent tipi
                <select
                  value={form.patientType}
                  onChange={(event) => {
                    const patientType = event.target.value as "LOCAL" | "FOREIGN";
                    setForm({
                      ...form,
                      patientType,
                      citizenshipCountryCode: patientType === "LOCAL" ? "AZ" : "",
                      identityDocumentType: patientType === "LOCAL" ? "NATIONAL_ID" : "PASSPORT",
                      preferredLanguage: patientType === "LOCAL" ? "AZ" : "EN",
                      identityDocumentExpiry: "",
                      interpreterRequired: false,
                    });
                  }}
                >
                  <option value="LOCAL">Azərbaycan vətəndaşı</option>
                  <option value="FOREIGN">Xarici vətəndaş</option>
                </select>
              </label>
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
                Telefon {form.patientType === "FOREIGN" ? "(ölkə kodu ilə)" : ""}
                <input
                  value={form.phone}
                  onChange={field("phone")}
                  placeholder={form.patientType === "FOREIGN" ? "+90 5xx xxx xx xx" : "+994 50 000 00 00"}
                  required
                />
              </label>
              <label>
                {form.patientType === "FOREIGN" ? "Sənəd nömrəsi" : "FIN"}
                <input
                  value={form.identityNumber}
                  onChange={field("identityNumber")}
                  required
                />
              </label>
              {form.patientType === "FOREIGN" && (
                <>
                  <label>
                    Vətəndaşlıq ölkəsi (ISO kodu)
                    <input
                      list="citizenship-country-codes"
                      maxLength={2}
                      pattern="[A-Za-z]{2}"
                      value={form.citizenshipCountryCode}
                      onChange={field("citizenshipCountryCode")}
                      placeholder="TR"
                      required
                    />
                    <datalist id="citizenship-country-codes">
                      <option value="TR">Türkiyə</option>
                      <option value="RU">Rusiya</option>
                      <option value="GE">Gürcüstan</option>
                      <option value="IR">İran</option>
                      <option value="KZ">Qazaxıstan</option>
                      <option value="UA">Ukrayna</option>
                      <option value="AE">BƏƏ</option>
                      <option value="US">ABŞ</option>
                      <option value="GB">Birləşmiş Krallıq</option>
                    </datalist>
                  </label>
                  <label>
                    Şəxsiyyət sənədi
                    <select value={form.identityDocumentType} onChange={field("identityDocumentType")}>
                      <option value="PASSPORT">Pasport</option>
                      <option value="NATIONAL_ID">Xarici şəxsiyyət vəsiqəsi</option>
                      <option value="RESIDENCE_PERMIT">Yaşayış icazəsi</option>
                      <option value="OTHER">Digər sənəd</option>
                    </select>
                  </label>
                  <label>
                    Sənədin bitmə tarixi
                    <input
                      type="date"
                      value={form.identityDocumentExpiry}
                      onChange={field("identityDocumentExpiry")}
                      required={form.identityDocumentType === "PASSPORT"}
                    />
                  </label>
                  <label>
                    Ünsiyyət dili
                    <select value={form.preferredLanguage} onChange={field("preferredLanguage")}>
                      <option value="AZ">Azərbaycan dili</option>
                      <option value="TR">Türk dili</option>
                      <option value="RU">Rus dili</option>
                      <option value="EN">İngilis dili</option>
                      <option value="OTHER">Digər</option>
                    </select>
                  </label>
                  <label className="ws-checkbox ws-form-wide">
                    <input
                      type="checkbox"
                      checked={form.interpreterRequired}
                      onChange={(event) => setForm({ ...form, interpreterRequired: event.target.checked })}
                    />
                    <span>Tərcüməçi tələb olunur</span>
                  </label>
                </>
              )}
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
