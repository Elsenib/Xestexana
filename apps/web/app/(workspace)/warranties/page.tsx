"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../../../lib/lovelydent-api";

type Patient = { id: string; fullName: string; phone: string; identityNumber: string };
type Template = { id: string; name: string; durationDays: number; conditions: string | null; active: boolean };
type Warranty = {
  id: string;
  patientName: string;
  patientPhone: string;
  templateName: string | null;
  title: string;
  status: string;
  isExpired: boolean;
  issuedAt: string;
  expiresAt: string;
  note: string | null;
  createdBy: string;
};

const defaultTemplate = { name: "", durationDays: "180", conditions: "" };
const defaultWarranty = { patientId: "", templateId: "", title: "", durationDays: "", note: "" };

export default function WarrantiesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [templateForm, setTemplateForm] = useState(defaultTemplate);
  const [warrantyForm, setWarrantyForm] = useState(defaultWarranty);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [patientRows, templateRows, warrantyRows] = await Promise.all([
      apiRequest<Patient[]>("/patients?take=200"),
      apiRequest<Template[]>("/warranties/templates"),
      apiRequest<Warranty[]>("/warranties?take=120"),
    ]);
    setPatients(patientRows);
    setTemplates(templateRows);
    setWarranties(warrantyRows);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Zəmanətlər yüklənmədi."));
  }, []);

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await apiRequest("/warranties/templates", {
        method: "POST",
        body: JSON.stringify({
          name: templateForm.name,
          durationDays: Number(templateForm.durationDays),
          conditions: templateForm.conditions || undefined,
        }),
      });
      setTemplateForm(defaultTemplate);
      setNotice("Zəmanət şablonu yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şablon yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function issueWarranty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!warrantyForm.patientId) {
      setError("Zəmanət üçün pasiyent seçilməlidir.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/warranties", {
        method: "POST",
        body: JSON.stringify({
          patientId: warrantyForm.patientId,
          templateId: warrantyForm.templateId || undefined,
          title: warrantyForm.title || undefined,
          durationDays: warrantyForm.durationDays ? Number(warrantyForm.durationDays) : undefined,
          note: warrantyForm.note || undefined,
        }),
      });
      setWarrantyForm(defaultWarranty);
      setNotice("Pasiyentə zəmanət yazıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zəmanət yazılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTemplate(template: Template) {
    setError("");
    try {
      await apiRequest(`/warranties/templates/${template.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !template.active }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şablon yenilənmədi.");
    }
  }

  return (
    <div>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Klinik iş · Zəmanət kitabçası</p>
          <h1>Zəmanətlər</h1>
          <span>Pasiyentə verilən müalicə zəmanətləri burada izlənir. Növbəti mərhələdə PDF/çap və müalicə planına avtomatik bağlanacaq.</span>
        </div>
      </section>

      {notice ? <div className="ws-alert ws-alert--success">{notice}</div> : null}
      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="pc-grid">
        <form className="ws-panel pc-form" onSubmit={createTemplate}>
          <header>
            <div>
              <p className="ws-eyebrow">Şablon</p>
              <h2>Zəmanət qaydası yarat</h2>
            </div>
          </header>
          <div className="ws-form-grid">
            <label>
              Ad
              <input value={templateForm.name} onChange={(e) => setTemplateForm((v) => ({ ...v, name: e.target.value }))} />
            </label>
            <label>
              Müddət, gün
              <input
                type="number"
                min="1"
                value={templateForm.durationDays}
                onChange={(e) => setTemplateForm((v) => ({ ...v, durationDays: e.target.value }))}
              />
            </label>
            <label>
              Şərtlər
              <textarea value={templateForm.conditions} onChange={(e) => setTemplateForm((v) => ({ ...v, conditions: e.target.value }))} />
            </label>
            <footer>
              <button className="ws-button ws-button--primary" disabled={saving}>
                Şablonu saxla
              </button>
            </footer>
          </div>
        </form>

        <form className="ws-panel pc-form" onSubmit={issueWarranty}>
          <header>
            <div>
              <p className="ws-eyebrow">Pasiyent</p>
              <h2>Zəmanət ver</h2>
            </div>
          </header>
          <div className="ws-form-grid">
            <label>
              Pasiyent
              <select value={warrantyForm.patientId} onChange={(e) => setWarrantyForm((v) => ({ ...v, patientId: e.target.value }))}>
                <option value="">Pasiyent seçin</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} · {patient.phone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Şablon
              <select value={warrantyForm.templateId} onChange={(e) => setWarrantyForm((v) => ({ ...v, templateId: e.target.value }))}>
                <option value="">Şablonsuz manual zəmanət</option>
                {templates.filter((row) => row.active).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.durationDays} gün
                  </option>
                ))}
              </select>
            </label>
            <label>
              Başlıq
              <input value={warrantyForm.title} onChange={(e) => setWarrantyForm((v) => ({ ...v, title: e.target.value }))} />
            </label>
            <label>
              Müddət, gün
              <input
                type="number"
                min="1"
                value={warrantyForm.durationDays}
                onChange={(e) => setWarrantyForm((v) => ({ ...v, durationDays: e.target.value }))}
                placeholder="Boş qalsa şablondan götürülür"
              />
            </label>
            <label>
              Qeyd
              <textarea value={warrantyForm.note} onChange={(e) => setWarrantyForm((v) => ({ ...v, note: e.target.value }))} />
            </label>
            <footer>
              <button className="ws-button ws-button--primary" disabled={saving}>
                Zəmanəti yaz
              </button>
            </footer>
          </div>
        </form>
      </section>

      <section className="pc-grid" style={{ marginTop: 22 }}>
        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Şablonlar</p>
              <h2>Zəmanət qaydaları</h2>
            </div>
          </header>
          {templates.map((template) => (
            <div className="ws-flow-card" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.durationDays} gün · {template.active ? "aktiv" : "deaktiv"}</span>
                {template.conditions ? <small>{template.conditions}</small> : null}
              </div>
              <button className="ws-row-action" type="button" onClick={() => toggleTemplate(template)}>
                {template.active ? "Deaktiv et" : "Aktiv et"}
              </button>
            </div>
          ))}
          {!templates.length ? <div className="ws-empty"><span>Hələ zəmanət şablonu yoxdur.</span></div> : null}
        </article>

        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Kitabça</p>
              <h2>Pasiyent zəmanətləri</h2>
            </div>
          </header>
          {warranties.map((warranty) => (
            <div className="ws-flow-card" key={warranty.id}>
              <div>
                <strong>{warranty.patientName} · {warranty.title}</strong>
                <span>
                  {warranty.templateName ?? "Manual"} · bitmə: {new Date(warranty.expiresAt).toLocaleDateString("az-AZ")} ·{" "}
                  {warranty.isExpired ? "müddəti bitib" : warranty.status}
                </span>
                {warranty.note ? <small>{warranty.note}</small> : null}
              </div>
              <small>{warranty.createdBy}</small>
            </div>
          ))}
          {!warranties.length ? <div className="ws-empty"><span>Hələ pasiyent zəmanəti yoxdur.</span></div> : null}
        </article>
      </section>
    </div>
  );
}
